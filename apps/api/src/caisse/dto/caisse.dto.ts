import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const MODES_CAISSE = ['ESPECES', 'MTN_MOMO', 'ORANGE_MONEY'] as const;
const MONTANT_MAX = 2_000_000_000;

export class OuvertureDto {
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  fondInitial!: number;
}

export class ClotureDto {
  @IsInt()
  @Min(0)
  @Max(MONTANT_MAX)
  especesComptees!: number;
}

export class LigneVenteDto {
  @IsString()
  @Length(1, 40)
  articleId!: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  quantite!: number;
}

export class VenteDto {
  @ValidateNested({ each: true })
  @Type(() => LigneVenteDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  lignes!: LigneVenteDto[];

  @IsIn(MODES_CAISSE, { message: 'Mode : ESPECES, MTN_MOMO ou ORANGE_MONEY' })
  mode!: (typeof MODES_CAISSE)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MONTANT_MAX)
  montantRecu?: number;
}
