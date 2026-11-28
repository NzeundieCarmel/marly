import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
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

export const PAIEMENTS_ACHAT = [
  'A_CREDIT',
  'ESPECES',
  'MTN_MOMO',
  'ORANGE_MONEY',
  'VIREMENT',
] as const;

export class LigneAchatDto {
  @IsString()
  @Length(1, 40)
  articleId!: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  quantite!: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  coutUnitaire!: number;
}

export class AchatDto {
  @IsString()
  @Length(2, 120, { message: 'Indiquez le fournisseur (2 à 120 caractères)' })
  fournisseur!: string;

  @IsOptional()
  @IsString()
  @Length(0, 60)
  referenceFournisseur?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date attendue au format AAAA-MM-JJ',
  })
  date!: string;

  @IsBoolean()
  avecTva!: boolean;

  @IsIn(PAIEMENTS_ACHAT, { message: 'Mode de paiement invalide' })
  paiement!: (typeof PAIEMENTS_ACHAT)[number];

  @ValidateNested({ each: true })
  @Type(() => LigneAchatDto)
  @ArrayMinSize(1, { message: 'Ajoutez au moins un article' })
  @ArrayMaxSize(50)
  lignes!: LigneAchatDto[];
}
export const MODES_REGLEMENT_ACHAT = [
  'ESPECES',
  'MTN_MOMO',
  'ORANGE_MONEY',
  'VIREMENT',
] as const;

export class ReglementAchatDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date attendue au format AAAA-MM-JJ',
  })
  date!: string;

  @IsInt({ message: 'Le montant doit être un nombre entier de FCFA' })
  @Min(1, { message: 'Le montant doit être supérieur à zéro' })
  @Max(2_000_000_000)
  montant!: number;

  @IsIn(MODES_REGLEMENT_ACHAT, { message: 'Mode de paiement invalide' })
  mode!: (typeof MODES_REGLEMENT_ACHAT)[number];
}
