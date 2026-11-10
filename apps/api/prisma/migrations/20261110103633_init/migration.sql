-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESPONSABLE', 'COMPTABLE', 'PME', 'ADMIN');

-- CreateEnum
CREATE TYPE "Regime" AS ENUM ('REEL', 'IGS');

-- CreateEnum
CREATE TYPE "StatutPiece" AS ENUM ('EN_ATTENTE', 'RECUE', 'A_COMPLETER', 'TRAITEE');

-- CreateTable
CREATE TABLE "Cabinet" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "niu" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cabinet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "motDePasseHache" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "cabinetId" TEXT NOT NULL,
    "dossierId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "niu" TEXT,
    "rccm" TEXT,
    "regime" "Regime" NOT NULL,
    "tauxTva" DECIMAL(5,2) NOT NULL DEFAULT 19.25,
    "cabinetId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piece" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montantTtc" INTEGER NOT NULL,
    "fournisseur" TEXT,
    "categorie" TEXT NOT NULL,
    "statut" "StatutPiece" NOT NULL DEFAULT 'RECUE',
    "fichier" TEXT,
    "empreinte" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Piece_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_telephone_key" ON "Utilisateur"("telephone");

-- CreateIndex
CREATE INDEX "Piece_dossierId_date_idx" ON "Piece"("dossierId", "date");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_cabinetId_fkey" FOREIGN KEY ("cabinetId") REFERENCES "Cabinet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
