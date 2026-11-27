import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TypeMouvementStock } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { ChargeJeton } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { FactureDto } from './dto/facture.dto';
import { FacturationService } from './facturation.service';

type Regime = 'REEL' | 'IGS';
type TypeFacture = 'FACTURE' | 'AVOIR';

export interface ClientFige {
  nom: string;
  adresse: string | null;
  niu: string | null;
  telephone: string | null;
  email: string | null;
}

export interface FactureResume {
  id: string;
  type: TypeFacture;
  statut: 'BROUILLON' | 'EMISE' | 'ANNULEE';
  numero: string | null;
  client: string;
  dateEmission: Date | null;
  totalTtc: number;
  netAPayer: number;
  creeLe: Date;
}

export interface FactureDetail extends FactureResume {
  clientId: string;
  clientDetail: ClientFige;
  dateEcheance: Date | null;
  regime: Regime;
  tauxTva: number;
  tauxRetenue: number;
  totalHt: number;
  totalTva: number;
  retenue: number;
  emetteur: Prisma.JsonValue;
  lignes: {
    articleId?: string | null;
    designation: string;
    detail: string | null;
    quantite: number;
    prixUnitaire: number;
    totalHt: number;
  }[];
  factureOrigine: { id: string; numero: string | null } | null;
  avoir: { id: string; numero: string | null } | null;
  jetonPartage: string | null;
}

// Ce que voit le client par le lien public : aucun identifiant interne
export interface FactureDocument {
  type: TypeFacture;
  statut: 'BROUILLON' | 'EMISE' | 'ANNULEE';
  numero: string | null;
  dateEmission: Date | null;
  dateEcheance: Date | null;
  regime: Regime;
  tauxTva: number;
  tauxRetenue: number;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  retenue: number;
  netAPayer: number;
  client: ClientFige;
  emetteur: Prisma.JsonValue;
  lignes: FactureDetail['lignes'];
  factureOrigine: { numero: string | null } | null;
  avoir: { numero: string | null } | null;
}

const MAXIMUM = 2_000_000_000;
const CATEGORIE_VENTE = 'Ventes';
const CATEGORIE_AVOIR = 'Avoir sur ventes';

const INCLURE = {
  client: {
    select: {
      id: true,
      nom: true,
      adresse: true,
      niu: true,
      telephone: true,
      email: true,
    },
  },
  lignes: { orderBy: { ordre: 'asc' as const } },
  factureOrigine: { select: { id: true, numero: true } },
  avoir: { select: { id: true, numero: true } },
} satisfies Prisma.FactureInclude;

type FactureComplete = Prisma.FactureGetPayload<{ include: typeof INCLURE }>;

// Jour courant à l'heure du Cameroun, au format AAAA-MM-JJ
function aujourdhui(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Douala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function jourEnDate(jour: string): Date {
  return new Date(`${jour}T00:00:00.000Z`);
}

// Tous les montants en FCFA entiers ; la TVA n'existe qu'au régime du réel
function calculer(
  lignes: { quantite: number; prixUnitaire: number }[],
  regime: Regime,
  tauxTva: number,
  tauxRetenue: number,
) {
  const totaux = lignes.map((l) => Math.round(l.quantite * l.prixUnitaire));
  const totalHt = totaux.reduce((somme, t) => somme + t, 0);
  const totalTva =
    regime === 'REEL' ? Math.round((totalHt * tauxTva) / 100) : 0;
  const totalTtc = totalHt + totalTva;
  const retenue = Math.round((totalHt * tauxRetenue) / 100);
  if (totalTtc > MAXIMUM) {
    throw new BadRequestException(
      'Montant total trop élevé (2 milliards FCFA au maximum)',
    );
  }
  return {
    totaux,
    totalHt,
    totalTva,
    totalTtc,
    retenue,
    netAPayer: totalTtc - retenue,
  };
}

function versDetail(f: FactureComplete): FactureDetail {
  const fige = f.clientFige as unknown as ClientFige | null;
  const client: ClientFige = fige ?? {
    nom: f.client.nom,
    adresse: f.client.adresse,
    niu: f.client.niu,
    telephone: f.client.telephone,
    email: f.client.email,
  };
  return {
    id: f.id,
    type: f.type,
    statut: f.statut,
    numero: f.numero,
    client: client.nom,
    clientId: f.clientId,
    clientDetail: client,
    dateEmission: f.dateEmission,
    dateEcheance: f.dateEcheance,
    regime: f.regime,
    tauxTva: f.tauxTva.toNumber(),
    tauxRetenue: f.tauxRetenue.toNumber(),
    totalHt: f.totalHt,
    totalTva: f.totalTva,
    totalTtc: f.totalTtc,
    retenue: f.retenue,
    netAPayer: f.netAPayer,
    emetteur: f.emetteur,
    lignes: f.lignes.map((l) => ({
      articleId: l.articleId,
      designation: l.designation,
      detail: l.detail,
      quantite: l.quantite.toNumber(),
      prixUnitaire: l.prixUnitaire,
      totalHt: l.totalHt,
    })),
    factureOrigine: f.factureOrigine,
    avoir: f.avoir,
    creeLe: f.creeLe,
    jetonPartage: f.jetonPartage,
  };
}

@Injectable()
export class FacturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly facturation: FacturationService,
    private readonly stock: StockService,
  ) {}

  private dossierDe(utilisateur: ChargeJeton): string {
    if (!utilisateur.dossierId) {
      throw new ForbiddenException('Aucun dossier rattaché à ce compte');
    }
    return utilisateur.dossierId;
  }

  private async charger(
    dossierId: string,
    id: string,
  ): Promise<FactureComplete> {
    const facture = await this.prisma.facture.findFirst({
      where: { AND: [{ id }, { dossierId }] },
      include: INCLURE,
    });
    if (!facture) throw new NotFoundException('Facture introuvable');
    return facture;
  }

  // Numéro suivant, attribué dans la transaction de l'émission : annulé avec elle en cas d'échec
  private async prochainNumero(
    tx: Prisma.TransactionClient,
    dossierId: string,
    annee: number,
    type: TypeFacture,
  ): Promise<string> {
    const resultat = await tx.$queryRaw<{ dernier: number }[]>`
      INSERT INTO "CompteurFacture" ("dossierId", "annee", "type", "dernier")
      VALUES (${dossierId}, ${annee}, ${type}::"TypeFacture", 1)
      ON CONFLICT ("dossierId", "annee", "type")
      DO UPDATE SET "dernier" = "CompteurFacture"."dernier" + 1
      RETURNING "dernier"`;
    const rang = Number(resultat[0].dernier);
    return `${type === 'FACTURE' ? 'FAC' : 'AV'}-${annee}-${String(rang).padStart(4, '0')}`;
  }

  async lister(utilisateur: ChargeJeton): Promise<FactureResume[]> {
    const liste = await this.prisma.facture.findMany({
      where: { dossierId: this.dossierDe(utilisateur) },
      orderBy: { creeLe: 'desc' },
      take: 100,
      include: { client: { select: { nom: true } } },
    });
    return liste.map((f) => ({
      id: f.id,
      type: f.type,
      statut: f.statut,
      numero: f.numero,
      client: (f.clientFige as { nom?: string } | null)?.nom ?? f.client.nom,
      dateEmission: f.dateEmission,
      totalTtc: f.totalTtc,
      netAPayer: f.netAPayer,
      creeLe: f.creeLe,
    }));
  }

  async lire(utilisateur: ChargeJeton, id: string): Promise<FactureDetail> {
    return versDetail(await this.charger(this.dossierDe(utilisateur), id));
  }

  // Contrôle le client et calcule les montants d'un brouillon, au régime actuel du dossier
  private async preparer(dossierId: string, dto: FactureDto) {
    const client = await this.prisma.clientFacture.findFirst({
      where: { AND: [{ id: dto.clientId }, { dossierId }, { archive: false }] },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { regime: true, tauxTva: true },
    });
    if (!dossier) throw new NotFoundException('Dossier introuvable');
    if (dto.dateEcheance && dto.dateEcheance < aujourdhui()) {
      throw new BadRequestException(
        "La date d'échéance ne peut pas être déjà passée",
      );
    }

    // Les articles cites appartiennent a l'entreprise ; un article suivi en stock se compte en unites entieres
    const idsArticles = [
      ...new Set(
        dto.lignes
          .map((l) => l.articleId)
          .filter((a): a is string => Boolean(a)),
      ),
    ];
    if (idsArticles.length > 0) {
      const articles = await this.prisma.article.findMany({
        where: { id: { in: idsArticles }, dossierId, actif: true },
        select: { id: true, suiviStock: true },
      });
      if (articles.length !== idsArticles.length) {
        throw new NotFoundException('Article introuvable');
      }
      const suivis = new Set(
        articles.filter((a) => a.suiviStock).map((a) => a.id),
      );
      const decimale = dto.lignes.some(
        (l) =>
          l.articleId &&
          suivis.has(l.articleId) &&
          !Number.isInteger(l.quantite),
      );
      if (decimale) {
        throw new BadRequestException(
          'Un article suivi en stock se facture en quantité entière',
        );
      }
    }

    const tauxRetenue = dto.tauxRetenue ?? 0;
    const calcul = calculer(
      dto.lignes,
      dossier.regime,
      dossier.tauxTva.toNumber(),
      tauxRetenue,
    );
    return {
      donnees: {
        clientId: client.id,
        dateEcheance: dto.dateEcheance ? jourEnDate(dto.dateEcheance) : null,
        regime: dossier.regime,
        tauxTva: dossier.tauxTva,
        tauxRetenue: new Prisma.Decimal(tauxRetenue),
        totalHt: calcul.totalHt,
        totalTva: calcul.totalTva,
        totalTtc: calcul.totalTtc,
        retenue: calcul.retenue,
        netAPayer: calcul.netAPayer,
      },
      lignes: dto.lignes.map((l, i) => ({
        ordre: i + 1,
        designation: l.designation,
        detail: l.detail || null,
        articleId: l.articleId || null,
        quantite: new Prisma.Decimal(l.quantite),
        prixUnitaire: l.prixUnitaire,
        totalHt: calcul.totaux[i],
      })),
    };
  }

  async creer(
    utilisateur: ChargeJeton,
    dto: FactureDto,
  ): Promise<FactureDetail> {
    const dossierId = this.dossierDe(utilisateur);
    const { donnees, lignes } = await this.preparer(dossierId, dto);
    const facture = await this.prisma.facture.create({
      data: {
        dossierId,
        creeParId: utilisateur.sub,
        ...donnees,
        lignes: { create: lignes },
      },
      select: { id: true },
    });
    return this.lire(utilisateur, facture.id);
  }

  async modifier(
    utilisateur: ChargeJeton,
    id: string,
    dto: FactureDto,
  ): Promise<FactureDetail> {
    const dossierId = this.dossierDe(utilisateur);
    await this.charger(dossierId, id);
    const { donnees, lignes } = await this.preparer(dossierId, dto);
    await this.prisma.$transaction(async (tx) => {
      // Statut vérifié dans la mise à jour même : une facture émise entre-temps n'est pas touchée
      const maj = await tx.facture.updateMany({
        where: { id, dossierId, statut: 'BROUILLON' },
        data: donnees,
      });
      if (maj.count !== 1) {
        throw new ConflictException(
          'Une facture émise ne peut plus être modifiée. Faites un avoir.',
        );
      }
      await tx.ligneFacture.deleteMany({ where: { factureId: id } });
      await tx.ligneFacture.createMany({
        data: lignes.map((l) => ({ ...l, factureId: id })),
      });
    });
    return this.lire(utilisateur, id);
  }

  async supprimer(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<{ id: string }> {
    const dossierId = this.dossierDe(utilisateur);
    await this.charger(dossierId, id);
    const resultat = await this.prisma.facture.deleteMany({
      where: { id, dossierId, statut: 'BROUILLON' },
    });
    if (resultat.count !== 1) {
      throw new ConflictException('Seul un brouillon peut être supprimé');
    }
    return { id };
  }

  async emettre(utilisateur: ChargeJeton, id: string): Promise<FactureDetail> {
    const dossierId = this.dossierDe(utilisateur);
    const profil = await this.facturation.lireProfil(utilisateur);
    if (profil.manquants.length > 0) {
      throw new BadRequestException(
        `Complétez d'abord votre fiche : ${profil.manquants.join(', ')}`,
      );
    }
    const jour = aujourdhui();

    await this.prisma.$transaction(async (tx) => {
      const f = await tx.facture.findFirst({
        where: { AND: [{ id }, { dossierId }] },
        include: { lignes: true, client: true },
      });
      if (!f) throw new NotFoundException('Facture introuvable');
      if (f.statut !== 'BROUILLON')
        throw new ConflictException('Cette facture est déjà émise');
      if (f.client.archive) {
        throw new BadRequestException(
          'Ce client a été retiré de votre carnet. Choisissez-en un autre.',
        );
      }
      if (f.dateEcheance && f.dateEcheance.toISOString().slice(0, 10) < jour) {
        throw new BadRequestException(
          "La date d'échéance est passée. Modifiez-la avant d'émettre.",
        );
      }

      // Montants recalculés au régime du jour de l'émission
      const calcul = calculer(
        f.lignes.map((l) => ({
          quantite: l.quantite.toNumber(),
          prixUnitaire: l.prixUnitaire,
        })),
        profil.regime,
        profil.tauxTva,
        f.tauxRetenue.toNumber(),
      );
      if (calcul.totalTtc <= 0) {
        throw new BadRequestException(
          'La facture doit avoir un montant supérieur à zéro',
        );
      }

      const numero = await this.prochainNumero(
        tx,
        dossierId,
        Number(jour.slice(0, 4)),
        'FACTURE',
      );
      const maj = await tx.facture.updateMany({
        where: { id, statut: 'BROUILLON' },
        data: {
          statut: 'EMISE',
          numero,
          dateEmission: jourEnDate(jour),
          emiseLe: new Date(),
          regime: profil.regime,
          tauxTva: new Prisma.Decimal(profil.tauxTva),
          totalHt: calcul.totalHt,
          totalTva: calcul.totalTva,
          totalTtc: calcul.totalTtc,
          retenue: calcul.retenue,
          netAPayer: calcul.netAPayer,
          // Copies figées : modifier la fiche plus tard ne change pas une facture émise
          emetteur: {
            raisonSociale: profil.raisonSociale,
            niu: profil.niu,
            rccm: profil.rccm,
            regime: profil.regime,
            ...profil.fiche,
          },
          clientFige: {
            nom: f.client.nom,
            adresse: f.client.adresse,
            niu: f.client.niu,
            telephone: f.client.telephone,
            email: f.client.email,
          },
        },
      });
      if (maj.count !== 1)
        throw new ConflictException('Cette facture est déjà émise');

      // La facture devient une pièce de vente du dossier, dans la même transaction que son numéro
      await tx.piece.create({
        data: {
          dossierId,
          date: jourEnDate(jour),
          montantTtc: calcul.totalTtc,
          fournisseur: f.client.nom,
          categorie: CATEGORIE_VENTE,
          statut: 'RECUE',
          factureId: id,
        },
      });

      // Les articles suivis en stock sortent au cout moyen pondere, dans la meme transaction
      for (const l of f.lignes) {
        if (!l.articleId) continue;
        const article = await tx.article.findFirst({
          where: { id: l.articleId, dossierId },
          select: { suiviStock: true, nom: true },
        });
        if (!article?.suiviStock) continue;
        const quantite = l.quantite.toNumber();
        if (!Number.isInteger(quantite)) {
          throw new BadRequestException(
            `La quantité de ${article.nom} doit être un nombre entier`,
          );
        }
        try {
          await this.stock.mouvementer(tx, l.articleId, {
            type: TypeMouvementStock.SORTIE,
            quantite,
            date: jourEnDate(jour),
            motif: `Facture ${numero}`,
            origine: 'FACTURE',
            origineId: id,
            creeParId: utilisateur.sub,
          });
        } catch (erreur) {
          if (erreur instanceof ConflictException) {
            throw new ConflictException(
              `Stock insuffisant pour ${article.nom}`,
            );
          }
          throw erreur;
        }
      }
    });
    return this.lire(utilisateur, id);
  }

  // Annulation totale : un avoir du même montant, émis aussitôt avec son propre numéro
  async creerAvoir(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<FactureDetail> {
    const dossierId = this.dossierDe(utilisateur);
    const jour = aujourdhui();

    const avoirId = await this.prisma.$transaction(async (tx) => {
      const f = await tx.facture.findFirst({
        where: { AND: [{ id }, { dossierId }, { type: 'FACTURE' }] },
        include: { lignes: true },
      });
      if (!f) throw new NotFoundException('Facture introuvable');
      if (f.statut !== 'EMISE') {
        throw new ConflictException(
          'Seule une facture émise, et pas encore annulée, peut recevoir un avoir',
        );
      }

      const numero = await this.prochainNumero(
        tx,
        dossierId,
        Number(jour.slice(0, 4)),
        'AVOIR',
      );
      const maj = await tx.facture.updateMany({
        where: { id, statut: 'EMISE' },
        data: { statut: 'ANNULEE' },
      });
      if (maj.count !== 1)
        throw new ConflictException('Cette facture a déjà été annulée');

      const avoir = await tx.facture.create({
        data: {
          dossierId,
          type: 'AVOIR',
          statut: 'EMISE',
          numero,
          clientId: f.clientId,
          dateEmission: jourEnDate(jour),
          emiseLe: new Date(),
          regime: f.regime,
          tauxTva: f.tauxTva,
          tauxRetenue: f.tauxRetenue,
          totalHt: f.totalHt,
          totalTva: f.totalTva,
          totalTtc: f.totalTtc,
          retenue: f.retenue,
          netAPayer: f.netAPayer,
          emetteur: (f.emetteur ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          clientFige: (f.clientFige ??
            Prisma.JsonNull) as Prisma.InputJsonValue,
          factureOrigineId: f.id,
          creeParId: utilisateur.sub,
          lignes: {
            create: f.lignes.map((l) => ({
              ordre: l.ordre,
              designation: l.designation,
              detail: l.detail,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              totalHt: l.totalHt,
            })),
          },
        },
        select: { id: true },
      });
      await tx.piece.create({
        data: {
          dossierId,
          date: jourEnDate(jour),
          montantTtc: f.totalTtc,
          fournisseur:
            (f.clientFige as { nom?: string } | null)?.nom ?? 'Client',
          categorie: CATEGORIE_AVOIR,
          statut: 'RECUE',
          factureId: avoir.id,
        },
      });

      // Les articles sortis par la facture reviennent en stock, a leur cout de sortie
      const sorties = await tx.mouvementStock.findMany({
        where: { origine: 'FACTURE', origineId: f.id },
        select: { articleId: true, quantite: true, coutUnitaire: true },
      });
      for (const s of sorties) {
        const article = await tx.article.findUnique({
          where: { id: s.articleId },
          select: { suiviStock: true },
        });
        if (!article?.suiviStock) continue;
        await this.stock.mouvementer(tx, s.articleId, {
          type: TypeMouvementStock.ENTREE,
          quantite: -s.quantite,
          coutUnitaire: s.coutUnitaire,
          date: jourEnDate(jour),
          motif: `Avoir ${numero}`,
          origine: 'AVOIR',
          origineId: avoir.id,
          creeParId: utilisateur.sub,
        });
      }
      return avoir.id;
    });
    return this.lire(utilisateur, avoirId);
  }

  // Lien public à envoyer au client : 256 bits aléatoires, impossibles à deviner
  async partager(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<{ jeton: string }> {
    const facture = await this.charger(this.dossierDe(utilisateur), id);
    if (facture.statut === 'BROUILLON') {
      throw new ConflictException(
        "Un brouillon ne se partage pas. Émettez d'abord la facture.",
      );
    }
    if (facture.jetonPartage) return { jeton: facture.jetonPartage };
    const jeton = randomBytes(32).toString('base64url');
    await this.prisma.facture.update({
      where: { id },
      data: { jetonPartage: jeton },
    });
    return { jeton };
  }

  async desactiverPartage(
    utilisateur: ChargeJeton,
    id: string,
  ): Promise<{ id: string }> {
    await this.charger(this.dossierDe(utilisateur), id);
    await this.prisma.facture.update({
      where: { id },
      data: { jetonPartage: null },
    });
    return { id };
  }

  private versDocument(f: FactureComplete): FactureDocument {
    const d = versDetail(f);
    return {
      type: d.type,
      statut: d.statut,
      numero: d.numero,
      dateEmission: d.dateEmission,
      dateEcheance: d.dateEcheance,
      regime: d.regime,
      tauxTva: d.tauxTva,
      tauxRetenue: d.tauxRetenue,
      totalHt: d.totalHt,
      totalTva: d.totalTva,
      totalTtc: d.totalTtc,
      retenue: d.retenue,
      netAPayer: d.netAPayer,
      client: d.clientDetail,
      emetteur: d.emetteur,
      lignes: d.lignes.map((l) => ({
        designation: l.designation,
        detail: l.detail,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        totalHt: l.totalHt,
      })),
      factureOrigine: d.factureOrigine
        ? { numero: d.factureOrigine.numero }
        : null,
      avoir: d.avoir ? { numero: d.avoir.numero } : null,
    };
  }

  async lirePublic(jeton: string): Promise<FactureDocument> {
    // Un jeton mal formé ne déclenche même pas de requête
    if (!/^[A-Za-z0-9_-]{43}$/.test(jeton))
      throw new NotFoundException('Facture introuvable');
    const f = await this.prisma.facture.findUnique({
      where: { jetonPartage: jeton },
      include: INCLURE,
    });
    if (!f || f.statut === 'BROUILLON')
      throw new NotFoundException('Facture introuvable');
    return this.versDocument(f);
  }

  // Pour le cabinet : l'accès est vérifié en amont, à travers la pièce de vente
  async documentParId(factureId: string): Promise<FactureDocument> {
    const f = await this.prisma.facture.findUnique({
      where: { id: factureId },
      include: INCLURE,
    });
    if (!f) throw new NotFoundException('Facture introuvable');
    return this.versDocument(f);
  }
}
