import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ESTADOS_PERMITIDOS_API = [
  'RESERVADA',
  'COMPLETADA',
  'CANCELADA',
] as const;

export type EstadoPermitidoApi = (typeof ESTADOS_PERMITIDOS_API)[number];

export class UpdateEstadoCitaDto {
  @IsIn(ESTADOS_PERMITIDOS_API, {
    message: 'El estado debe ser RESERVADA, COMPLETADA o CANCELADA.',
  })
  estado!: EstadoPermitidoApi;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoCancelacion?: string;
}
