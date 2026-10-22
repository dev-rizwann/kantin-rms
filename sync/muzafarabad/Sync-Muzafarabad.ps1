[CmdletBinding()]
param([string]$SyncRoot=$PSScriptRoot,[switch]$Launch)
Set-StrictMode -Version 2
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath($SyncRoot)
$lock=$null;$work=$null;$token=$null;$headers=$null;$stage='startup'
function Assert-SafePath([string]$Path) {
    $p=[IO.Path]::GetFullPath($Path)
    while($p){
        if((Test-Path -LiteralPath $p) -and ((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Linked path prohibited'}
        $p=[IO.Path]::GetDirectoryName($p)
    }
}
Assert-SafePath $root
New-Item -ItemType Directory -Path (Join-Path $root 'logs') -Force | Out-Null
$log=Join-Path $root ('logs\sync-'+(Get-Date -Format 'yyyy-MM-dd')+'.log')
function Log([string]$Message){Add-Content -LiteralPath $log -Value ((Get-Date -Format o)+' '+$Message) -Encoding UTF8}
function Save-Status([bool]$Success,[string]$Step,$Policy) {
    $status=@{ok=$Success;stage=$Step;checkedUtc=[DateTime]::UtcNow.ToString('o')}
    if($Policy){$status.instanceId=$Policy.instanceId;$status.firstTradingLocal=$Policy.firstTradingLocal;$status.lastBackupAt=$Policy.lastBackupAt}
    $tmp=Join-Path $root ('status-'+[guid]::NewGuid().ToString('N')+'.tmp')
    [IO.File]::WriteAllText($tmp,($status|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $tmp -Destination (Join-Path $root 'status.json') -Force
}
function Clean-Work {
    if($work -and (Test-Path -LiteralPath $work)){
        $resolved=(Resolve-Path -LiteralPath $work).Path
        if([IO.Path]::GetDirectoryName($resolved) -ne (Join-Path $root 'work') -or [IO.Path]::GetFileName($resolved) -notmatch '^run-[a-f0-9]{32}$'){throw 'Unsafe staging cleanup path'}
        Assert-SafePath $resolved
        if(@(Get-ChildItem -LiteralPath $resolved -Recurse -Force|Where-Object {$_.Attributes -band [IO.FileAttributes]::ReparsePoint}).Count){throw 'Linked staging content'}
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
try {
    $stage='configuration'
    $config=Get-Content -LiteralPath (Join-Path $root 'config.json') -Raw|ConvertFrom-Json
    if($config.apiUrl -ne 'https://kantin.iespl.org/api/sync/kashmir'){throw 'Unexpected destination'}
    $pos=[IO.Path]::GetFullPath($config.posRoot);Assert-SafePath $pos
    if(!(Test-Path -LiteralPath (Join-Path $pos '.kantin\setup-complete.txt'))){throw 'POS installation missing'}
    $lock=[IO.File]::Open((Join-Path $root 'sync.lock'),'OpenOrCreate','ReadWrite','None')
    New-Item -ItemType Directory -Path (Join-Path $root 'work') -Force|Out-Null
    $work=Join-Path $root ('work\run-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work|Out-Null
    $stage='credential'
    $secure=(Get-Content -LiteralPath (Join-Path $root 'token.dpapi') -Raw).Trim()|ConvertTo-SecureString
    $token=[Net.NetworkCredential]::new('',$secure).Password
    $headers=@{Authorization='Bearer '+$token}
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    function Policy {
        $r=Invoke-RestMethod -Uri $config.apiUrl -Headers $headers -MaximumRedirection 0 -TimeoutSec 60
        if(!$r.ok -or $r.protocol -ne 2 -or $r.kantinSlug -ne 'kashmir'){throw 'Unexpected policy'}
        return $r
    }
    function Post($Body) {
        $bytes=[Text.Encoding]::UTF8.GetBytes(($Body|ConvertTo-Json -Depth 10 -Compress))
        if($bytes.Length -gt 32MB){throw 'Snapshot too large'}
        $r=Invoke-RestMethod -Uri $config.apiUrl -Method Post -Headers $headers -Body $bytes -ContentType 'application/json' -MaximumRedirection 0 -TimeoutSec 180
        if(!$r.ok){throw 'Portal did not confirm request'}
        return $r
    }
    $stage='portal-policy';$policy=Policy
    $stage='fresh-backup'
    # Random filename suffixes do not order backups taken in the same second.
    $backup=Get-ChildItem -LiteralPath (Join-Path $pos 'backups') -File -Filter 'Kantin-*.zip'|
        Where-Object {$_.Name -match '^Kantin-\d{8}-\d{6}-[a-f0-9]{8}\.zip$'}|
        Sort-Object LastWriteTimeUtc,Name -Descending|Select-Object -First 1
    if(!$backup){throw 'No verified engine backup yet'}
    $backupAt=[DateTime]::SpecifyKind([DateTime]::ParseExact($backup.Name.Substring(7,15),'yyyyMMdd-HHmmss',[Globalization.CultureInfo]::InvariantCulture),[DateTimeKind]::Utc)
    if($backupAt -lt [DateTime]::UtcNow.AddHours(-2) -or $backupAt -gt [DateTime]::UtcNow.AddMinutes(5)){throw 'Backup stale or PC clock incorrect'}
    $java=Join-Path $pos 'runtime\bin\java.exe'
    $cp=(Join-Path $root 'kantin-reporting.jar')+';'+(Join-Path $pos 'tools\kantin-maintenance.jar')+';'+(Join-Path $pos 'Kantin Server.jar')
    function Export-Backup([string]$Mode) {
        $output=Join-Path $work ($Mode+'.json');$extract=Join-Path $work ('snapshot-'+$Mode)
        if(Test-Path -LiteralPath $output){return Get-Content -LiteralPath $output -Raw|ConvertFrom-Json}
        & $java '-Djava.awt.headless=true' "-Dderby.stream.error.file=$work\derby.log" -cp $cp KantinReportExport $Mode $backup.FullName $extract $output > (Join-Path $work ($Mode+'.log')) 2>&1
        if($LASTEXITCODE -ne 0){throw 'Verified backup export failed'}
        return Get-Content -LiteralPath $output -Raw|ConvertFrom-Json
    }
    $stage='verified-export';$metadata=Export-Backup 'metadata'
    if($metadata.instanceId -ne $config.instanceId -or !$metadata.cleanup -or $metadata.cleanup.cleanupId -ne $config.cleanupId){throw 'Installation or cleanup evidence mismatch'}
    if($Launch -and !$policy.firstTradingLocal){
        $stage='launch-validation'
        $permitSecure=(Get-Content -LiteralPath (Join-Path $root 'launch.dpapi') -Raw).Trim()|ConvertTo-SecureString
        $permit=[Net.NetworkCredential]::new('',$permitSecure).Password
        $tables=Export-Backup 'snapshot'
        $stage='portal-activation'
        $null=Post @{mode='activate';permit=$permit;instanceId=$metadata.instanceId;cleanupId=$metadata.cleanup.cleanupId;cleanupUtc=$metadata.cleanup.cleanupUtc;computerName=$metadata.cleanup.computerName;receiptBaseline=[long]$metadata.cleanup.receiptBaseline;backupAt=$backupAt.ToString('yyyy-MM-ddTHH:mm:ssZ');tables=$tables}
        $permit=$null;$policy=Policy
    }
    $stage='identity-and-boundary'
    if($metadata.instanceId -ne $policy.instanceId){throw 'Registered installation mismatch'}
    $expectedLocal=([DateTimeOffset]::Parse($metadata.cleanup.cleanupUtc)).ToOffset([TimeSpan]::FromHours(5)).ToString('yyyy-MM-ddTHH:mm:ss')
    if($policy.receiptBaseline -ne $metadata.cleanup.receiptBaseline -or $policy.firstTradingLocal -ne $expectedLocal){throw 'Launch boundary mismatch'}
    $stage='snapshot-upload'
    if(!$policy.lastBackupAt -or $backupAt -gt [DateTime]::Parse($policy.lastBackupAt).ToUniversalTime()){
        $tables=Export-Backup 'snapshot'
        $null=Post @{mode='snapshot';instanceId=$metadata.instanceId;backupAt=$backupAt.ToString('yyyy-MM-ddTHH:mm:ssZ');firstTradingLocal=$policy.firstTradingLocal;tables=$tables}
        $policy=Policy
    }
    $stage='portal-confirmation'
    if(!$policy.lastBackupAt -or [DateTime]::Parse($policy.lastBackupAt).ToUniversalTime() -lt $backupAt){throw 'Latest backup not confirmed'}
    Save-Status $true 'active' $policy
    Log ('OK: active, verified backup '+$backupAt.ToString('o'))
    Write-Output 'MUZAFARABAD (AJK): portal confirmed automatic reporting.'
} catch {
    Log ('ERROR at '+$stage+' ('+$_.Exception.GetType().Name+'). Retry after resolving this stage.')
    Save-Status $false $stage $null
    throw "Muzafarabad sync failed at $stage. See $log. No success was reported."
} finally {
    try {Clean-Work} finally {if($lock){$lock.Dispose()}}
    $token=$null;$headers=$null;$permit=$null
}
