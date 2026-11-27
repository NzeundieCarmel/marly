-- CreateEnum
CREATE TYPE "TypeMouvementStock" AS ENUM ('ENTREE', 'SORTIE', 'INVENTAIRE');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT,
    "unite" TEXT NOT NULL,
    "prixVente" INTEGER NOT NULL,
    "tauxTva" INTEGER NOT NULL,
    "suiviStock" BOOLEAN NOT NULL DEFAULT true,
    "seuilAlerte" INTEGER NOT NULL DEFAULT 0,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "valeurStock" INTEGER NOT NULL DEFAULT 0,
    "coutMoyen" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "TypeMouvementStock" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantite" INTEGER NOT NULL,
    "coutUnitaire" INTEGER NOT NULL,
    "valeur" INTEGER NOT NULL,
    "quantiteApres" INTEGER NOT NULL,
    "valeurApres" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "origine" TEXT,
    "origineId" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_dossierId_nom_idx" ON "Article"("dossierId", "nom");

-- CreateIndex
CREATE UNIQUE INDEX "Article_dossierId_reference_key" ON "Article"("dossierId", "reference");

-- CreateIndex
CREATE INDEX "MouvementStock_articleId_date_idx" ON "MouvementStock"("articleId", "date");

-- CreateIndex
CREATE INDEX "MouvementStock_dossierId_date_idx" ON "MouvementStock"("dossierId", "date");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
