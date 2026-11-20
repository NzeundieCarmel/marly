import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

function texte({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function facultatif({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
}

function emailFacultatif({ value }: { value: unknown }): unknown {
  const v = facultatif({ value });
  return typeof v === 'string' ? v.toLowerCase() : v;
}

function emailObligatoire({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class CreerInvitationDto {
  @IsIn(['PME', 'COMPTABLE'], { message: 'Le rôle doit être PME ou COMPTABLE' })
  role!: 'PME' | 'COMPTABLE';

  // Obligatoire pour une entreprise : l'invitation la rattache à son dossier
  @ValidateIf((o: CreerInvitationDto) => o.role === 'PME')
  @IsString({ message: "Choisis le dossier de l'entreprise" })
  @Length(1, 40)
  dossierId?: string;

  @Transform(texte)
  @IsString()
  @Length(2, 80, { message: 'Le nom doit faire entre 2 et 80 caractères' })
  nom!: string;

  @Transform(facultatif)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9 ]{8,20}$/, { message: 'Numéro de téléphone invalide' })
  telephone?: string | null;

  @Transform(emailFacultatif)
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email?: string | null;
}

export class AccepterInvitationDto {
  @Transform(emailObligatoire)
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
}
