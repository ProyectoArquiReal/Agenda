import type { Cita } from "../types/cita";
import { hoy, sumarDias } from "../utils/fechas";

// Datos de prueba basados en el seed.sql del PR #1 (especialistas y consultorio reales del seed).
const DRA_MORALES = { id: "01935a00-0000-7000-8000-000000000021", nombre_completo: "Dra. Camila Morales" };
const DR_SEGUNDO = { id: "01935a00-0000-7000-8000-000000000022", nombre_completo: "Dr. Esteban Ruiz" };

const VALORACION = { id: "srv-1", nombre: "Valoración inicial" };
const CONTROL = { id: "srv-2", nombre: "Control post-tratamiento" };
const ENDODONCIA = { id: "srv-3", nombre: "Endodoncia" };
const PROFILAXIS = { id: "srv-4", nombre: "Profilaxis dental" };

// Convierte "YYYY-MM-DD" + "HH:mm" (hora de Guayaquil, UTC-5) a ISO en UTC.
function iso(fecha: string, hora: string, minutosExtra = 0): string {
  const [h, m] = hora.split(":").map(Number);
  const [a, mes, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, mes - 1, d, h + 5, m + minutosExtra)).toISOString();
}

let contador = 0;
function cita(
  fecha: string,
  hora: string,
  duracion: number,
  paciente: string,
  telefono: string | null,
  servicio: Cita["servicio"],
  especialista: Cita["especialista"],
  estado: Cita["estado"] = "RESERVADA",
): Cita {
  contador++;
  return {
    id: crypto.randomUUID(),
    codigo: `CITA-${String(contador).padStart(3, "0")}`,
    fecha_inicio: iso(fecha, hora),
    fecha_fin: iso(fecha, hora, duracion),
    paciente_nombre: paciente,
    paciente_telefono: telefono,
    servicio,
    especialista,
    estado,
  };
}

const HOY = hoy();
const AYER = sumarDias(HOY, -1);
const MANANA = sumarDias(HOY, 1);

// Se crean desordenadas a propósito: el tablero debe ordenarlas por hora.
export const citasMock: Cita[] = [
  cita(HOY, "11:00", 60, "Luis Andrade", "+593 98 765 4321", ENDODONCIA, DRA_MORALES),
  cita(HOY, "08:30", 30, "María Fernanda Torres", "+593 99 111 2233", VALORACION, DRA_MORALES, "COMPLETADA"),
  cita(HOY, "09:00", 45, "Jorge Paredes", "+593 96 444 5566", PROFILAXIS, DR_SEGUNDO),
  cita(HOY, "15:30", 30, "Ana Lucía Vega", null, CONTROL, DR_SEGUNDO),
  cita(HOY, "10:00", 30, "Carlos Mena", "+593 97 222 3344", VALORACION, DR_SEGUNDO, "CANCELADA"),
  cita(HOY, "16:30", 60, "Gabriela Ortiz", "+593 95 888 9900", ENDODONCIA, DRA_MORALES),
  cita(AYER, "09:30", 30, "Pedro Salazar", "+593 99 333 4455", VALORACION, DRA_MORALES, "COMPLETADA"),
  cita(AYER, "14:00", 45, "Sofía Cárdenas", "+593 98 555 6677", PROFILAXIS, DR_SEGUNDO, "COMPLETADA"),
  cita(MANANA, "08:30", 60, "Ricardo Benítez", "+593 96 777 8899", ENDODONCIA, DRA_MORALES),
  cita(MANANA, "12:00", 30, "Daniela Pozo", "+593 97 000 1122", CONTROL, DR_SEGUNDO),
];
