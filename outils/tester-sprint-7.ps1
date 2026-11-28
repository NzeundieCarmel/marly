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

# Bloc 1b : le gerant comptabilise lui-meme ses pieces
Appeler Post "$c/comptabiliser" $j | Out-Null
Verifier "Gerant autonome : comptabilisation groupee" "0/0" "$($script:resultat.comptabilisees)/$($script:resultat.ignorees)"
Verifier "Gerant autonome : piece inconnue" 404 (Appeler Get "/pieces/piece-inconnue" $j)
Verifier "Isolation : comptabilisation chez une autre entreprise" 404 (Appeler Post "$c/comptabiliser" $autre.jeton)

if ($env:MARLY_MDP_MARC) {
  # Une entreprise qui rejoint un cabinet ne tient plus elle-meme sa comptabilite
  $r = NouvelleEntreprise "Entreprise Rattachee"
  Appeler Get "/comptables" $r.jeton | Out-Null
  $cabinet = @($script:resultat) | Where-Object { $_.nom -like "*Ngando*" } | Select-Object -First 1
  Appeler Post "/rattachements" $r.jeton @{ cabinetId = $cabinet.id; message = "Test du sprint 7" } | Out-Null
  $demande = $script:resultat.demande.id
  Appeler Post "/auth/connexion" $null @{ email = "marc@exemple.cm"; motDePasse = $env:MARLY_MDP_MARC } | Out-Null
  $marc = $script:resultat.jeton
  Appeler Post "/rattachements/$demande/accepter" $marc | Out-Null
  $cr = "/dossiers/$($r.dossier)/comptabilite"
  $operation = @{ journal = "CA"; date = "2026-11-10"; libelle = "Apport"; lignes = @((Ligne "571" 50000 0), (Ligne "104" 0 50000)) }
  Verifier "Suivi par un cabinet : saisie refusee au gerant" 403 (Appeler Post "$cr/ecritures" $r.jeton $operation)
  Verifier "Suivi par un cabinet : comptabilisation refusee au gerant" 403 (Appeler Post "$cr/comptabiliser" $r.jeton)
  Verifier "Suivi par un cabinet : consultation permise" "ok" (Appeler Get "$cr/balance" $r.jeton)
  Verifier "Suivi par un cabinet : le cabinet saisit" "ok" (Appeler Post "$cr/ecritures" $marc $operation)
}
# Bloc 2 : articles et stock au cout moyen pondere
$s = "/dossiers/$($e.dossier)/stock"
Verifier "Stock : article cree avec stock initial" "ok" (Appeler Post "$s/articles" $j @{ nom = "Ciment 50 kg"; reference = "cim-50"; unite = "sac"; prixVente = 5500; tauxTva = 1925; seuilAlerte = 0; quantiteInitiale = 10; coutInitial = 4000 })
$art = $script:resultat
Verifier "Stock : 10 sacs a 4000" "CIM-50/10/4000/40000" "$($art.reference)/$($art.quantite)/$($art.coutMoyen)/$($art.valeurStock)"
Verifier "Stock : reference en double refusee" 409 (Appeler Post "$s/articles" $j @{ nom = "Doublon"; reference = "CIM-50"; unite = "sac"; prixVente = 1; tauxTva = 0 })
Verifier "Stock : taux de TVA invalide refuse" 400 (Appeler Post "$s/articles" $j @{ nom = "Taux"; reference = "TX-1"; unite = "sac"; prixVente = 1; tauxTva = 1800 })
Verifier "Stock : stock initial sans cout refuse" 400 (Appeler Post "$s/articles" $j @{ nom = "Sans cout"; reference = "SC-1"; unite = "sac"; prixVente = 1; tauxTva = 0; quantiteInitiale = 5 })
$a = "$s/articles/$($art.id)"
Verifier "Stock : entree sans cout refusee" 400 (Appeler Post "$a/mouvements" $j @{ type = "ENTREE"; quantite = 5 })
Appeler Post "$a/mouvements" $j @{ type = "ENTREE"; quantite = 20; coutUnitaire = 4300; motif = "Achat CIMENCO" } | Out-Null
Verifier "Stock : cout moyen pondere apres entree" "30/4200/126000" "$($script:resultat.quantite)/$($script:resultat.coutMoyen)/$($script:resultat.valeurStock)"
Appeler Post "$a/mouvements" $j @{ type = "SORTIE"; quantite = 12; motif = "Casse" } | Out-Null
Verifier "Stock : sortie au cout moyen" "18/4200/75600" "$($script:resultat.quantite)/$($script:resultat.coutMoyen)/$($script:resultat.valeurStock)"
Verifier "Stock : sortie superieure au stock refusee" 409 (Appeler Post "$a/mouvements" $j @{ type = "SORTIE"; quantite = 19 })
Appeler Post "$a/inventaire" $j @{ quantiteReelle = 17 } | Out-Null
Verifier "Stock : inventaire, un sac manquant" "17/71400" "$($script:resultat.quantite)/$($script:resultat.valeurStock)"
Appeler Get $a $j | Out-Null
Verifier "Stock : fiche, 4 mouvements" "4/-1" "$(@($script:resultat.mouvements).Count)/$($script:resultat.mouvements[0].quantite)"
Appeler Patch $a $j @{ prixVente = 6000 } | Out-Null
Verifier "Stock : prix modifie" "6000/17" "$($script:resultat.prixVente)/$($script:resultat.quantite)"
Appeler Post "$s/articles" $j @{ nom = "Pointes 70 mm"; reference = "PTE-70"; unite = "kg"; prixVente = 1200; tauxTva = 1925; seuilAlerte = 10; quantiteInitiale = 6; coutInitial = 950 } | Out-Null
Appeler Post "$s/articles" $j @{ nom = "Tole bac 3 m"; reference = "TOL-3"; unite = "feuille"; prixVente = 7800; tauxTva = 1925; seuilAlerte = 5 } | Out-Null
Appeler Post "$s/articles" $j @{ nom = "Livraison"; reference = "SRV-LIV"; unite = "paquet"; prixVente = 2000; tauxTva = 1925; suiviStock = $false } | Out-Null
$service = $script:resultat
Verifier "Stock : service, mouvement refuse" 400 (Appeler Post "$s/articles/$($service.id)/mouvements" $j @{ type = "ENTREE"; quantite = 1; coutUnitaire = 10 })
Appeler Get "$s/resume" $j | Out-Null
Verifier "Stock : resume (articles/ruptures/bas/valeur)" "3/1/1/77100" "$($script:resultat.articles)/$($script:resultat.ruptures)/$($script:resultat.stockBas)/$($script:resultat.valeur)"
Appeler Get "$s/articles?alerte=1" $j | Out-Null
Verifier "Stock : filtre a reapprovisionner" 2 @($script:resultat).Count
Appeler Get "$s/articles?recherche=cim" $j | Out-Null
Verifier "Stock : recherche" "1/CIM-50" "$(@($script:resultat).Count)/$(@($script:resultat)[0].reference)"
Verifier "Isolation : fiche d'article d'une autre entreprise" 404 (Appeler Get $a $autre.jeton)
Verifier "Isolation : article vu depuis un autre dossier" 404 (Appeler Get "/dossiers/$($autre.dossier)/stock/articles/$($art.id)" $autre.jeton)
Verifier "Isolation : mouvement chez une autre entreprise" 404 (Appeler Post "$a/mouvements" $autre.jeton @{ type = "SORTIE"; quantite = 1 })

# Bloc 3 : la caisse
$k = "/dossiers/$($e.dossier)/caisse"
$panier = @{ mode = "ESPECES"; montantRecu = 20000; lignes = @(@{ articleId = $art.id; quantite = 2 }, @{ articleId = $service.id; quantite = 1 }) }
Verifier "Caisse : vente sans caisse ouverte refusee" 409 (Appeler Post "$k/ventes" $j $panier)
Verifier "Caisse : ouverture, fond de 50000" "ok" (Appeler Post "$k/session/ouverture" $j @{ fondInitial = 50000 })
Verifier "Caisse : double ouverture refusee" 409 (Appeler Post "$k/session/ouverture" $j @{ fondInitial = 0 })
Verifier "Caisse : ticket encaisse" "ok" (Appeler Post "$k/ventes" $j $panier)
$t = $script:resultat
Verifier "Caisse : ticket 1, HT/TVA/TTC/monnaie" "1/11740/2260/14000/6000" "$($t.numero)/$($t.totalHt)/$($t.totalTva)/$($t.totalTtc)/$($t.monnaie)"
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Caisse : stock sorti par la vente" "15/VENTE" "$($script:resultat.quantite)/$($script:resultat.mouvements[0].origine)"
Verifier "Caisse : montant recu insuffisant refuse" 400 (Appeler Post "$k/ventes" $j @{ mode = "ESPECES"; montantRecu = 1000; lignes = @(@{ articleId = $art.id; quantite = 1 }) })
Verifier "Caisse : stock insuffisant refuse" 409 (Appeler Post "$k/ventes" $j @{ mode = "ESPECES"; lignes = @(@{ articleId = $art.id; quantite = 16 }) })
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Caisse : vente refusee, stock intact" 15 $script:resultat.quantite
Verifier "Caisse : vente MTN MoMo" "ok" (Appeler Post "$k/ventes" $j @{ mode = "MTN_MOMO"; lignes = @(@{ articleId = $art.id; quantite = 1 }) })
Verifier "Caisse : ticket 2" 2 $script:resultat.numero
Verifier "Caisse : article inconnu refuse" 404 (Appeler Post "$k/ventes" $j @{ mode = "ESPECES"; lignes = @(@{ articleId = "inconnu"; quantite = 1 }) })
Appeler Get "$c/journal?journal=MM" $j | Out-Null
$vm = @(@($script:resultat) | Where-Object { $_.origine -eq "CAISSE" })
Verifier "Caisse : ecriture Mobile Money au grand livre" "1/552/6000" "$($vm.Count)/$($vm[0].mouvements[0].compte)/$($vm[0].mouvements[0].debit)"
Appeler Get "$k/session" $j | Out-Null
$b = $script:resultat.session
Verifier "Caisse : bilan (ventes/total/especes attendues)" "2/20000/64000" "$($b.ventes)/$($b.totalTtc)/$($b.especesAttendues)"
Verifier "Caisse : cloture" "ok" (Appeler Post "$k/session/cloture" $j @{ especesComptees = 63000 })
Verifier "Caisse : ecart de caisse" "64000/-1000" "$($script:resultat.especesAttendues)/$($script:resultat.ecart)"
Verifier "Caisse : vente apres cloture refusee" 409 (Appeler Post "$k/ventes" $j $panier)
Verifier "Isolation : caisse d'une autre entreprise" 404 (Appeler Get "$k/session" $autre.jeton)
Verifier "Isolation : ticket d'une autre entreprise" 404 (Appeler Get "$k/ventes/$($t.id)" $autre.jeton)

# Bloc 4a : factures liees aux articles
Appeler Put "/facturation/profil" $j @{ niu = "M123456789012Q"; adresse = "Akwa, Douala"; telephone = "+237 699 00 00 00" } | Out-Null
Appeler Post "/facturation/clients" $j @{ nom = "Chantier Test" } | Out-Null
$client = $script:resultat.id
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
$stockAvant = $script:resultat.quantite
Verifier "Facture : brouillon avec article" "ok" (Appeler Post "/facturation/factures" $j @{ clientId = $client; lignes = @(@{ designation = "Ciment 50 kg"; quantite = 3; prixUnitaire = 5031; articleId = $art.id }) })
$fa = $script:resultat
Verifier "Facture : article garde sur la ligne" $art.id $fa.lignes[0].articleId
Verifier "Facture : quantite decimale sur article suivi refusee" 400 (Appeler Post "/facturation/factures" $j @{ clientId = $client; lignes = @(@{ designation = "Ciment"; quantite = 1.5; prixUnitaire = 5031; articleId = $art.id }) })
Verifier "Facture : article inconnu refuse" 404 (Appeler Post "/facturation/factures" $j @{ clientId = $client; lignes = @(@{ designation = "X"; quantite = 1; prixUnitaire = 10; articleId = "inconnu" }) })
Verifier "Facture : emission avec article" "ok" (Appeler Post "/facturation/factures/$($fa.id)/emettre" $j)
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Facture : stock sorti a l'emission" "$($stockAvant - 3)/FACTURE" "$($script:resultat.quantite)/$($script:resultat.mouvements[0].origine)"
Appeler Post "/facturation/factures" $j @{ clientId = $client; lignes = @(@{ designation = "Ciment 50 kg"; quantite = 500; prixUnitaire = 5031; articleId = $art.id }) } | Out-Null
$fb = $script:resultat
Verifier "Facture : emission refusee si stock insuffisant" 409 (Appeler Post "/facturation/factures/$($fb.id)/emettre" $j)
Appeler Get "/facturation/factures/$($fb.id)" $j | Out-Null
Verifier "Facture : reste en brouillon, sans numero" "BROUILLON/" "$($script:resultat.statut)/$($script:resultat.numero)"
Verifier "Facture : avoir" "ok" (Appeler Post "/facturation/factures/$($fa.id)/avoir" $j)
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Facture : stock rendu par l'avoir" "$stockAvant/AVOIR" "$($script:resultat.quantite)/$($script:resultat.mouvements[0].origine)"

# Bloc 4b : achats fournisseurs
$h = "/dossiers/$($e.dossier)/achats"
$ceJour = (Get-Date).ToUniversalTime().AddHours(1).ToString("yyyy-MM-dd")
$demain = (Get-Date).ToUniversalTime().AddHours(1).AddDays(3).ToString("yyyy-MM-dd")
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
$avantAchat = $script:resultat
Verifier "Achat : a credit avec TVA" "ok" (Appeler Post $h $j @{ fournisseur = "CIMENCO"; referenceFournisseur = "F-118"; date = $ceJour; avecTva = $true; paiement = "A_CREDIT"; lignes = @(@{ articleId = $art.id; quantite = 10; coutUnitaire = 4600 }) })
$achat = $script:resultat
Verifier "Achat : numero et totaux HT/TVA/TTC" "1/46000/8855/54855" "$($achat.numero)/$($achat.totalHt)/$($achat.totalTva)/$($achat.totalTtc)"
$valeurAttendue = $avantAchat.valeurStock + 46000
$quantiteAttendue = $avantAchat.quantite + 10
$coutAttendu = [Math]::Round($valeurAttendue / $quantiteAttendue, [MidpointRounding]::AwayFromZero)
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Achat : entree en stock au cout moyen pondere" "$quantiteAttendue/$coutAttendu/ACHAT" "$($script:resultat.quantite)/$($script:resultat.coutMoyen)/$($script:resultat.mouvements[0].origine)"
Appeler Get "$c/journal?journal=AC" $j | Out-Null
$ea = @(@($script:resultat) | Where-Object { $_.origine -eq "ACHAT" })
$mv = @($ea[0].mouvements)
Verifier "Achat : ecriture 601/4452/401 au journal AC" "1/601:46000/4452:8855/401:54855" "$($ea.Count)/$($mv[0].compte):$($mv[0].debit)/$($mv[1].compte):$($mv[1].debit)/$($mv[2].compte):$($mv[2].credit)"
Verifier "Achat : paye par MTN MoMo" "ok" (Appeler Post $h $j @{ fournisseur = "CIMENCO"; date = $ceJour; avecTva = $false; paiement = "MTN_MOMO"; lignes = @(@{ articleId = $art.id; quantite = 2; coutUnitaire = 4500 }) })
Verifier "Achat : numero 2, sans TVA" "2/0/9000" "$($script:resultat.numero)/$($script:resultat.totalTva)/$($script:resultat.totalTtc)"
Verifier "Achat : date future refusee" 400 (Appeler Post $h $j @{ fournisseur = "CIMENCO"; date = $demain; avecTva = $false; paiement = "ESPECES"; lignes = @(@{ articleId = $art.id; quantite = 1; coutUnitaire = 10 }) })
Verifier "Achat : article sans stock refuse" 400 (Appeler Post $h $j @{ fournisseur = "CIMENCO"; date = $ceJour; avecTva = $false; paiement = "ESPECES"; lignes = @(@{ articleId = $service.id; quantite = 1; coutUnitaire = 10 }) })
Verifier "Achat : article inconnu refuse" 404 (Appeler Post $h $j @{ fournisseur = "CIMENCO"; date = $ceJour; avecTva = $false; paiement = "ESPECES"; lignes = @(@{ articleId = "inconnu"; quantite = 1; coutUnitaire = 10 }) })
Appeler Get $h $j | Out-Null
Verifier "Achat : liste" 2 @($script:resultat).Count
Verifier "Achat : annulation" "ok" (Appeler Post "$h/$($achat.id)/annuler" $j)
Appeler Get "$s/articles/$($art.id)" $j | Out-Null
Verifier "Achat : stock ressorti a l'annulation" "$($quantiteAttendue + 2 - 10)/ACHAT_ANNULE" "$($script:resultat.quantite)/$($script:resultat.mouvements[0].origine)"
Appeler Get "$c/journal?journal=AC" $j | Out-Null
$ea = @(@($script:resultat) | Where-Object { $_.origine -eq "ACHAT" })
Verifier "Achat : ecriture contre-passee" "2" "$($ea.Count)"
Verifier "Achat : double annulation refusee" 409 (Appeler Post "$h/$($achat.id)/annuler" $j)
Verifier "Isolation : achat d'une autre entreprise" 404 (Appeler Get "$h/$($achat.id)" $autre.jeton)
Verifier "Isolation : achat chez une autre entreprise" 404 (Appeler Post $h $autre.jeton @{ fournisseur = "X Y"; date = $ceJour; avecTva = $false; paiement = "ESPECES"; lignes = @(@{ articleId = $art.id; quantite = 1; coutUnitaire = 10 }) })

# Bloc 4c : devis
$annee = (Get-Date).ToUniversalTime().AddHours(1).Year
$ligneDevis = @(@{ designation = "Ciment 50 kg"; quantite = 2; prixUnitaire = 5031; articleId = $art.id })
Verifier "Devis : cree" "ok" (Appeler Post "/facturation/devis" $j @{ clientId = $client; validiteJours = 15; lignes = $ligneDevis })
$dv = $script:resultat
Verifier "Devis : numero et totaux HT/TVA/TTC" "DEV-$annee-0001/10062/1937/11999" "$($dv.numero)/$($dv.totalHt)/$($dv.totalTva)/$($dv.totalTtc)"
Verifier "Devis : client inconnu refuse" 404 (Appeler Post "/facturation/devis" $j @{ clientId = "inconnu"; lignes = $ligneDevis })
Verifier "Devis : modification en cours" "ok" (Appeler Put "/facturation/devis/$($dv.id)" $j @{ clientId = $client; validiteJours = 30; lignes = @(@{ designation = "Ciment 50 kg"; quantite = 4; prixUnitaire = 5031; articleId = $art.id }) })
Verifier "Devis : accepte" "ACCEPTE" (& { Appeler Post "/facturation/devis/$($dv.id)/statut" $j @{ statut = "ACCEPTE" } | Out-Null; $script:resultat.statut })
Verifier "Devis : transforme en facture" "ok" (Appeler Post "/facturation/devis/$($dv.id)/facture" $j)
$fd = $script:resultat.factureId
Appeler Get "/facturation/factures/$fd" $j | Out-Null
Verifier "Devis : brouillon de facture avec l'article" "BROUILLON/4/$($art.id)" "$($script:resultat.statut)/$($script:resultat.lignes[0].quantite)/$($script:resultat.lignes[0].articleId)"
Verifier "Devis : seconde transformation refusee" 409 (Appeler Post "/facturation/devis/$($dv.id)/facture" $j)
Verifier "Devis : modification apres facturation refusee" 409 (Appeler Put "/facturation/devis/$($dv.id)" $j @{ clientId = $client; lignes = $ligneDevis })
Verifier "Isolation : devis d'une autre entreprise" 404 (Appeler Get "/facturation/devis/$($dv.id)" $autre.jeton)

# Bloc 5 : accueil du gerant et paiement des fournisseurs
$pil = "/dossiers/$($e.dossier)/pilotage"
Verifier "Accueil : lecture" "ok" (Appeler Get $pil $j)
$pl = $script:resultat
Verifier "Accueil : caisse du jour (total/tickets)" "20000/2" "$($pl.ventesJour.caisse)/$($pl.ventesJour.tickets)"
Verifier "Accueil : alertes de stock (ruptures/bas)" "1/1" "$($pl.stock.ruptures)/$($pl.stock.stockBas)"
Verifier "Accueil : entreprise autonome, tresorerie lue" "True/True" "$($pl.autonome)/$($null -ne $pl.tresorerie)"
Verifier "Paiement fournisseur : achat a credit" "ok" (Appeler Post $h $j @{ fournisseur = "QUINCAM"; date = $ceJour; avecTva = $false; paiement = "A_CREDIT"; lignes = @(@{ articleId = $art.id; quantite = 5; coutUnitaire = 4000 }) })
$ac = $script:resultat
Verifier "Paiement fournisseur : acompte MTN MoMo" "15000/5000" (& { Appeler Post "$h/$($ac.id)/reglements" $j @{ date = $ceJour; montant = 15000; mode = "MTN_MOMO" } | Out-Null; "$($script:resultat.montantRegle)/$($script:resultat.reste)" })
Verifier "Paiement fournisseur : plus que le reste refuse" 400 (Appeler Post "$h/$($ac.id)/reglements" $j @{ date = $ceJour; montant = 6000; mode = "ESPECES" })
Verifier "Paiement fournisseur : date future refusee" 400 (Appeler Post "$h/$($ac.id)/reglements" $j @{ date = $demain; montant = 100; mode = "ESPECES" })
Appeler Get "$c/journal?journal=MM" $j | Out-Null
$p401 = @(@($script:resultat) | ForEach-Object { $_.mouvements } | Where-Object { $_.compte -eq "401" -and $_.debit -eq 15000 })
Verifier "Paiement fournisseur : 401 au debit, journal MM" 1 $p401.Count
Appeler Get $pil $j | Out-Null
Verifier "Accueil : reste a payer aux fournisseurs" 5000 $script:resultat.aPayer
Verifier "Paiement fournisseur : achat paye en partie non annulable" 409 (Appeler Post "$h/$($ac.id)/annuler" $j)
Appeler Get $h $j | Out-Null
$comptant = @($script:resultat) | Where-Object { $_.paiement -eq "MTN_MOMO" -and $_.statut -eq "VALIDE" } | Select-Object -First 1
Verifier "Paiement fournisseur : achat au comptant refuse" 409 (Appeler Post "$h/$($comptant.id)/reglements" $j @{ date = $ceJour; montant = 100; mode = "ESPECES" })
Verifier "Isolation : accueil d'une autre entreprise" 404 (Appeler Get $pil $autre.jeton)

$resultats | Format-Table -AutoSize
$echecs = @($resultats | Where-Object { $_.Resultat -ne "OK" }).Count
if ($echecs -eq 0) { Write-Host "Tous les tests du sprint 7 sont OK ($($resultats.Count))." -ForegroundColor Green }
else { Write-Host "$echecs test(s) en echec sur $($resultats.Count)." -ForegroundColor Red }