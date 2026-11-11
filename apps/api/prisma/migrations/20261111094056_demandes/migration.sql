-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('OUVERTE', 'SATISFAITE', 'ANNULEE');

-- AlterEnum
ALTER TYPE "StatutPiece" ADD VALUE 'REMPLACEE';

-- CreateTable
CREATE TABLE "DemandePiece" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "echeance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'OUVERTE',
    "pieceId" TEXT,
    "reponseId" TEXT,
    "demandeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satisfaiteLe" TIMESTAMP(3),

    CONSTRAINT "DemandePiece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandePiece_reponseId_key" ON "DemandePiece"("reponseId");

-- CreateIndex
CREATE INDEX "DemandePiece_dossierId_statut_idx" ON "DemandePiece"("dossierId", "statut");

-- AddForeignKey
ALTER TABLE "DemandePiece" ADD CONSTRAINT "DemandePiece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandePiece" ADD CONSTRAINT "DemandePiece_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandePiece" ADD CONSTRAINT "DemandePiece_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "Piece"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandePiece" ADD CONSTRAINT "DemandePiece_demandeParId_fkey" FOREIGN KEY ("demandeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
