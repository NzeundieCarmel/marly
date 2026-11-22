-- CreateEnum
CREATE TYPE "StatutRattachement" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE');

-- AlterTable
ALTER TABLE "Cabinet" ADD COLUMN     "partenaire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ville" TEXT;

-- CreateTable
CREATE TABLE "DemandeRattachement" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "message" TEXT,
    "statut" "StatutRattachement" NOT NULL DEFAULT 'EN_ATTENTE',
    "creeParId" TEXT NOT NULL,
    "traiteParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traiteeLe" TIMESTAMP(3),

    CONSTRAINT "DemandeRattachement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeRattachement_cabinetId_statut_idx" ON "DemandeRattachement"("cabinetId", "statut");

-- CreateIndex
CREATE INDEX "DemandeRattachement_dossierId_statut_idx" ON "DemandeRattachement"("dossierId", "statut");

-- AddForeignKey
ALTER TABLE "DemandeRattachement" ADD CONSTRAINT "DemandeRattachement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRattachement" ADD CONSTRAINT "DemandeRattachement_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRattachement" ADD CONSTRAINT "DemandeRattachement_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeRattachement" ADD CONSTRAINT "DemandeRattachement_traiteParId_fkey" FOREIGN KEY ("traiteParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
