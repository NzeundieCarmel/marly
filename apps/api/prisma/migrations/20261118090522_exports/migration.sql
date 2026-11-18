-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "lotExportId" TEXT;

-- CreateTable
CREATE TABLE "LotExport" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "creeParId" TEXT NOT NULL,
    "nbPieces" INTEGER NOT NULL,
    "nbLignes" INTEGER NOT NULL,
    "totalDebit" INTEGER NOT NULL,
    "totalCredit" INTEGER NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LotExport_dossierId_creeLe_idx" ON "LotExport"("dossierId", "creeLe");

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_lotExportId_fkey" FOREIGN KEY ("lotExportId") REFERENCES "LotExport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotExport" ADD CONSTRAINT "LotExport_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotExport" ADD CONSTRAINT "LotExport_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
