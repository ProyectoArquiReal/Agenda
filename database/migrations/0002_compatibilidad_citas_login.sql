-- MIGRACIÓN 0002: Compatibilidad con el plan v0.1.0
-- Ejecutar con un rol de migración autorizado para mantenimiento multi-tenant.
-- SET row_security = off hace que el backfill falle explícitamente si el rol no
-- puede ignorar RLS; no deja una migración parcialmente aplicada por cero filas.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'estado_cita' AND e.enumlabel = 'CONFIRMADA'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'estado_cita' AND e.enumlabel = 'RESERVADA'
    ) THEN
        ALTER TYPE estado_cita RENAME VALUE 'CONFIRMADA' TO 'RESERVADA';
    END IF;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS citas_codigo_seq AS BIGINT START WITH 1;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS codigo VARCHAR(20);

SET LOCAL row_security = off;

UPDATE citas
SET codigo = 'CITA-' || CASE
    WHEN nextval('citas_codigo_seq') < 1000
        THEN LPAD(currval('citas_codigo_seq')::TEXT, 3, '0')
    ELSE currval('citas_codigo_seq')::TEXT
END
WHERE codigo IS NULL;

-- Normaliza los datos persistidos cuando ya coexistían las dos etiquetas enum.
UPDATE citas
SET estado = 'RESERVADA'
WHERE estado::TEXT = 'CONFIRMADA';

ALTER TABLE citas ALTER COLUMN codigo SET DEFAULT (
    'CITA-' || CASE
        WHEN nextval('citas_codigo_seq') < 1000
            THEN LPAD(currval('citas_codigo_seq')::TEXT, 3, '0')
        ELSE currval('citas_codigo_seq')::TEXT
    END
);
ALTER TABLE citas ALTER COLUMN codigo SET NOT NULL;
ALTER SEQUENCE citas_codigo_seq OWNED BY citas.codigo;
CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_codigo ON citas (codigo);

ALTER TABLE citas DROP CONSTRAINT IF EXISTS ex_citas_sin_solapamiento;
ALTER TABLE citas ADD CONSTRAINT ex_citas_sin_solapamiento
    EXCLUDE USING gist (
        consultorio_id WITH =,
        especialista_id WITH =,
        tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
    )
    WHERE (estado IN ('PENDIENTE_CONFIRMACION', 'RESERVADA', 'EN_ATENCION'));

CREATE OR REPLACE FUNCTION fn_normalizar_estado_cita()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado::TEXT = 'CONFIRMADA' THEN
        NEW.estado := 'RESERVADA';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_citas_normalizar_estado ON citas;
CREATE TRIGGER trg_citas_normalizar_estado
    BEFORE INSERT OR UPDATE OF estado ON citas
    FOR EACH ROW EXECUTE FUNCTION fn_normalizar_estado_cita();

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_email
    ON usuarios (LOWER(email)) WHERE activo = TRUE;

DROP POLICY IF EXISTS rls_usuarios_login_lookup ON usuarios;
CREATE POLICY rls_usuarios_login_lookup ON usuarios
    FOR SELECT
    USING (current_user = 'agenda_auth');

COMMIT;
