import { IsEmail, IsString, MinLength } from 'class-validator';

export class ConnexionDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caracteres' })
  motDePasse!: string;
}