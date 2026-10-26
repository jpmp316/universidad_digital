# Despliegue

## Frontend en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** como `frontend`.
3. Define la variable de entorno de producción `VITE_API_BASE_URL` con la URL pública HTTPS del backend de Railway, sin una barra final (por ejemplo, `https://mi-api.up.railway.app`).
4. Despliega. `frontend/vercel.json` configura el build Vite y el fallback de rutas de React Router.

Vite incorpora `VITE_API_BASE_URL` durante el build. Cada cambio de esa variable requiere un nuevo deployment. La configuración Vercel no usa Docker; `frontend/Dockerfile` existe para probar/ejecutar la SPA en un contenedor Nginx.

## Backend en Railway

1. Crea un servicio PostgreSQL en el proyecto de Railway.
2. Crea el servicio del backend desde el mismo repositorio y establece **Root Directory** como `backend`. Railway detectará `backend/Dockerfile` automáticamente.
3. Configura estas variables en el servicio backend:

   - `APP_ENV=production`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}` (ajusta `Postgres` al nombre del servicio de base de datos)
   - `APP_JWT_SECRET`: secreto aleatorio de al menos 32 caracteres
   - `APP_CORS_ORIGINS`: origen exacto del frontend, por ejemplo `https://mi-app.vercel.app` (sin `/` final)
   - `APP_COOKIE_SECURE=true`
   - `APP_COOKIE_SAMESITE=none`

4. En Settings del servicio, define el health check path como `/health` y genera un dominio público.

El contenedor ejecuta `alembic upgrade head` antes de iniciar Uvicorn y escucha en el puerto `PORT` proporcionado por Railway. La URL estándar `postgresql://` de Railway se convierte a `postgresql+psycopg://`, usando el driver incluido en `requirements.txt`.

El backend debe tener exactamente el origen de Vercel en `APP_CORS_ORIGINS`; con cookies entre dominios, SameSite debe ser `none` y Secure debe estar activo. Si conectas un dominio personalizado o usas un deployment de preview, agrega sus orígenes permitidos separados por comas.
