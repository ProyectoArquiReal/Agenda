import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCitaDto {
  @IsUUID()
  especialistaId!: string;

  @IsUUID()
  servicioId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  pacienteNombre!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  pacienteDocumento!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  pacienteTelefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  pacienteEmail?: string;

  @IsISO8601({ strict: true })
  @Matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(?:Z|[+-][0-9]{2}:[0-9]{2})$/, {
    message: 'fechaInicio debe incluir zona horaria (Z o desplazamiento UTC).',
  })
  fechaInicio!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string;
}
