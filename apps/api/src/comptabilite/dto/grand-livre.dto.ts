import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { JOURNAUX_SAISIE } from '../plan-syscohada';

const MONTANT_MAX = 2_000_000_000;

export class LigneSaisieDto {
  @Matches(/^[1-8]\d{1,9}$/, { message: 'Numero de compte invalide' })
  compte!: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  libelle?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  tiers?: string;

  @IsInt()
  @Min(0)
  @Max(MONTANT_MAX)
  debit!: number;

  @IsInt()
  @Min(0)
  @Max(MONTANT_MAX)
  credit!: number;
}

export class EcritureManuelleDto {
  @IsIn(JOURNAUX_SAISIE, { message: 'Journal de saisie invalide' })
  journal!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date attendue au format AAAA-MM-JJ',
  })
  date!: string;

  @IsString()
  @Length(2, 120)
  libelle!: string;

  @ValidateNested({ each: true })
  @Type(() => LigneSaisieDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  lignes!: LigneSaisieDto[];
}

export class CompteDto {
  @Matches(/^[1-8]\d{2,9}$/, {
    message: 'Numero de compte invalide (classes 1 a 8, au moins 3 chiffres)',
  })
  numero!: string;

  @IsString()
  @Length(2, 80)
  intitule!: string;
}
