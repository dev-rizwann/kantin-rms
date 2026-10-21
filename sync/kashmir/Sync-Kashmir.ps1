[CmdletBinding()]
param([string]$SyncRoot = $PSScriptRoot)
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($SyncRoot)
$config = Get-Content -LiteralPath (Join-Path $root 'config.json') -Raw | ConvertFrom-Json
if ($config.apiUrl -ne 'https://kantin.iespl.org/api/sync/kashmir') { throw 'Unexpected sync destination' }
$pos = [IO.Path]::GetFullPath($config.posRoot)
if (!(Test-Path -LiteralPath (Join-Path $pos '.kantin\setup-complete.txt'))) { throw 'Kantin POS installation not found' }
New-Item -ItemType Directory -Path (Join-Path $root 'work'),(Join-Path $root 'logs') -Force | Out-Null
$lock = $null
try { $lock = [IO.File]::Open((Join-Path $root 'sync.lock'), 'OpenOrCreate', 'ReadWrite', 'None') }
catch [IO.IOException] { Write-Output 'Another Kashmir sync is running.'; exit 0 }
$work = Join-Path $root ('work\run-' + [guid]::NewGuid().ToString('N'))
$log = Join-Path $root ('logs\sync-' + (Get-Date -Format 'yyyy-MM-dd') + '.log')
function Log([string]$Message) { Add-Content -LiteralPath $log -Value ((Get-Date -Format o) + ' ' + $Message) -Encoding UTF8 }
function Clean-Work {
    if (Test-Path -LiteralPath $work) {
        $resolved = (Resolve-Path -LiteralPath $work).Path
        $parent = [IO.Path]::GetFullPath((Join-Path $root 'work'))
        if ([IO.Path]::GetDirectoryName($resolved) -ne $parent -or [IO.Path]::GetFileName($resolved) -notmatch '^run-[a-f0-9]{32}$') { throw 'Unsafe staging cleanup path' }
        if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked staging directory' }
        if ((Get-Item -LiteralPath $parent).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked work directory' }
        if (@(Get-ChildItem -LiteralPath $resolved -Recurse -Force | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }).Count) { throw 'Linked staging content' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
try {
    $secure = (Get-Content -LiteralPath (Join-Path $root 'token.dpapi') -Raw).Trim() | ConvertTo-SecureString
    $token = [Net.NetworkCredential]::new('', $secure).Password
    $headers = @{ Authorization = 'Bearer ' + $token }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $policy = Invoke-RestMethod -Uri $config.apiUrl -Headers $headers -MaximumRedirection 0 -TimeoutSec 60
    if (!$policy.ok -or $policy.protocol -ne 2 -or $policy.kantinSlug -ne 'kashmir') { throw 'Unexpected portal policy' }
    $backup = Get-ChildItem -LiteralPath (Join-Path $pos 'backups') -File -Filter 'Kantin-*.zip' |
        Where-Object { $_.Name -match '^Kantin-\d{8}-\d{6}-[a-f0-9]{8}\.zip$' } | Sort-Object Name -Descending | Select-Object -First 1
    if (!$backup) { throw 'No verified engine backup is available yet; leave Kantin Server running for at least ten minutes' }
    $backupAt = [DateTime]::SpecifyKind([DateTime]::ParseExact($backup.Name.Substring(7,15),'yyyyMMdd-HHmmss',[Globalization.CultureInfo]::InvariantCulture),[DateTimeKind]::Utc)
    if ($backupAt -lt [DateTime]::UtcNow.AddHours(-2) -or $backupAt -gt [DateTime]::UtcNow.AddMinutes(5)) { throw 'Latest backup is stale or the PC clock is incorrect; no upload performed' }
    New-Item -ItemType Directory -Path $work | Out-Null
    $java = Join-Path $pos 'runtime\bin\java.exe'
    $cp = (Join-Path $root 'kantin-reporting.jar') + ';' + (Join-Path $pos 'tools\kantin-maintenance.jar') + ';' + (Join-Path $pos 'Kantin Server.jar')
    function Export-Backup([string]$Mode) {
        $stage = Join-Path $work ('snapshot-' + $Mode)
        $output = Join-Path $work ($Mode + '.json')
        # Standard authenticated Derby driver from this installation. No auth patch.
        & $java '-Djava.awt.headless=true' "-Dderby.stream.error.file=$work\derby.log" -cp $cp KantinReportExport $Mode $backup.FullName $stage $output | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Backup export failed; no upload performed' }
        return Get-Content -LiteralPath $output -Raw | ConvertFrom-Json
    }
    $metadata = @(Export-Backup 'metadata')[-1]
    if (!$policy.instanceId) {
        if ($policy.firstTradingLocal) { throw 'Cannot establish a pre-launch baseline after activation' }
        $registration = @{mode='register';instanceId=$metadata.instanceId;receiptBaseline=$metadata.receiptBaseline} | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Uri $config.apiUrl -Method Post -Headers $headers -Body ([Text.Encoding]::UTF8.GetBytes($registration)) -ContentType 'application/json' -MaximumRedirection 0 -TimeoutSec 60
        if (!$response.ok) { throw 'Registration failed' }
        Log 'Pre-launch receipt boundary registered. QA history remains excluded.'
        $policy = Invoke-RestMethod -Uri $config.apiUrl -Headers $headers -MaximumRedirection 0 -TimeoutSec 60
    }
    if ($metadata.instanceId -ne $policy.instanceId) { throw 'POS identity differs from registered Kashmir installation; no upload performed' }
    if (!$policy.firstTradingLocal) {
        Log 'WAITING: first real trading date not confirmed. No sales uploaded.'
        Write-Output 'Kashmir connected. Waiting for go-live; no sales uploaded.'
    } elseif ($policy.lastBackupAt -and $backupAt -le [DateTime]::Parse($policy.lastBackupAt).ToUniversalTime()) {
        Log 'No newer engine backup; no duplicate upload.'
    } else {
        $tables = @(Export-Backup 'snapshot')[-1]
        $payload = @{mode='snapshot';instanceId=$metadata.instanceId;backupAt=$backupAt.ToString('yyyy-MM-ddTHH:mm:ssZ');firstTradingLocal=$policy.firstTradingLocal;tables=$tables} | ConvertTo-Json -Depth 8 -Compress
        $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
        if ($bytes.Length -gt 32MB) { throw 'Snapshot is too large; no upload performed' }
        $response = Invoke-RestMethod -Uri $config.apiUrl -Method Post -Headers $headers -Body $bytes -ContentType 'application/json' -MaximumRedirection 0 -TimeoutSec 180
        if (!$response.ok) { throw 'Portal did not confirm snapshot' }
        Log ('OK: ' + $response.rows + ' eligible reporting rows; backup ' + $backupAt.ToString('o'))
        Write-Output 'Kashmir reporting sync completed.'
    }
} catch {
    # Avoid logging request bodies, tokens, database credentials or raw HTTP errors.
    Log ('ERROR: sync did not complete (' + $_.Exception.GetType().Name + '). Existing portal data and POS are unchanged.')
    Write-Error 'Kashmir sync did not complete. Check connectivity, latest backup, identity and go-live configuration.'
    exit 1
} finally {
    try { Clean-Work } finally { if ($lock) { $lock.Dispose() } }
    $token = $null; $headers = $null
}
