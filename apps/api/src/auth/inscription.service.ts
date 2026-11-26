import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  InscriptionDto,
  InscriptionEntrepriseDto,
} from './dto/inscription.dto';

const UNE_HEURE_MS = 3_600_000;
const CLE_GLOBALE = '*';
const EMAIL_PRIS = 'Un compte existe déjà avec cette adresse e-mail';

interface Session {
  id: string;
  role: 'RESPONSABLE' | 'PME';
  cabinetId: string;
  dossierId: string | null;
}

@Injectable()
export class InscriptionService {
  // Tentatives récentes, par adresse IP (en mémoire : remises à zéro au redémarrage)
  private readonly tentatives = new Map<string, number[]>();
  private readonly maxParIp: number;
  private readonly maxGlobal: number;
  private readonly dureeSecondes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.maxParIp = Number(config.get('INSCRIPTIONS_PAR_HEURE') ?? 5);
    this.maxGlobal = Number(config.get('INSCRIPTIONS_MAX_GLOBAL') ?? 50);
    this.dureeSecondes = Number(config.get('JWT_DUREE_SECONDES') ?? 28800);
  }

  private limiter(ip: string): void {
    const maintenant = Date.now();
    const recentes = (cle: string) =>
      (this.tentatives.get(cle) ?? []).filter(
        (t) => maintenant - t < UNE_HEURE_MS,
      );

    const parIp = recentes(ip);
    const toutes = recentes(CLE_GLOBALE);
    if (parIp.length >= this.maxParIp || toutes.length >= this.maxGlobal) {
      throw new HttpException(
        "Trop de tentatives d'inscription. Réessayez dans une heure.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    parIp.push(maintenant);
    toutes.push(maintenant);
    this.tentatives.set(ip, parIp);
    this.tentatives.set(CLE_GLOBALE, toutes);

    if (this.tentatives.size > 10_000) {
      for (const [cle, liste] of this.tentatives) {
        if (liste.every((t) => maintenant - t >= UNE_HEURE_MS))
          this.tentatives.delete(cle);
      }
    }
  }

  // Contrôles communs aux deux inscriptions
  private async preparer(
    ip: string,
    email: string,
    siteWeb: string | undefined,
    motDePasse: string,
  ) {
    this.limiter(ip);
    if (siteWeb) {
      throw new BadRequestException('Inscription refusée');
    }
    const existant = await this.prisma.utilisateur.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existant) {
      throw new ConflictException(EMAIL_PRIS);
    }
    return hash(motDePasse, 10);
  }

  private async emettre(session: Session): Promise<{ jeton: string }> {
    const jeton = await this.jwt.signAsync(
      {
        sub: session.id,
        role: session.role,
        cabinetId: session.cabinetId,
        dossierId: session.dossierId,
        v: 0,
      },
      { expiresIn: this.dureeSecondes },
    );
    return { jeton };
  }

  private emailDejaPris(erreur: unknown): boolean {
    return (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === 'P2002'
    );
  }

  // Un cabinet et son responsable
  async inscrire(dto: InscriptionDto, ip: string): Promise<{ jeton: string }> {
    const motDePasseHache = await this.preparer(
      ip,
      dto.email,
      dto.siteWeb,
      dto.motDePasse,
    );
    try {
      const utilisateur = await this.prisma.utilisateur.create({
        data: {
          nom: dto.nomResponsable,
          email: dto.email,
          motDePasseHache,
          role: 'RESPONSABLE',
          cabinet: { create: { nom: dto.nomCabinet } },
        },
        select: { id: true, cabinetId: true },
      });
      return this.emettre({
        id: utilisateur.id,
        role: 'RESPONSABLE',
        cabinetId: utilisateur.cabinetId,
        dossierId: null,
      });
    } catch (erreur) {
      if (this.emailDejaPris(erreur)) throw new ConflictException(EMAIL_PRIS);
      throw erreur;
    }
  }

  // Une entreprise seule : son espace autonome, son dossier, son gérant
  async inscrireEntreprise(
    dto: InscriptionEntrepriseDto,
    ip: string,
  ): Promise<{ jeton: string }> {
    const motDePasseHache = await this.preparer(
      ip,
      dto.email,
      dto.siteWeb,
      dto.motDePasse,
    );
    try {
      const utilisateur = await this.prisma.$transaction(async (tx) => {
        const espace = await tx.cabinet.create({
          data: { nom: dto.raisonSociale, autonome: true },
          select: { id: true },
        });
        const dossier = await tx.dossier.create({
          data: {
            raisonSociale: dto.raisonSociale,
            regime: dto.regime,
            cabinetId: espace.id,
          },
          select: { id: true },
        });
        return tx.utilisateur.create({
          data: {
            nom: dto.nomGerant,
            email: dto.email,
            motDePasseHache,
            role: 'PME',
            cabinetId: espace.id,
            dossierId: dossier.id,
          },
          select: { id: true, cabinetId: true, dossierId: true },
        });
      });
      return this.emettre({
        id: utilisateur.id,
        role: 'PME',
        cabinetId: utilisateur.cabinetId,
        dossierId: utilisateur.dossierId,
      });
    } catch (erreur) {
      if (this.emailDejaPris(erreur)) throw new ConflictException(EMAIL_PRIS);
      throw erreur;
    }
  }
}
