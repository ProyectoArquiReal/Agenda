// Forma de una cita tal como la muestra el tablero /agenda.
// Basada en la tabla `citas` del esquema SQL (PR #1) + nombres de servicio y especialista.
// ⚠️ Confirmar con Integrante 1 (Jhonatan) si GET /api/citas devuelve estos campos así.

export type EstadoCita = "RESERVADA" | "COMPLETADA" | "CANCELADA";

export interface Cita {
  id: string; // UUID
  codigo?: string; // CITA-XXX (aún no existe en el esquema SQL)
  fecha_inicio: string; // ISO en UTC, ej: "2026-11-24T14:00:00Z"
  fecha_fin: string;
  paciente_nombre: string;
  paciente_telefono: string | null;
  servicio: { id: string; nombre: string };
  especialista: { id: string; nombre_completo: string };
  estado: EstadoCita;
}
