# Universidad Digital Frontend

## Descripción

SPA académica construida con React, TypeScript, Axios y React Router. Consume el backend FastAPI existente para autenticación, usuarios, materias, periodos, inscripciones, calificaciones y reportes.

La interfaz se organiza por espacios de trabajo:

- Estudiante: materias, inscripción, avance y calificaciones propias.
- Docente: materias asignadas, inscripciones visibles y registro de notas.
- Administrador: gestión de usuarios, materias, periodos, inscripciones y calificaciones.

## Arquitectura frontend

```text
frontend/
├── src/
│   ├── api/          # Cliente Axios, tipos y endpoints REST
│   ├── auth/         # Espacio reservado para piezas específicas de auth
│   ├── components/   # UI reutilizable sin lógica de dominio
│   ├── context/      # Estado de sesión global
│   ├── hooks/        # useAuth, useFetch y hooks por dominio
│   ├── layouts/      # Espacio reservado para layouts adicionales
│   ├── pages/        # Login, dashboards y páginas de error
│   ├── routes/       # BrowserRouter, guards y rutas por rol
│   ├── services/     # Validaciones y lógica de presentación reutilizable
│   ├── styles/       # Estilos globales responsive
│   ├── utils/        # Espacio reservado para helpers transversales
│   └── main.tsx      # Punto de entrada
├── .env
├── .env.example
├── package.json
└── vite.config.ts
```

La UI no replica reglas de autorización del backend. Los guards mejoran la navegación, pero el backend sigue siendo la fuente de verdad para roles y ownership.

## Flujo de autenticación

1. `AuthProvider` consulta `GET /auth/me` al cargar la SPA.
2. Login consume `POST /auth/login` con `withCredentials: true`.
3. FastAPI establece `access_token` como cookie `HttpOnly` y `csrf_token` como cookie double-submit.
4. Para permitir el flujo entre Vercel y Render, la API entrega el token CSRF en la cabecera `X-CSRF-Token` al iniciar sesión y al restaurar la sesión con `/auth/me`; CORS expone esa cabecera al frontend.
5. Axios guarda el token CSRF solo en memoria y adjunta `X-CSRF-Token` en `POST`, `PUT`, `PATCH` y `DELETE`. Las cookies se envían mediante `withCredentials`.
6. Un `401` dispara el evento de sesión expirada y el contexto limpia el usuario y el token CSRF en memoria.
7. Logout consume `POST /auth/logout` y elimina el estado local de sesión.

El frontend nunca lee, guarda ni expone el JWT. No usa `localStorage` ni `sessionStorage` para autenticación.

## Integración con backend

El cliente se encuentra en `src/api/client.ts` y usa:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Todas las solicitudes incluyen `withCredentials: true`. Las rutas consumidas corresponden al backend real:

- `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- `/users/`
- `/subjects/`
- `/periods/`
- `/enrollments/`
- `/grades/`
- `/reports/students/{student_id}`

Para producción, definir `VITE_API_BASE_URL` con la URL HTTPS del backend. No colocar secretos en variables `VITE_*`, porque Vite las expone al navegador.

## Seguridad aplicada

- Autenticación por cookie HttpOnly administrada por FastAPI.
- No se almacena JWT en almacenamiento del navegador.
- Interceptor Axios para CSRF y expiración de sesión.
- Errores de API normalizados sin mostrar trazas ni detalles internos.
- Roles visibles mediante guards de React Router; la autorización definitiva queda en el backend.
- Los datos de estudiantes, docentes y administradores se muestran según la respuesta autorizada de la API.
- Validación UX de email, contraseña, campos obligatorios, fechas y rango de calificación.
- React escapa texto por defecto; no se usa `dangerouslySetInnerHTML`.
- CORS y cookies se configuran en el backend, no se relajan desde la SPA.
- No hay `console.log` en el código de aplicación.

## Accesibilidad WCAG 2.1 AA

Decisiones aplicadas:

- Labels asociados explícitamente a inputs mediante `htmlFor`/`id`.
- Errores con `aria-invalid`, `aria-describedby` y `role="alert"`.
- Estados de carga con `role="status"` y `aria-live`.
- Navegación semántica con `nav`, `main`, `header`, `section`, tablas con `caption` y encabezados `scope`.
- Foco visible para enlaces, botones, tabs y campos.
- Navegación móvil con botón etiquetado y overlay accesible.
- Contraste reforzado en texto, controles y estados.
- Botones con iconos y texto contextual; iconos decorativos ocultos con `aria-hidden`.
- Soporte para `prefers-reduced-motion`.
- Layout responsive sin depender solo del color para comunicar estados.

Limitaciones conocidas:

- No se incluye todavía un escáner automatizado de contraste o axe en CI.
- La selección de docentes del panel administrativo usa UUIDs separados por coma; puede reemplazarse por un selector multivalor específico en una iteración UX posterior.
- La accesibilidad de Swagger UI depende de la herramienta externa.

## Ejecutar el frontend

Desde `frontend/`:

```powershell
npm install
npm run dev
```

La aplicación queda en `http://localhost:3000`.

Para generar el bundle de producción:

```powershell
npm run build
npm run preview
```

El backend debe estar disponible en `http://127.0.0.1:8000` y tener una base PostgreSQL configurada. El navegador debe poder enviar cookies cross-origin entre el frontend y el backend configurados.

## Uso por rol

### Estudiante

- Abrir `Mi avance`.
- Consultar materias activas y periodos.
- Crear una inscripción propia.
- Seleccionar una inscripción para ver calificaciones.
- Consultar el reporte académico propio.
- Cancelar una inscripción activa.

### Docente

- Abrir `Mi docencia`.
- Consultar únicamente materias asignadas por un administrador.
- Ver inscripciones de esas materias.
- Seleccionar una inscripción.
- Registrar calificaciones entre 0 y 100.
- Consultar las evaluaciones registradas.

### Administrador

- Abrir `Administración`.
- Crear usuarios con roles válidos.
- Crear materias y asignar docentes.
- Crear periodos académicos.
- Crear y cancelar inscripciones.
- Registrar y consultar calificaciones.
- Desactivar usuarios y materias desde las tarjetas de gestión.

## Auditoría final

### Calidad

- Separación entre API, contexto, hooks, servicios, componentes y páginas.
- Tipos TypeScript para entidades y payloads del backend.
- Componentes visuales reutilizables con props tipadas.
- Sin acceso a Axios directamente desde componentes UI puros.
- Sin duplicación de token o lógica de autorización en páginas.
- TypeScript estricto habilitado.

### Seguridad

- Cookies y CSRF alineados con el contrato FastAPI.
- No existe almacenamiento persistente de tokens.
- Interceptor de errores para `401`.
- Rutas protegidas y guards de rol.
- Validaciones de UX antes de enviar formularios.
- No se filtran mensajes de infraestructura al usuario.

### Accesibilidad

- Estructura semántica y navegación por teclado.
- Foco visible.
- Mensajes de error anunciables.
- Contraste y estados no dependientes únicamente del color.
- Responsive para móvil, tablet y escritorio.

### UX técnica

- Estados explícitos de carga, vacío, éxito y error.
- Acciones de actualización visibles.
- Confirmación visual de estados de inscripción y disponibilidad.
- Paneles diferenciados por rol sin duplicar la sesión.

## Validación manual

Consultar [README_TEST.md](README_TEST.md) para el procedimiento manual del backend y los flujos de cookies, CSRF, roles y ownership. La SPA está preparada para consumir esos endpoints con cookies incluidas.

## Próximos pasos

- Añadir pruebas de accesibilidad con axe en CI.
- Añadir pruebas E2E de navegación y permisos.
- Incorporar paginación visual cuando el volumen real lo requiera.
- Sustituir la entrada manual de UUIDs docentes por un selector accesible.
- Configurar Content Security Policy en el servidor de despliegue.
