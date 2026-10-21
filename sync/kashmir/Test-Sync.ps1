$ErrorActionPreference = 'Stop'
$run = 'E:\MutfakPos\recovery\runs\kashmir-sync-20261021-01'
$reference = 'E:\MutfakPos\recovery\releases\20261020-04\Kantin Clean Install\Kantin POS'
$fixture = Get-ChildItem -LiteralPath $run -Directory -Filter 'snapshot-synthetic-fixture-*' | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'backups') } | Select-Object -First 1
if (!$fixture) { throw 'Synthetic fixture not found' }
$pos = $fixture.FullName
foreach ($name in 'runtime','tools','Kantin Server.jar') {
    if (!(Test-Path -LiteralPath (Join-Path $pos $name))) { Copy-Item -LiteralPath (Join-Path $reference $name) -Destination (Join-Path $pos $name) -Recurse }
}
$root = Join-Path $run ('agent-qa-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
Copy-Item -LiteralPath (Join-Path $run 'package\kantin-reporting.jar') -Destination $root
@{apiUrl='https://kantin.iespl.org/api/sync/kashmir';posRoot=$pos} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'config.json') -Encoding UTF8
ConvertTo-SecureString ('local-test-only-' + [guid]::NewGuid()) -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $root 'token.dpapi')
$global:qaPolicy = @{ok=$true;protocol=2;kantinSlug='kashmir';instanceId=$null;receiptBaseline=$null;firstTradingLocal=$null;lastBackupAt=$null}
$global:qaRegistrations = 0
$global:qaUploads = 0
# Reveal local fixture exceptions only. No real credential or HTTP response exists here.
function Write-Error { param($Message) throw $global:Error[0] }
# Mock network at the PowerShell function boundary; no external HTTP is made.
function Invoke-RestMethod {
    param($Uri,$Headers,$MaximumRedirection,$TimeoutSec,$Method,$Body,$ContentType)
    if ($Uri -ne 'https://kantin.iespl.org/api/sync/kashmir') { throw 'Unexpected destination' }
    if (!$Method) { return [pscustomobject]$global:qaPolicy }
    $bodyObject = [Text.Encoding]::UTF8.GetString($Body) | ConvertFrom-Json
    if ($bodyObject.mode -eq 'register') {
        $global:qaRegistrations++
        $global:qaPolicy.instanceId = $bodyObject.instanceId
        $global:qaPolicy.receiptBaseline = $bodyObject.receiptBaseline
        return @{ok=$true}
    }
    if (!$global:qaPolicy.firstTradingLocal) { throw 'Sales upload while pending' }
    if ($bodyObject.tables.PAYMENT.Count -ne 4 -or $bodyObject.tables.REFUND.Count -ne 1) { throw 'Incomplete export' }
    if ($bodyObject.tables.STAFF[0].PSObject.Properties.Name -contains 'password') { throw 'Password leaked' }
    $global:qaUploads++
    $global:qaPolicy.lastBackupAt = $bodyObject.backupAt
    return @{ok=$true;rows=1}
}
& "$PSScriptRoot\Sync-Kashmir.ps1" -SyncRoot $root
if ($global:qaRegistrations -ne 1 -or $global:qaUploads -ne 0) { throw 'Pending registration behavior failed' }
& "$PSScriptRoot\Sync-Kashmir.ps1" -SyncRoot $root
if ($global:qaRegistrations -ne 1 -or $global:qaUploads -ne 0) { throw 'Pending retry moved baseline or uploaded' }
$global:qaPolicy.firstTradingLocal = '2026-10-22T00:00:00'
& "$PSScriptRoot\Sync-Kashmir.ps1" -SyncRoot $root
& "$PSScriptRoot\Sync-Kashmir.ps1" -SyncRoot $root
if ($global:qaRegistrations -ne 1 -or $global:qaUploads -ne 1) { throw 'Upload or duplicate suppression failed' }
if (@(Get-ChildItem -LiteralPath (Join-Path $root 'work') -Force).Count -ne 0) { throw 'Staging cleanup failed' }
Write-Output 'PASS: Windows PowerShell 5 agent registration, pending lock, encrypted token, snapshot serialization, duplicate suppression and staging cleanup. Network mocked; live POS untouched.'
