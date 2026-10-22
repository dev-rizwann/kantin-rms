$ErrorActionPreference='Stop'
$base='E:\MutfakPos\recovery\runs\muzafarabad-launch-qa-20261022'
$fixture=Get-ChildItem -LiteralPath $base -Directory -Filter 'snapshot-clear-*'|Where-Object {Test-Path -LiteralPath (Join-Path $_.FullName '.kantin\muzafarabad-cleanup.json')}|Select-Object -Last 1
if(!$fixture){throw 'Synthetic clean fixture required'}
$backup=Get-ChildItem -LiteralPath (Join-Path $fixture.FullName 'backups') -Filter '*.zip'|Sort-Object LastWriteTimeUtc -Descending|Select-Object -Skip 1 -First 1
$reference='E:\MutfakPos\recovery\releases\20261021-03\Kantin POS'
$root=Join-Path $base ('agent-'+[guid]::NewGuid().ToString('N'))
$pos=Join-Path $root 'pos'
New-Item -ItemType Directory -Path $root|Out-Null
& "$reference\runtime\bin\java.exe" '-Djava.awt.headless=true' "-Dderby.stream.error.file=$root\derby.log" -cp "$reference\tools\kantin-maintenance.jar;$reference\Kantin Server.jar" KantinMaintenance extract $backup.FullName $pos
if($LASTEXITCODE){throw 'Fixture extraction failed'}
foreach($name in 'runtime','tools','Kantin Server.jar'){Copy-Item -LiteralPath (Join-Path $reference $name) -Destination (Join-Path $pos $name) -Recurse}
New-Item -ItemType Directory -Path (Join-Path $pos 'backups')|Out-Null
Copy-Item -LiteralPath $backup.FullName -Destination (Join-Path $pos 'backups')
$evidence=Get-Content -LiteralPath (Join-Path $fixture.FullName '.kantin\muzafarabad-cleanup.json') -Raw|ConvertFrom-Json
Copy-Item -LiteralPath (Join-Path $base 'kantin-reporting.jar') -Destination $root
$config=@{apiUrl='https://kantin.iespl.org/api/sync/kashmir';posRoot=$pos;instanceId=$evidence.instanceId;cleanupId=$evidence.cleanupId;version=3}
$config|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'config.json') -Encoding UTF8
ConvertTo-SecureString ('synthetic-only-'+[guid]::NewGuid()) -AsPlainText -Force|ConvertFrom-SecureString|Set-Content -LiteralPath (Join-Path $root 'token.dpapi')
ConvertTo-SecureString 'synthetic-launch-permit' -AsPlainText -Force|ConvertFrom-SecureString|Set-Content -LiteralPath (Join-Path $root 'launch.dpapi')
$global:qaPolicy=@{ok=$true;protocol=2;kantinSlug='kashmir';instanceId=$null;firstTradingLocal=$null;receiptBaseline=$null;lastBackupAt=$null}
$global:qaActivations=0;$global:qaUploads=0;$global:qaLoseResponse=$true
function Invoke-RestMethod {
    param($Uri,$Headers,$MaximumRedirection,$TimeoutSec,$Method,$Body,$ContentType)
    if($Uri -ne 'https://kantin.iespl.org/api/sync/kashmir'){throw 'Unexpected test destination'}
    if(!$Method){return [pscustomobject]$global:qaPolicy}
    $b=[Text.Encoding]::UTF8.GetString($Body)|ConvertFrom-Json
    if(@($b.tables.RECEIPT).Count -ne 0 -or @($b.tables.PAYMENT).Count -ne 0){throw 'Fixture must be empty after cleanup'}
    if($b.tables.STAFF[0].PSObject.Properties.Name -contains 'password'){throw 'Credential in report'}
    if($b.mode -eq 'activate'){
        $global:qaActivations++
        $global:qaPolicy.instanceId=$b.instanceId;$global:qaPolicy.receiptBaseline=$b.receiptBaseline
        $global:qaPolicy.firstTradingLocal=([DateTimeOffset]::Parse($b.cleanupUtc)).ToOffset([TimeSpan]::FromHours(5)).ToString('yyyy-MM-ddTHH:mm:ss')
        $global:qaPolicy.lastBackupAt=$b.backupAt
        if($global:qaLoseResponse){$global:qaLoseResponse=$false;throw 'Simulated response lost after commit'}
    }elseif($b.mode -eq 'snapshot'){$global:qaUploads++;$global:qaPolicy.lastBackupAt=$b.backupAt}
    else{throw 'Unexpected registration/deletion mode'}
    return @{ok=$true}
}
function Expect-Failure([scriptblock]$Action,[string]$Stage){
    $failed=$false;try{& $Action}catch{$failed=$true}
    if(!$failed){throw 'Expected failure'}
    $status=Get-Content -LiteralPath (Join-Path $root 'status.json') -Raw|ConvertFrom-Json
    if($status.ok -or $status.stage -ne $Stage){throw "Wrong failure stage: $($status.stage), expected $Stage"}
}
$worker=Join-Path $PSScriptRoot 'Sync-Muzafarabad.ps1'
Expect-Failure {& $worker -SyncRoot $root} 'identity-and-boundary'
Expect-Failure {& $worker -SyncRoot $root -Launch} 'portal-activation'
& $worker -SyncRoot $root -Launch
& $worker -SyncRoot $root
if($global:qaActivations -ne 1 -or $global:qaUploads -ne 0){throw 'Retry/deduplication failed'}
$global:qaPolicy.lastBackupAt=$null
& $worker -SyncRoot $root
if($global:qaUploads -ne 1){throw 'Snapshot refresh failed'}
$config.cleanupId=[guid]::NewGuid().ToString();$config|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'config.json') -Encoding UTF8
Expect-Failure {& $worker -SyncRoot $root} 'verified-export'
[IO.File]::WriteAllText((Join-Path $root 'config.json'),'{invalid')
Expect-Failure {& $worker -SyncRoot $root} 'configuration'
if(@(Get-ChildItem -LiteralPath (Join-Path $root 'work') -Force).Count){throw 'Sensitive staging files left behind'}
$config.cleanupId=$evidence.cleanupId;$config|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'config.json') -Encoding UTF8
$global:qaPolicy|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $root 'qa-policy.json') -Encoding UTF8
Copy-Item -LiteralPath $worker -Destination $root
Write-Host 'PASS Windows PowerShell 5: DPAPI, verified backup export, launch, lost response, retry, deduplication, ordinary sync, mismatch rejection, early diagnostics and staging cleanup.'
Write-Host "QA agent directory: $root"
