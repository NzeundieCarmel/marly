-- CreateTable
CREATE TABLE "MemoireCompte" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "cleFournisseur" TEXT NOT NULL,
    "compte" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "utilisations" INTEGER NOT NULL DEFAULT 1,
    "majLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoireCompte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemoireCompte_cleFournisseur_idx" ON "MemoireCompte"("cleFournisseur");

-- CreateIndex
CREATE UNIQUE INDEX "MemoireCompte_dossierId_cleFournisseur_key" ON "MemoireCompte"("dossierId", "cleFournisseur");

-- AddForeignKey
ALTER TABLE "MemoireCompte" ADD CONSTRAINT "MemoireCompte_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
