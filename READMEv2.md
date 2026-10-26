# Universidad Digital Backend

## Descripción

Backend de una plataforma universitaria para administrar usuarios con roles, materias, periodos académicos, inscripciones, calificaciones y reportes básicos.

## Arquitectura aplicada

La aplicación usa una separación por dominio y responsabilidades:

```text
backend/
├── app/
│   ├── auth/          # Registro, login, logout y sesión
│   ├── users/         # Usuarios, roles y usuario_rol
│   ├── subjects/      # Materias
│   ├── periods/       # Periodos académicos
│   ├── enrollments/   # Inscripciones y estados
│   ├── grades/        # Calificaciones
│   ├── reports/       # Proyecciones de lectura académica
│   ├── core/          # Configuración, seguridad, errores y dependencias
│   ├── database/      # SQLAlchemy base, sesiones y bootstrap
│   └── main.py        # Composición FastAPI
├── migrations/        # Migraciones Alembic
├── requirements.txt
└── .env.example
```

Cada dominio mantiene `models.py`, `schemas.py`, `services.py` y `routes.py`. Los modelos representan persistencia, los schemas validan contratos Pydantic, los servicios contienen reglas y transacciones, y las rutas coordinan HTTP mediante dependencias FastAPI.

## Modelo de datos

La migración inicial implementa las tablas normalizadas `users`, `roles`, `user_roles`, `subjects`, `academic_periods`, `enrollments` y `grades`.

- `users` y `roles`: N:M mediante `user_roles`.
- `users` y `enrollments`: 1:N.
- `subjects` y `enrollments`: 1:N.
- `academic_periods` y `enrollments`: 1:N.
- `enrollments` y `grades`: 1:N.
- Un estudiante no puede repetir la misma materia en el mismo periodo.
- Una evaluación es única dentro de una inscripción.
- Las claves foráneas protegen la integridad referencial.
- `@validates` normaliza y valida valores en el límite ORM.

Los reportes no tienen tabla propia: son consultas de lectura construidas sobre el modelo normalizado.

## Seguridad

- JWT firmado con HS256 y expiración configurable.
- Token JWT en cookie `HttpOnly`, nunca en `localStorage`.
- Cookie CSRF separada y cabecera `X-CSRF-Token` para mutaciones.
- Hashing Argon2 mediante `pwdlib`.
- Registro público limitado al rol `student`.
- Roles `admin`, `teacher` y `student` protegidos por dependencias FastAPI.
- Validación estricta de entradas con Pydantic v2 y validación adicional en ORM.
- Respuestas públicas sin `password_hash`.
- Errores de dominio, validación, base de datos e inesperados centralizados.
- Desactivación lógica de usuarios, materias, periodos, inscripciones y calificaciones cuando aplica.
- CORS restringido al origen configurado.

## Flujo de autenticación

1. `POST /auth/register` crea un estudiante.
2. `POST /auth/login` valida credenciales y establece `access_token` `HttpOnly` y `csrf_token` legible por el cliente.
3. El frontend envía cookies automáticamente y agrega `X-CSRF-Token` en `POST`, `PUT` y `DELETE`.
4. Las dependencias resuelven el usuario actual y verifican sus roles.
5. `POST /auth/logout` elimina ambas cookies.

## Roles y permisos

| Rol | Permisos principales |
| --- | --- |
| `admin` | CRUD de usuarios, materias y periodos; acceso global; gestión de inscripciones y calificaciones |
| `teacher` | Consultar materias, periodos, inscripciones y reportes; gestionar estados y calificaciones |
| `student` | Consultar materias y periodos; gestionar su propia inscripción; consultar sus calificaciones y reporte |

La autorización se aplica en el backend. Las restricciones visuales del frontend nunca sustituyen estas dependencias.

## Configuración

Copiar `.env.example` a `.env` dentro de `backend/` y sustituir los valores:

```env
DATABASE_URL=postgresql+psycopg://postgres:CONTRASENA@localhost:5432/universidad_digital
JWT_SECRET=CLAVE_ALEATORIA_DE_AL_MENOS_32_CARACTERES
JWT_EXPIRATION=30
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
FRONTEND_ORIGIN=http://localhost:5173
```

Si la contraseña contiene caracteres reservados de URL, deben codificarse. Por ejemplo, `@` se escribe como `%40`.

En producción, `COOKIE_SECURE=true` y HTTPS son obligatorios. El archivo `.env` está excluido de Git.

## Levantar el backend

Desde `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

El usuario solo necesita crear la base de datos. El startup crea tablas y roles para desarrollo; Alembic permite gestionar el esquema de forma reproducible.

Endpoints de infraestructura:

- `GET /health`
- `GET /docs`
- `GET /openapi.json`

## Endpoints principales

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` | Registrar estudiante |
| POST | `/auth/login` | Autenticar y establecer cookies |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/auth/me` | Consultar usuario autenticado |
| CRUD | `/users/` | Administrar usuarios |
| CRUD | `/subjects/` | Administrar materias |
| CRUD | `/periods/` | Administrar periodos |
| CRUD | `/enrollments/` | Crear, consultar, actualizar y cancelar inscripciones |
| CRUD | `/grades/` | Crear, consultar, actualizar y desactivar calificaciones |
| GET | `/reports/students/{student_id}` | Consultar resumen académico |

Las listas tienen paginación por `offset` y `limit`. Las respuestas usan códigos HTTP coherentes: `201`, `200`, `204`, `401`, `403`, `404`, `409` y `422`.

## Migraciones

```powershell
python -m alembic upgrade head
python -m alembic downgrade base
```

La revisión `0001_initial` crea el modelo relacional completo. Las migraciones futuras deben generarse y revisarse antes de desplegar.

## Próximos pasos

- Añadir pruebas unitarias de servicios y validadores.
- Añadir pruebas de integración con PostgreSQL 18.
- Añadir pruebas de seguridad para autorización, CSRF y cookies.
- Conectar el frontend React usando `credentials: "include"` y la cabecera CSRF.
- Añadir observabilidad, rotación de claves JWT y gestión de secretos del proveedor de despliegue.