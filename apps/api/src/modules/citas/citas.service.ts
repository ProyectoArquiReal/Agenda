import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateEstadoCitaDto } from './dto/update-estado-cita.dto';

const ESTADOS_QUE_BLOQUEAN_HORARIO = [
  'PENDIENTE_CONFIRMACION',
  'RESERVADA',
  'EN_ATENCION',
] as const;

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code);
  }
  return undefined;
}

@Injectable()
export class CitasService {
  constructor(private readonly db: DatabaseService) {}

  async listarPorFecha(consultorioId: string, fecha?: string) {
    if (!fecha || !isValidDateOnly(fecha)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message: 'El parámetro query ?fecha=YYYY-MM-DD es obligatorio y debe ser una fecha válida.',
      });
    }

    return this.db.withTenantTx(consultorioId, async (client) => {
      const result = await client.query(
        `SELECT
           c.id,
           c.codigo,
           c.estado,
           c.fecha_inicio AS "fechaInicio",
           c.fecha_fin AS "fechaFin",
           c.paciente_nombre AS "pacienteNombre",
           c.paciente_documento AS "pacienteDocumento",
           c.paciente_telefono AS "pacienteTelefono",
           c.paciente_email AS "pacienteEmail",
           c.notas,
           json_build_object(
             'id', e.id,
             'nombreCompleto', e.nombre_completo,
             'especialidad', e.especialidad,
             'sillonOCabina', e.sillon_o_cabina
           ) AS especialista,
           json_build_object(
             'id', s.id,
             'codigo', s.codigo,
             'nombre', s.nombre,
             'tipo', s.tipo,
             'duracionMinutos', s.duracion_minutos
           ) AS servicio
         FROM citas c
         JOIN consultorio_config cc
           ON cc.id = c.consultorio_id
         JOIN especialistas e
           ON e.id = c.especialista_id
          AND e.consultorio_id = c.consultorio_id
         JOIN servicios s
           ON s.id = c.servicio_id
          AND s.consultorio_id = c.consultorio_id
         WHERE c.fecha_inicio >= ($1::date::timestamp AT TIME ZONE cc.zona_horaria)
           AND c.fecha_inicio < (($1::date + INTERVAL '1 day')::timestamp AT TIME ZONE cc.zona_horaria)
         ORDER BY c.fecha_inicio ASC`,
        [fecha],
      );
      return result.rows;
    });
  }

  async crearCita(
    consultorioId: string,
    usuarioId: string,
    dto: CreateCitaDto,
  ) {
    return this.db.withTenantTx(consultorioId, async (client) => {
      const specialist = await client.query<{
        id: string;
        activo: boolean;
      }>(
        'SELECT id, activo FROM especialistas WHERE id = $1',
        [dto.especialistaId],
      );
      if (!specialist.rows[0]?.activo) {
        throw new NotFoundException({
          code: 'ESPECIALISTA_NOT_FOUND',
          message: 'El especialista indicado no existe o está inactivo.',
        });
      }

      const service = await client.query<{
        id: string;
        duracion_minutos: number;
        activo: boolean;
      }>(
        'SELECT id, duracion_minutos, activo FROM servicios WHERE id = $1',
        [dto.servicioId],
      );
      if (!service.rows[0]?.activo) {
        throw new NotFoundException({
          code: 'SERVICIO_NOT_FOUND',
          message: 'El servicio indicado no existe o está inactivo.',
        });
      }

      const start = new Date(dto.fechaInicio);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException({
          code: 'INVALID_START_DATE',
          message: 'fechaInicio debe ser una fecha ISO-8601 válida con zona horaria.',
        });
      }
      const end = new Date(
        start.getTime() + Number(service.rows[0].duracion_minutos) * 60_000,
      );

      const overlap = await client.query<{
        id: string;
        codigo: string;
        fecha_inicio: Date;
        fecha_fin: Date;
      }>(
        `SELECT id, codigo, fecha_inicio, fecha_fin
         FROM citas
         WHERE especialista_id = $1
           AND estado = ANY($2::estado_cita[])
           AND tstzrange(fecha_inicio, fecha_fin, '[)')
               && tstzrange($3::timestamptz, $4::timestamptz, '[)')
         LIMIT 1`,
        [
          dto.especialistaId,
          [...ESTADOS_QUE_BLOQUEAN_HORARIO],
          start.toISOString(),
          end.toISOString(),
        ],
      );

      if (overlap.rows[0]) {
        const conflict = overlap.rows[0];
        throw new ConflictException({
          code: 'SCHEDULE_OVERLAP',
          message: `El especialista ya tiene una cita (${conflict.codigo}) que se solapa con el horario solicitado.`,
          conflict: {
            citaId: conflict.id,
            codigo: conflict.codigo,
            fechaInicio: conflict.fecha_inicio,
            fechaFin: conflict.fecha_fin,
          },
        });
      }

      try {
        const inserted = await client.query(
          `INSERT INTO citas (
             consultorio_id,
             especialista_id,
             servicio_id,
             creado_por,
             paciente_nombre,
             paciente_documento,
             paciente_telefono,
             paciente_email,
             fecha_inicio,
             fecha_fin,
             estado,
             notas
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RESERVADA', $11)
           RETURNING
             id,
             codigo,
             estado,
             especialista_id AS "especialistaId",
             servicio_id AS "servicioId",
             paciente_nombre AS "pacienteNombre",
             paciente_documento AS "pacienteDocumento",
             paciente_telefono AS "pacienteTelefono",
             paciente_email AS "pacienteEmail",
             fecha_inicio AS "fechaInicio",
             fecha_fin AS "fechaFin",
             notas,
             created_at AS "createdAt"`,
          [
            consultorioId,
            dto.especialistaId,
            dto.servicioId,
            usuarioId,
            dto.pacienteNombre.trim(),
            dto.pacienteDocumento.trim(),
            dto.pacienteTelefono?.trim() || null,
            dto.pacienteEmail?.trim().toLowerCase() || null,
            start.toISOString(),
            end.toISOString(),
            dto.notas?.trim() || null,
          ],
        );
        return inserted.rows[0];
      } catch (error) {
        if (postgresErrorCode(error) === '23P01') {
          throw new ConflictException({
            code: 'SCHEDULE_OVERLAP',
            message: 'El horario seleccionado acaba de ser ocupado para este especialista.',
          });
        }
        throw error;
      }
    });
  }

  async actualizarEstado(
    consultorioId: string,
    citaId: string,
    estado: UpdateEstadoCitaDto,
  ) {
    return this.db.withTenantTx(consultorioId, async (client) => {
      const current = await client.query<{
        id: string;
        codigo: string;
        estado: string;
      }>(
        'SELECT id, codigo, estado FROM citas WHERE id = $1 FOR UPDATE',
        [citaId],
      );

      const appointment = current.rows[0];
      if (!appointment) {
        throw new NotFoundException({
          code: 'CITA_NOT_FOUND',
          message: 'La cita especificada no existe en este consultorio.',
        });
      }

      if (
        ['COMPLETADA', 'CANCELADA'].includes(appointment.estado) &&
        appointment.estado !== estado.estado
      ) {
        throw new ConflictException({
          code: 'INVALID_STATE_TRANSITION',
          message: `No se puede cambiar una cita en estado ${appointment.estado} a ${estado.estado}.`,
        });
      }

      const updated = await client.query(
        `UPDATE citas
         SET estado = $1::estado_cita,
             motivo_cancelacion = CASE
               WHEN $1::estado_cita = 'CANCELADA'::estado_cita
                 THEN COALESCE($2, motivo_cancelacion)
               ELSE motivo_cancelacion
             END,
             version = version + 1
         WHERE id = $3
         RETURNING
           id,
           codigo,
           estado,
           fecha_inicio AS "fechaInicio",
           fecha_fin AS "fechaFin",
           motivo_cancelacion AS "motivoCancelacion",
           updated_at AS "updatedAt"`,
        [estado.estado, estado.motivoCancelacion ?? null, citaId],
      );
      return updated.rows[0];
    });
  }
}
