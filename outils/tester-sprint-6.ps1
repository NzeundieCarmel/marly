# Tests du sprint 6 : suivi des paiements des factures
# Fichier en ASCII uniquement : PowerShell 5.1 lit mal les accents
param([string]$MotDePasseMarc = $env:MARLY_MDP_MARC)

$ErrorActionPreference = "Stop"
$api = "http://127.0.0.1:4001/api/v1"
$resultats = New-Object System.Collections.Generic.List[object]
$script:resultat = $null
$aujourdhui = (Get-Date).ToUniversalTime().AddHours(1).ToString("yyyy-MM-dd")
$demain = (Get-Date).ToUniversalTime().AddHours(25).ToString("yyyy-MM-dd")

if (-not $MotDePasseMarc) {
  Write-Host "Mot de passe de Marc manquant : definis MARLY_MDP_MARC." -ForegroundColor Red
  exit 2
}

function Appeler($methode, $chemin, $jeton, $donnees) {
  try {
    $p = @{ Method = $methode; Uri = "$api$chemin"; DisableKeepAlive = $true; ContentType = "application/json; charset=utf-8" }
    if ($jeton) { $p.Headers = @{ Authorization = "Bearer $jeton" } }
    if ($donnees) { $p.Body = [System.Text.Encoding]::UTF8.GetBytes(($donnees | ConvertTo-Json -Depth 6)) }
    $script:resultat = Invoke-RestMethod @p
    return "ok"
  } catch {
    $script:resultat = $null
    if ($_.Exception.Response) { return [string][int]$_.Exception.Response.StatusCode }
    return "injoignable"
  }
}

function Verifier($nom, $attendu, $obtenu) {
  $ok = ("$attendu" -eq "$obtenu")
  $resultats.Add([pscustomobject]@{ Test = $nom; Attendu = "$attendu"; Obtenu = "$obtenu"; Resultat = $(if ($ok) { "OK" } else { "ECHEC" }) })
}

function Inscrire($nom) {
  $etat = Appeler Post "/inscription/entreprise" $null @{ raisonSociale = $nom; regime = "REEL"; nomGerant = "Gerant Test"; email = "p$(Get-Random)@test.cm"; motDePasse = "Boutique2026" }
  if ($etat -ne "ok") { throw "Inscription de $nom impossible ($etat)." }
  return $script:resultat.jeton
}

Write-Host "Tests du sprint 6..."
Appeler Post "/auth/connexion" $null @{ email = "marc@exemple.cm"; motDePasse = $MotDePasseMarc } | Out-Null
$marc = $resultat.jeton

# Une entreprise, sa fiche, un client, une facture emise : net 292625
$a = Inscrire "Paiement Test"
Appeler Put "/facturation/profil" $a @{ niu = "M012345678901A"; adresse = "Rue Joss, Douala"; telephone = "+237 699000000" } | Out-Null
Appeler Post "/facturation/clients" $a @{ nom = "Ndokoti Distribution SA"; niu = "M098765432109B"; telephone = "677000000" } | Out-Null
$client = $resultat.id
$lignes = @(@{ designation = "Affiche A2"; quantite = 2; prixUnitaire = 50000 }, @{ designation = "Maintenance"; quantite = 1; prixUnitaire = 150000 })
Appeler Post "/facturation/factures" $a @{ clientId = $client; tauxRetenue = 2.2; lignes = $lignes } | Out-Null
$f = $resultat.id
Appeler Post "/facturation/factures/$f/emettre" $a | Out-Null

Verifier "Paiement : facture emise a payer" "A_PAYER/292625" $(Appeler Get "/facturation/factures/$f/paiement" $a | Out-Null; "$($resultat.etat)/$($resultat.reste)")
Verifier "Paiement : present dans la liste" "A_PAYER" $(Appeler Get "/facturation/paiements" $a | Out-Null; (@($resultat) | Where-Object { $_.factureId -eq $f }).etat)
Verifier "Reglement : acompte MTN MoMo" "PARTIELLE/192625" $(Appeler Post "/facturation/factures/$f/reglements" $a @{ date = $aujourdhui; montant = 100000; mode = "MTN_MOMO"; reference = "MP123" } | Out-Null; "$($resultat.etat)/$($resultat.reste)")
Verifier "Reglement : plus que le reste refuse" 400 (Appeler Post "/facturation/factures/$f/reglements" $a @{ date = $aujourdhui; montant = 200000; mode = "ESPECES" })
Verifier "Reglement : date future refusee" 400 (Appeler Post "/facturation/factures/$f/reglements" $a @{ date = $demain; montant = 1000; mode = "ESPECES" })
Verifier "Reglement : mode inconnu refuse" 400 (Appeler Post "/facturation/factures/$f/reglements" $a @{ date = $aujourdhui; montant = 1000; mode = "BITCOIN" })
Verifier "Relance : facture partiellement payee" "ok" (Appeler Post "/facturation/factures/$f/relance" $a)
Verifier "Relance : date enregistree" "True" $(Appeler Get "/facturation/factures/$f/paiement" $a | Out-Null; [bool]$resultat.derniereRelanceLe)
Verifier "Reglement : solde par virement" "PAYEE/0" $(Appeler Post "/facturation/factures/$f/reglements" $a @{ date = $aujourdhui; montant = 192625; mode = "VIREMENT" } | Out-Null; "$($resultat.etat)/$($resultat.reste)")
$solde = (@($resultat.reglements) | Where-Object { $_.montant -eq 192625 }).id
Verifier "Relance : facture payee refusee" 409 (Appeler Post "/facturation/factures/$f/relance" $a)
Verifier "Reglement : retrait du solde" "PARTIELLE/192625" $(Appeler Post "/facturation/factures/$f/reglements/$solde/supprimer" $a | Out-Null; "$($resultat.etat)/$($resultat.reste)")

# Brouillon et facture annulee ne recoivent rien
Appeler Post "/facturation/factures" $a @{ clientId = $client; lignes = $lignes } | Out-Null
$brouillon = $resultat.id
Verifier "Reglement : brouillon refuse" 409 (Appeler Post "/facturation/factures/$brouillon/reglements" $a @{ date = $aujourdhui; montant = 1000; mode = "ESPECES" })
Appeler Post "/facturation/factures/$brouillon/emettre" $a | Out-Null
Appeler Post "/facturation/factures/$brouillon/avoir" $a | Out-Null
Verifier "Reglement : facture annulee refusee" 409 (Appeler Post "/facturation/factures/$brouillon/reglements" $a @{ date = $aujourdhui; montant = 1000; mode = "ESPECES" })

# Isolation et droits
$b = Inscrire "Autre Paiement Test"
Verifier "Isolation : paiement d'une autre entreprise" 404 (Appeler Get "/facturation/factures/$f/paiement" $b)
Verifier "Isolation : reglement sur une autre entreprise" 404 (Appeler Post "/facturation/factures/$f/reglements" $b @{ date = $aujourdhui; montant = 1000; mode = "ESPECES" })
Verifier "Droits : cabinet refuse" 403 (Appeler Get "/facturation/paiements" $marc)

$resultats | Format-Table -AutoSize
$echecs = @($resultats | Where-Object { $_.Resultat -ne "OK" }).Count
if ($echecs -gt 0) {
  Write-Host "$echecs test(s) en echec sur $($resultats.Count)." -ForegroundColor Red
  exit 1
}
Write-Host "Tous les tests du sprint 6 sont OK ($($resultats.Count))." -ForegroundColor Green