# Tests des sprints 4 (mode autonome) et 5 (facturation)
# Fichier en ASCII uniquement : PowerShell 5.1 lit mal les accents
param([string]$MotDePasseMarc = $env:MARLY_MDP_MARC)

$ErrorActionPreference = "Stop"
$api = "http://127.0.0.1:4001/api/v1"
$annee = (Get-Date).ToUniversalTime().AddHours(1).Year
$resultats = New-Object System.Collections.Generic.List[object]
$script:resultat = $null

if (-not $MotDePasseMarc) {
  Write-Host "Mot de passe de Marc manquant : definis MARLY_MDP_MARC ou passe -MotDePasseMarc." -ForegroundColor Red
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

function Inscrire($nom, $regime) {
  $email = "t$(Get-Random)@test.cm"
  $etat = Appeler Post "/inscription/entreprise" $null @{ raisonSociale = $nom; regime = $regime; nomGerant = "Gerant Test"; email = $email; motDePasse = "Boutique2026" }
  if ($etat -ne "ok") { throw "Inscription de $nom impossible ($etat). Limite d'inscriptions ? Voir INSCRIPTIONS_PAR_HEURE dans apps/api/.env" }
  return [pscustomobject]@{ Jeton = $script:resultat.jeton; Email = $email }
}

Write-Host "Tests des sprints 4 et 5..."
$etat = Appeler Post "/auth/connexion" $null @{ email = "marc@exemple.cm"; motDePasse = $MotDePasseMarc }
if ($etat -ne "ok") { Write-Host "Connexion de Marc impossible ($etat)." -ForegroundColor Red; exit 2 }
$marc = $resultat.jeton

# ---------- Sprint 4 : mode autonome ----------
$A = Inscrire "Nkolo Test" "REEL"
Appeler Get "/auth/moi" $A.Jeton | Out-Null
Verifier "Autonome : profil autonome" "True" $resultat.autonome
$dossierA = $resultat.dossier.id
Verifier "Autonome : voit 1 seul dossier" 1 $(Appeler Get "/dossiers" $A.Jeton | Out-Null; @($resultat).Count)
Verifier "Autonome : tableau de bord refuse" 403 (Appeler Get "/tableau-de-bord" $A.Jeton)
Verifier "Autonome : creation de dossier refusee" 403 (Appeler Post "/dossiers" $A.Jeton @{ raisonSociale = "Pirate"; regime = "REEL" })
Verifier "Autonome : meme e-mail refuse" 409 (Appeler Post "/inscription/entreprise" $null @{ raisonSociale = "Doublon"; regime = "IGS"; nomGerant = "Gerant Test"; email = $A.Email; motDePasse = "Boutique2026" })

# Fiche de facturation remplie tant que l'entreprise est autonome
Verifier "Fiche : vide, 3 mentions manquantes" 3 $(Appeler Get "/facturation/profil" $A.Jeton | Out-Null; @($resultat.manquants).Count)
Verifier "Fiche : NIU normalise" "M012345678901A" $(Appeler Put "/facturation/profil" $A.Jeton @{ niu = "m012 3456 7890 1a"; adresse = "Rue Joss, Douala"; telephone = "+237 699000000" } | Out-Null; $resultat.niu)
Verifier "Fiche : NIU invalide refuse" 400 (Appeler Put "/facturation/profil" $A.Jeton @{ niu = "123" })
Appeler Post "/facturation/clients" $A.Jeton @{ nom = "Ndokoti Distribution SA"; niu = "M098765432109B" } | Out-Null
$clientA = $resultat.id
Verifier "Clients : NIU en double refuse" 409 (Appeler Post "/facturation/clients" $A.Jeton @{ nom = "Doublon"; niu = "M098765432109B" })

# Trouver un comptable
Appeler Get "/comptables" $A.Jeton | Out-Null
$cabinet = (@($resultat) | Where-Object { $_.nom -like "Cabinet Ngando*" } | Select-Object -First 1).id
Verifier "Annuaire : cabinet Ngando present" "True" ([bool]$cabinet)
Verifier "Rattachement : demande envoyee" "EN_ATTENTE" $(Appeler Post "/rattachements" $A.Jeton @{ cabinetId = $cabinet } | Out-Null; $resultat.demande.statut)
Verifier "Rattachement : une seule demande a la fois" 409 (Appeler Post "/rattachements" $A.Jeton @{ cabinetId = $cabinet })
Verifier "Rattachement : un cabinet ne demande pas" 403 (Appeler Post "/rattachements" $marc @{ cabinetId = $cabinet })
Appeler Get "/rattachements" $marc | Out-Null
$demandeA = (@($resultat) | Where-Object { $_.dossier.id -eq $dossierA }).id
Verifier "Rattachement : la PME n'accepte pas" 403 (Appeler Post "/rattachements/$demandeA/accepter" $A.Jeton)
Verifier "Rattachement : Marc accepte" "ACCEPTEE" $(Appeler Post "/rattachements/$demandeA/accepter" $marc | Out-Null; $resultat.statut)
Verifier "Rattachement : double acceptation refusee" 409 (Appeler Post "/rattachements/$demandeA/accepter" $marc)
Verifier "Transfert : ancien jeton toujours valide" "ok" (Appeler Get "/dossiers/$dossierA/pieces" $A.Jeton)
Verifier "Transfert : entreprise plus autonome" "False" $(Appeler Get "/auth/moi" $A.Jeton | Out-Null; $resultat.autonome)
Verifier "Transfert : Marc voit le dossier" 1 $(Appeler Get "/dossiers" $marc | Out-Null; @(@($resultat) | Where-Object { $_.id -eq $dossierA }).Count)
Verifier "Transfert : NIU gere par le cabinet" 403 (Appeler Put "/facturation/profil" $A.Jeton @{ niu = "M012345678901A"; adresse = "Rue Joss, Douala"; telephone = "+237 699000000" })

$B = Inscrire "Autre Test" "REEL"
Appeler Post "/rattachements" $B.Jeton @{ cabinetId = $cabinet } | Out-Null
$demandeB = $resultat.demande.id
Verifier "Rattachement : Marc refuse" "REFUSEE" $(Appeler Post "/rattachements/$demandeB/refuser" $marc | Out-Null; $resultat.statut)
Verifier "Rattachement : refus visible par l'entreprise" "REFUSEE" $(Appeler Get "/rattachements/mien" $B.Jeton | Out-Null; $resultat.demande.statut)

# ---------- Sprint 5 : facturation ----------
$lignes = @(@{ designation = "Affiche A2"; quantite = 2; prixUnitaire = 50000 }, @{ designation = "Maintenance"; quantite = 1; prixUnitaire = 150000 })
Appeler Post "/facturation/factures" $A.Jeton @{ clientId = $clientA; tauxRetenue = 2.2; lignes = $lignes } | Out-Null
$f1 = $resultat.id
Verifier "Facture : calcul HT/TVA/TTC/net" "250000/48125/298125/292625" "$($resultat.totalHt)/$($resultat.totalTva)/$($resultat.totalTtc)/$($resultat.netAPayer)"
Verifier "Facture : brouillon sans numero" "BROUILLON/" "$($resultat.statut)/$($resultat.numero)"
Verifier "Facture : brouillon non partageable" 409 (Appeler Post "/facturation/factures/$f1/partage" $A.Jeton)
Verifier "Facture : emission numerotee" "FAC-$annee-0001" $(Appeler Post "/facturation/factures/$f1/emettre" $A.Jeton | Out-Null; $resultat.numero)
Verifier "Facture : double emission refusee" 409 (Appeler Post "/facturation/factures/$f1/emettre" $A.Jeton)
Verifier "Facture : modification apres emission refusee" 409 (Appeler Put "/facturation/factures/$f1" $A.Jeton @{ clientId = $clientA; lignes = $lignes })
Appeler Post "/facturation/factures" $A.Jeton @{ clientId = $clientA; lignes = $lignes } | Out-Null
$f2 = $resultat.id
Verifier "Facture : numerotation sans trou" "FAC-$annee-0002" $(Appeler Post "/facturation/factures/$f2/emettre" $A.Jeton | Out-Null; $resultat.numero)

# La facture emise devient une piece de vente
Appeler Get "/dossiers/$dossierA/pieces" $A.Jeton | Out-Null
$venteF1 = @($resultat) | Where-Object { $_.factureId -eq $f1 }
$pieceF1 = $venteF1.id
Verifier "Vente : piece creee a l'emission" "Ventes/298125" "$($venteF1.categorie)/$($venteF1.montantTtc)"
Appeler Get "/pieces/$pieceF1" $marc | Out-Null
$l = @($resultat.ecriture.lignes)
$ecriture = $resultat.ecriture
Verifier "Vente : ecriture VE proposee" "VE/411,701,4431/298125/298125" "$($ecriture.journal)/$(($l | ForEach-Object { $_.compte }) -join ',')/$(($l | Measure-Object debit -Sum).Sum)/$(($l | Measure-Object credit -Sum).Sum)"
Verifier "Vente : document lisible par le cabinet" "FAC-$annee-0001" $(Appeler Get "/pieces/$pieceF1/facture" $marc | Out-Null; $resultat.numero)
Verifier "Vente : document refuse a l'entreprise" 403 (Appeler Get "/pieces/$pieceF1/facture" $A.Jeton)
Verifier "Vente : pas de nouvelle photo" 409 (Appeler Post "/pieces/$pieceF1/a-completer" $marc @{ motif = "Illisible" })
Verifier "Vente : validation par Marc" "TRAITEE" $(Appeler Post "/pieces/$pieceF1/valider" $marc @{ journal = $ecriture.journal; lignes = @($ecriture.lignes) } | Out-Null; $resultat.piece.statut)

# Lien public
Appeler Post "/facturation/factures/$f1/partage" $A.Jeton | Out-Null
$jetonPartage = $resultat.jeton
Verifier "Partage : jeton de 43 caracteres" 43 $jetonPartage.Length
Verifier "Partage : lecture sans connexion" "FAC-$annee-0001" $(Appeler Get "/public/factures/$jetonPartage" $null | Out-Null; $resultat.numero)
Verifier "Partage : jeton invente refuse" 404 (Appeler Get "/public/factures/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" $null)
Appeler Post "/facturation/factures/$f1/partage/desactiver" $A.Jeton | Out-Null
Verifier "Partage : lien desactive" 404 (Appeler Get "/public/factures/$jetonPartage" $null)

# Avoir
Verifier "Avoir : numerote a part" "AV-$annee-0001" $(Appeler Post "/facturation/factures/$f1/avoir" $A.Jeton | Out-Null; $resultat.numero)
Verifier "Avoir : facture d'origine annulee" "ANNULEE" $(Appeler Get "/facturation/factures/$f1" $A.Jeton | Out-Null; $resultat.statut)
Verifier "Avoir : un seul par facture" 409 (Appeler Post "/facturation/factures/$f1/avoir" $A.Jeton)
Appeler Get "/dossiers/$dossierA/pieces" $A.Jeton | Out-Null
$pieceAvoir = (@($resultat) | Where-Object { $_.categorie -eq "Avoir sur ventes" }).id
Verifier "Avoir : ecriture inversee (411 au credit)" 298125 $(Appeler Get "/pieces/$pieceAvoir" $marc | Out-Null; (@($resultat.ecriture.lignes) | Where-Object { $_.compte -eq "411" }).credit)

# Isolation, fiche incomplete, suppression, IGS, droits
Verifier "Isolation : facture d'une autre entreprise" 404 (Appeler Get "/facturation/factures/$f1" $B.Jeton)
Verifier "Isolation : client d'une autre entreprise" 404 (Appeler Get "/facturation/clients/$clientA" $B.Jeton)
Appeler Post "/facturation/clients" $B.Jeton @{ nom = "Client B" } | Out-Null
$clientB = $resultat.id
Appeler Post "/facturation/factures" $B.Jeton @{ clientId = $clientB; lignes = $lignes } | Out-Null
$fb = $resultat.id
Verifier "Facture : fiche incomplete, emission refusee" 400 (Appeler Post "/facturation/factures/$fb/emettre" $B.Jeton)
Verifier "Facture : brouillon supprime" "ok" (Appeler Post "/facturation/factures/$fb/supprimer" $B.Jeton)
Verifier "Facture : brouillon supprime introuvable" 404 (Appeler Get "/facturation/factures/$fb" $B.Jeton)
$C = Inscrire "Boutique IGS Test" "IGS"
Appeler Post "/facturation/clients" $C.Jeton @{ nom = "Client C" } | Out-Null
$clientC = $resultat.id
Verifier "IGS : sans TVA, quantite decimale" "15000/0/15000" $(Appeler Post "/facturation/factures" $C.Jeton @{ clientId = $clientC; lignes = @(@{ designation = "Pagne"; quantite = 1.5; prixUnitaire = 10000 }) } | Out-Null; "$($resultat.totalHt)/$($resultat.totalTva)/$($resultat.totalTtc)")
Verifier "Droits : cabinet refuse sur la facturation" 403 (Appeler Get "/facturation/profil" $marc)

# ---------- Bilan ----------
$resultats | Format-Table -AutoSize
$echecs = @($resultats | Where-Object { $_.Resultat -ne "OK" }).Count
if ($echecs -gt 0) {
  Write-Host "$echecs test(s) en echec sur $($resultats.Count)." -ForegroundColor Red
  exit 1
}
Write-Host "Tous les tests des sprints 4 et 5 sont OK ($($resultats.Count))." -ForegroundColor Green