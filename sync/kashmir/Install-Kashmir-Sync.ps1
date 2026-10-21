[CmdletBinding()]
param([string]$PosRoot = (Join-Path $env:LOCALAPPDATA 'KantinPOS-Clean'), [string]$Destination = (Join-Path $env:LOCALAPPDATA 'KantinReportingKashmir'))
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath (Join-Path $PosRoot '.kantin\setup-complete.txt'))) { throw 'Kantin POS installation not found. Specify -PosRoot with its actual folder.' }
$provision = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'provisioning.json') -Raw | ConvertFrom-Json
if ($provision.apiUrl -ne 'https://kantin.iespl.org/api/sync/kashmir' -or $provision.token.Length -lt 32) { throw 'Invalid Kashmir provisioning file' }
$destinationPath = [IO.Path]::GetFullPath($Destination)
if ($destinationPath -eq [IO.Path]::GetPathRoot($destinationPath)) { throw 'A dedicated installation folder is required' }
New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
if ((Get-Item -LiteralPath $destinationPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked destination not allowed' }
foreach ($name in 'Sync-Kashmir.ps1','kantin-reporting.jar') { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path $destinationPath $name) -Force }
@{apiUrl=$provision.apiUrl;posRoot=[IO.Path]::GetFullPath($PosRoot)} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destinationPath 'config.json') -Encoding UTF8
ConvertTo-SecureString $provision.token -AsPlainText -Force | ConvertFrom-SecureString | Set-Content -LiteralPath (Join-Path $destinationPath 'token.dpapi') -Encoding ASCII
$name = 'Kantin-Kashmir-Reporting'
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + (Join-Path $destinationPath 'Sync-Kashmir.ps1') + '"')
$triggers = @(0..23 | ForEach-Object { New-ScheduledTaskTrigger -Daily -At ('{0:D2}:00' -f $_) })
$triggers += New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName $name -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'Kashmir reporting: verified backup to Kantin portal, hourly while POS user is logged in; pre-launch receipts excluded.' -Force | Out-Null
# Only the task just installed is started. Cashier/Supervisor/Server are not stopped.
Start-ScheduledTask -TaskName $name
Write-Output 'Kashmir automatic reporting task installed. It runs hourly and at login.'
Write-Output 'Sales remain blocked until the portal go-live date is confirmed.'
Write-Output 'Keep this package private: provisioning.json contains a location-scoped credential.'
