import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

// Taux de TVA en centiemes de pour cent : 1925 = 19,25 %
export const TAUX_TVA = [0, 1925];
export const UNITES = [
  'unité',
  'sac',
  'kg',
  'litre',
  'mètre',
  'carton',
  'paquet',
  'rouleau',
  'barre',
  'feuille',
  'seau',
];
const PRIX_MAX = 100_000_000;
const QUANTITE_MAX = 1_000_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ArticleDto {
  @IsString()
  @Length(2, 80)
  nom!: string;

  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,29}$/, {
    message:
      'Reference invalide : lettres, chiffres, point, tiret (30 au plus)',
  })
  reference!: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  categorie?: string;

  @IsIn(UNITES, { message: 'Unite inconnue' })
  unite!: string;

  @IsInt()
  @Min(0)
  @Max(PRIX_MAX)
  prixVente!: number;

  @IsIn(TAUX_TVA, { message: 'Taux de TVA : 0 ou 1925 (19,25 %)' })
  tauxTva!: number;

  @IsOptional()
  @IsBoolean()
  suiviStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QUANTITE_MAX)
  seuilAlerte?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QUANTITE_MAX)
  quantiteInitiale?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRIX_MAX)
  coutInitial?: number;
}

export class ModifArticleDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  nom?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  categorie?: string;

  @IsOptional()
  @IsIn(UNITES, { message: 'Unite inconnue' })
  unite?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRIX_MAX)
  prixVente?: number;

  @IsOptional()
  @IsIn(TAUX_TVA, { message: 'Taux de TVA : 0 ou 1925 (19,25 %)' })
  tauxTva?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(QUANTITE_MAX)
  seuilAlerte?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class MouvementDto {
  @IsIn(['ENTREE', 'SORTIE'], { message: 'Type : ENTREE ou SORTIE' })
  type!: 'ENTREE' | 'SORTIE';

  @IsInt()
  @Min(1)
  @Max(QUANTITE_MAX)
  quantite!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(PRIX_MAX)
  coutUnitaire?: number;

  @IsOptional()
  @Matches(DATE, { message: 'Date attendue au format AAAA-MM-JJ' })
  date?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  motif?: string;
}

export class InventaireDto {
  @IsInt()
  @Min(0)
  @Max(QUANTITE_MAX)
  quantiteReelle!: number;

  @IsOptional()
  @Matches(DATE, { message: 'Date attendue au format AAAA-MM-JJ' })
  date?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  motif?: string;
}
