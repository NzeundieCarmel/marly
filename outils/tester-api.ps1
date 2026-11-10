# Tests automatiques de l'API Marly
# Lancement : powershell -ExecutionPolicy Bypass -File .\outils\tester-api.ps1

$ErrorActionPreference = "Stop"
$api = "http://127.0.0.1:4001/api/v1"

function Test-Marly($nom, [scriptblock]$action, $attendu) {
    try {
        $obtenu = & $action
    } catch {
        if ($_.Exception.Response) {
            $obtenu = [int]$_.Exception.Response.StatusCode
        } else {
            $obtenu = "injoignable"
        }
    }
    $ok = "$obtenu" -eq "$attendu"
    [pscustomobject]@{
        Test     = $nom
        Attendu  = $attendu
        Obtenu   = $obtenu
        Resultat = $(if ($ok) { "OK" } else { "ECHEC" })
    }
}

function Get-JetonMarly($email) {
    $corps = @{ email = $email; motDePasse = "Marly2026!" } | ConvertTo-Json
    (Invoke-RestMethod -Method Post -Uri "$api/auth/connexion" -ContentType "application/json" -Body $corps).jeton
}

# Preparation : sans ces donnees, les tests suivants n'auraient aucun sens
try {
    $enteteMarc = @{ Authorization = "Bearer $(Get-JetonMarly 'marc@exemple.cm')" }
    $entetePaul = @{ Authorization = "Bearer $(Get-JetonMarly 'essomba@exemple.cm')" }
    $dossiersMarc = Invoke-RestMethod -Uri "$api/dossiers" -Headers $enteteMarc
    $dossiersPaul = Invoke-RestMethod -Uri "$api/dossiers" -Headers $entetePaul
} catch {
    Write-Host "Preparation impossible : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifie que l'API tourne (fenetre 2) et que les donnees de demo existent (npx.cmd prisma db seed)." -ForegroundColor Red
    exit 1
}

$autre = $dossiersMarc | Where-Object { $_.raisonSociale -eq "Agence Wouri Services" }
$sienPaul = $dossiersPaul | Where-Object { $_.raisonSociale -eq "Quincaillerie Essomba" }
if (-not $autre -or -not $sienPaul) {
    Write-Host "Dossiers de demo introuvables. Lance d'abord : npx.cmd prisma db seed (dans apps\api)." -ForegroundColor Red
    exit 1
}

$resultats = @(
    Test-Marly "Sante publique" { (Invoke-RestMethod "$api/sante").api } "ok"
    Test-Marly "Dossiers sans jeton refuses" { Invoke-RestMethod "$api/dossiers" | Out-Null; 200 } 401
    Test-Marly "Faux jeton refuse" { Invoke-RestMethod "$api/dossiers" -Headers @{ Authorization = "Bearer faux.jeton.marly" } | Out-Null; 200 } 401
    Test-Marly "Mauvais mot de passe refuse" {
        $corps = @{ email = "marc@exemple.cm"; motDePasse = "mauvais-mdp" } | ConvertTo-Json
        Invoke-RestMethod -Method Post -Uri "$api/auth/connexion" -ContentType "application/json" -Body $corps | Out-Null; 200
    } 401
    Test-Marly "Marc voit 5 dossiers" { $dossiersMarc.Count } 5
    Test-Marly "Marc lit les pieces de l'Agence" { $p = Invoke-RestMethod "$api/dossiers/$($autre.id)/pieces" -Headers $enteteMarc; $p.Count } 3
    Test-Marly "Paul voit 1 dossier" { $dossiersPaul.Count } 1
    Test-Marly "Paul lit ses propres pieces" { $p = Invoke-RestMethod "$api/dossiers/$($sienPaul.id)/pieces" -Headers $entetePaul; $p.Count } 4
    Test-Marly "Paul bloque sur l'Agence" { Invoke-RestMethod "$api/dossiers/$($autre.id)/pieces" -Headers $entetePaul | Out-Null; 200 } 404
)

$resultats | Format-Table -AutoSize

$echecs = @($resultats | Where-Object { $_.Resultat -eq "ECHEC" }).Count
if ($echecs -eq 0) {
    Write-Host "Tous les tests sont OK." -ForegroundColor Green
} else {
    Write-Host "$echecs test(s) en echec." -ForegroundColor Red
    exit 1
}