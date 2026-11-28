-- AlterTable
ALTER TABLE "Achat" ADD COLUMN     "montantRegle" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReglementAchat" (
    "id" TEXT NOT NULL,
    "achatId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" INTEGER NOT NULL,
    "mode" "PaiementAchat" NOT NULL,
    "creeParId" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReglementAchat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReglementAchat_achatId_idx" ON "ReglementAchat"("achatId");

-- AddForeignKey
ALTER TABLE "ReglementAchat" ADD CONSTRAINT "ReglementAchat_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "Achat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
