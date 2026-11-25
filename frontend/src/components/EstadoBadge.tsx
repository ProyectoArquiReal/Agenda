import type { EstadoCita } from "../types/cita";
import { ESTADOS } from "../constants/estados";

export default function EstadoBadge({ estado }: { estado: EstadoCita }) {
  // Si la API devuelve un estado desconocido, se muestra en gris en vez de romperse.
  const info = ESTADOS[estado] ?? { etiqueta: estado, clases: "bg-slate-100 text-slate-600 ring-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${info.clases}`}>
      {info.etiqueta}
    </span>
  );
}
