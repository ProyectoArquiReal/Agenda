import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { getSession } from "../services/authService";

// Vista de bienvenida / resumen operativo (T3.1 - ACM-10)
export default function Inicio() {
  const sesion = getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido{sesion?.nombre ? `, ${sesion.nombre}` : ""}
        </h1>
        <p className="text-slate-500">¿Qué quieres hacer hoy?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/agendar" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-clinica-500">
          <CalendarPlus className="mb-3 h-8 w-8 text-clinica-600" />
          <h2 className="font-semibold">Agendar nueva cita</h2>
          <p className="text-sm text-slate-500">Registra una cita para un paciente.</p>
        </Link>

        <Link to="/agenda" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-clinica-500">
          <CalendarDays className="mb-3 h-8 w-8 text-clinica-600" />
          <h2 className="font-semibold">Ver agenda del día</h2>
          <p className="text-sm text-slate-500">Revisa y gestiona las citas de hoy.</p>
        </Link>
      </div>
    </div>
  );
}
