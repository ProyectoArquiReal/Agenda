import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, CalendarPlus, LogOut, Menu, Package, Stethoscope, X } from "lucide-react";
import { getSession, logout } from "../services/authService";

// Layout global (T3.1 - ACM-10): barra de navegación + contenido + pie de página.
// El /login NO usa este layout.

const enlaces = [
  { to: "/agendar", texto: "Agendar", Icono: CalendarPlus },
  { to: "/agenda", texto: "Agenda", Icono: CalendarDays },
];

function claseEnlace({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-clinica-100 text-clinica-700" : "text-slate-600 hover:bg-slate-100"
  }`;
}

// Los enlaces del menú (se usan en escritorio y en celular)
function Enlaces({ alHacerClic }: { alHacerClic?: () => void }) {
  return (
    <>
      {enlaces.map(({ to, texto, Icono }) => (
        <NavLink key={to} to={to} className={claseEnlace} onClick={alHacerClic}>
          <Icono className="h-4 w-4" />
          {texto}
        </NavLink>
      ))}
      <span
        title="Disponible en v0.2.0"
        className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-slate-400"
      >
        <Package className="h-4 w-4" />
        Inventario
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">En construcción</span>
      </span>
    </>
  );
}

export default function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();
  const sesion = getSession();

  const cerrarSesion = () => {
    logout();
    navigate("/login");
  };

  const Usuario = (
    <div className="flex items-center gap-3 text-sm">
      {sesion && <span className="text-slate-500">{sesion.nombre ?? sesion.email}</span>}
      <button
        onClick={cerrarSesion}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100"
      >
        <LogOut className="h-4 w-4" />
        Salir
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* ARRIBA: barra de navegación */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <NavLink to="/inicio" className="flex items-center gap-2 font-semibold text-clinica-700">
            <Stethoscope className="h-6 w-6" />
            Clínica Sonrisa
          </NavLink>

          {/* Menú de escritorio */}
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            <Enlaces />
          </nav>
          <div className="hidden md:block">{Usuario}</div>

          {/* Botón hamburguesa (solo en celular) */}
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Menú desplegable en celular */}
        {menuAbierto && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
            <Enlaces alHacerClic={() => setMenuAbierto(false)} />
            <div className="mt-2 border-t border-slate-100 pt-2">{Usuario}</div>
          </nav>
        )}
      </header>

      {/* CENTRO: aquí se pinta cada página */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      {/* ABAJO: pie de página */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Agendamiento de Citas Médicas · v0.1.0
      </footer>
    </div>
  );
}
