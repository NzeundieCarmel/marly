# Lance toutes les series de tests de l'API Marly
# Le mot de passe de demo de Marc est lu dans la variable MARLY_MDP_MARC

$ici = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $env:MARLY_MDP_MARC) {
  Write-Host "Variable MARLY_MDP_MARC absente : enregistre d'abord le mot de passe de demo de Marc." -ForegroundColor Red
  exit 2
}

powershell -ExecutionPolicy Bypass -File (Join-Path $ici "tester-api.ps1")
$codeApi = $LASTEXITCODE

powershell -ExecutionPolicy Bypass -File (Join-Path $ici "tester-sprints-4-5.ps1")
$codeSprints = $LASTEXITCODE

if ($codeApi -ne 0 -or $codeSprints -ne 0) {
  Write-Host "Au moins une serie de tests a echoue." -ForegroundColor Red
  exit 1
}
Write-Host "Toutes les series de tests sont OK." -ForegroundColor Green