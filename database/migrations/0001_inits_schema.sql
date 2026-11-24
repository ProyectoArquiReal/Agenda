-- ============================================================================
-- MIGRACIÓN 0001: Esquema Core v0.1.0 + Estructura Base Inventario (v0.2.0)
-- Motor objetivo: PostgreSQL 16+
-- Arquitectura: Monolito Modular | Multi-Tenant Pool + Row-Level Security (RLS)
-- ============================================================================

BEGIN;

-- Extensión requerida para restricción EXCLUDE USING gist con UUID + tstzrange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1. TIPOS ENUMERADOS DE DOMINIO
-- ============================================================================

CREATE TYPE rol_usuario AS ENUM (
    'OWNER',
    'ADMIN',
    'RECEPCIONISTA',
    'ADMIN_BODEGA',
    'ESPECIALISTA'
);

CREATE TYPE tipo_servicio AS ENUM (
    'VALORACION',
    'PROCEDIMIENTO'
);

-- Máquina de estados finita de citas (7 estados persistentes)
CREATE TYPE estado_cita AS ENUM (
    'PENDIENTE_CONFIRMACION',
    'CONFIRMADA',
    'REQUIERE_REPOSICION',
    'EN_ATENCION',
    'COMPLETADA',
    'CANCELADA',
    'EXPIRADA'
);

-- ============================================================================
-- 2. FUNCIÓN UTILITARIA PARA AUDITORÍA DE UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. TABLAS CORE (ACTIVAS EN v0.1.0)
-- ============================================================================

-- 3.1 consultorio_config (Entidad raíz del Tenant / Clínica)
CREATE TABLE consultorio_config (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_comercial        VARCHAR(150) NOT NULL,
    ruc_identificacion      VARCHAR(30)  NOT NULL,
    especialidad_principal  VARCHAR(80)  NOT NULL DEFAULT 'ODONTOLOGIA',
    zona_horaria            VARCHAR(64)  NOT NULL DEFAULT 'America/Guayaquil',
    telefono_contacto       VARCHAR(30),
    email_contacto          VARCHAR(150),
    direccion               TEXT,
    ttl_prereserva_minutos  INTEGER      NOT NULL DEFAULT 30,
    permite_lista_reposicion BOOLEAN     NOT NULL DEFAULT TRUE,
    horario_atencion        JSONB        NOT NULL DEFAULT '{}'::jsonb,
    activo                  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_consultorio_ruc UNIQUE (ruc_identificacion),
    CONSTRAINT chk_consultorio_ttl CHECK (ttl_prereserva_minutos BETWEEN 5 AND 1440)
);

-- 3.2 usuarios (Identidad y Control de Acceso RBAC por Consultorio)
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id  UUID         NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    email           VARCHAR(150) NOT NULL,
    password_hash   TEXT         NOT NULL, -- Formato Argon2id
    nombre_completo VARCHAR(150) NOT NULL,
    rol             rol_usuario  NOT NULL,
    mfa_habilitado  BOOLEAN      NOT NULL DEFAULT FALSE,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_usuarios_tenant_id    UNIQUE (consultorio_id, id),
    CONSTRAINT uq_usuarios_tenant_email UNIQUE (consultorio_id, email)
);

-- 3.3 especialistas (Recurso clínico reservable en agenda)
CREATE TABLE especialistas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id       UUID         NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    usuario_id           UUID         NULL, -- Opcional si el especialista también inicia sesión
    registro_profesional VARCHAR(60)  NOT NULL,
    nombre_completo      VARCHAR(150) NOT NULL,
    especialidad         VARCHAR(100) NOT NULL,
    sillon_o_cabina      VARCHAR(50),
    horario_laboral      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    activo               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_especialistas_tenant_id       UNIQUE (consultorio_id, id),
    CONSTRAINT uq_especialistas_tenant_registro UNIQUE (consultorio_id, registro_profesional),
    CONSTRAINT fk_especialistas_usuario
        FOREIGN KEY (consultorio_id, usuario_id)
        REFERENCES usuarios (consultorio_id, id)
        ON DELETE RESTRICT
);

-- 3.4 servicios (Catálogo clínico: VALORACION y PROCEDIMIENTO)
CREATE TABLE servicios (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id    UUID           NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    codigo            VARCHAR(40)    NOT NULL,
    nombre            VARCHAR(150)   NOT NULL,
    descripcion       TEXT,
    tipo              tipo_servicio  NOT NULL,
    duracion_minutos  INTEGER        NOT NULL,
    precio_base       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    requiere_insumos  BOOLEAN        NOT NULL DEFAULT FALSE,
    activo            BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_servicios_tenant_id     UNIQUE (consultorio_id, id),
    CONSTRAINT uq_servicios_tenant_codigo UNIQUE (consultorio_id, codigo),
    CONSTRAINT chk_servicios_duracion     CHECK (duracion_minutos > 0 AND duracion_minutos <= 480),
    CONSTRAINT chk_servicios_precio       CHECK (precio_base >= 0)
);

-- 3.5 citas (Núcleo temporal protegido físicamente contra doble agendamiento)
CREATE TABLE citas (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id          UUID         NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    especialista_id         UUID         NOT NULL,
    servicio_id             UUID         NOT NULL,
    creado_por              UUID         NOT NULL,

    -- Datos de paciente en v0.1.0 + columna lista para normalizar tabla pacientes
    paciente_id             UUID         NULL,
    paciente_nombre         VARCHAR(150) NOT NULL,
    paciente_documento      VARCHAR(30)  NOT NULL,
    paciente_telefono       VARCHAR(30),
    paciente_email          VARCHAR(150),

    fecha_inicio            TIMESTAMPTZ  NOT NULL,
    fecha_fin               TIMESTAMPTZ  NOT NULL,
    estado                  estado_cita  NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
    conteo_reprogramaciones INTEGER      NOT NULL DEFAULT 0,
    notas                   TEXT,
    motivo_cancelacion      TEXT,
    version                 INTEGER      NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_citas_tenant_id UNIQUE (consultorio_id, id),
    CONSTRAINT fk_citas_especialista
        FOREIGN KEY (consultorio_id, especialista_id)
        REFERENCES especialistas (consultorio_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_citas_servicio
        FOREIGN KEY (consultorio_id, servicio_id)
        REFERENCES servicios (consultorio_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_citas_creado_por
        FOREIGN KEY (consultorio_id, creado_por)
        REFERENCES usuarios (consultorio_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_citas_rango_valido CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT chk_citas_reprogramaciones CHECK (conteo_reprogramaciones >= 0),

    -- Garantía física en PostgreSQL: un especialista no puede tener dos citas activas solapadas
    CONSTRAINT ex_citas_sin_solapamiento
        EXCLUDE USING gist (
            consultorio_id WITH =,
            especialista_id WITH =,
            tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
        )
        WHERE (estado IN ('PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'EN_ATENCION'))
);

-- ============================================================================
-- 4. TABLAS ESTRUCTURALES EXTENDIDAS (SIN LÓGICA ACTIVA EN v0.1.0 -> MOTOR v0.2.0)
-- ============================================================================

-- 4.1 insumos (Catálogo + saldos materializados listos para bloqueo FOR UPDATE en v0.2.0)
CREATE TABLE insumos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id       UUID           NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    sku                  VARCHAR(60)    NOT NULL,
    nombre               VARCHAR(150)   NOT NULL,
    categoria            VARCHAR(80)    NOT NULL DEFAULT 'GENERAL',
    unidad_medida        VARCHAR(30)    NOT NULL, -- ej: UNIDAD, ML, CARTUCHO, KIT
    stock_fisico         NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    stock_reservado      NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    stock_minimo         NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    es_critico           BOOLEAN        NOT NULL DEFAULT TRUE,
    controla_vencimiento BOOLEAN        NOT NULL DEFAULT FALSE,
    version              INTEGER        NOT NULL DEFAULT 1,
    activo               BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_insumos_tenant_id  UNIQUE (consultorio_id, id),
    CONSTRAINT uq_insumos_tenant_sku UNIQUE (consultorio_id, sku),

    -- Invariantes duros de inventario (se explotarán en el motor transaccional v0.2.0)
    CONSTRAINT chk_insumos_stocks_no_negativos CHECK (
        stock_fisico >= 0 AND stock_reservado >= 0 AND stock_minimo >= 0
    ),
    CONSTRAINT chk_insumos_reservado_menor_igual_fisico CHECK (
        stock_reservado <= stock_fisico
    )
);

-- 4.2 receta_items (BOM ligero: vincula PROCEDIMIENTOS con sus insumos requeridos)
CREATE TABLE receta_items (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultorio_id     UUID           NOT NULL REFERENCES consultorio_config(id) ON DELETE RESTRICT,
    servicio_id        UUID           NOT NULL,
    insumo_id          UUID           NOT NULL,
    cantidad_requerida NUMERIC(12, 3) NOT NULL,
    es_obligatorio     BOOLEAN        NOT NULL DEFAULT TRUE,
    notas              VARCHAR(255),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_receta_servicio_insumo UNIQUE (consultorio_id, servicio_id, insumo_id),
    CONSTRAINT fk_receta_servicio
        FOREIGN KEY (consultorio_id, servicio_id)
        REFERENCES servicios (consultorio_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_receta_insumo
        FOREIGN KEY (consultorio_id, insumo_id)
        REFERENCES insumos (consultorio_id, id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_receta_cantidad_positiva CHECK (cantidad_requerida > 0)
);

-- ============================================================================
-- 5. ÍNDICES RECOMENDADOS
-- ============================================================================

CREATE INDEX idx_usuarios_consultorio_rol
    ON usuarios (consultorio_id, rol) WHERE activo = TRUE;

CREATE INDEX idx_especialistas_consultorio_activos
    ON especialistas (consultorio_id) WHERE activo = TRUE;

CREATE INDEX idx_servicios_consultorio_tipo
    ON servicios (consultorio_id, tipo) WHERE activo = TRUE;

CREATE INDEX idx_citas_agenda_especialista
    ON citas (consultorio_id, especialista_id, fecha_inicio, fecha_fin);

CREATE INDEX idx_citas_estado_fecha
    ON citas (consultorio_id, estado, fecha_inicio);

CREATE INDEX idx_citas_paciente_documento
    ON citas (consultorio_id, paciente_documento);

CREATE INDEX idx_insumos_alerta_stock
    ON insumos (consultorio_id, es_critico)
    WHERE activo = TRUE;

CREATE INDEX idx_receta_items_servicio
    ON receta_items (consultorio_id, servicio_id);

-- ============================================================================
-- 6. TRIGGERS DE ACTUALIZACIÓN DE TIMESTAMPS
-- ============================================================================

CREATE TRIGGER trg_consultorio_config_updated_at
    BEFORE UPDATE ON consultorio_config FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_especialistas_updated_at
    BEFORE UPDATE ON especialistas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_servicios_updated_at
    BEFORE UPDATE ON servicios FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_citas_updated_at
    BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_insumos_updated_at
    BEFORE UPDATE ON insumos FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_receta_items_updated_at
    BEFORE UPDATE ON receta_items FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================================
-- 7. SEGURIDAD MULTI-TENANT: ROW-LEVEL SECURITY (RLS) DESDE DÍA 1
-- ============================================================================
-- Nota operativa: Cada transacción desde NestJS/Drizzle ejecutará:
--   SELECT set_config('app.current_consultorio_id', $1, true);
-- NULLIF evita errores de cast cuando la variable no ha sido inicializada.

ALTER TABLE consultorio_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultorio_config FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_consultorio_config ON consultorio_config
    USING (id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_usuarios ON usuarios
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialistas FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_especialistas ON especialistas
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_servicios ON servicios
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_citas ON citas
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_insumos ON insumos
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

ALTER TABLE receta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receta_items FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_receta_items ON receta_items
    USING (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid)
    WITH CHECK (consultorio_id = NULLIF(current_setting('app.current_consultorio_id', true), '')::uuid);

COMMIT;