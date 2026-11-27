import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TypeMouvementStock } from '@prisma/client';
import type { ChargeJeton } from '../auth/auth.service';
import { DossiersService } from '../dossiers/dossiers.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ArticleDto,
  InventaireDto,
  ModifArticleDto,
  MouvementDto,
} from './dto/stock.dto';

export type EtatStock = 'EN_STOCK' | 'STOCK_BAS' | 'RUPTURE' | 'SANS_SUIVI';

// Un mouvement demande par un ecran ou un autre module (caisse, achats)
export interface MouvementDemande {
  type: TypeMouvementStock;
  // ENTREE et SORTIE : quantite positive ; INVENTAIRE : ecart signe
  quantite: number;
  coutUnitaire?: number;
  date: Date;
  motif: string;
  origine?: string | null;
  origineId?: string | null;
  creeParId: string;
}

const VALEUR_MAX = 2_000_000_000;

const CHAMPS = {
  id: true,
  reference: true,
  nom: true,
  categorie: true,
  unite: true,
  prixVente: true,
  tauxTva: true,
  suiviStock: true,
  seuilAlerte: true,
  quantite: true,
  valeurStock: true,
  coutMoyen: true,
  actif: true,
} satisfies Prisma.ArticleSelect;

type ArticleLu = Prisma.ArticleGetPayload<{ select: typeof CHAMPS }>;

function etat(a: {
  suiviStock: boolean;
  quantite: number;
  seuilAlerte: number;
}): EtatStock {
  if (!a.suiviStock) return 'SANS_SUIVI';
  if (a.quantite <= 0) return 'RUPTURE';
  if (a.quantite <= a.seuilAlerte) return 'STOCK_BAS';
  return 'EN_STOCK';
}

// Une date AAAA-MM-JJ a minuit UTC ; sans date, aujourd'hui
function jour(valeur?: string): Date {
  if (!valeur) {
    const d = new Date();
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }
  const date = new Date(`${valeur}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== valeur
  ) {
    throw new BadRequestException('Date invalide');
  }
  return date;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dossiers: DossiersService,
  ) {}

  // Lecture : tout utilisateur qui a acces au dossier. Ecriture : l'entreprise elle-meme
  private async acces(
    dossierId: string,
    utilisateur: ChargeJeton,
    ecriture: boolean,
  ): Promise<void> {
    try {
      await this.dossiers.verifierAcces(dossierId, utilisateur);
    } catch {
      throw new NotFoundException('Dossier introuvable');
    }
    if (ecriture && utilisateur.role !== 'PME') {
      throw new ForbiddenException('Le stock est tenu par l’entreprise');
    }
  }

  private async trouver(dossierId: string, id: string): Promise<ArticleLu> {
    const article = await this.prisma.article.findFirst({
      where: { id, dossierId },
      select: CHAMPS,
    });
    if (!article) {
      throw new NotFoundException('Article introuvable');
    }
    return article;
  }

  async lister(
    dossierId: string,
    utilisateur: ChargeJeton,
    recherche?: string,
    alerte?: boolean,
  ) {
    await this.acces(dossierId, utilisateur, false);
    const q = recherche?.trim().slice(0, 60);
    const articles = await this.prisma.article.findMany({
      where: {
        dossierId,
        actif: true,
        ...(q
          ? {
              OR: [
                { nom: { contains: q, mode: Prisma.QueryMode.insensitive } },
                {
                  reference: {
                    contains: q,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  categorie: {
                    contains: q,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { nom: 'asc' },
      take: 500,
      select: CHAMPS,
    });
    const liste = articles.map((a) => ({ ...a, etat: etat(a) }));
    return alerte
      ? liste.filter((a) => a.etat === 'RUPTURE' || a.etat === 'STOCK_BAS')
      : liste;
  }

  async resume(dossierId: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const articles = await this.prisma.article.findMany({
      where: { dossierId, actif: true, suiviStock: true },
      select: {
        suiviStock: true,
        quantite: true,
        seuilAlerte: true,
        valeurStock: true,
      },
    });
    const etats = articles.map(etat);
    return {
      articles: articles.length,
      valeur: articles.reduce((s, a) => s + a.valeurStock, 0),
      ruptures: etats.filter((e) => e === 'RUPTURE').length,
      stockBas: etats.filter((e) => e === 'STOCK_BAS').length,
    };
  }

  async detail(dossierId: string, id: string, utilisateur: ChargeJeton) {
    await this.acces(dossierId, utilisateur, false);
    const article = await this.trouver(dossierId, id);
    const mouvements = await this.prisma.mouvementStock.findMany({
      where: { articleId: id },
      orderBy: [{ date: 'desc' }, { creeLe: 'desc' }],
      take: 50,
      select: {
        id: true,
        type: true,
        date: true,
        quantite: true,
        coutUnitaire: true,
        valeur: true,
        quantiteApres: true,
        valeurApres: true,
        motif: true,
        origine: true,
      },
    });
    return { ...article, etat: etat(article), mouvements };
  }

  async creer(dossierId: string, utilisateur: ChargeJeton, dto: ArticleDto) {
    await this.acces(dossierId, utilisateur, true);
    const suivi = dto.suiviStock ?? true;
    const initiale = suivi ? (dto.quantiteInitiale ?? 0) : 0;
    if (initiale > 0 && dto.coutInitial === undefined) {
      throw new BadRequestException(
        'Indiquez le cout d’achat unitaire du stock initial',
      );
    }
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const article = await tx.article.create({
          data: {
            dossierId,
            reference: dto.reference.trim().toUpperCase(),
            nom: dto.nom.trim(),
            categorie: dto.categorie?.trim() || null,
            unite: dto.unite,
            prixVente: dto.prixVente,
            tauxTva: dto.tauxTva,
            suiviStock: suivi,
            seuilAlerte: dto.seuilAlerte ?? 0,
          },
          select: { id: true },
        });
        if (initiale > 0) {
          await this.mouvementer(tx, article.id, {
            type: TypeMouvementStock.ENTREE,
            quantite: initiale,
            coutUnitaire: dto.coutInitial,
            date: jour(),
            motif: 'Stock initial',
            creeParId: utilisateur.sub,
          });
        }
        return article.id;
      });
    } catch (erreur) {
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ConflictException('Cette reference existe deja');
      }
      throw erreur;
    }
    return this.detail(dossierId, id, utilisateur);
  }

  async modifier(
    dossierId: string,
    id: string,
    utilisateur: ChargeJeton,
    dto: ModifArticleDto,
  ) {
    await this.acces(dossierId, utilisateur, true);
    await this.trouver(dossierId, id);
    await this.prisma.article.update({
      where: { id },
      data: {
        nom: dto.nom?.trim(),
        categorie:
          dto.categorie === undefined
            ? undefined
            : dto.categorie.trim() || null,
        unite: dto.unite,
        prixVente: dto.prixVente,
        tauxTva: dto.tauxTva,
        seuilAlerte: dto.seuilAlerte,
        actif: dto.actif,
      },
    });
    return this.detail(dossierId, id, utilisateur);
  }

  async mouvement(
    dossierId: string,
    id: string,
    utilisateur: ChargeJeton,
    dto: MouvementDto,
  ) {
    await this.acces(dossierId, utilisateur, true);
    await this.trouver(dossierId, id);
    if (dto.type === 'ENTREE' && dto.coutUnitaire === undefined) {
      throw new BadRequestException(
        'Indiquez le cout d’achat unitaire de l’entree',
      );
    }
    const entree = dto.type === 'ENTREE';
    await this.prisma.$transaction((tx) =>
      this.mouvementer(tx, id, {
        type: entree ? TypeMouvementStock.ENTREE : TypeMouvementStock.SORTIE,
        quantite: dto.quantite,
        coutUnitaire: dto.coutUnitaire,
        date: jour(dto.date),
        motif:
          dto.motif?.trim() || (entree ? 'Entree de stock' : 'Sortie de stock'),
        creeParId: utilisateur.sub,
      }),
    );
    return this.detail(dossierId, id, utilisateur);
  }

  async inventaire(
    dossierId: string,
    id: string,
    utilisateur: ChargeJeton,
    dto: InventaireDto,
  ) {
    await this.acces(dossierId, utilisateur, true);
    await this.trouver(dossierId, id);
    const date = jour(dto.date);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Article" WHERE "id" = ${id} FOR UPDATE`;
      const { quantite } = await tx.article.findUniqueOrThrow({
        where: { id },
        select: { quantite: true },
      });
      const ecart = dto.quantiteReelle - quantite;
      if (ecart === 0) return;
      await this.mouvementer(tx, id, {
        type: TypeMouvementStock.INVENTAIRE,
        quantite: ecart,
        date,
        motif: dto.motif?.trim() || 'Inventaire',
        creeParId: utilisateur.sub,
      });
    });
    return this.detail(dossierId, id, utilisateur);
  }

  // Unique porte d'entree des quantites : verrouille l'article et applique le cout moyen pondere
  async mouvementer(
    tx: Prisma.TransactionClient,
    articleId: string,
    m: MouvementDemande,
  ): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "Article" WHERE "id" = ${articleId} FOR UPDATE`;
    const a = await tx.article.findUniqueOrThrow({
      where: { id: articleId },
      select: {
        dossierId: true,
        suiviStock: true,
        quantite: true,
        valeurStock: true,
        coutMoyen: true,
      },
    });
    if (!a.suiviStock) {
      throw new BadRequestException('Cet article n’est pas suivi en stock');
    }
    const delta =
      m.type === TypeMouvementStock.SORTIE ? -m.quantite : m.quantite;
    if (delta === 0) return;

    let cout: number;
    let valeur: number;
    if (delta > 0) {
      // Une entree se fait au cout d'achat ; un surplus d'inventaire au cout moyen
      cout =
        m.type === TypeMouvementStock.ENTREE
          ? (m.coutUnitaire ?? 0)
          : a.coutMoyen;
      valeur = delta * cout;
    } else {
      const sortie = -delta;
      if (sortie > a.quantite) {
        throw new ConflictException(
          `Stock insuffisant : ${a.quantite} disponible(s)`,
        );
      }
      cout = a.coutMoyen;
      valeur = -(sortie === a.quantite
        ? a.valeurStock
        : Math.round((a.valeurStock * sortie) / a.quantite));
    }
    const quantiteApres = a.quantite + delta;
    const valeurApres = a.valeurStock + valeur;
    if (Math.abs(valeur) > VALEUR_MAX || valeurApres > VALEUR_MAX) {
      throw new BadRequestException('Montant trop eleve');
    }
    const coutMoyen =
      quantiteApres > 0 ? Math.round(valeurApres / quantiteApres) : a.coutMoyen;

    await tx.article.update({
      where: { id: articleId },
      data: { quantite: quantiteApres, valeurStock: valeurApres, coutMoyen },
    });
    await tx.mouvementStock.create({
      data: {
        articleId,
        dossierId: a.dossierId,
        type: m.type,
        date: m.date,
        quantite: delta,
        coutUnitaire: cout,
        valeur,
        quantiteApres,
        valeurApres,
        motif: m.motif.trim().slice(0, 120),
        origine: m.origine ?? null,
        origineId: m.origineId ?? null,
        creeParId: m.creeParId,
      },
    });
  }
}
