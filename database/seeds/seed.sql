-- ============================================================================
-- SEED INICIAL v0.1.0 (Idempotente y compatible con RLS)
-- Contiene:
--   - 1 consultorio
--   - 2 usuarios de prueba (RECEPCIONISTA y ADMIN_BODEGA)
--   - 2 especialistas
--   - 4 servicios (2 VALORACION + 2 PROCEDIMIENTO)
--   - insumos y receta_items quedan vacías (estructura reservada para v0.2.0)
-- ============================================================================

BEGIN;

-- Contexto de sesión multi-tenant requerido por FORCE ROW LEVEL SECURITY
SELECT set_config(
    'app.current_consultorio_id',
    '01935a00-0000-7000-8000-000000000001',
    true
);

-- ----------------------------------------------------------------------------
-- 1. CONSULTORIO (1 registro)
-- ----------------------------------------------------------------------------
INSERT INTO consultorio_config (
    id,
    nombre_comercial,
    ruc_identificacion,
    especialidad_principal,
    zona_horaria,
    telefono_contacto,
    email_contacto,
    direccion,
    ttl_prereserva_minutos,
    permite_lista_reposicion,
    horario_atencion
) VALUES (
    '01935a00-0000-7000-8000-000000000001',
    'Clínica Dental Sonrisa Integral',
    '1790012345001',
    'ODONTOLOGIA',
    'America/Guayaquil',
    '+593 99 123 4567',
    'contacto@sonrisaintegral.ec',
    'Av. Amazonas N34-120 y República, Quito',
    30,
    TRUE,
    '{
        "lunes_a_viernes": {"inicio": "08:30", "fin": "18:30"},
        "sabado": {"inicio": "09:00", "fin": "13:00"}
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. USUARIOS DE PRUEBA (2 registros: Recepcionista y Admin Bodega)
-- IMPORTANTE: Reemplazar password_hash por hashes Argon2id reales generados
-- desde tu backend (ej. `argon2.hash('ClinicaDemo2026!')`) antes de staging.
-- ----------------------------------------------------------------------------
INSERT INTO usuarios (
    id,
    consultorio_id,
    email,
    password_hash,
    nombre_completo,
    rol,
    mfa_habilitado,
    activo
) VALUES
(
    '01935a00-0000-7000-8000-000000000011',
    '01935a00-0000-7000-8000-000000000001',
    'recepcion@sonrisaintegral.ec',
    '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_WITH_REAL_SALT_01$REPLACE_WITH_REAL_HASH_RECEPCIONISTA',
    'Valeria Cevallos (Recepción)',
    'RECEPCIONISTA',
    FALSE,
    TRUE
),
(
    '01935a00-0000-7000-8000-000000000012',
    '01935a00-0000-7000-8000-000000000001',
    'bodega@sonrisaintegral.ec',
    '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_WITH_REAL_SALT_02$REPLACE_WITH_REAL_HASH_ADMIN_BODEGA',
    'Andrés Mendoza (Admin Bodega)',
    'ADMIN_BODEGA',
    TRUE,
    TRUE
)
ON CONFLICT (consultorio_id, email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. ESPECIALISTAS (2 registros)
-- ----------------------------------------------------------------------------
INSERT INTO especialistas (
    id,
    consultorio_id,
    usuario_id,
    registro_profesional,
    nombre_completo,
    especialidad,
    sillon_o_cabina,
    horario_laboral,
    activo
) VALUES
(
    '01935a00-0000-7000-8000-000000000021',
    '01935a00-0000-7000-8000-000000000001',
    NULL,
    'MSP-OD-10482',
    'Dra. Camila Morales',
    'Endodoncia y Rehabilitación Oral',
    'Sillón 1',
    '{
        "dias": [1, 2, 3, 4, 5],
        "inicio": "08:30",
        "fin": "17:30"
    }'::jsonb,
    TRUE
),
(
    '01935a00-0000-7000-8000-000000000022',
    '01935a00-0000-7000-8000-000000000001',
    NULL,
    'MSP-OD-11935',
    'Dr. Mateo Paredes',
    'Odontología General e Implantología',
    'Sillón 2',
    '{
        "dias": [1, 2, 3, 4, 5, 6],
        "inicio": "09:00",
        "fin": "18:30"
    }'::jsonb,
    TRUE
)
ON CONFLICT (consultorio_id, registro_profesional) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. SERVICIOS (4 registros: 2 VALORACION y 2 PROCEDIMIENTO)
-- ----------------------------------------------------------------------------
INSERT INTO servicios (
    id,
    consultorio_id,
    codigo,
    nombre,
    descripcion,
    tipo,
    duracion_minutos,
    precio_base,
    requiere_insumos,
    activo
) VALUES
(
    '01935a00-0000-7000-8000-000000000031',
    '01935a00-0000-7000-8000-000000000001',
    'VAL-001',
    'Valoración Odontológica Integral',
    'Diagnóstico clínico general, odontograma inicial y plan de tratamiento.',
    'VALORACION',
    30,
    25.00,
    FALSE,
    TRUE
),
(
    '01935a00-0000-7000-8000-000000000032',
    '01935a00-0000-7000-8000-000000000001',
    'VAL-002',
    'Valoración Especializada de Endodoncia',
    'Evaluación de sensibilidad pulpar y revisión radiográfica previa a procedimiento.',
    'VALORACION',
    30,
    35.00,
    FALSE,
    TRUE
),
(
    '01935a00-0000-7000-8000-000000000033',
    '01935a00-0000-7000-8000-000000000001',
    'PRO-001',
    'Endodoncia Unirradicular',
    'Tratamiento de conducto en pieza de una raíz con obturación definitiva.',
    'PROCEDIMIENTO',
    60,
    180.00,
    TRUE,  -- En v0.2.0 exigirá receta_items + reserva atómica en insumos
    TRUE
),
(
    '01935a00-0000-7000-8000-000000000034',
    '01935a00-0000-7000-8000-000000000001',
    'PRO-002',
    'Restauración con Resina Compuesta',
    'Eliminación de caries y reconstrucción estética con resina fotopolimerizable.',
    'PROCEDIMIENTO',
    45,
    65.00,
    TRUE,  -- En v0.2.0 exigirá receta_items + reserva atómica en insumos
    TRUE
)
ON CONFLICT (consultorio_id, codigo) DO NOTHING;

COMMIT;