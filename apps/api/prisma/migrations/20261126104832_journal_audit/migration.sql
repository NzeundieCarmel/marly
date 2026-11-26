-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" TEXT NOT NULL,
    "cabinetId" TEXT,
    "dossierId" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "nomUtilisateur" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "ip" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalAudit_cabinetId_creeLe_idx" ON "JournalAudit"("cabinetId", "creeLe");

-- CreateIndex
CREATE INDEX "JournalAudit_dossierId_creeLe_idx" ON "JournalAudit"("dossierId", "creeLe");
