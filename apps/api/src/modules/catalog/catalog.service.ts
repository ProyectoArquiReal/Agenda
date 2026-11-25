import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  listarServicios(consultorioId: string) {
    return this.db.withTenantTx(consultorioId, async (client) => {
      const result = await client.query(
        `SELECT
           id,
           codigo,
           nombre,
           descripcion,
           tipo,
           duracion_minutos AS "duracionMinutos",
           precio_base::FLOAT AS "precioBase",
           requiere_insumos AS "requiereInsumos"
         FROM servicios
         WHERE activo = TRUE
         ORDER BY tipo ASC, codigo ASC`,
      );
      return result.rows;
    });
  }

  listarEspecialistas(consultorioId: string) {
    return this.db.withTenantTx(consultorioId, async (client) => {
      const result = await client.query(
        `SELECT
           id,
           registro_profesional AS "registroProfesional",
           nombre_completo AS "nombreCompleto",
           especialidad,
           sillon_o_cabina AS "sillonOCabina",
           horario_laboral AS "horarioLaboral"
         FROM especialistas
         WHERE activo = TRUE
         ORDER BY nombre_completo ASC`,
      );
      return result.rows;
    });
  }
}
