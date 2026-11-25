-- Roles locales de desarrollo. No reutilizar estas contraseñas fuera del entorno local.
CREATE ROLE agenda_app
    LOGIN PASSWORD 'agenda_app_dev_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

CREATE ROLE agenda_auth
    LOGIN PASSWORD 'agenda_auth_dev_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO agenda_app, agenda_auth;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO agenda_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agenda_app;

GRANT SELECT (
    id,
    consultorio_id,
    email,
    password_hash,
    nombre_completo,
    rol,
    mfa_habilitado,
    activo
) ON usuarios TO agenda_auth;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO agenda_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO agenda_app;
