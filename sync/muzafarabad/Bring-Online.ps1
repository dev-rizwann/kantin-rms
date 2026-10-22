[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Launch-Common.ps1')
Initialize-Launch
. (Join-Path $PSScriptRoot 'Common.ps1')
. (Join-Path $PSScriptRoot 'Repair-Lifecycle.ps1')
$evidence=Get-Content -LiteralPath (Join-Path $Pos '.kantin\muzafarabad-cleanup.json') -Raw|ConvertFrom-Json
if($evidence.version -ne 1 -or $evidence.kantinSlug -ne 'kashmir' -or $evidence.computerName -ne $env:COMPUTERNAME){throw 'Run step 1 on this Muzafarabad POS first'}
$null=[guid]::Parse($evidence.instanceId);$null=[guid]::Parse($evidence.cleanupId)
$policy=Get-LaunchPolicy
if($policy.instanceId -and $policy.instanceId -ne $evidence.instanceId){throw 'Portal is bound to a different installation; nothing changed'}
Suspend-Reporting
$lock=$null
try {
    $lock=[IO.File]::Open((Join-Path $Sync 'sync.lock'),'OpenOrCreate','ReadWrite','None')
    # Fresh engine backup, online if running. Never copy a live Derby directory.
    $servers=@(Get-KantinRepairProcesses $Pos|Where-Object Role -eq 'Server')
    if($servers.Count){
        $backup=Get-KantinRepairOnlineBackup $Pos $servers[0]
        Invoke-KantinJava $Pos 'KantinMaintenance' @('verify',$backup)
    }else{
        Push-Location $Pos
        try {Invoke-KantinJava $Pos 'KantinMaintenance' @('backup')} finally {Pop-Location}
    }
    $saved=Join-Path $Sync ('previous-launch-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $saved|Out-Null
    foreach($n in 'config.json','Sync-Kashmir.ps1','Sync-Muzafarabad.ps1','kantin-reporting.jar','token.dpapi'){
        $f=Join-Path $Sync $n;if(Test-Path -LiteralPath $f){Copy-Item -LiteralPath $f -Destination $saved}
    }
    foreach($n in 'Sync-Muzafarabad.ps1','kantin-reporting.jar'){
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $n) -Destination (Join-Path $Sync $n) -Force
        if((Get-FileHash -LiteralPath (Join-Path $PSScriptRoot $n)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $Sync $n)).Hash){throw 'Installed sync file hash mismatch'}
    }
    @{apiUrl=$Provision.apiUrl;posRoot=$Pos;instanceId=$evidence.instanceId;cleanupId=$evidence.cleanupId;version=3}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $Sync 'config.json') -Encoding UTF8
    ConvertTo-SecureString $Provision.launchPermit -AsPlainText -Force|ConvertFrom-SecureString|Set-Content -LiteralPath (Join-Path $Sync 'launch.dpapi') -Encoding ASCII
    $user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
    $exe=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $action=New-ScheduledTaskAction -Execute $exe -WorkingDirectory $Sync -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+(Join-Path $Sync 'Sync-Muzafarabad.ps1')+'"')
    $triggers=@(0..23|ForEach-Object {New-ScheduledTaskTrigger -Daily -At ('{0:D2}:00' -f $_)})
    $triggers+=New-ScheduledTaskTrigger -AtLogOn -User $user
    $principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
    $settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -Disable
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'MUZAFARABAD (AJK): verified reporting hourly and at login; bound to this clean launch.' -Force|Out-Null
} finally {if($lock){$lock.Dispose()}}
# Do not claim installation success until HTTPS registration/activation has actually succeeded.
& (Join-Path $Sync 'Sync-Muzafarabad.ps1') -SyncRoot $Sync -Launch
$status=Get-Content -LiteralPath (Join-Path $Sync 'status.json') -Raw|ConvertFrom-Json
if(!$status.ok -or $status.stage -ne 'active' -or $status.instanceId -ne $evidence.instanceId){throw 'Portal confirmation missing. Do not start trading yet.'}
Enable-ScheduledTask -TaskName $TaskName|Out-Null
$started=Get-Date
Start-ScheduledTask -TaskName $TaskName
$complete=$false
for($i=0;$i -lt 90;$i++){
    Start-Sleep -Seconds 2
    $info=Get-ScheduledTaskInfo -TaskName $TaskName
    if($info.LastRunTime -ge $started.AddSeconds(-1) -and (Get-ScheduledTask -TaskName $TaskName).State -ne 'Running'){
        if($info.LastTaskResult -ne 0){throw "Scheduled reporting failed (code $($info.LastTaskResult)). Run step 2 again after checking the logs."}
        $complete=$true;break
    }
}
if(!$complete){throw 'Scheduled reporting verification timed out. The task remains installed; check status before trading.'}
$status=Get-Content -LiteralPath (Join-Path $Sync 'status.json') -Raw|ConvertFrom-Json
if(!$status.ok -or $status.stage -ne 'active' -or [DateTime]::Parse($status.checkedUtc).ToUniversalTime() -lt $started.ToUniversalTime()){throw 'Scheduled task did not produce a fresh successful confirmation'}
Write-Host 'SUCCESS: MUZAFARABAD (AJK) is active on https://kantin.iespl.org/kashmir'
Write-Host 'Initial sync AND the scheduled task were verified. Hourly and login sync are enabled.'
Write-Host 'You can now unlock the POS normally and begin real trading. Receipt counters were deliberately not reset.'
Write-Host 'Keep this package private. It contains a Muzafarabad-only credential and a short-lived launch permit.'
