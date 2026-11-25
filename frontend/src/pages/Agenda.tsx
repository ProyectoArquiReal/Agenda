import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarX, Check, ChevronLeft, ChevronRight, Loader2, Phone, RefreshCw, X } from "lucide-react";
import type { Cita, EstadoCita } from "../types/cita";
import { cambiarEstado, mensajeDeError, obtenerCitas, USANDO_MOCKS } from "../services/citasService";
import { ESTADOS, ESTADOS_ACCIONABLES } from "../constants/estados";
import { fechaLarga, horaLocal, hoy, sumarDias } from "../utils/fechas";
import EstadoBadge from "../components/EstadoBadge";

type Aviso = { tipo: "ok" | "error"; texto: string };
type OnAccion = (cita: Cita, nuevo: EstadoCita) => void;

// Tablero Diario /agenda (T3.2 - ACM-11) + acciones Completar/Cancelar (T3.3 - ACM-12)
export default function Agenda() {
  const [fecha, setFecha] = useState(hoy());
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [recargas, setRecargas] = useState(0);
  // id de cita -> acción que se está procesando (para mostrar el spinner en ese botón)
  const [procesando, setProcesando] = useState<Record<string, EstadoCita>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);

  // ---- T3.2: cargar las citas de la fecha elegida ----
  useEffect(() => {
    let cancelado = false; // evita pintar datos de una fecha anterior si el usuario cambió rápido
    obtenerCitas(fecha)
      .then((datos) => {
        if (cancelado) return;
        setCitas(datos);
        setErrorCarga(null);
      })
      .catch((error) => {
        if (!cancelado) setErrorCarga(mensajeDeError(error));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, recargas]);

  // El aviso verde/rojo desaparece solo a los 4 segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(t);
  }, [aviso]);

  function cambiarFecha(nueva: string) {
    if (!nueva || nueva === fecha) return;
    setCargando(true);
    setFecha(nueva);
  }

  function recargar() {
    setCargando(true);
    setErrorCarga(null);
    setRecargas((n) => n + 1);
  }

  // Orden cronológico
  const ordenadas = useMemo(
    () => [...citas].sort((a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()),
    [citas],
  );

  const resumen = useMemo(() => {
    const cuenta = (e: EstadoCita) => citas.filter((c) => c.estado === e).length;
    return { total: citas.length, reservadas: cuenta("RESERVADA"), completadas: cuenta("COMPLETADA"), canceladas: cuenta("CANCELADA") };
  }, [citas]);

  // ---- T3.3: Completar / Cancelar ----
  const ejecutarAccion: OnAccion = async (cita, nuevo) => {
    if (
      nuevo === "CANCELADA" &&
      !window.confirm(`¿Cancelar la cita de ${cita.paciente_nombre} a las ${horaLocal(cita.fecha_inicio)}?`)
    ) {
      return;
    }

    setProcesando((p) => ({ ...p, [cita.id]: nuevo }));
    setAviso(null);
    try {
      const actualizada = await cambiarEstado(cita.id, nuevo);
      // Se actualiza en pantalla sin recargar la página
      setCitas((lista) =>
        lista.map((c) => (c.id === cita.id ? { ...c, estado: actualizada?.estado ?? nuevo } : c)),
      );
      setAviso({ tipo: "ok", texto: `Cita de ${cita.paciente_nombre} marcada como ${ESTADOS[nuevo].etiqueta.toLowerCase()}.` });
    } catch (error) {
      setAviso({ tipo: "error", texto: mensajeDeError(error) });
    } finally {
      setProcesando((p) => {
        const resto = { ...p };
        delete resto[cita.id];
        return resto;
      });
    }
  };

  const esHoy = fecha === hoy();

  return (
    <div className="space-y-5">
      {/* Encabezado + selector de fecha */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agenda del día</h1>
          <p className="text-slate-500">{fechaLarga(fecha)}</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => cambiarFecha(sumarDias(fecha, -1))} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Día anterior">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={fecha}
            onChange={(e) => cambiarFecha(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-clinica-500 focus:outline-none focus:ring-2 focus:ring-clinica-100"
            aria-label="Fecha de la agenda"
          />
          <button onClick={() => cambiarFecha(sumarDias(fecha, 1))} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" aria-label="Día siguiente">
            <ChevronRight className="h-4 w-4" />
          </button>
          {!esHoy && (
            <button onClick={() => cambiarFecha(hoy())} className="rounded-lg bg-clinica-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-clinica-700">
              Hoy
            </button>
          )}
          <button onClick={recargar} disabled={cargando} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="Actualizar agenda">
            <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {USANDO_MOCKS && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
          Mostrando <strong>datos de prueba</strong>. Para usar la API real pon <code>VITE_USE_MOCKS=false</code> en <code>.env</code>.
        </p>
      )}

      {/* Resumen del día */}
      {!cargando && !errorCarga && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Contador etiqueta="Total" valor={resumen.total} clases="bg-white text-slate-700 ring-slate-200" />
          <Contador etiqueta="Reservadas" valor={resumen.reservadas} clases={ESTADOS.RESERVADA.clases} />
          <Contador etiqueta="Completadas" valor={resumen.completadas} clases={ESTADOS.COMPLETADA.clases} />
          <Contador etiqueta="Canceladas" valor={resumen.canceladas} clases={ESTADOS.CANCELADA.clases} />
        </div>
      )}

      {/* Aviso tras una acción */}
      {aviso && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ring-1 ${
            aviso.tipo === "ok" ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200"
          }`}
        >
          {aviso.tipo === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {aviso.texto}
        </div>
      )}

      {/* Contenido */}
      {cargando ? (
        <Esqueleto />
      ) : errorCarga ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-rose-500" />
          <p className="text-rose-800">{errorCarga}</p>
          <button onClick={recargar} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            Reintentar
          </button>
        </div>
      ) : ordenadas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarX className="h-8 w-8 text-slate-400" />
          <p className="font-medium text-slate-700">No hay citas para este día</p>
          <p className="text-sm text-slate-500">Elige otra fecha o agenda una nueva cita.</p>
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Especialista</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordenadas.map((c) => (
                  <tr key={c.id} className={c.estado === "CANCELADA" ? "text-slate-400" : ""}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {horaLocal(c.fecha_inicio)}
                      <span className="block text-xs font-normal text-slate-400">hasta {horaLocal(c.fecha_fin)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.paciente_nombre}</span>
                      <Telefono telefono={c.paciente_telefono} />
                    </td>
                    <td className="px-4 py-3">{c.servicio.nombre}</td>
                    <td className="px-4 py-3">{c.especialista.nombre_completo}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <Acciones cita={c} enCurso={procesando[c.id]} onAccion={ejecutarAccion} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas */}
          <ul className="space-y-3 md:hidden">
            {ordenadas.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {horaLocal(c.fecha_inicio)}
                      <span className="ml-1 text-sm font-normal text-slate-400">– {horaLocal(c.fecha_fin)}</span>
                    </p>
                    <p className="font-medium">{c.paciente_nombre}</p>
                  </div>
                  <EstadoBadge estado={c.estado} />
                </div>
                <Telefono telefono={c.paciente_telefono} />
                <p className="mt-2 text-sm text-slate-600">
                  {c.servicio.nombre} · {c.especialista.nombre_completo}
                </p>
                <div className="mt-3">
                  <Acciones cita={c} enCurso={procesando[c.id]} onAccion={ejecutarAccion} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------- Componentes pequeños de esta página ----------

function Acciones({ cita, enCurso, onAccion }: { cita: Cita; enCurso?: EstadoCita; onAccion: OnAccion }) {
  if (!ESTADOS_ACCIONABLES.includes(cita.estado)) {
    return <span className="block text-right text-xs text-slate-400 md:text-right">Sin acciones</span>;
  }
  const ocupado = enCurso !== undefined;
  return (
    <div className="flex gap-2 md:justify-end">
      <button
        onClick={() => onAccion(cita, "COMPLETADA")}
        disabled={ocupado}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enCurso === "COMPLETADA" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Completar
      </button>
      <button
        onClick={() => onAccion(cita, "CANCELADA")}
        disabled={ocupado}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enCurso === "CANCELADA" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        Cancelar
      </button>
    </div>
  );
}

function Telefono({ telefono }: { telefono: string | null }) {
  if (!telefono) return <span className="block text-xs text-slate-400">Sin teléfono</span>;
  return (
    <a href={`tel:${telefono.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs text-clinica-600 hover:underline">
      <Phone className="h-3 w-3" />
      {telefono}
    </a>
  );
}

function Contador({ etiqueta, valor, clases }: { etiqueta: string; valor: number; clases: string }) {
  return (
    <span className={`rounded-full px-3 py-1 ring-1 ring-inset ${clases}`}>
      {etiqueta}: <strong>{valor}</strong>
    </span>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-3" aria-label="Cargando citas">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200/70" />
      ))}
    </div>
  );
}
