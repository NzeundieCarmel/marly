import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const texte = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const code = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value;

const FORMAT_NIU = /^[A-Z]\d{12}[A-Z]$/;
const MESSAGE_NIU =
  'Le NIU doit avoir 14 caractères : une lettre, 12 chiffres, une lettre (ex. : M012345678901A)';

// Fiche émetteur : remplacée en entier à chaque enregistrement (un champ vide efface la valeur)
export class ProfilFacturationDto {
  @Transform(code)
  @ValidateIf((o: ProfilFacturationDto) => Boolean(o.niu))
  @IsString()
  @Matches(FORMAT_NIU, { message: MESSAGE_NIU })
  niu?: string;

  @IsOptional()
  @Transform(code)
  @IsString()
  @MaxLength(40, { message: 'Le RCCM doit faire 40 caractères au maximum' })
  rccm?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(60)
  formeJuridique?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(200, { message: "L'adresse doit faire 200 caractères au maximum" })
  adresse?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @Transform(texte)
  @ValidateIf((o: ProfilFacturationDto) => Boolean(o.email))
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(80)
  centreImpots?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(80)
  banque?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(60)
  compte?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(300)
  conditionsPaiement?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(300)
  penalitesRetard?: string;
}

export class ClientFactureDto {
  @Transform(texte)
  @IsString()
  @Length(2, 120, {
    message: 'Le nom du client doit faire entre 2 et 120 caractères',
  })
  nom!: string;

  @Transform(code)
  @ValidateIf((o: ClientFactureDto) => Boolean(o.niu))
  @IsString()
  @Matches(FORMAT_NIU, { message: MESSAGE_NIU })
  niu?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(200)
  adresse?: string;

  @IsOptional()
  @Transform(texte)
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @Transform(texte)
  @ValidateIf((o: ClientFactureDto) => Boolean(o.email))
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email?: string;
}
