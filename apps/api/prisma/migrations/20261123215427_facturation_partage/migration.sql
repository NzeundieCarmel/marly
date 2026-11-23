/*
  Warnings:

  - A unique constraint covering the columns `[jetonPartage]` on the table `Facture` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "jetonPartage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Facture_jetonPartage_key" ON "Facture"("jetonPartage");
