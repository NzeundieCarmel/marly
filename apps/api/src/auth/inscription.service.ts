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
import { InscriptionDto } from './dto/inscription.dto';

const UNE_HEURE_MS = 3_600_000;
const CLE_GLOBALE = '*';

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
        "Trop de tentatives d'inscription. Réessaie dans une heure.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    parIp.push(maintenant);
    toutes.push(maintenant);
    this.tentatives.set(ip, parIp);
    this.tentatives.set(CLE_GLOBALE, toutes);

    // Évite que la liste grossisse sans fin
    if (this.tentatives.size > 10_000) {
      for (const [cle, liste] of this.tentatives) {
        if (liste.every((t) => maintenant - t >= UNE_HEURE_MS))
          this.tentatives.delete(cle);
      }
    }
  }

  async inscrire(dto: InscriptionDto, ip: string): Promise<{ jeton: string }> {
    this.limiter(ip);

    if (dto.siteWeb) {
      throw new BadRequestException('Inscription refusée');
    }

    const existant = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existant) {
      throw new ConflictException(
        'Un compte existe déjà avec cette adresse e-mail',
      );
    }

    const motDePasseHache = await hash(dto.motDePasse, 10);

    let utilisateur: { id: string; cabinetId: string };
    try {
      // Le cabinet et son responsable sont créés ensemble, ou pas du tout
      utilisateur = await this.prisma.utilisateur.create({
        data: {
          nom: dto.nomResponsable,
          email: dto.email,
          motDePasseHache,
          role: 'RESPONSABLE',
          cabinet: { create: { nom: dto.nomCabinet } },
        },
        select: { id: true, cabinetId: true },
      });
    } catch (erreur) {
      // Deux inscriptions simultanées avec le même e-mail
      if (
        erreur instanceof Prisma.PrismaClientKnownRequestError &&
        erreur.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un compte existe déjà avec cette adresse e-mail',
        );
      }
      throw erreur;
    }

    const jeton = await this.jwt.signAsync(
      {
        sub: utilisateur.id,
        role: 'RESPONSABLE',
        cabinetId: utilisateur.cabinetId,
        dossierId: null,
      },
      { expiresIn: this.dureeSecondes },
    );
    return { jeton };
  }
}
