# Tests automatiques de l'API Marly
# Lancement : powershell -ExecutionPolicy Bypass -File .\outils\tester-api.ps1
# Attention : le script remet les donnees de demonstration a zero (au debut et a la fin).
# PowerShell 5.1 : une connexion neuve a chaque appel (evite "connexion sous-jacente fermee")
$PSDefaultParameterValues['Invoke-RestMethod:DisableKeepAlive'] = $true
$PSDefaultParameterValues['Invoke-WebRequest:DisableKeepAlive'] = $true
$api = "http://127.0.0.1:4001/api/v1"
$racine = Split-Path -Parent $PSScriptRoot

function Reset-DonneesDemo {
    Push-Location (Join-Path $racine "apps\api")
    npx.cmd prisma db seed | Out-Null
    $code = $LASTEXITCODE
    Remove-Item -Recurse -Force .\uploads -ErrorAction SilentlyContinue
    Pop-Location
    return $code
}

# 0. Donnees de demonstration propres
Write-Host "Remise a zero des donnees de demo..." -ForegroundColor Cyan
if ((Reset-DonneesDemo) -ne 0) {
    Write-Host "Le seed a echoue. Verifie que la base Docker tourne (docker compose up -d)." -ForegroundColor Red
    exit 1
}

# Fichiers de test (vraie signature PNG, contenus differents pour eviter les doublons)
$dossierTest = Join-Path $env:TEMP "marly-tests-auto"
New-Item -ItemType Directory -Force $dossierTest | Out-Null
$entetePng = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
[IO.File]::WriteAllBytes("$dossierTest\releve.png", $entetePng + [byte[]](1, 1, 1))
[IO.File]::WriteAllBytes("$dossierTest\taxi.png", $entetePng + [byte[]](2, 2, 2))
[IO.File]::WriteAllBytes("$dossierTest\autre.png", $entetePng + [byte[]](3, 3, 3))

$ErrorActionPreference = "Stop"

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

function Send-JsonMarly($uri, $entete, $objet) {
    $octets = [Text.Encoding]::UTF8.GetBytes(($objet | ConvertTo-Json -Depth 6))
    Invoke-RestMethod -Method Post -Uri $uri -Headers $entete -ContentType "application/json; charset=utf-8" -Body $octets
}

function Send-PieceMarly($entete, $dossierId, $fichier, $demandeId) {
    $options = @("-s", "-o", "NUL", "-w", "%{http_code}",
        "-H", "Authorization: $($entete.Authorization)",
        "-F", "date=2026-11-10", "-F", "montantTtc=5000", "-F", "categorie=Autre",
        "-F", "fichier=@$fichier")
    if ($demandeId) { $options += @("-F", "demandeId=$demandeId") }
    & curl.exe @options "$api/dossiers/$dossierId/pieces"
}

function ConvertTo-CorpsValidation($detail) {
    @{
        journal = $detail.ecriture.journal
        lignes  = @($detail.ecriture.lignes | ForEach-Object {
            @{ compte = $_.compte; libelle = $_.libelle; tiers = $_.tiers; debit = [int]$_.debit; credit = [int]$_.credit }
        })
    }
}

# 1. Preparation : sans ces donnees, les tests n'auraient aucun sens
try {
    $enteteMarc = @{ Authorization = "Bearer $(Get-JetonMarly 'marc@exemple.cm')" }
    $entetePaul = @{ Authorization = "Bearer $(Get-JetonMarly 'essomba@exemple.cm')" }
    $dossiersMarc = Invoke-RestMethod -Uri "$api/dossiers" -Headers $enteteMarc
    $dossiersPaul = Invoke-RestMethod -Uri "$api/dossiers" -Headers $entetePaul

    $autre = $dossiersMarc | Where-Object { $_.raisonSociale -eq "Agence Wouri Services" }
    $sienPaul = $dossiersPaul | Where-Object { $_.raisonSociale -eq "Quincaillerie Essomba" }
    $studio = $dossiersMarc | Where-Object { $_.raisonSociale -eq "Studio Ndolo Graphik" }

    $piecesQuinc = Invoke-RestMethod -Uri "$api/dossiers/$($sienPaul.id)/pieces" -Headers $enteteMarc
    $eneoReel = $piecesQuinc | Where-Object { $_.fournisseur -eq "ENEO" }
    $camtelReel = $piecesQuinc | Where-Object { $_.fournisseur -eq "Camtel" }
    $piecesStudio = Invoke-RestMethod -Uri "$api/dossiers/$($studio.id)/pieces" -Headers $enteteMarc
    $eneoIgs = $piecesStudio | Where-Object { $_.fournisseur -eq "ENEO" }

    $detailReel = Invoke-RestMethod -Uri "$api/pieces/$($eneoReel.id)" -Headers $enteteMarc
    $detailIgs = Invoke-RestMethod -Uri "$api/pieces/$($eneoIgs.id)" -Headers $enteteMarc

    $demandesPaul = Invoke-RestMethod -Uri "$api/dossiers/$($sienPaul.id)/demandes" -Headers $entetePaul
    $demandeReleve = $demandesPaul | Where-Object { $_.description -like "*MTN*" }
    $demandeTaxi = $demandesPaul | Where-Object { $_.pieceId }
} catch {
    Write-Host "Preparation impossible : $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifie que l'API tourne (fenetre 2)." -ForegroundColor Red
    exit 1
}

if (-not $autre -or -not $sienPaul -or -not $studio -or -not $eneoReel -or -not $camtelReel -or -not $eneoIgs -or -not $demandeReleve -or -not $demandeTaxi) {
    Write-Host "Donnees de demo introuvables." -ForegroundColor Red
    exit 1
}

$corpsValide = ConvertTo-CorpsValidation $detailReel
$corpsDesequilibre = ConvertTo-CorpsValidation $detailReel
$corpsDesequilibre.lignes[0].debit = 49000

$resultats = @(
    # Acces et securite
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

    # Ecriture proposee
    Test-Marly "Reel : ecriture en 3 lignes" { $detailReel.ecriture.lignes.Count } 3
    Test-Marly "Reel : HT 6052 a 50000" { $detailReel.ecriture.lignes[0].debit } 50000
    Test-Marly "Reel : TVA 4452 a 9625" { $detailReel.ecriture.lignes[1].debit } 9625
    Test-Marly "IGS : ecriture en 2 lignes sans TVA" { $detailIgs.ecriture.lignes.Count } 2

    # Validation
    Test-Marly "Paul refuse sur le detail" { Invoke-RestMethod "$api/pieces/$($eneoReel.id)" -Headers $entetePaul | Out-Null; 200 } 403
    Test-Marly "Paul ne peut pas valider" { Send-JsonMarly "$api/pieces/$($camtelReel.id)/valider" $entetePaul (ConvertTo-CorpsValidation $detailReel) | Out-Null; 200 } 403
    Test-Marly "Ecriture desequilibree refusee" { Send-JsonMarly "$api/pieces/$($eneoReel.id)/valider" $enteteMarc $corpsDesequilibre | Out-Null; 200 } 400
    Test-Marly "Validation par Marc acceptee" { (Send-JsonMarly "$api/pieces/$($eneoReel.id)/valider" $enteteMarc $corpsValide).piece.statut } "TRAITEE"
    Test-Marly "Double validation refusee" { Send-JsonMarly "$api/pieces/$($eneoReel.id)/valider" $enteteMarc $corpsValide | Out-Null; 200 } 409

    # Demandes de pieces
    Test-Marly "Paul voit 3 demandes" { $demandesPaul.Count } 3
    Test-Marly "Paul ne peut pas creer de demande" { Send-JsonMarly "$api/dossiers/$($sienPaul.id)/demandes" $entetePaul @{ description = "Test" } | Out-Null; 200 } 403
    Test-Marly "Paul bloque sur les demandes de l'Agence" { Invoke-RestMethod "$api/dossiers/$($autre.id)/demandes" -Headers $entetePaul | Out-Null; 200 } 404
    Test-Marly "Marc cree une demande" { $script:demandeAgence = Send-JsonMarly "$api/dossiers/$($autre.id)/demandes" $enteteMarc @{ description = "Releve Orange Money d'octobre" }; $script:demandeAgence.statut } "OUVERTE"
    Test-Marly "Marc annule cette demande" { (Send-JsonMarly "$api/demandes/$($script:demandeAgence.id)/annuler" $enteteMarc @{}).statut } "ANNULEE"
    Test-Marly "Marc renvoie Camtel a la PME" { (Send-JsonMarly "$api/pieces/$($camtelReel.id)/a-completer" $enteteMarc @{ motif = "Facture coupee" }).statut } "OUVERTE"
    Test-Marly "Camtel passe a completer" { $p = Invoke-RestMethod "$api/dossiers/$($sienPaul.id)/pieces" -Headers $enteteMarc; ($p | Where-Object { $_.id -eq $camtelReel.id }).statut } "A_COMPLETER"
    Test-Marly "Piece validee non renvoyable" { Send-JsonMarly "$api/pieces/$($eneoReel.id)/a-completer" $enteteMarc @{ motif = "Test" } | Out-Null; 200 } 409
    Test-Marly "Paul repond au releve MTN" { Send-PieceMarly $entetePaul $sienPaul.id "$dossierTest\releve.png" $demandeReleve.id } "201"
    Test-Marly "Demande du releve satisfaite" { $d = Invoke-RestMethod "$api/dossiers/$($sienPaul.id)/demandes" -Headers $entetePaul; ($d | Where-Object { $_.id -eq $demandeReleve.id }).statut } "SATISFAITE"
    Test-Marly "Paul repond au taxi illisible" { Send-PieceMarly $entetePaul $sienPaul.id "$dossierTest\taxi.png" $demandeTaxi.id } "201"
    Test-Marly "Taxi d'origine remplace" { $p = Invoke-RestMethod "$api/dossiers/$($sienPaul.id)/pieces" -Headers $enteteMarc; ($p | Where-Object { $_.id -eq $demandeTaxi.pieceId }).statut } "REMPLACEE"
    Test-Marly "Demande close non reutilisable" { Send-PieceMarly $entetePaul $sienPaul.id "$dossierTest\autre.png" $demandeReleve.id } "409"
)

$resultats | Format-Table -AutoSize

# Base propre pour la suite
$ErrorActionPreference = "Continue"
Reset-DonneesDemo | Out-Null

$echecs = @($resultats | Where-Object { $_.Resultat -eq "ECHEC" }).Count
if ($echecs -eq 0) {
    Write-Host "Tous les tests sont OK ($($resultats.Count))." -ForegroundColor Green
} else {
    Write-Host "$echecs test(s) en echec sur $($resultats.Count)." -ForegroundColor Red
    exit 1
}