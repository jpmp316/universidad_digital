# Universidad Digital

API de gestión académica construida con Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic v2 y PostgreSQL.

## Estructura

Cada dominio mantiene responsabilidades separadas:

```text
backend/app/
├── auth/          # Registro, login, logout y sesión actual
├── users/         # Usuarios, roles y asociación N:M
├── subjects/      # Materias
├── periods/       # Periodos académicos
├── enrollments/   # Inscripciones
├── grades/        # Calificaciones
├── core/          # Configuración, seguridad, dependencias y errores
├── database/      # Base declarativa, sesiones y bootstrap local
└── main.py        # Aplicación FastAPI y composición de routers
```

En cada dominio académico se mantienen `models.py`, `schemas.py`, `services.py` y `routes.py`. Los modelos ORM no contienen reglas de negocio, los esquemas validan entrada/salida, los servicios controlan transacciones y las rutas solo coordinan HTTP.

## Modelo relacional

Se implementan `users`, `roles`, `user_roles`, `subjects`, `academic_periods`, `enrollments` y `grades`.

- Usuario y rol: relación N:M mediante `user_roles`.
- Usuario y matrícula: relación 1:N.
- Materia y matrícula: relación 1:N.
- Periodo y matrícula: relación 1:N.
- Matrícula y calificación: relación 1:N.
- Una matrícula es única por estudiante, materia y periodo.
- Una evaluación es única dentro de una matrícula.

## Seguridad

- Las contraseñas se almacenan con Argon2 mediante `pwdlib`.
- Los JWT se entregan mediante cookie `HttpOnly`; no se usa `localStorage`.
- El registro público solo crea usuarios con rol `student`.
- Las operaciones administrativas requieren roles explícitos en el backend.
- Las entradas se validan con Pydantic v2.
- Las respuestas nunca incluyen `password_hash`.
- Las excepciones de dominio se transforman en respuestas HTTP centralizadas.
- Usuarios, materias y periodos se desactivan lógicamente para conservar historial.

## Configuración

Crear `backend/.env` con valores apropiados para el entorno:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/universidad_digital
SECRET_KEY=una-clave-aleatoria-de-al-menos-32-caracteres
ACCESS_TOKEN_EXPIRE_MINUTES=30
COOKIE_SECURE=true
FRONTEND_ORIGIN=http://localhost:5173
```

`COOKIE_SECURE` debe ser `true` detrás de HTTPS. Los valores por defecto solo sirven para desarrollo local.

## Ejecución

Desde `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

La documentación interactiva queda disponible en `/docs` y el estado del proceso en `/health`.

El bootstrap crea tablas para desarrollo y registra los roles base `admin`, `teacher` y `student`. Para producción se recomienda sustituir la creación automática por migraciones Alembic ejecutadas como paso de despliegue.

## Endpoints principales

| Método | Ruta | Acceso |
| --- | --- | --- |
| POST | `/auth/register` | Público, crea estudiante |
| POST | `/auth/login` | Público, establece cookie |
| POST | `/auth/logout` | Público |
| GET | `/auth/me` | Usuario autenticado |
| CRUD | `/users/` | Administrador |
| CRUD | `/subjects/` | Lectura autenticada, escritura admin |
| CRUD | `/periods/` | Lectura autenticada, escritura admin |
| CRUD | `/enrollments/` | Según rol y propiedad |
| POST/GET/PUT | `/grades/` | Lectura propia o privilegiada; escritura docente/admin |

Las rutas de escritura reciben JSON validado por Pydantic y devuelven códigos `201`, `200`, `204`, `401`, `403`, `404` o `409` según el resultado.