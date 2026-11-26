import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type { ChargeJeton } from '../auth/auth.service';
import { ipDe } from '../auth/ip-relayee';
import { PrismaService } from '../prisma/prisma.service';

const METHODES_ECRITURE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PREFIXE = '/api/v1';

type RequeteAuthentifiee = Request & {
  user?: ChargeJeton;
  utilisateur?: ChargeJeton;
};

// Note chaque action réussie qui modifie quelque chose : qui, quand, quoi, sur quel dossier
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  intercept(
    contexte: ExecutionContext,
    suite: CallHandler,
  ): Observable<unknown> {
    const requete = contexte.switchToHttp().getRequest<RequeteAuthentifiee>();
    const utilisateur = requete.user ?? requete.utilisateur;
    if (!METHODES_ECRITURE.has(requete.method) || !utilisateur?.sub)
      return suite.handle();

    return suite.handle().pipe(
      concatMap(async (reponse: unknown) => {
        try {
          await this.noter(requete, utilisateur, reponse);
        } catch (erreur) {
          // Un journal en panne ne doit jamais bloquer le travail de l'utilisateur
          this.logger.error(`Journal non écrit : ${String(erreur)}`);
        }
        return reponse;
      }),
    );
  }

  private async noter(
    requete: RequeteAuthentifiee,
    utilisateur: ChargeJeton,
    reponse: unknown,
  ): Promise<void> {
    const route = (requete as unknown as { route?: { path?: unknown } }).route;
    const brut = typeof route?.path === 'string' ? route.path : requete.path;
    const chemin = brut.replace(PREFIXE, '') || '/';
    const params = requete.params as Record<string, string | undefined>;
    const idReponse =
      typeof reponse === 'object' &&
      reponse !== null &&
      typeof (reponse as { id?: unknown }).id === 'string'
        ? (reponse as { id: string }).id
        : null;

    const personne = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateur.sub },
      select: { nom: true },
    });

    await this.prisma.journalAudit.create({
      data: {
        cabinetId: utilisateur.cabinetId,
        dossierId: await this.dossierConcerne(
          chemin,
          params.id ?? null,
          utilisateur,
          idReponse,
        ),
        utilisateurId: utilisateur.sub,
        nomUtilisateur: personne?.nom ?? 'Inconnu',
        role: utilisateur.role,
        action: `${requete.method} ${chemin}`,
        cible: params.id ?? idReponse,
        ip: ipDe(requete),
      },
    });
  }

  // Le dossier touché : celui du gérant, ou celui de la ressource visée par le cabinet
  private async dossierConcerne(
    chemin: string,
    id: string | null,
    utilisateur: ChargeJeton,
    idReponse: string | null,
  ): Promise<string | null> {
    if (utilisateur.dossierId) return utilisateur.dossierId;
    if (chemin === '/dossiers') return idReponse;
    if (!id) return null;
    if (chemin.startsWith('/dossiers/:id')) return id;
    if (chemin.startsWith('/pieces/:id')) {
      return (
        (
          await this.prisma.piece.findUnique({
            where: { id },
            select: { dossierId: true },
          })
        )?.dossierId ?? null
      );
    }
    if (chemin.startsWith('/demandes/:id')) {
      return (
        (
          await this.prisma.demandePiece.findUnique({
            where: { id },
            select: { dossierId: true },
          })
        )?.dossierId ?? null
      );
    }
    if (chemin.startsWith('/rattachements/:id')) {
      return (
        (
          await this.prisma.demandeRattachement.findUnique({
            where: { id },
            select: { dossierId: true },
          })
        )?.dossierId ?? null
      );
    }
    if (chemin.startsWith('/invitations/:id')) {
      return (
        (
          await this.prisma.invitation.findUnique({
            where: { id },
            select: { dossierId: true },
          })
        )?.dossierId ?? null
      );
    }
    return null;
  }
}
