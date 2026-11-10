import { PrismaClient, Regime, Role, StatutPiece } from '@prisma/client';

const prisma = new PrismaClient();

const dossiers = [
  { raisonSociale: 'Quincaillerie Essomba', regime: Regime.REEL },
  { raisonSociale: 'Agence Wouri Services', regime: Regime.REEL },
  { raisonSociale: 'Boulangerie Le Pain Doré', regime: Regime.REEL },
  { raisonSociale: 'Studio Ndolo Graphik', regime: Regime.IGS },
  { raisonSociale: 'Salon Belle Afrique', regime: Regime.IGS },
];

const pieces = [
  { date: '2026-11-03', montantTtc: 59625, fournisseur: 'ENEO', categorie: 'Électricité, eau', statut: StatutPiece.RECUE },
  { date: '2026-11-02', montantTtc: 35000, fournisseur: 'Camtel', categorie: 'Télécommunications', statut: StatutPiece.RECUE },
  { date: '2026-10-30', montantTtc: 12500, fournisseur: 'Papeterie du Centre', categorie: 'Fournitures', statut: StatutPiece.TRAITEE },
  { date: '2026-10-29', montantTtc: 3000, fournisseur: null, categorie: 'Transport', statut: StatutPiece.A_COMPLETER },
];

async function main(): Promise<void> {
  // On vide la base pour pouvoir relancer le script autant de fois qu'on veut
  await prisma.piece.deleteMany();
  await prisma.utilisateur.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.cabinet.deleteMany();

  const cabinet = await prisma.cabinet.create({
    data: { nom: 'Cabinet Ngando & Associés' },
  });

  await prisma.utilisateur.create({
    data: {
      nom: 'Marc T.',
      email: 'marc@exemple.cm',
      motDePasseHache: 'a-definir',
      role: Role.RESPONSABLE,
      cabinetId: cabinet.id,
    },
  });

  for (const [i, d] of dossiers.entries()) {
    const dossier = await prisma.dossier.create({
      data: { ...d, cabinetId: cabinet.id },
    });
    // Un nombre de pièces différent par dossier, pour un tableau de bord réaliste
    const sesPieces = pieces.slice(0, 4 - (i % 3));
    await prisma.piece.createMany({
      data: sesPieces.map((p) => ({
        ...p,
        date: new Date(p.date),
        dossierId: dossier.id,
      })),
    });
  }

  console.log('Donnees de demo creees.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });