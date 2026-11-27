-- CreateEnum
CREATE TYPE "OrigineEcriture" AS ENUM ('PIECE', 'CAISSE', 'STOCK', 'MANUELLE');

-- CreateTable
CREATE TABLE "EcritureComptable" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "libelle" TEXT NOT NULL,
    "origine" "OrigineEcriture" NOT NULL,
    "origineId" TEXT,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcritureComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementComptable" (
    "id" TEXT NOT NULL,
    "ecritureId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ordre" INTEGER NOT NULL,
    "compte" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "tiers" TEXT,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MouvementComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompteDossier" (
    "dossierId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompteDossier_pkey" PRIMARY KEY ("dossierId","numero")
);

-- CreateTable
CREATE TABLE "CompteurEcriture" (
    "dossierId" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "CompteurEcriture_pkey" PRIMARY KEY ("dossierId","journal","annee")
);

-- CreateIndex
CREATE INDEX "EcritureComptable_dossierId_date_idx" ON "EcritureComptable"("dossierId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EcritureComptable_dossierId_journal_annee_numero_key" ON "EcritureComptable"("dossierId", "journal", "annee", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "EcritureComptable_origine_origineId_key" ON "EcritureComptable"("origine", "origineId");

-- CreateIndex
CREATE INDEX "MouvementComptable_dossierId_compte_date_idx" ON "MouvementComptable"("dossierId", "compte", "date");

-- CreateIndex
CREATE INDEX "MouvementComptable_ecritureId_idx" ON "MouvementComptable"("ecritureId");

-- AddForeignKey
ALTER TABLE "EcritureComptable" ADD CONSTRAINT "EcritureComptable_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementComptable" ADD CONSTRAINT "MouvementComptable_ecritureId_fkey" FOREIGN KEY ("ecritureId") REFERENCES "EcritureComptable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompteDossier" ADD CONSTRAINT "CompteDossier_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Reprise dans le grand livre des pieces deja validees
INSERT INTO "EcritureComptable" ("id", "dossierId", "journal", "annee", "numero", "date", "libelle", "origine", "origineId", "creeParId", "creeLe")
SELECT 'gl_' || p."id", p."dossierId", COALESCE(p."journal", 'AC'),
       EXTRACT(YEAR FROM p."date")::int,
       (ROW_NUMBER() OVER (PARTITION BY p."dossierId", COALESCE(p."journal", 'AC'), EXTRACT(YEAR FROM p."date") ORDER BY p."date", p."valideLe", p."id"))::int,
       p."date", LEFT(COALESCE(p."fournisseur", p."categorie"), 120), 'PIECE'::"OrigineEcriture", p."id",
       COALESCE(p."valideParId", ''), COALESCE(p."valideLe", p."creeLe")
FROM "Piece" p
WHERE p."statut" = 'TRAITEE'
  AND EXISTS (SELECT 1 FROM "LigneEcriture" l WHERE l."pieceId" = p."id");

INSERT INTO "MouvementComptable" ("id", "ecritureId", "dossierId", "date", "ordre", "compte", "libelle", "tiers", "debit", "credit")
SELECT 'gl_' || l."id", 'gl_' || l."pieceId", p."dossierId", p."date", l."ordre", l."compte", l."libelle", l."tiers", l."debit", l."credit"
FROM "LigneEcriture" l
JOIN "Piece" p ON p."id" = l."pieceId"
WHERE p."statut" = 'TRAITEE';

INSERT INTO "CompteurEcriture" ("dossierId", "journal", "annee", "dernier")
SELECT "dossierId", "journal", "annee", MAX("numero")
FROM "EcritureComptable"
GROUP BY "dossierId", "journal", "annee";