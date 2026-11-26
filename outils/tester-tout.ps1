# Lance toutes les series de tests de l'API Marly
# Le mot de passe de demo de Marc est lu dans la variable MARLY_MDP_MARC

$ici = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $env:MARLY_MDP_MARC) {
  Write-Host "Variable MARLY_MDP_MARC absente : enregistre d'abord le mot de passe de demo de Marc." -ForegroundColor Red
  exit 2
}

$codes = @()
foreach ($script in @("tester-api.ps1", "tester-sprints-4-5.ps1", "tester-sprint-6.ps1")) {
  powershell -ExecutionPolicy Bypass -File (Join-Path $ici $script)
  $codes += $LASTEXITCODE
}

if (@($codes | Where-Object { $_ -ne 0 }).Count -gt 0) {
  Write-Host "Au moins une serie de tests a echoue." -ForegroundColor Red
  exit 1
}
Write-Host "Toutes les series de tests sont OK." -ForegroundColor Green