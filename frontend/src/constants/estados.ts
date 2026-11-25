import type { EstadoCita } from "../types/cita";

// ⚠️ ÚNICO lugar donde se definen los estados.
// Jira (T1.2/T3.2/T3.3) usa estos 3; el esquema SQL del PR #1 tiene 7 distintos.
// Si Jhonatan confirma otros, solo se cambia este archivo y el tipo EstadoCita.

export const ESTADOS: Record<EstadoCita, { etiqueta: string; clases: string }> = {
  RESERVADA: { etiqueta: "Reservada", clases: "bg-sky-100 text-sky-700 ring-sky-200" },
  COMPLETADA: { etiqueta: "Completada", clases: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
  CANCELADA: { etiqueta: "Cancelada", clases: "bg-rose-100 text-rose-700 ring-rose-200" },
};

// Solo las citas en estos estados se pueden completar o cancelar.
export const ESTADOS_ACCIONABLES: EstadoCita[] = ["RESERVADA"];
