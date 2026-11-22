import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class DemanderRattachementDto {
  @IsString()
  @Length(1, 40)
  cabinetId!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500, {
    message: 'Le message doit faire 500 caractères au maximum',
  })
  message?: string;
}
