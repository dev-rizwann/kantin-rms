param([string]$Output = 'E:\MutfakPos\recovery\runs\kashmir-sync-20261021-01')
$ErrorActionPreference = 'Stop'
$jdk = 'E:\MutfakPos\recovery\tools\jdk-17.0.20.1+1\bin'
$pos = 'E:\MutfakPos\recovery\releases\20261020-04\Kantin Clean Install\Kantin POS'
New-Item -ItemType Directory -Path "$Output\classes","$Output\package" -Force | Out-Null
& "$jdk\javac.exe" --release 8 -cp "$pos\tools\kantin-maintenance.jar;$pos\Kantin Server.jar" -d "$Output\classes" "$PSScriptRoot\KantinReportExport.java"
if ($LASTEXITCODE) { throw 'Collector compilation failed' }
& "$jdk\jar.exe" cf "$Output\package\kantin-reporting.jar" -C "$Output\classes" KantinReportExport.class
if ($LASTEXITCODE) { throw 'Collector packaging failed' }
foreach ($name in 'Sync-Kashmir.ps1','Install-Kashmir-Sync.ps1','Install Kashmir Sync.cmd','INSTALL.txt') { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination (Join-Path "$Output\package" $name) -Force }
Write-Output "Collector/package prepared at $Output (no credentials included yet)."
