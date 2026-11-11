import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreerDemandeDto {
  @IsString()
  @IsNotEmpty({ message: 'Precise la piece attendue' })
  @MaxLength(160)
  description!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Echeance attendue au format AAAA-MM-JJ',
  })
  echeance?: string;
}

export class ACompleterDto {
  @IsString()
  @IsNotEmpty({ message: 'Precise ce qui ne va pas' })
  @MaxLength(120)
  motif!: string;
}