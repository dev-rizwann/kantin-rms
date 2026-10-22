param([string]$Fixture)
$ErrorActionPreference='Stop'
$base='E:\MutfakPos\recovery\runs\muzafarabad-launch-qa-20261022'
if([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($Fixture)) -ne $base -or [IO.Path]::GetFileName($Fixture) -notmatch '^agent-[a-f0-9]{32}$'){throw 'Synthetic QA directory required'}
function Invoke-RestMethod {
    param($Uri,$Headers,$MaximumRedirection,$TimeoutSec,$Method,$Body,$ContentType)
    if($Uri -ne 'https://kantin.iespl.org/api/sync/kashmir' -or $Method){throw 'Only mocked, read-only, no-network verification allowed'}
    return Get-Content -LiteralPath (Join-Path $Fixture 'qa-policy.json') -Raw|ConvertFrom-Json
}
& (Join-Path $Fixture 'Sync-Muzafarabad.ps1') -SyncRoot $Fixture
