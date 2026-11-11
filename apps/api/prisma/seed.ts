import { PrismaClient, Regime, Role, StatutPiece } from '@prisma/client';
import { hash } from 'bcryptjs';
import { prochaineEcheance } from '../src/dossiers/echeances';

const prisma = new PrismaClient();

// Mot de passe commun aux comptes de démonstration uniquement
const MOT_DE_PASSE_DEMO = 'Marly2026!';

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
  // Ordre de suppression : des tables qui dépendent vers celles dont on dépend
  await prisma.demandePiece.deleteMany();
  await prisma.piece.deleteMany();
  await prisma.utilisateur.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.cabinet.deleteMany();

  const motDePasseHache = await hash(MOT_DE_PASSE_DEMO, 10);
  const echeance = prochaineEcheance(new Date());

  const cabinet = await prisma.cabinet.create({
    data: { nom: 'Cabinet Ngando & Associés' },
  });

  const marc = await prisma.utilisateur.create({
    data: {
      nom: 'Marc T.',
      email: 'marc@exemple.cm',
      motDePasseHache,
      role: Role.RESPONSABLE,
      cabinetId: cabinet.id,
    },
  });

  const idsDossiers: string[] = [];
  for (const [i, d] of dossiers.entries()) {
    const dossier = await prisma.dossier.create({
      data: { ...d, cabinetId: cabinet.id },
    });
    idsDossiers.push(dossier.id);
    const sesPieces = pieces.slice(0, 4 - (i % 3));
    await prisma.piece.createMany({
      data: sesPieces.map((p) => ({
        ...p,
        date: new Date(p.date),
        dossierId: dossier.id,
      })),
    });

    // Chaque reçu de taxi illisible fait l'objet d'une demande
    const illisible = await prisma.piece.findFirst({
      where: { dossierId: dossier.id, statut: StatutPiece.A_COMPLETER },
    });
    if (illisible) {
      await prisma.demandePiece.create({
        data: {
          dossierId: dossier.id,
          description: 'Montant illisible : recu taxi du 29/10',
          echeance,
          pieceId: illisible.id,
          demandeParId: marc.id,
        },
      });
    }
  }

  // Pièces manquantes réclamées à la Quincaillerie Essomba
  await prisma.demandePiece.createMany({
    data: [
      { dossierId: idsDossiers[0], description: "Releve MTN MoMo d'octobre", echeance, demandeParId: marc.id },
      { dossierId: idsDossiers[0], description: "Quittance de loyer d'octobre", echeance, demandeParId: marc.id },
    ],
  });

  await prisma.utilisateur.createMany({
    data: [
      {
        nom: 'Awa M.',
        email: 'awa@exemple.cm',
        motDePasseHache,
        role: Role.COMPTABLE,
        cabinetId: cabinet.id,
      },
      {
        nom: 'Paul Essomba',
        email: 'essomba@exemple.cm',
        motDePasseHache,
        role: Role.PME,
        cabinetId: cabinet.id,
        dossierId: idsDossiers[0],
      },
    ],
  });

  console.log('Donnees de demo creees : 3 comptes, 5 dossiers, 16 pieces, 4 demandes.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });