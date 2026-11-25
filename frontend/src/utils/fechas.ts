// Las fechas se guardan en UTC y se muestran en la zona horaria del consultorio.
export const ZONA_HORARIA = "America/Guayaquil";

// Fecha "YYYY-MM-DD" de un instante, vista en la zona del consultorio.
export function fechaLocal(instante: Date | string): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instante));
}

export function hoy(): string {
  return fechaLocal(new Date());
}

// "09:30" a partir de un ISO en UTC.
export function horaLocal(iso: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

// "martes, 24 de noviembre de 2026" a partir de "2026-11-24".
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-EC", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(a, m - 1, d)));
  return texto.charAt(0).toUpperCase() + texto.slice(1); // solo la primera letra en mayúscula
}

// Suma (o resta) días a "YYYY-MM-DD".
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const nueva = new Date(Date.UTC(a, m - 1, d + dias));
  return nueva.toISOString().slice(0, 10);
}
