[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Launch-Common.ps1')
Initialize-Launch
. (Join-Path $PSScriptRoot 'Common.ps1')
. (Join-Path $PSScriptRoot 'Repair-Lifecycle.ps1')
$evidence=Join-Path $Pos '.kantin\muzafarabad-cleanup.json'
if(Test-Path -LiteralPath $evidence){Write-Host 'Cleanup was already recorded. No sales deleted again. Run step 2 to verify/repair reporting.';return}
$policy=Get-LaunchPolicy
if($policy.firstTradingLocal){throw 'Muzafarabad reporting is already live. Cleanup is prohibited.'}
Assert-Package $Pos
Write-Host 'MUZAFARABAD (AJK) ONLY. This removes ALL existing sales, unpaid orders, refunds, payments, payouts and shifts.'
Write-Host 'Menus, prices, staff/PINs, printers, stock setup and settings remain unchanged.'
Write-Host 'The apps will close automatically after a verified backup, then reopen. Do not reopen them during cleanup.'
if((Read-Host 'Type CLEAR MUZAFARABAD TEST SALES to continue') -cne 'CLEAR MUZAFARABAD TEST SALES'){throw 'Cancelled. No sales cleared.'}
$lock=$null;$syncLock=$null;$processes=@();$stopping=$false
try {
    Suspend-Reporting
    $syncLock=[IO.File]::Open((Join-Path $Sync 'sync.lock'),'OpenOrCreate','ReadWrite','None')
    $lock=[IO.File]::Open((Join-Path $Pos '.kantin\repair.lock'),'OpenOrCreate','ReadWrite','None')
    $processes=@(Get-KantinRepairProcesses $Pos)
    $server=@($processes|Where-Object Role -eq 'Server')
    if($server.Count){
        $archive=Get-KantinRepairOnlineBackup $Pos $server[0]
        Invoke-KantinJava $Pos 'KantinMaintenance' @('verify',$archive)
    }
    # Recheck policy immediately before closing apps; never clean an active outlet.
    if((Get-LaunchPolicy).firstTradingLocal){throw 'Reporting became live; cleanup refused'}
    $stopping=$true;Stop-KantinRepairProcesses $Pos $processes
    Invoke-LaunchJava 'KantinClearTestSales' @($Pos,$env:COMPUTERNAME)
    Write-Host 'TEST SALES CLEARED AND VERIFIED. Backups are in the POS backups folder.'
    Write-Host 'Next run: 2 - Bring Muzafarabad Online.cmd. Do not begin real sales before step 2 succeeds.'
} finally {
    try {if($stopping){Restart-KantinRepairProcesses $Pos $processes}}
    finally {if($lock){$lock.Dispose()};if($syncLock){$syncLock.Dispose()}}
    # Keep the old reporting task disabled until step 2 installs the identity-bound worker.
}
