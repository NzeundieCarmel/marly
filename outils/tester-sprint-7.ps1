# Tests du sprint 7, bloc 1 : le grand livre d'une entreprise autonome
# Usage : powershell -ExecutionPolicy Bypass -File .\outils\tester-sprint-7.ps1
$ErrorActionPreference = "Stop"
$base = "http://localhost:4001/api/v1"
$resultats = New-Object System.Collections.Generic.List[object]
$script:resultat = $null

function Appeler([string]$methode, [string]$chemin, [string]$jeton, $corps) {
  $entetes = @{}
  if ($jeton) { $entetes["Authorization"] = "Bearer $jeton" }
  $params = @{ Method = $methode; Uri = "$base$chemin"; Headers = $entetes; ContentType = "application/json; charset=utf-8" }
  if ($null -ne $corps) { $params["Body"] = [Text.Encoding]::UTF8.GetBytes(($corps | ConvertTo-Json -Depth 10 -Compress)) }
  try {
    $script:resultat = Invoke-RestMethod @params
    return "ok"
  } catch {
    $script:resultat = $null
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
    return "injoignable"
  }
}

function Verifier([string]$nom, $attendu, $obtenu) {
  $etat = if ("$attendu" -eq "$obtenu") { "OK" } else { "ECHEC" }
  $resultats.Add([pscustomobject]@{ Test = $nom; Attendu = "$attendu"; Obtenu = "$obtenu"; Resultat = $etat })
}

function Ligne([string]$compte, [int]$debit, [int]$credit) {
  return @{ compte = $compte; debit = $debit; credit = $credit }
}

function NouvelleEntreprise([string]$nom) {
  $email = "gl$(Get-Random)@test.cm"
  Appeler Post "/inscription/entreprise" $null @{ raisonSociale = $nom; regime = "REEL"; nomGerant = "Gerant Test"; email = $email; motDePasse = "Boutique2026" } | Out-Null
  $jeton = $script:resultat.jeton
  Appeler Get "/auth/moi" $jeton | Out-Null
  return @{ jeton = $jeton; dossier = $script:resultat.dossier.id }
}

$e = NouvelleEntreprise "Quincaillerie Grand Livre"
$j = $e.jeton
$c = "/dossiers/$($e.dossier)/comptabilite"

# Plan comptable
Appeler Get "$c/plan" $j | Out-Null
$numeros = @($script:resultat | ForEach-Object { $_.numero })
Verifier "Plan : caisse et Mobile Money presents" "True/True" "$($numeros -contains '571')/$($numeros -contains '552')"
Verifier "Plan : compte ajoute" "ok" (Appeler Post "$c/comptes" $j @{ numero = "6011"; intitule = "Achats de quincaillerie" })
Verifier "Plan : compte en double refuse" 409 (Appeler Post "$c/comptes" $j @{ numero = "6011"; intitule = "Doublon" })
Verifier "Plan : compte du plan en double refuse" 409 (Appeler Post "$c/comptes" $j @{ numero = "571"; intitule = "Caisse bis" })
Verifier "Plan : compte de classe 9 refuse" 400 (Appeler Post "$c/comptes" $j @{ numero = "9999"; intitule = "Analytique" })

# Controles de saisie
Verifier "Saisie : ecriture desequilibree refusee" 400 (Appeler Post "$c/ecritures" $j @{ journal = "OD"; date = "2026-11-02"; libelle = "Test"; lignes = @((Ligne "571" 1000 0), (Ligne "101" 0 900)) })
Verifier "Saisie : debit et credit sur une ligne refuse" 400 (Appeler Post "$c/ecritures" $j @{ journal = "OD"; date = "2026-11-02"; libelle = "Test"; lignes = @((Ligne "571" 1000 1000), (Ligne "101" 0 0)) })
Verifier "Saisie : journal des achats reserve aux pieces" 400 (Appeler Post "$c/ecritures" $j @{ journal = "AC"; date = "2026-11-02"; libelle = "Test"; lignes = @((Ligne "601" 1000 0), (Ligne "401" 0 1000)) })
Verifier "Saisie : date inexistante refusee" 400 (Appeler Post "$c/ecritures" $j @{ journal = "OD"; date = "2026-02-30"; libelle = "Test"; lignes = @((Ligne "571" 1000 0), (Ligne "101" 0 1000)) })

# Ecritures
Appeler Post "$c/ecritures" $j @{ journal = "CA"; date = "2026-11-02"; libelle = "Apport en capital"; lignes = @((Ligne "571" 500000 0), (Ligne "101" 0 500000)) } | Out-Null
Verifier "Caisse : premiere ecriture numerotee 1" "CA/1" "$($script:resultat.journal)/$($script:resultat.numero)"
Appeler Post "$c/ecritures" $j @{ journal = "CA"; date = "2026-11-05"; libelle = "Fournitures de bureau"; lignes = @((Ligne "6055" 20000 0), (Ligne "571" 0 20000)) } | Out-Null
Verifier "Caisse : deuxieme ecriture numerotee 2" "CA/2" "$($script:resultat.journal)/$($script:resultat.numero)"
Appeler Post "$c/ecritures" $j @{ journal = "BQ"; date = "2026-11-06"; libelle = "Versement en banque"; lignes = @((Ligne "521" 100000 0), (Ligne "571" 0 100000)) } | Out-Null
Verifier "Banque : numerotation propre au journal" "BQ/1" "$($script:resultat.journal)/$($script:resultat.numero)"
Verifier "Saisie : compte ajoute utilisable" "ok" (Appeler Post "$c/ecritures" $j @{ journal = "OD"; date = "2026-11-07"; libelle = "Achat a credit"; lignes = @((Ligne "6011" 10000 0), (Ligne "401" 0 10000)) })

# Balance
Appeler Get "$c/balance" $j | Out-Null
$bal = $script:resultat
Verifier "Balance : equilibree" "630000/630000/True" "$($bal.totalDebit)/$($bal.totalCredit)/$($bal.equilibree)"
$caisse = $bal.lignes | Where-Object { $_.compte -eq "571" }
Verifier "Balance : solde de caisse" 380000 $caisse.soldeDebiteur
$perso = $bal.lignes | Where-Object { $_.compte -eq "6011" }
Verifier "Balance : intitule du compte ajoute" "Achats de quincaillerie" $perso.intitule

# Grand livre et journal
Appeler Get "$c/grand-livre?compte=571" $j | Out-Null
Verifier "Grand livre : caisse, 3 mouvements" "3/380000" "$(@($script:resultat.lignes).Count)/$($script:resultat.soldeFinal)"
Appeler Get "$c/grand-livre?compte=571&du=2026-11-05" $j | Out-Null
Verifier "Grand livre : report au 5 novembre" "500000/2" "$($script:resultat.soldeInitial)/$(@($script:resultat.lignes).Count)"
Appeler Get "$c/journal?journal=CA" $j | Out-Null
Verifier "Journal de caisse : 2 ecritures" 2 @($script:resultat).Count
Verifier "Grand livre : date invalide refusee" 400 (Appeler Get "$c/balance?du=2026-13-01" $j)

# Isolation
$autre = NouvelleEntreprise "Autre Entreprise"
Verifier "Isolation : balance d'une autre entreprise" 404 (Appeler Get "$c/balance" $autre.jeton)
Verifier "Isolation : saisie chez une autre entreprise" 404 (Appeler Post "$c/ecritures" $autre.jeton @{ journal = "OD"; date = "2026-11-02"; libelle = "Intrusion"; lignes = @((Ligne "571" 1000 0), (Ligne "101" 0 1000)) })
if ($env:MARLY_MDP_MARC) {
  Appeler Post "/auth/connexion" $null @{ email = "marc@exemple.cm"; motDePasse = $env:MARLY_MDP_MARC } | Out-Null
  Verifier "Isolation : un cabinet tiers ne voit rien" 404 (Appeler Get "$c/balance" $script:resultat.jeton)
}

$resultats | Format-Table -AutoSize
$echecs = @($resultats | Where-Object { $_.Resultat -ne "OK" }).Count
if ($echecs -eq 0) { Write-Host "Tous les tests du sprint 7 sont OK ($($resultats.Count))." -ForegroundColor Green }
else { Write-Host "$echecs test(s) en echec sur $($resultats.Count)." -ForegroundColor Red }