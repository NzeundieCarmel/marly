-- CreateEnum
CREATE TYPE "StatutInvitation" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "dossierId" TEXT,
    "role" "Role" NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "jetonHache" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "statut" "StatutInvitation" NOT NULL DEFAULT 'EN_ATTENTE',
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepteeLe" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_jetonHache_key" ON "Invitation"("jetonHache");

-- CreateIndex
CREATE INDEX "Invitation_cabinetId_statut_idx" ON "Invitation"("cabinetId", "statut");

-- CreateIndex
CREATE INDEX "Invitation_dossierId_statut_idx" ON "Invitation"("dossierId", "statut");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
