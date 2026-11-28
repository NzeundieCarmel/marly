import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
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

  // Facultatif : la pièce répond à une demande du cabinet
  @IsOptional()
  @IsString()
  @MaxLength(40)
  demandeId?: string;

  // Facultatifs : lus sur la photo par Marly, ou saisis par le gérant
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le montant HT doit etre un nombre entier de FCFA' })
  @Min(0)
  @Max(2_000_000_000)
  montantHt?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La TVA doit etre un nombre entier de FCFA' })
  @Min(0)
  @Max(2_000_000_000)
  tva?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value,
  )
  @Matches(/^[A-Z]\d{12}[A-Z]$/, {
    message:
      'NIU du fournisseur invalide (une lettre, 12 chiffres, une lettre)',
  })
  niuFournisseur?: string;

  // « oui » quand les champs ont ete pre-remplis par la lecture automatique
  @IsOptional()
  @IsIn(['oui'])
  lectureAuto?: string;
}
