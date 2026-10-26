# Universidad Digital Backend v3

## Alcance

Backend FastAPI para usuarios, roles, materias, periodos académicos, inscripciones, calificaciones y reportes. La versión v3 endurece la configuración de ambientes, la autenticación por cookie, la autorización por rol y el ownership de recursos sin cambiar las tecnologías del proyecto.

## Arquitectura

La aplicación conserva separación por dominio:

```text
backend/app/
├── auth/          # Registro, login, logout y sesión
├── users/         # Usuarios, roles y asociación usuario_rol
├── subjects/      # Materias y asignación docente
├── periods/       # Periodos académicos
├── enrollments/   # Inscripciones
├── grades/        # Calificaciones
├── reports/       # Proyecciones de lectura
├── core/          # Configuración, seguridad, dependencias y errores
├── database/      # Engine, sesiones, base ORM y bootstrap
└── main.py        # Composición de FastAPI
```

Cada dominio mantiene `models.py`, `schemas.py`, `services.py` y `routes.py`. Las rutas no acceden directamente a la base de datos para ejecutar reglas; delegan en servicios. La migración `0002_subject_teacher_assignments` añade la tabla asociativa `subject_teachers`, necesaria para comprobar ownership docente.

## Ambientes

### Development

- `APP_ENV=development`.
- CORS permite por defecto `http://localhost:3000` y `http://localhost:5173`.
- `APP_COOKIE_SECURE=false` permite HTTP local.
- Se puede usar el bootstrap de tablas para desarrollo.

### Production

- `APP_ENV=production`.
- `APP_COOKIE_SECURE=true` es obligatorio.
- `APP_CORS_ORIGINS` debe declarar explícitamente los dominios permitidos.
- HTTPS es obligatorio para transportar cookies.
- Ejecutar migraciones como paso de despliegue y no depender de `create_all`.
- Usar un gestor de secretos para `APP_JWT_SECRET` y `DATABASE_URL`.

La configuración falla al iniciar si el ambiente no es `development` o `production`, si producción usa cookies inseguras o si no define orígenes CORS.

## Variables de entorno

Copiar `.env.example` a `.env` dentro de `backend/` y sustituir los marcadores:

```env
APP_NAME=Universidad Digital API
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:CONTRASENA@localhost:5432/universidad_digital
APP_JWT_SECRET=GENERA_UNA_CLAVE_ALEATORIA_DE_AL_MENOS_32_CARACTERES
APP_JWT_EXPIRATION=30
APP_COOKIE_NAME=access_token
APP_COOKIE_SECURE=false
APP_COOKIE_SAMESITE=lax
APP_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

En producción, un ejemplo mínimo es:

```env
APP_ENV=production
APP_JWT_SECRET=CLAVE_SECRETA_PROPORCIONADA_POR_EL_GESTOR_DE_SECRETOS
APP_COOKIE_SECURE=true
APP_CORS_ORIGINS=https://frontend-produccion.com
DATABASE_URL=postgresql+psycopg://usuario:CONTRASENA@host:5432/universidad_digital
```

Las variables antiguas `ENVIRONMENT`, `JWT_SECRET`, `JWT_EXPIRATION`, `COOKIE_SECURE`, `COOKIE_NAME`, `COOKIE_SAMESITE` y `FRONTEND_ORIGIN` se aceptan como compatibilidad temporal. Para despliegues nuevos se deben usar los nombres `APP_*`.

Si la contraseña PostgreSQL contiene caracteres reservados, codifícalos en la URL. `@` equivale a `%40`.

## Autenticación y cookies

1. `POST /auth/register` crea únicamente usuarios con rol `student`.
2. `POST /auth/login` verifica bcrypt mediante Passlib y emite un JWT de corta duración.
3. El JWT se almacena en `access_token` con `HttpOnly`; el frontend no puede leerlo ni debe usar `localStorage`.
4. El backend emite `csrf_token` como cookie no `HttpOnly` para el patrón double-submit.
5. Toda mutación autenticada envía `X-CSRF-Token` con el mismo valor que `csrf_token`.
6. `POST /auth/logout` elimina ambas cookies.

La cookie JWT usa `Secure=true` en producción, `SameSite` configurable y expiración limitada por `APP_JWT_EXPIRATION` en minutos. La verificación de credenciales utiliza un hash dummy cuando el usuario no existe para reducir diferencias de timing.

## Roles y ownership

- `admin`: acceso administrativo global y asignación de docentes a materias.
- `teacher`: solo consulta y gestiona materias, inscripciones, calificaciones y reportes vinculados a materias asignadas.
- `student`: solo gestiona o consulta sus propias inscripciones, calificaciones y reporte.

La asignación docente se representa mediante `subject_teachers`. Los servicios validan esa relación antes de crear, consultar o modificar recursos. Las dependencias FastAPI aplican el rol mínimo en cada endpoint; las rutas no son el límite de seguridad por sí solas.

## Seguridad aplicada

- Passlib con bcrypt para hashing y verificación.
- JWT firmado con secreto obligatorio de al menos 32 caracteres.
- Cookies `HttpOnly` y sin almacenamiento en `localStorage`.
- CSRF double-submit para métodos mutantes.
- CORS dinámico, restringido y sin comodines en producción.
- Validación Pydantic v2 y `@validates` en ORM.
- Claves foráneas, restricciones únicas y transacciones controladas.
- Errores centralizados sin exposición de trazas, hashes o credenciales.
- Desactivación lógica para conservar historial académico.
- Paginación limitada para colecciones.

## Ejecución

Desde `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

En producción, usar un proceso gestionado y no `--reload`:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

El usuario debe crear la base de datos PostgreSQL; las tablas se gestionan con Alembic. El bootstrap `create_all` se conserva para desarrollo y el arranque si la base aún no tiene tablas.

## Endpoints

| Método | Ruta | Acceso |
| --- | --- | --- |
| GET | `/health` | Público |
| POST | `/auth/register` | Público, estudiante |
| POST | `/auth/login` | Público |
| POST | `/auth/logout` | CSRF |
| GET | `/auth/me` | Autenticado |
| CRUD | `/users/` | Admin |
| CRUD | `/subjects/` | Lectura autenticada; escritura admin |
| CRUD | `/periods/` | Lectura autenticada; escritura admin |
| CRUD | `/enrollments/` | Propietario, docente asignado o admin |
| CRUD | `/grades/` | Estudiante propietario; docente asignado o admin |
| GET | `/reports/students/{student_id}` | Propietario, docente vinculado o admin |

## Migraciones

```powershell
python -m alembic upgrade head
python -m alembic current
python -m alembic downgrade -1
```

La revisión `0001_initial` crea el modelo académico base, `0002_subject_teacher_assignments` crea la relación de ownership docente y `0003_add_grade_active` corrige bases antiguas que no tenían `grades.is_active`. Antes de desplegar, revisar la migración y ejecutar backup de la base.

## Despliegue productivo

- Usar HTTPS, `APP_COOKIE_SECURE=true` y un dominio CORS explícito.
- Mantener `.env` fuera del control de versiones y rotar secretos periódicamente.
- Ejecutar `alembic upgrade head` en el pipeline de despliegue.
- Usar PostgreSQL gestionado con backups, TLS y usuario de mínimo privilegio.
- Configurar logs centralizados sin contraseñas, cookies ni tokens.
- Añadir rate limiting, auditoría, refresh-token revocable y observabilidad antes de exposición pública.
- Ejecutar pruebas unitarias, integración con PostgreSQL y pruebas OWASP en CI.

## Estado de validación

La aplicación compila, importa y genera OpenAPI. Se validaron health check, registro, login, cookies JWT/CSRF, rechazo de mutaciones sin CSRF y migraciones sobre una base SQLite temporal. La validación final contra PostgreSQL requiere que el servidor local tenga credenciales válidas y esté accesible.