import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LigneEcritureDto {
  @Matches(/^\d{2,8}$/, { message: 'Compte invalide (2 a 8 chiffres)' })
  compte!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le libelle est obligatoire' })
  @MaxLength(80)
  libelle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tiers?: string | null;

  @IsInt()
  @Min(0)
  debit!: number;

  @IsInt()
  @Min(0)
  credit!: number;
}

export class ValiderPieceDto {
  @Matches(/^[A-Z]{2,4}$/, { message: 'Code journal invalide' })
  journal!: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Une ecriture compte au moins 2 lignes' })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LigneEcritureDto)
  lignes!: LigneEcritureDto[];
}