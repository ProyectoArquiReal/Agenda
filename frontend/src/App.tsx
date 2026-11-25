import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { getSession, logout } from './services/authService';
import AppLayout from './layout/AppLayout';
import Inicio from './pages/Inicio';
import Agenda from './pages/Agenda';

function PlaceholderView({ title }: { title: string }) {
  const navigate = useNavigate();
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>{title}</h1>
      <p>
        Sesión activa: <strong>{session?.email}</strong> | Rol:{' '}
        <strong>{session?.role}</strong>
      </p>
      <button
        onClick={handleLogout}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#ef4444',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Rutas internas: usan el layout global (barra de navegación + pie) */}
        <Route element={<AppLayout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route
            path="/agendar"
            element={<PlaceholderView title="Vista /agendar (Próxima tarea T2.2)" />}
          />
          <Route
            path="/inventario"
            element={<PlaceholderView title="Vista /inventario (Módulo Bodega)" />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;