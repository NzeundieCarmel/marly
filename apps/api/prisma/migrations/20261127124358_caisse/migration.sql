-- CreateEnum
CREATE TYPE "ModeCaisse" AS ENUM ('ESPECES', 'MTN_MOMO', 'ORANGE_MONEY');

-- CreateTable
CREATE TABLE "SessionCaisse" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "fondInitial" INTEGER NOT NULL,
    "ouverteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ouverteParId" TEXT NOT NULL,
    "fermeeLe" TIMESTAMP(3),
    "fermeeParId" TEXT,
    "especesComptees" INTEGER,
    "ecart" INTEGER,

    CONSTRAINT "SessionCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteCaisse" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalHt" INTEGER NOT NULL,
    "totalTva" INTEGER NOT NULL,
    "totalTtc" INTEGER NOT NULL,
    "mode" "ModeCaisse" NOT NULL,
    "montantRecu" INTEGER,
    "monnaie" INTEGER,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenteCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneVenteCaisse" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "articleId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" INTEGER NOT NULL,
    "tauxTva" INTEGER NOT NULL,
    "totalHt" INTEGER NOT NULL,
    "tva" INTEGER NOT NULL,
    "totalTtc" INTEGER NOT NULL,

    CONSTRAINT "LigneVenteCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteurTicket" (
    "dossierId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurTicket_pkey" PRIMARY KEY ("dossierId","annee")
);

-- CreateIndex
CREATE INDEX "SessionCaisse_dossierId_fermeeLe_idx" ON "SessionCaisse"("dossierId", "fermeeLe");

-- CreateIndex
CREATE INDEX "VenteCaisse_sessionId_idx" ON "VenteCaisse"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "VenteCaisse_dossierId_annee_numero_key" ON "VenteCaisse"("dossierId", "annee", "numero");

-- CreateIndex
CREATE INDEX "LigneVenteCaisse_venteId_idx" ON "LigneVenteCaisse"("venteId");

-- CreateIndex
CREATE INDEX "LigneVenteCaisse_articleId_idx" ON "LigneVenteCaisse"("articleId");

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteCaisse" ADD CONSTRAINT "VenteCaisse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVenteCaisse" ADD CONSTRAINT "LigneVenteCaisse_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "VenteCaisse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
