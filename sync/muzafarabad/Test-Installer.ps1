$ErrorActionPreference='Stop'
Import-Module ScheduledTasks -ErrorAction Stop
$base='E:\MutfakPos\recovery\runs\muzafarabad-launch-qa-20261022'
$test=Join-Path $base ('installer-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $test|Out-Null
$token='synthetic-only-'+[guid]::NewGuid().ToString('N')
$provision=Join-Path $test 'synthetic-provisioning.json'
@{apiUrl='https://kantin.iespl.org/api/sync/kashmir';token=$token;launchPermit='synthetic-launch-permit';kantinSlug='kashmir';expectedUser='Lenovo'}|ConvertTo-Json|Set-Content -LiteralPath $provision -Encoding UTF8
& "$PSScriptRoot\Build-Package.ps1" -Output (Join-Path $test 'build') -ProvisionFile $provision
$package=Join-Path $test 'build\Muzafarabad - Start Trading'
$local=Join-Path $test 'Local';New-Item -ItemType Directory -Path $local|Out-Null
$pos=Join-Path $local 'KantinPOS-Clean';$sync=Join-Path $local 'KantinReportingKashmir'
$reference='E:\MutfakPos\recovery\releases\20261021-03\Kantin POS'
$archive='E:\MutfakPos\recovery\runs\kashmir-sync-20261021-01\snapshot-synthetic-fixture-a3a9f4f0-471c-48f7-bd7e-50674621a407\backups\Kantin-20261021-051356-1838d375.zip'
& "$reference\runtime\bin\java.exe" '-Djava.awt.headless=true' "-Dderby.stream.error.file=$test\derby.log" -cp "$reference\tools\kantin-maintenance.jar;$reference\Kantin Server.jar" KantinMaintenance extract $archive $pos
if($LASTEXITCODE){throw 'Fixture extraction failed'}
Get-ChildItem -LiteralPath $reference -Force|Copy-Item -Destination $pos -Recurse
New-Item -ItemType Directory -Path (Join-Path $pos 'logs'),$sync|Out-Null
@{apiUrl='https://kantin.iespl.org/api/sync/kashmir';posRoot=$pos}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $sync 'config.json') -Encoding UTF8
ConvertTo-SecureString $token -AsPlainText -Force|ConvertFrom-SecureString|Set-Content -LiteralPath (Join-Path $sync 'token.dpapi')
$global:installerPolicy=@{ok=$true;protocol=2;kantinSlug='kashmir';instanceId=$null;firstTradingLocal=$null;receiptBaseline=$null;lastBackupAt=$null}
function Invoke-RestMethod {param($Uri,$Headers,$TimeoutSec,$MaximumRedirection,$Method,$Body,$ContentType)
    if($Uri -ne 'https://kantin.iespl.org/api/sync/kashmir'){throw 'Unexpected mocked destination'}
    if($Method){
        $b=[Text.Encoding]::UTF8.GetString($Body)|ConvertFrom-Json
        if(@($b.tables.RECEIPT).Count -or @($b.tables.PAYMENT).Count){throw 'Post-cleanup snapshot was not empty'}
        if($b.mode -eq 'activate'){
            $global:installerPolicy.instanceId=$b.instanceId;$global:installerPolicy.receiptBaseline=$b.receiptBaseline
            $global:installerPolicy.firstTradingLocal=([DateTimeOffset]::Parse($b.cleanupUtc)).ToOffset([TimeSpan]::FromHours(5)).ToString('yyyy-MM-ddTHH:mm:ss')
        }elseif($b.mode -ne 'snapshot'){throw 'Unexpected POST'}
        $global:installerPolicy.lastBackupAt=$b.backupAt
        return @{ok=$true}
    }
    return [pscustomobject]$global:installerPolicy
}
$global:installerTask=$null;$global:installerTaskInfo=$null
function Get-ScheduledTask {param($TaskName,$ErrorAction) return $global:installerTask}
function Disable-ScheduledTask {param($TaskName) $global:installerTask.State='Disabled'}
function Enable-ScheduledTask {param($TaskName) $global:installerTask.State='Ready'}
function Register-ScheduledTask {param($TaskName,$Action,$Trigger,$Principal,$Settings,$Description,[switch]$Force)
    if($TaskName -ne 'Kantin-Kashmir-Reporting' -or $Action.Execute -ne "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -or $Trigger.Count -ne 25){throw 'Invalid scheduled task contract'}
    $global:installerTask=@{State='Disabled'}
}
function Get-ScheduledTaskInfo {param($TaskName) return $global:installerTaskInfo}
function Start-ScheduledTask {param($TaskName)
    $global:installerTaskInfo=@{LastRunTime=Get-Date;LastTaskResult=0}
    & (Join-Path $sync 'Sync-Muzafarabad.ps1') -SyncRoot $sync
}
function Get-CimInstance {param($ClassName,$Filter) if($ClassName -ne 'Win32_Process'){throw 'Unexpected process query'};return @()}
function Get-TimeZone {return @{Id='Pakistan Standard Time'}}
function Read-Host {param($Prompt) return 'CLEAR MUZAFARABAD TEST SALES'}
$oldUser=$env:USERNAME;$oldLocal=$env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA=$local
    # Guard must reject the wrong account before touching the fixture database.
    $env:USERNAME='NOT-THE-POS';$failed=$false
    try{& "$package\Clear-Test-Sales.ps1"}catch{$failed=$true}
    if(!$failed -or (Test-Path -LiteralPath (Join-Path $pos '.kantin\muzafarabad-cleanup.json'))){throw 'Wrong-machine guard failed'}
    $env:USERNAME='Lenovo'
    & "$package\Clear-Test-Sales.ps1"
    $marker=Join-Path $pos '.kantin\muzafarabad-cleanup.json'
    if(!(Test-Path -LiteralPath $marker)){throw 'Cleanup evidence not saved'}
    $before=(Get-FileHash -LiteralPath $marker).Hash
    & "$package\Clear-Test-Sales.ps1"
    if((Get-FileHash -LiteralPath $marker).Hash -ne $before){throw 'Repeated cleanup changed evidence'}
    & "$package\Bring-Online.ps1"
    if(!$global:installerPolicy.firstTradingLocal -or $global:installerTask.State -ne 'Ready'){throw 'Bring-online verification failed'}
    & "$package\Bring-Online.ps1"
    Write-Host 'PASS: complete packaged PowerShell cleanup, package/installed hashes, target guard, verified backup, transaction, rerun no-op. No real network or scheduled tasks used.'
    Write-Host 'PASS: complete bring-online installer, fresh backup, file verification, DPAPI, one-time activation, task contract, scheduled verification and repeated install.'
} finally {$env:USERNAME=$oldUser;$env:LOCALAPPDATA=$oldLocal}
