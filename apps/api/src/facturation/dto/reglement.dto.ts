import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MODES_REGLEMENT = [
  'ESPECES',
  'VIREMENT',
  'MTN_MOMO',
  'ORANGE_MONEY',
  'CHEQUE',
  'AUTRE',
] as const;

export class ReglementDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date du règlement invalide' })
  date!: string;

  @Type(() => Number)
  @IsInt({ message: 'Le montant doit être un nombre entier de FCFA' })
  @Min(1, { message: 'Le montant doit être supérieur à zéro' })
  @Max(2_000_000_000)
  montant!: number;

  @IsIn(MODES_REGLEMENT, { message: 'Mode de règlement invalide' })
  mode!: (typeof MODES_REGLEMENT)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(60, {
    message: 'La référence doit faire 60 caractères au maximum',
  })
  reference?: string;
}
