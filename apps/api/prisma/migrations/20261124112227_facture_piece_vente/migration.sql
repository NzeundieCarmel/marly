/*
  Warnings:

  - A unique constraint covering the columns `[factureId]` on the table `Piece` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "factureId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Piece_factureId_key" ON "Piece"("factureId");

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
