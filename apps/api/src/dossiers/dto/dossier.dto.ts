import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const REGIMES = ['REEL', 'IGS'] as const;
type RegimeSaisi = (typeof REGIMES)[number];

function texte({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// Champ facultatif : une case vide efface la valeur (null)
function facultatif({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t === '' ? null : t;
}

// NIU : majuscules, sans espaces (ex. M012345678901A)
function niu({ value }: { value: unknown }): unknown {
  const v = facultatif({ value });
  return typeof v === 'string' ? v.toUpperCase().replace(/\s+/g, '') : v;
}

const MESSAGE_NIU = 'Le NIU doit contenir de 10 à 20 lettres ou chiffres';

export class CreerDossierDto {
  @Transform(texte)
  @IsString()
  @Length(2, 120, {
    message: 'La raison sociale doit faire entre 2 et 120 caractères',
  })
  raisonSociale!: string;

  @IsIn(REGIMES, { message: 'Le régime doit être REEL ou IGS' })
  regime!: RegimeSaisi;

  @Transform(niu)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{10,20}$/, { message: MESSAGE_NIU })
  niu?: string | null;

  @Transform(facultatif)
  @IsOptional()
  @IsString()
  @MaxLength(40, { message: 'Le RCCM fait 40 caractères au maximum' })
  rccm?: string | null;
}

export class ModifierDossierDto {
  @Transform(texte)
  @IsOptional()
  @IsString()
  @Length(2, 120, {
    message: 'La raison sociale doit faire entre 2 et 120 caractères',
  })
  raisonSociale?: string;

  @IsOptional()
  @IsIn(REGIMES, { message: 'Le régime doit être REEL ou IGS' })
  regime?: RegimeSaisi;

  @Transform(niu)
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{10,20}$/, { message: MESSAGE_NIU })
  niu?: string | null;

  @Transform(facultatif)
  @IsOptional()
  @IsString()
  @MaxLength(40, { message: 'Le RCCM fait 40 caractères au maximum' })
  rccm?: string | null;
}
