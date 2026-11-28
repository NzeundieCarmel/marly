/*
  Warnings:

  - A unique constraint covering the columns `[dossierId,numero]` on the table `Piece` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Piece" ADD COLUMN     "luAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "montantHt" INTEGER,
ADD COLUMN     "niuTiers" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "tva" INTEGER;

-- CreateTable
CREATE TABLE "CompteurPiece" (
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurPiece_pkey" PRIMARY KEY ("dossierId","annee")
);

-- CreateIndex
CREATE UNIQUE INDEX "Piece_dossierId_numero_key" ON "Piece"("dossierId", "numero");
