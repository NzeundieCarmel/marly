import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreerPieceDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date attendue au format AAAA-MM-JJ',
  })
  date!: string;

  // Les formulaires envoient du texte : on le convertit en nombre
  @Type(() => Number)
  @IsInt({ message: 'Le montant doit etre un nombre entier de FCFA' })
  @Min(1, { message: 'Le montant doit etre positif' })
  montantTtc!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fournisseur?: string;

  @IsString()
  @IsNotEmpty({ message: 'La categorie est obligatoire' })
  @MaxLength(60)
  categorie!: string;
}