import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { MessagerieService } from '../messagerie/messagerie.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReinitialisationDto } from './dto/mot-de-passe.dto';

const UNE_HEURE_MS = 3_600_000;
const DUREE_CODE_MS = 15 * 60_000;
const ESSAIS_MAX = 5;
const CODES_PAR_HEURE = 3;
const REPONSE_DEMANDE =
  "Si un compte existe avec cette adresse, un code vient d'y être envoyé.";
const CODE_REFUSE =
  'Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.';

@Injectable()
export class MotDePasseService {
  private readonly logger = new Logger('MotDePasse');
  // Tentatives récentes par clé (en mémoire : remises à zéro au redémarrage)
  private readonly tentatives = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagerie: MessagerieService,
  ) {}

  private limiter(cle: string, maximum: number): void {
    const maintenant = Date.now();
    const recentes = (this.tentatives.get(cle) ?? []).filter(
      (t) => maintenant - t < UNE_HEURE_MS,
    );
    if (recentes.length >= maximum) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans une heure.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recentes.push(maintenant);
    this.tentatives.set(cle, recentes);
    if (this.tentatives.size > 10_000) {
      for (const [k, liste] of this.tentatives) {
        if (liste.every((t) => maintenant - t >= UNE_HEURE_MS))
          this.tentatives.delete(k);
      }
    }
  }

  // Même réponse que le compte existe ou non : on ne révèle jamais qui est inscrit
  async demander(email: string, ip: string): Promise<{ message: string }> {
    this.limiter(`demande:${ip}`, 10);
    const reponse = { message: REPONSE_DEMANDE };

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true, nom: true, email: true },
    });
    if (!utilisateur?.email) return reponse;

    const recents = await this.prisma.codeReinitialisation.count({
      where: {
        utilisateurId: utilisateur.id,
        creeLe: { gte: new Date(Date.now() - UNE_HEURE_MS) },
      },
    });
    if (recents >= CODES_PAR_HEURE) return reponse;

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const codeHache = await hash(code, 10);
    // Un nouveau code annule les précédents
    await this.prisma.$transaction([
      this.prisma.codeReinitialisation.updateMany({
        where: { utilisateurId: utilisateur.id, utiliseLe: null },
        data: { utiliseLe: new Date() },
      }),
      this.prisma.codeReinitialisation.create({
        data: {
          utilisateurId: utilisateur.id,
          codeHache,
          expireLe: new Date(Date.now() + DUREE_CODE_MS),
        },
      }),
    ]);

    const texte = [
      `Bonjour ${utilisateur.nom},`,
      '',
      `Votre code pour choisir un nouveau mot de passe Marly : ${code.slice(0, 3)} ${code.slice(3)}`,
      '',
      'Il est valable 15 minutes.',
      "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.",
      '',
      "L'équipe Marly",
    ].join('\n');

    try {
      await this.messagerie.envoyer(
        utilisateur.email,
        'Votre code Marly',
        texte,
      );
    } catch (erreur) {
      this.logger.error(`Envoi du code impossible : ${String(erreur)}`);
    }
    return reponse;
  }

  async reinitialiser(
    dto: ReinitialisationDto,
    ip: string,
  ): Promise<{ message: string }> {
    this.limiter(`essai:${ip}`, 20);

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (!utilisateur) throw new BadRequestException(CODE_REFUSE);

    const actif = await this.prisma.codeReinitialisation.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        utiliseLe: null,
        expireLe: { gt: new Date() },
      },
      orderBy: { creeLe: 'desc' },
    });
    if (!actif || actif.essais >= ESSAIS_MAX)
      throw new BadRequestException(CODE_REFUSE);

    if (!(await compare(dto.code, actif.codeHache))) {
      const maj = await this.prisma.codeReinitialisation.update({
        where: { id: actif.id },
        data: { essais: { increment: 1 } },
        select: { essais: true },
      });
      // Après 5 erreurs, le code meurt
      if (maj.essais >= ESSAIS_MAX) {
        await this.prisma.codeReinitialisation.update({
          where: { id: actif.id },
          data: { utiliseLe: new Date() },
        });
      }
      throw new BadRequestException(CODE_REFUSE);
    }

    const motDePasseHache = await hash(dto.motDePasse, 10);
    await this.prisma.$transaction(async (tx) => {
      // Usage unique : si deux requêtes arrivent ensemble, une seule consomme le code
      const consomme = await tx.codeReinitialisation.updateMany({
        where: { id: actif.id, utiliseLe: null },
        data: { utiliseLe: new Date() },
      });
      if (consomme.count !== 1) throw new BadRequestException(CODE_REFUSE);
      await tx.utilisateur.update({
        where: { id: utilisateur.id },
        data: { motDePasseHache, versionJeton: { increment: 1 } },
      });
    });
    return { message: 'Mot de passe modifié. Vous pouvez vous connecter.' };
  }
}
