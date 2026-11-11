-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "journal" TEXT,
ADD COLUMN     "valideLe" TIMESTAMP(3),
ADD COLUMN     "valideParId" TEXT;

-- CreateTable
CREATE TABLE "LigneEcriture" (
    "id" TEXT NOT NULL,
    "pieceId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "compte" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "tiers" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LigneEcriture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LigneEcriture_pieceId_idx" ON "LigneEcriture"("pieceId");

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneEcriture" ADD CONSTRAINT "LigneEcriture_pieceId_fkey" FOREIGN KEY ("pieceId") REFERENCES "Piece"("id") ON DELETE CASCADE ON UPDATE CASCADE;
