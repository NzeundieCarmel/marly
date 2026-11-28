-- CreateEnum
CREATE TYPE "PaiementAchat" AS ENUM ('A_CREDIT', 'ESPECES', 'MTN_MOMO', 'ORANGE_MONEY', 'VIREMENT');

-- CreateEnum
CREATE TYPE "StatutAchat" AS ENUM ('VALIDE', 'ANNULE');

-- AlterEnum
ALTER TYPE "OrigineEcriture" ADD VALUE 'ACHAT';

-- CreateTable
CREATE TABLE "Achat" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "referenceFournisseur" TEXT,
    "avecTva" BOOLEAN NOT NULL,
    "totalHt" INTEGER NOT NULL,
    "totalTva" INTEGER NOT NULL,
    "totalTtc" INTEGER NOT NULL,
    "paiement" "PaiementAchat" NOT NULL,
    "statut" "StatutAchat" NOT NULL DEFAULT 'VALIDE',
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annuleLe" TIMESTAMP(3),

    CONSTRAINT "Achat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneAchat" (
    "id" TEXT NOT NULL,
    "achatId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "articleId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "coutUnitaire" INTEGER NOT NULL,
    "totalHt" INTEGER NOT NULL,

    CONSTRAINT "LigneAchat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurAchat" (
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurAchat_pkey" PRIMARY KEY ("dossierId","annee")
);

-- CreateIndex
CREATE INDEX "Achat_dossierId_date_idx" ON "Achat"("dossierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Achat_dossierId_annee_numero_key" ON "Achat"("dossierId", "annee", "numero");

-- CreateIndex
CREATE INDEX "LigneAchat_achatId_idx" ON "LigneAchat"("achatId");

-- AddForeignKey
ALTER TABLE "Achat" ADD CONSTRAINT "Achat_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneAchat" ADD CONSTRAINT "LigneAchat_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "Achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
