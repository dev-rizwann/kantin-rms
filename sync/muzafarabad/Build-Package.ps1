[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Output,[Parameter(Mandatory=$true)][string]$ProvisionFile)
$ErrorActionPreference='Stop'
$base='E:\MutfakPos'
$reference=Join-Path $base 'recovery\releases\20261021-03\Kantin POS'
$jdk=Join-Path $base 'recovery\tools\jdk-17.0.20.1+1\bin'
$out=[IO.Path]::GetFullPath($Output)
if(Test-Path -LiteralPath $out){throw 'Fresh build output required'}
$classes=Join-Path $out 'classes';$package=Join-Path $out 'Muzafarabad - Start Trading'
New-Item -ItemType Directory -Path $classes,$package|Out-Null
$cp="$reference\tools\kantin-maintenance.jar;$reference\Kantin Server.jar"
& "$jdk\javac.exe" --release 8 -cp $cp -d $classes (Join-Path $PSScriptRoot 'KantinClearTestSales.java') (Join-Path $base 'dashboard\sync\kashmir\KantinReportExport.java')
if($LASTEXITCODE){throw 'Java compilation failed'}
& "$jdk\jar.exe" cf (Join-Path $package 'kantin-cleanup.jar') -C $classes KantinClearTestSales.class
if($LASTEXITCODE){throw 'Cleanup packaging failed'}
& "$jdk\jar.exe" cf (Join-Path $package 'kantin-reporting.jar') -C $classes KantinReportExport.class
if($LASTEXITCODE){throw 'Collector packaging failed'}
foreach($n in '1 - Clear Test Sales.cmd','2 - Bring Muzafarabad Online.cmd','Clear-Test-Sales.ps1','Bring-Online.ps1','Launch-Common.ps1','Sync-Muzafarabad.ps1','README.txt'){
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $n) -Destination $package
}
Copy-Item -LiteralPath (Join-Path $base 'recovery\standalone\repair\Repair-Lifecycle.ps1') -Destination $package
Copy-Item -LiteralPath (Join-Path $reference 'Common.ps1') -Destination $package
Copy-Item -LiteralPath $ProvisionFile -Destination (Join-Path $package 'provisioning.json')
$files=@(Get-ChildItem -LiteralPath $package -File|Sort-Object Name|ForEach-Object {@{path=$_.Name;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}})
@{product='Muzafarabad launch';version=1;files=$files}|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $package 'launch-manifest.json') -Encoding UTF8
$errors=@();Get-ChildItem -LiteralPath $package -Filter '*.ps1'|ForEach-Object {
    $tokens=$null;$parse=$null;$null=[Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$tokens,[ref]$parse);$errors+=@($parse)
}
if($errors.Count){throw 'PowerShell parser errors'}
$zip=Join-Path $out 'Muzafarabad-Start-Trading-20261022.zip'
Compress-Archive -LiteralPath $package -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Verified source package built: $zip"
Write-Host ('SHA256 '+(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash)
