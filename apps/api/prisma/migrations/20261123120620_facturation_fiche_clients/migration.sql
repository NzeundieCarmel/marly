-- CreateTable
CREATE TABLE "ProfilFacturation" (
    "dossierId" TEXT NOT NULL,
    "formeJuridique" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "centreImpots" TEXT,
    "banque" TEXT,
    "compte" TEXT,
    "conditionsPaiement" TEXT,
    "penalitesRetard" TEXT,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfilFacturation_pkey" PRIMARY KEY ("dossierId")
);

-- CreateTable
CREATE TABLE "ClientFacture" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "niu" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientFacture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientFacture_dossierId_archive_idx" ON "ClientFacture"("dossierId", "archive");

-- AddForeignKey
ALTER TABLE "ProfilFacturation" ADD CONSTRAINT "ProfilFacturation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientFacture" ADD CONSTRAINT "ClientFacture_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
