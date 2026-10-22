Set-StrictMode -Version 2
$ErrorActionPreference='Stop'
$script:TaskName='Kantin-Kashmir-Reporting'
function Assert-LaunchPath([string]$Path){
    $p=[IO.Path]::GetFullPath($Path)
    if($p -eq [IO.Path]::GetPathRoot($p)){throw 'Dedicated directory required'}
    while($p){
        if((Test-Path -LiteralPath $p) -and ((Get-Item -LiteralPath $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Linked path is prohibited'}
        $p=[IO.Path]::GetDirectoryName($p)
    }
}
function Initialize-Launch {
    Assert-LaunchPath $PSScriptRoot
    $manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'launch-manifest.json') -Raw|ConvertFrom-Json
    $required=@('1 - Clear Test Sales.cmd','2 - Bring Muzafarabad Online.cmd','Clear-Test-Sales.ps1','Bring-Online.ps1','Launch-Common.ps1','Sync-Muzafarabad.ps1','Repair-Lifecycle.ps1','Common.ps1','kantin-cleanup.jar','kantin-reporting.jar','provisioning.json','README.txt')
    if($manifest.product -ne 'Muzafarabad launch' -or $manifest.files.Count -ne $required.Count){throw 'Wrong launch package'}
    foreach($name in $required){
        $entries=@($manifest.files|Where-Object path -CEQ $name)
        if($entries.Count -ne 1){throw 'Incomplete package manifest'}
        $file=Join-Path $PSScriptRoot $name;Assert-LaunchPath $file
        if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ne $entries[0].sha256){throw "Package verification failed: $name"}
    }
    $script:Provision=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'provisioning.json') -Raw|ConvertFrom-Json
    if($Provision.kantinSlug -ne 'kashmir' -or $Provision.apiUrl -ne 'https://kantin.iespl.org/api/sync/kashmir' -or $Provision.token.Length -lt 32 -or $Provision.expectedUser -ne 'Lenovo'){throw 'Wrong location provisioning'}
    if($env:USERNAME -ne $Provision.expectedUser){throw 'This package is only for the Lenovo Windows account on the Muzafarabad POS. Do not run on H-8 or another computer.'}
    $script:Pos=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'KantinPOS-Clean'))
    $script:Sync=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'KantinReportingKashmir'))
    Assert-LaunchPath $Pos;Assert-LaunchPath $Sync
    if(!(Test-Path -LiteralPath (Join-Path $Pos '.kantin\setup-complete.txt'))){throw 'Expected Muzafarabad Kantin installation missing'}
    # Existing location-scoped provisioning must match before any deletion.
    $existing=Get-Content -LiteralPath (Join-Path $Sync 'config.json') -Raw|ConvertFrom-Json
    if($existing.apiUrl -ne $Provision.apiUrl -or [IO.Path]::GetFullPath($existing.posRoot) -ne $Pos){throw 'Existing reporting location or POS path does not match Muzafarabad'}
    $secure=(Get-Content -LiteralPath (Join-Path $Sync 'token.dpapi') -Raw).Trim()|ConvertTo-SecureString
    $old=[Net.NetworkCredential]::new('',$secure).Password
    if($old -cne $Provision.token){throw 'Muzafarabad credential mismatch; cleanup refused'}
    $old=$null
    if((Get-TimeZone).Id -ne 'Pakistan Standard Time'){throw 'Set Windows time zone to Islamabad/Karachi (Pakistan Standard Time) before continuing.'}
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    $script:Headers=@{Authorization='Bearer '+$Provision.token}
}
function Get-LaunchPolicy {
    $p=Invoke-RestMethod -Uri $Provision.apiUrl -Headers $Headers -TimeoutSec 60 -MaximumRedirection 0
    if(!$p.ok -or $p.protocol -ne 2 -or $p.kantinSlug -ne 'kashmir'){throw 'Portal policy verification failed'}
    return $p
}
function Suspend-Reporting {
    $task=Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if($task){
        Disable-ScheduledTask -TaskName $TaskName|Out-Null
        # Let a current backup export finish instead of killing an embedded DB reader.
        for($i=0;$i -lt 90;$i++){
            if((Get-ScheduledTask -TaskName $TaskName).State -ne 'Running'){return}
            Start-Sleep -Seconds 2
        }
        throw 'Reporting task is still running. Nothing will be cleared; wait and retry.'
    }
}
function Invoke-LaunchJava([string]$Main,[string[]]$JavaArguments){
    $cp=(Join-Path $PSScriptRoot 'kantin-cleanup.jar')+';'+(Join-Path $PSScriptRoot 'kantin-reporting.jar')+';'+(Join-Path $Pos 'tools\kantin-maintenance.jar')+';'+(Join-Path $Pos 'Kantin Server.jar')
    & (Join-Path $Pos 'runtime\bin\java.exe') '-Djava.awt.headless=true' "-Dderby.stream.error.file=$Pos\logs\launch-derby.log" -cp $cp $Main @JavaArguments
    if($LASTEXITCODE -ne 0){throw "Maintenance failed ($Main, exit $LASTEXITCODE). Keep the backup and contact support."}
}
