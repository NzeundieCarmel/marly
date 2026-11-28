-- CreateEnum
CREATE TYPE "StatutDevis" AS ENUM ('EN_COURS', 'ACCEPTE', 'REFUSE', 'TRANSFORME');

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateDevis" TIMESTAMP(3) NOT NULL,
    "validiteJours" INTEGER NOT NULL DEFAULT 30,
    "note" TEXT,
    "statut" "StatutDevis" NOT NULL DEFAULT 'EN_COURS',
    "regime" "Regime" NOT NULL,
    "tauxTva" DECIMAL(5,2) NOT NULL,
    "totalHt" INTEGER NOT NULL,
    "totalTva" INTEGER NOT NULL,
    "totalTtc" INTEGER NOT NULL,
    "factureId" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" TEXT NOT NULL,
    "devisId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "articleId" TEXT,
    "designation" TEXT NOT NULL,
    "detail" TEXT,
    "quantite" DECIMAL(12,3) NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "totalHt" INTEGER NOT NULL,

    CONSTRAINT "LigneDevis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurDevis" (
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurDevis_pkey" PRIMARY KEY ("dossierId","annee")
);

-- CreateIndex
CREATE UNIQUE INDEX "Devis_factureId_key" ON "Devis"("factureId");

-- CreateIndex
CREATE INDEX "Devis_dossierId_statut_idx" ON "Devis"("dossierId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_dossierId_numero_key" ON "Devis"("dossierId", "numero");

-- CreateIndex
CREATE INDEX "LigneDevis_devisId_idx" ON "LigneDevis"("devisId");

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientFacture"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneDevis" ADD CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
