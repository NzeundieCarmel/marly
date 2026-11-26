-- CreateEnum
CREATE TYPE "ModeReglement" AS ENUM ('ESPECES', 'VIREMENT', 'MTN_MOMO', 'ORANGE_MONEY', 'CHEQUE', 'AUTRE');

-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "derniereRelanceLe" TIMESTAMP(3),
ADD COLUMN     "montantRegle" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReglementFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" INTEGER NOT NULL,
    "mode" "ModeReglement" NOT NULL,
    "reference" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReglementFacture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReglementFacture_factureId_idx" ON "ReglementFacture"("factureId");

-- AddForeignKey
ALTER TABLE "ReglementFacture" ADD CONSTRAINT "ReglementFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
