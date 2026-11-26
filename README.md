# Agenda

## Migraciones

- Base nueva: ejecutar `database/migrations/0001_inits_schema.sql` y después `database/migrations/0002_compatibilidad_citas_login.sql`.
- Base que ya ejecutó la migración 0001: ejecutar solo la 0002. Su backfill requiere un rol de migración con permiso para operar sobre todos los tenants; `row_security = off` hace que falle explícitamente si RLS lo bloquearía.

## Login con RLS

La política `rls_usuarios_login_lookup` autoriza búsquedas globales solo cuando `current_user` es `agenda_auth`. Provisiona este rol fuera de las migraciones, sin `BYPASSRLS`, y úsalo únicamente en un pool de conexiones de login:

```sql
CREATE ROLE agenda_auth LOGIN NOINHERIT NOBYPASSRLS;
GRANT SELECT (id, consultorio_id, email, password_hash, nombre_completo, rol, mfa_habilitado, activo)
    ON usuarios TO agenda_auth;
```

Configura sus credenciales mediante el gestor de secretos del entorno. El endpoint de login debe buscar el correo, comprobar que haya una sola coincidencia activa y validar el hash. Como el correo solo es único dentro de cada consultorio, si hay varias coincidencias el login debe pedir el identificador del consultorio. Después de autenticar, las consultas normales deben usar el rol de aplicación y establecer `app.current_consultorio_id` dentro de cada transacción antes de leer `usuarios`, `consultorio_config` u otras tablas con RLS.

## Códigos visibles de cita

`citas.codigo` genera identificadores únicos como `CITA-001` y `CITA-842`. Para que el rol de aplicación pueda insertar citas con el valor por defecto, concédele uso de la secuencia:

```sql
GRANT USAGE, SELECT ON SEQUENCE citas_codigo_seq TO agenda_app;
```

El comprobante puede obtener la ubicación desde `consultorio_config` (`nombre_comercial`, `direccion`, `telefono_contacto`, `email_contacto`) y los datos del profesional desde `especialistas` (`nombre_completo`, `especialidad`, `registro_profesional`), relacionados por `consultorio_id`. Esos datos ya existen en el esquema y no se duplican en `citas`.

## API local

El backend NestJS vive en `apps/api`. En una instalación local nueva:

```powershell
docker compose up -d postgres
cd apps/api
Copy-Item .env.example .env
npm install
npm run start:dev
```

El seed local incluye `recepcion@sonrisaintegral.ec` y `bodega@sonrisaintegral.ec`, ambos con la contraseña de demostración `ClinicaDemo2026!`. Son credenciales solo para desarrollo. Recepción permite probar el login; bodega tiene MFA habilitado y el endpoint responde `401 MFA_REQUIRED` hasta que exista el flujo de segundo factor.

Los endpoints implementados son:

- `GET /api/health`: `200` con estado y conexión a PostgreSQL; `503` si la base no responde.
- `POST /api/auth/login`: `200` y `{ accessToken, tokenType, expiresIn, user }`; `400` si el correo aparece en varios consultorios; `401` para credenciales inválidas o inactivas.
- `GET /api/servicios` y `GET /api/especialistas`: `200` con `{ data: [...] }`; requieren Bearer JWT.
- `GET /api/citas?fecha=YYYY-MM-DD`: `200` con `{ data: [...] }`; interpreta el día en la zona horaria del consultorio.
- `POST /api/citas`: `201` con `{ data }`; calcula el fin desde la duración del servicio, genera el código desde PostgreSQL y responde `409 SCHEDULE_OVERLAP` ante un choque de horario.
- `PATCH /api/citas/:id/estado`: `200` con `{ data }`; acepta `RESERVADA`, `COMPLETADA` o `CANCELADA` y bloquea cambios desde estados terminales.

Los endpoints de catálogo y citas requieren `Authorization: Bearer <accessToken>`. El backend mantiene un pool `agenda_auth` para el lookup de login y un pool `agenda_app` para las operaciones normales; cada transacción de negocio establece `app.current_consultorio_id` antes de consultar tablas protegidas por RLS.
