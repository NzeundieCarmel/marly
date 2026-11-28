import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LigneFactureDto } from './facture.dto';

export class DevisDto {
  @IsString()
  @Length(1, 40, { message: 'Choisissez un client' })
  clientId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Durée de validité invalide' })
  @Min(1)
  @Max(365, { message: 'Un devis est valable un an au plus' })
  validiteJours?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Ajoutez au moins une ligne' })
  @ArrayMaxSize(50, { message: '50 lignes au maximum' })
  @ValidateNested({ each: true })
  @Type(() => LigneFactureDto)
  lignes!: LigneFactureDto[];
}

export class StatutDevisDto {
  @IsIn(['EN_COURS', 'ACCEPTE', 'REFUSE'], { message: 'Statut invalide' })
  statut!: 'EN_COURS' | 'ACCEPTE' | 'REFUSE';
}
