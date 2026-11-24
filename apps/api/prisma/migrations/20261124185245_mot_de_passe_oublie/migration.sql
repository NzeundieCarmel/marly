-- CreateTable
CREATE TABLE "CodeReinitialisation" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "codeHache" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "essais" INTEGER NOT NULL DEFAULT 0,
    "utiliseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeReinitialisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeReinitialisation_utilisateurId_creeLe_idx" ON "CodeReinitialisation"("utilisateurId", "creeLe");

-- AddForeignKey
ALTER TABLE "CodeReinitialisation" ADD CONSTRAINT "CodeReinitialisation_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
