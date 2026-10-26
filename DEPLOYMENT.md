# Despliegue

## Frontend en Vercel

1. Importa el repositorio en Vercel.
2. Configura **Root Directory** como `frontend`.
3. Define la variable de entorno de producción `VITE_API_BASE_URL` con la URL pública HTTPS del backend, sin una barra final (por ejemplo, `https://mi-api.onrender.com`).
4. Despliega. `frontend/vercel.json` configura el build Vite y el fallback de rutas de React Router.

Vite incorpora `VITE_API_BASE_URL` durante el build. Cada cambio de esa variable requiere un nuevo deployment. La configuración Vercel no usa Docker; `frontend/Dockerfile` existe para probar/ejecutar la SPA en un contenedor Nginx.

## Backend en Render

1. Crea un servicio PostgreSQL y un Web Service desde el mismo repositorio. Configura la región del backend igual a la de la base de datos.
2. En el Web Service, selecciona la rama `main`, **Root Directory** `backend` y runtime `Docker`. Render encontrará el Dockerfile dentro de esa carpeta.
3. Configura estas variables en el servicio backend:

   - `APP_ENV=production`
   - `DATABASE_URL`: Internal Database URL de Render PostgreSQL
   - `APP_JWT_SECRET`: secreto aleatorio de al menos 32 caracteres
   - `APP_CORS_ORIGINS`: origen exacto del frontend, por ejemplo `https://mi-app.vercel.app` (sin `/` final)
   - `APP_COOKIE_SECURE=true`
   - `APP_COOKIE_SAMESITE=none`
   - `BOOTSTRAP_ADMIN_EMAIL`: correo para la primera cuenta administradora
   - `BOOTSTRAP_ADMIN_NAME`: nombre para mostrar de esa cuenta
   - `BOOTSTRAP_ADMIN_PASSWORD`: contraseña aleatoria de al menos 12 caracteres, con mayúsculas, minúsculas y números

4. Configura `/health` como health check y genera un dominio público.

El contenedor ejecuta `alembic upgrade head` antes de iniciar Uvicorn y escucha en el puerto `PORT` proporcionado por Render. La URL estándar `postgresql://` de Render se convierte a `postgresql+psycopg://`, usando el driver incluido en `requirements.txt`.

El backend crea el administrador inicial al arrancar si todavía no hay uno. Si ya existe un usuario con ese correo, solo le asigna el rol administrador cuando la contraseña configurada coincide con la de esa cuenta. El registro público sigue creando únicamente estudiantes. Después de confirmar que puedes iniciar sesión como administrador, elimina `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` y `BOOTSTRAP_ADMIN_PASSWORD` de Render.

El backend debe tener exactamente el origen de Vercel en `APP_CORS_ORIGINS`; con cookies entre dominios, SameSite debe ser `none` y Secure debe estar activo. Si conectas un dominio personalizado o usas un deployment de preview, agrega sus orígenes permitidos separados por comas.
