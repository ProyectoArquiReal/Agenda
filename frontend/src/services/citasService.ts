import { isAxiosError } from "axios";
import { api } from "./api";
import type { Cita, EstadoCita } from "../types/cita";
import { citasMock } from "../mocks/citas";
import { fechaLocal } from "../utils/fechas";

// Mientras la API de Integrante 1 no esté lista se usan datos de prueba.
// Para usar la API real: VITE_USE_MOCKS=false en el archivo .env
export const USANDO_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

// Con VITE_MOCK_ERRORES=true el mock falla a propósito para probar los errores.
const MOCK_ERRORES = import.meta.env.VITE_MOCK_ERRORES === "true";

export class ErrorMock extends Error {
  status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

// Mensaje entendible para la recepcionista según el código HTTP.
export function mensajeDeError(error: unknown): string {
  let status: number | undefined;
  if (isAxiosError(error)) status = error.response?.status;
  else if (error instanceof ErrorMock) status = error.status;

  if (status === undefined) return "No se pudo conectar con el servidor. Revisa tu conexión.";
  if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para hacer esta acción.";
  if (status === 404) return "La cita ya no existe.";
  if (status === 409) return "Otra persona modificó esta cita. Actualiza la agenda.";
  if (status >= 500) return "El servidor tuvo un problema. Intenta de nuevo.";
  return `Ocurrió un error (${status}).`;
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GET /api/citas?fecha=YYYY-MM-DD  (baseURL de axios ya incluye /api)
export async function obtenerCitas(fecha: string): Promise<Cita[]> {
  if (USANDO_MOCKS) {
    await esperar(500);
    if (MOCK_ERRORES) throw new ErrorMock(500, "Error simulado");
    return citasMock
      .filter((c) => fechaLocal(c.fecha_inicio) === fecha)
      .map((c) => ({ ...c }));
  }
  const { data } = await api.get<Cita[]>("/citas", { params: { fecha } });
  return data;
}

// PATCH /api/citas/:id/estado  (T3.3 - ACM-12)
// Puede devolver la cita actualizada o nada (204), según cómo lo implemente el backend.
export async function cambiarEstado(id: string, estado: EstadoCita): Promise<Cita | undefined> {
  if (USANDO_MOCKS) {
    await esperar(800);
    if (MOCK_ERRORES) throw new ErrorMock(409, "Error simulado");
    const cita = citasMock.find((c) => c.id === id);
    if (!cita) throw new ErrorMock(404, "Cita no encontrada");
    cita.estado = estado;
    return { ...cita };
  }
  const { data } = await api.patch<Cita | undefined>(`/citas/${encodeURIComponent(id)}/estado`, { estado });
  return data || undefined;
}
