$ErrorActionPreference='Stop'
$base='E:\MutfakPos\recovery\runs\muzafarabad-launch-qa-20261022'
$fixture=Get-ChildItem -LiteralPath $base -Directory -Filter 'agent-*'|Where-Object {Test-Path -LiteralPath (Join-Path $_.FullName 'qa-policy.json')}|Select-Object -Last 1
if(!$fixture){throw 'Run Test-Agent first'}
$name='Kantin-Muzafarabad-QA-'+[guid]::NewGuid().ToString('N')
$description='Disposable mocked-network Muzafarabad scheduler test'
$user=[Security.Principal.WindowsIdentity]::GetCurrent().Name
$exe=Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$action=New-ScheduledTaskAction -Execute $exe -WorkingDirectory $fixture.FullName -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "'+$PSScriptRoot+'\Test-Scheduled.ps1" -Fixture "'+$fixture.FullName+'"')
$principal=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -Disable
$registered=$false
try {
    Register-ScheduledTask -TaskName $name -Action $action -Principal $principal -Settings $settings -Description $description|Out-Null
    $registered=$true
    Enable-ScheduledTask -TaskName $name|Out-Null
    $start=Get-Date;Start-ScheduledTask -TaskName $name
    $done=$false
    for($i=0;$i -lt 90;$i++){
        Start-Sleep -Seconds 2
        $info=Get-ScheduledTaskInfo -TaskName $name
        if($info.LastRunTime -ge $start.AddSeconds(-1) -and (Get-ScheduledTask -TaskName $name).State -ne 'Running'){
            if($info.LastTaskResult -ne 0){throw "Task failed: $($info.LastTaskResult)"};$done=$true;break
        }
    }
    if(!$done){throw 'Scheduled run timed out'}
    $status=Get-Content -LiteralPath (Join-Path $fixture.FullName 'status.json') -Raw|ConvertFrom-Json
    if(!$status.ok -or $status.stage -ne 'active' -or [DateTime]::Parse($status.checkedUtc).ToUniversalTime() -lt $start.ToUniversalTime()){throw 'No fresh successful status'}
    Write-Host 'PASS actual Windows scheduled task: absolute PowerShell path, working directory, current-user DPAPI, fresh status, exit 0. Network mocked; no POS task touched.'
} finally {
    if($registered){
        $task=Get-ScheduledTask -TaskName $name
        if($task.Description -ne $description -or $task.Actions[0].WorkingDirectory -ne $fixture.FullName){throw 'QA task identity changed; cleanup refused'}
        Stop-ScheduledTask -TaskName $name
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
}
