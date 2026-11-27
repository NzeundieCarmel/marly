import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const texte = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LigneFactureDto {
  @Transform(texte)
  @IsString()
  @Length(1, 200, {
    message:
      'Chaque ligne doit avoir une désignation (200 caractères au maximum)',
  })
  designation!: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(200)
  detail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  articleId?: string;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Quantité invalide (3 décimales au maximum)' },
  )
  @Min(0.001, { message: 'La quantité doit être supérieure à zéro' })
  @Max(1_000_000)
  quantite!: number;

  @Type(() => Number)
  @IsInt({ message: 'Le prix doit être un nombre entier de FCFA' })
  @Min(0)
  @Max(2_000_000_000)
  prixUnitaire!: number;
}

export class FactureDto {
  @IsString()
  @Length(1, 40, { message: 'Choisissez un client' })
  clientId!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Date d'échéance invalide" })
  dateEcheance?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Taux de retenue invalide' })
  @Min(0)
  @Max(20, { message: 'Le taux de retenue doit être compris entre 0 et 20 %' })
  tauxRetenue?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Ajoutez au moins une ligne' })
  @ArrayMaxSize(50, { message: '50 lignes au maximum' })
  @ValidateNested({ each: true })
  @Type(() => LigneFactureDto)
  lignes!: LigneFactureDto[];
}
