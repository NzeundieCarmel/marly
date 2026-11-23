-- CreateEnum
CREATE TYPE "TypeFacture" AS ENUM ('FACTURE', 'AVOIR');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('BROUILLON', 'EMISE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "TypeFacture" NOT NULL DEFAULT 'FACTURE',
    "statut" "StatutFacture" NOT NULL DEFAULT 'BROUILLON',
    "numero" TEXT,
    "clientId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "regime" "Regime" NOT NULL,
    "tauxTva" DECIMAL(5,2) NOT NULL,
    "tauxRetenue" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalHt" INTEGER NOT NULL DEFAULT 0,
    "totalTva" INTEGER NOT NULL DEFAULT 0,
    "totalTtc" INTEGER NOT NULL DEFAULT 0,
    "retenue" INTEGER NOT NULL DEFAULT 0,
    "netAPayer" INTEGER NOT NULL DEFAULT 0,
    "emetteur" JSONB,
    "clientFige" JSONB,
    "factureOrigineId" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emiseLe" TIMESTAMP(3),

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "detail" TEXT,
    "quantite" DECIMAL(12,3) NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "totalHt" INTEGER NOT NULL,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurFacture" (
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "type" "TypeFacture" NOT NULL,
    "dernier" INTEGER NOT NULL,
    "clientFactureId" TEXT,

    CONSTRAINT "CompteurFacture_pkey" PRIMARY KEY ("dossierId","annee","type")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facture_factureOrigineId_key" ON "Facture"("factureOrigineId");

-- CreateIndex
CREATE INDEX "Facture_dossierId_statut_idx" ON "Facture"("dossierId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_dossierId_numero_key" ON "Facture"("dossierId", "numero");

-- CreateIndex
CREATE INDEX "LigneFacture_factureId_idx" ON "LigneFacture"("factureId");

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacture"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_factureOrigineId_fkey" FOREIGN KEY ("factureOrigineId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurFacture" ADD CONSTRAINT "CompteurFacture_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteurFacture" ADD CONSTRAINT "CompteurFacture_clientFactureId_fkey" FOREIGN KEY ("clientFactureId") REFERENCES "ClientFacture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
