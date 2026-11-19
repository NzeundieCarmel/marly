import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

function nettoyer({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function nettoyerEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class InscriptionDto {
  @Transform(nettoyer)
  @IsString()
  @Length(2, 120, {
    message: 'Le nom du cabinet doit faire entre 2 et 120 caractères',
  })
  nomCabinet!: string;

  @Transform(nettoyer)
  @IsString()
  @Length(2, 80, { message: 'Ton nom doit faire entre 2 et 80 caractères' })
  nomResponsable!: string;

  @Transform(nettoyerEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(10, 72, {
    message: 'Le mot de passe doit faire entre 10 et 72 caractères',
  })
  @Matches(/[A-Za-z]/, {
    message: 'Le mot de passe doit contenir au moins une lettre',
  })
  @Matches(/[0-9]/, {
    message: 'Le mot de passe doit contenir au moins un chiffre',
  })
  motDePasse!: string;

  // Champ piège, invisible à l'écran : un humain le laisse vide, un robot le remplit
  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteWeb?: string;
}
