import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

const email = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const chiffres = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\s/g, '') : value;

export class DemandeCodeDto {
  @Transform(email)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email!: string;
}

export class ReinitialisationDto {
  @Transform(email)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email!: string;

  @Transform(chiffres)
  @Matches(/^\d{6}$/, { message: 'Le code contient 6 chiffres' })
  code!: string;

  @IsString()
  @Length(10, 72, {
    message: 'Le mot de passe doit faire entre 10 et 72 caractères',
  })
  @Matches(/[A-Za-z]/, {
    message: 'Le mot de passe doit contenir au moins une lettre',
  })
  @Matches(/[0-9]/, {
    message: 'Le mot de passe doit contenir au moins un chiffre',
  })
  motDePasse!: string;
}
