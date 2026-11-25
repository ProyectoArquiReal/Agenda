import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginDemo } from '../services/authService';
import type { UserRole } from '../types/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role: UserRole) => {
    if (role === 'ADMIN_BODEGA') {
      navigate('/inventario');
    } else {
      navigate('/agendar');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await login({ email, password });
      redirectByRole(session.role);
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus credenciales o la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: UserRole) => {
    const demoEmail =
      role === 'RECEPCION' ? 'recepcion@clinica.local' : 'bodega@clinica.local';
    const session = loginDemo(demoEmail, role);
    redirectByRole(session.role);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Agenda Clínica & Stock</h1>
        <p style={styles.subtitle}>Ingreso de personal autorizado</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="usuario@clinica.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <label style={styles.label} htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && (
            <div role="alert" style={styles.error}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={styles.demoBox}>
          <p style={styles.demoText}>Acceso rápido (Modo prueba sin Backend):</p>
          <div style={styles.demoButtons}>
            <button
              type="button"
              onClick={() => handleDemoLogin('RECEPCION')}
              style={styles.demoButton}
            >
              Entrar como Recepción
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN_BODEGA')}
              style={styles.demoButton}
            >
              Entrar como Bodega
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: '1rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0.25rem 0 1.5rem',
    fontSize: '0.9rem',
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    padding: '0.65rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  demoBox: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0',
  },
  demoText: {
    margin: '0 0 0.5rem',
    fontSize: '0.8rem',
    color: '#64748b',
    textAlign: 'center',
  },
  demoButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  demoButton: {
    flex: 1,
    padding: '0.5rem',
    fontSize: '0.8rem',
    backgroundColor: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};