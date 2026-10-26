# Manual de Pruebas Manuales de API

## 1. Introducción

Este documento describe cómo consumir y validar manualmente las APIs REST del backend de Universidad Digital. Está dirigido a quienes prueban el servicio mediante Swagger UI, Postman o cURL.

Una API se considera validada cuando la solicitud llega al endpoint correcto, la autenticación y autorización se comportan según el rol, la respuesta contiene el contrato esperado y el código HTTP corresponde al resultado.

El alcance es exclusivamente el consumo manual de endpoints. No incluye pytest, scripts de pruebas automatizadas ni código de testing.

## 2. Herramientas recomendadas

### Swagger UI

Usar Swagger UI para explorar rápidamente el contrato OpenAPI, ver los schemas Pydantic y probar endpoints desde el navegador. Está disponible en:

```text
http://127.0.0.1:8000/docs
```

Es la opción más práctica para una primera verificación funcional.

### Postman

Usar Postman para organizar colecciones, conservar cookies entre solicitudes, configurar variables de entorno y repetir flujos de autenticación. Es recomendable para validar varios roles y escenarios de ownership.

En la colección se recomienda crear la variable:

```text
base_url = http://127.0.0.1:8000
```

Activar el almacenamiento automático de cookies. Después de `POST /auth/login`, Postman debe conservar `access_token` y `csrf_token`.

### cURL

Usar cURL para validar desde la terminal, reproducir solicitudes exactas y documentar integraciones. Para este backend se necesita conservar cookies con `-c cookies.txt` y `-b cookies.txt`.

## 3. Preparación del entorno

### Variables mínimas

Crear `backend/.env` con valores de desarrollo válidos:

```env
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:CONTRASENA@localhost:5432/universidad_digital
APP_JWT_SECRET=una-clave-aleatoria-de-al-menos-32-caracteres
APP_JWT_EXPIRATION=30
APP_COOKIE_NAME=access_token
APP_COOKIE_SECURE=false
APP_COOKIE_SAMESITE=lax
APP_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Si la contraseña PostgreSQL contiene `@`, se escribe como `%40` dentro de `DATABASE_URL`.

La base `universidad_digital` debe existir y el usuario configurado debe poder conectarse. En desarrollo, el arranque crea tablas y roles base. En una base ya existente, usar las migraciones correspondientes:

```powershell
cd C:\devseniorcode\universidad-digital\backend
python -m alembic upgrade head
```

La migración `0003_add_grade_active` agrega `grades.is_active` si la base fue creada con una versión anterior del modelo. El seed también contiene una reparación defensiva para ese mismo caso.

### Levantar el backend

Ejecutar desde `backend`, no desde `backend/app`:

```powershell
cd C:\devseniorcode\universidad-digital\backend
python -m uvicorn app.main:app --reload
```

URL base:

```text
http://127.0.0.1:8000
```

Comprobación inicial:

```powershell
curl.exe http://127.0.0.1:8000/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

En desarrollo se usa HTTP y `APP_COOKIE_SECURE=false`. En producción se requiere HTTPS, `APP_ENV=production`, `APP_COOKIE_SECURE=true` y una lista explícita en `APP_CORS_ORIGINS`.

### Precondición para roles administrativos

El arranque crea los roles `admin`, `teacher` y `student`, pero no crea automáticamente un usuario administrador. Para probar endpoints administrativos debe existir previamente un usuario con rol `admin` provisionado por el responsable de la base de datos o por un mecanismo de despliegue controlado. El registro público solo crea estudiantes.

## 4. Autenticación y autorización

### 4.1 Registro de estudiante

El registro público crea siempre un estudiante. No acepta un rol enviado por el cliente.

**URL:** `POST {{base_url}}/auth/register`

**Headers:** `Content-Type: application/json`

**Request:**

```json
{
  "email": "ana.estudiante@example.com",
  "full_name": "Ana Estudiante",
  "password": "StrongPassword123"
}
```

La contraseña debe tener entre 12 y 128 caracteres, mayúscula, minúscula y número.

**Respuesta exitosa:** `201 Created`

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "email": "ana.estudiante@example.com",
  "full_name": "Ana Estudiante",
  "is_active": true,
  "role_names": ["student"]
}
```

No se retorna `password_hash` ni se establecen cookies en el registro.

### 4.2 Login

**URL:** `POST {{base_url}}/auth/login`

**Headers:** `Content-Type: application/json`

**Request:**

```json
{
  "email": "ana.estudiante@example.com",
  "password": "StrongPassword123"
}
```

**Respuesta exitosa:** `200 OK`

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "email": "ana.estudiante@example.com",
  "full_name": "Ana Estudiante",
  "is_active": true,
  "role_names": ["student"]
}
```

La respuesta establece dos cookies:

- `access_token`: JWT de sesión, `HttpOnly`, con expiración limitada.
- `csrf_token`: token CSRF legible por el cliente para enviarlo como header.

Con cURL:

```powershell
curl.exe -i -c cookies.txt -X POST http://127.0.0.1:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"ana.estudiante@example.com","password":"StrongPassword123"}'
```

No copiar el JWT a `localStorage`. Este backend autentica mediante cookie; no requiere ni documenta un header `Authorization: Bearer`.

### 4.3 Uso de cookies y token CSRF

Para solicitudes `GET`, la cookie `access_token` basta para autenticar. Para `POST`, `PUT` y `DELETE`, enviar también el valor de `csrf_token` en `X-CSRF-Token`.

En cURL, obtener el valor de `csrf_token` del archivo `cookies.txt` y usarlo así:

```powershell
$csrf = "VALOR_COPIADO_DESDE_COOKIES_TXT"
curl.exe -b cookies.txt -X GET http://127.0.0.1:8000/auth/me
curl.exe -b cookies.txt -X POST http://127.0.0.1:8000/auth/logout `
  -H "X-CSRF-Token: $csrf"
```

En Postman, leer `csrf_token` desde el cookie jar y crear el header `X-CSRF-Token` para cada solicitud mutante.

### 4.4 Sesión actual

**URL:** `GET {{base_url}}/auth/me`

**Roles:** cualquier usuario autenticado.

**Headers:** ninguno adicional; enviar cookies.

**Respuesta:** `200 OK` con el mismo formato público del usuario. Si falta la cookie `access_token`, responde `401 Unauthorized`.

### 4.5 Refresh token

No existe endpoint de refresh en la implementación actual. Cuando expire el JWT, ejecutar login nuevamente.

### 4.6 Logout

**URL:** `POST {{base_url}}/auth/logout`

**Roles:** sesión autenticada por cookies.

**Headers:** `X-CSRF-Token` obligatorio.

**Respuesta exitosa:** `204 No Content` y eliminación de `access_token` y `csrf_token`.

Sin `X-CSRF-Token`, la respuesta esperada es `403 Forbidden`.

## 5. Pruebas por dominio

Los ejemplos usan `{{base_url}}` y UUIDs ilustrativos. Sustituirlos por IDs retornados por solicitudes anteriores.

### 5.1 Usuarios

#### Crear usuario

**URL:** `POST {{base_url}}/users/`

**Roles:** `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "email": "carlos.docente@example.com",
  "full_name": "Carlos Docente",
  "password": "StrongPassword123",
  "role_names": ["teacher"]
}
```

**Respuesta:** `201 Created` con `id`, `email`, `full_name`, `is_active` y `role_names`. Nunca contiene `password_hash`.

**Errores:** `401` sin sesión, `403` si el usuario no es admin, `409` si el correo o rol entra en conflicto, `422` si el JSON no cumple el schema.

#### Listar usuarios

**URL:** `GET {{base_url}}/users/?offset=0&limit=50`

**Roles:** `admin`.

**Headers:** cookies de sesión.

**Respuesta:** `200 OK`, lista de usuarios públicos sin hashes.

`offset` debe ser mayor o igual a 0 y `limit` estar entre 1 y 100.

#### Consultar un usuario

**URL:** `GET {{base_url}}/users/{user_id}`

**Roles:** `admin`.

**Respuesta:** `200 OK` con el usuario público, o `404 Not Found` si el UUID no existe.

#### Actualizar usuario

**URL:** `PUT {{base_url}}/users/{user_id}`

**Roles:** `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "full_name": "Carlos Docente Actualizado",
  "password": "NewStrongPassword123",
  "is_active": true,
  "role_names": ["teacher"]
}
```

Todos los campos son opcionales. La nueva contraseña nunca aparece en la respuesta.

**Respuesta:** `200 OK`. Errores esperados: `401`, `403`, `404`, `409` y `422`.

#### Cambiar estado o desactivar

**URL:** `DELETE {{base_url}}/users/{user_id}`

**Roles:** `admin`.

**Headers:** `X-CSRF-Token` y cookies.

**Respuesta:** `200 OK` con `is_active: false`. Es eliminación lógica; el registro histórico no se borra.

### 5.2 Materias

#### Crear materia

**URL:** `POST {{base_url}}/subjects/`

**Roles:** `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "code": "MAT101",
  "name": "Matemáticas I",
  "description": "Fundamentos de cálculo",
  "credits": 4,
  "teacher_ids": ["22222222-2222-4222-8222-222222222222"]
}
```

`teacher_ids` solo acepta usuarios activos con rol `teacher`.

**Respuesta:** `201 Created`

```json
{
  "id": "33333333-3333-4333-8333-333333333333",
  "code": "MAT101",
  "name": "Matemáticas I",
  "description": "Fundamentos de cálculo",
  "credits": 4,
  "is_active": true,
  "teacher_ids": ["22222222-2222-4222-8222-222222222222"]
}
```

**Errores:** `401`, `403`, `409` por código duplicado o docente inválido, `422` por créditos o campos inválidos.

#### Listar materias

**URL:** `GET {{base_url}}/subjects/?offset=0&limit=50`

**Roles:** cualquier usuario autenticado.

**Respuesta:** `200 OK`. Un docente recibe únicamente materias asignadas a él; admin y estudiante reciben la lista general.

#### Consultar materia

**URL:** `GET {{base_url}}/subjects/{subject_id}`

**Roles:** estudiante o usuario autenticado; docente solo si está asignado; admin global.

**Respuesta:** `200 OK`, `403` para un docente no asignado o `404` si no existe.

#### Actualizar materia

**URL:** `PUT {{base_url}}/subjects/{subject_id}`

**Roles:** `admin` o `teacher` asignado.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "name": "Matemáticas I - Actualizada",
  "credits": 5
}
```

Un docente no puede modificar `teacher_ids`; solo un admin puede cambiar asignaciones.

**Respuesta:** `200 OK`. Errores: `401`, `403`, `404`, `409` o `422`.

#### Desactivar materia

**URL:** `DELETE {{base_url}}/subjects/{subject_id}`

**Roles:** `admin`.

**Headers:** `X-CSRF-Token` y cookies.

**Respuesta:** `200 OK` con `is_active: false`. Es eliminación lógica.

### 5.3 Periodos académicos

Aunque no forma parte del CRUD resumido, este dominio es necesario para crear inscripciones.

#### Crear periodo

**URL:** `POST {{base_url}}/periods/`

**Roles:** `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "name": "2026-A",
  "start_date": "2026-01-15",
  "end_date": "2026-06-30"
}
```

**Respuesta:** `201 Created`. `end_date` debe ser posterior a `start_date`.

#### Listar o consultar periodos

**URL:** `GET {{base_url}}/periods/?offset=0&limit=50` o `GET {{base_url}}/periods/{period_id}`

**Roles:** cualquier usuario autenticado.

**Respuesta:** `200 OK`; `404` si el ID no existe.

#### Actualizar periodo

**URL:** `PUT {{base_url}}/periods/{period_id}`

**Roles:** `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "name": "2026-A Actualizado",
  "is_active": true
}
```

**Respuesta:** `200 OK`; errores `401`, `403`, `404`, `409` o `422`.

#### Desactivar periodo

**URL:** `DELETE {{base_url}}/periods/{period_id}`

**Roles:** `admin`.

**Respuesta:** `200 OK` con `is_active: false`.

### 5.4 Inscripciones

#### Inscribir estudiante

**URL:** `POST {{base_url}}/enrollments/`

**Roles:** `student`, `teacher` o `admin`; un estudiante solo puede usar su propio `student_id`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "student_id": "11111111-1111-4111-8111-111111111111",
  "subject_id": "33333333-3333-4333-8333-333333333333",
  "period_id": "44444444-4444-4444-8444-444444444444"
}
```

**Respuesta:** `201 Created`

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "student_id": "11111111-1111-4111-8111-111111111111",
  "subject_id": "33333333-3333-4333-8333-333333333333",
  "period_id": "44444444-4444-4444-8444-444444444444",
  "status": "active",
  "enrolled_at": "2026-08-31T12:00:00Z"
}
```

**Errores:** `403` por ownership docente/estudiante, `404` por estudiante inexistente, `409` por recurso inactivo o inscripción duplicada, `422` por UUID inválido.

#### Consultar inscripciones

**URL:** `GET {{base_url}}/enrollments/?offset=0&limit=50` o `GET {{base_url}}/enrollments/{enrollment_id}`

**Roles:** `student`, `teacher` o `admin`.

Un estudiante solo ve sus inscripciones. Un docente solo ve inscripciones de sus materias asignadas. Un admin tiene acceso global.

**Respuesta:** `200 OK`; `403` por ownership y `404` si el ID no existe.

#### Actualizar estado

**URL:** `PUT {{base_url}}/enrollments/{enrollment_id}`

**Roles:** `teacher` asignado o `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{"status":"completed"}
```

**Respuesta:** `200 OK`. Estados válidos: `active`, `cancelled`, `completed`.

#### Cancelar inscripción

**URL:** `DELETE {{base_url}}/enrollments/{enrollment_id}`

**Roles:** estudiante propietario, docente asignado o admin.

**Headers:** `X-CSRF-Token` y cookies.

**Respuesta:** `200 OK` con `status: "cancelled"`. La inscripción no se elimina físicamente. Una inscripción ya cancelada devuelve `409 Conflict`.

### 5.5 Calificaciones

#### Registrar calificación

**URL:** `POST {{base_url}}/grades/`

**Roles:** `teacher` asignado o `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{
  "enrollment_id": "55555555-5555-4555-8555-555555555555",
  "assessment_name": "Parcial 1",
  "value": 87.50
}
```

`value` debe estar entre 0 y 100, con hasta dos decimales.

**Respuesta:** `201 Created`

```json
{
  "id": "66666666-6666-4666-8666-666666666666",
  "enrollment_id": "55555555-5555-4555-8555-555555555555",
  "assessment_name": "Parcial 1",
  "value": 87.50,
  "is_active": true,
  "graded_at": "2026-08-31T12:00:00Z"
}
```

**Errores:** `403` si el docente no está asignado, `404` si la inscripción no existe, `409` si la evaluación ya existe, `422` por nota inválida.

#### Consultar calificaciones

**URL:** `GET {{base_url}}/grades/enrollment/{enrollment_id}`

**Roles:** estudiante propietario, docente asignado o admin.

**Headers:** cookies de sesión.

**Respuesta:** `200 OK`, lista de calificaciones activas. Un estudiante no puede consultar la matrícula de otro; un docente no puede consultar una materia no asignada.

Para consultar una calificación individual:

```text
GET {{base_url}}/grades/{grade_id}
```

Respuesta: `200 OK` o `403/404` según ownership y existencia.

#### Actualizar calificación

**URL:** `PUT {{base_url}}/grades/{grade_id}`

**Roles:** `teacher` asignado o `admin`.

**Headers:** `Content-Type: application/json`, `X-CSRF-Token` y cookies.

**Request:**

```json
{"value": 92.25}
```

**Respuesta:** `200 OK` con la calificación actualizada. Errores: `403`, `404` o `422`.

#### Desactivar calificación

**URL:** `DELETE {{base_url}}/grades/{grade_id}`

**Roles:** `teacher` asignado o `admin`.

**Headers:** `X-CSRF-Token` y cookies.

**Respuesta:** `200 OK` con `is_active: false`. Es eliminación lógica; las consultas de calificaciones activas ya no la retornan.

### 5.6 Reportes académicos

#### Consultar reporte de estudiante

**URL:** `GET {{base_url}}/reports/students/{student_id}`

**Roles:** estudiante propietario, docente con una materia asignada a ese estudiante o admin.

**Headers:** cookies de sesión.

**Respuesta:** `200 OK`

```json
{
  "student_id": "11111111-1111-4111-8111-111111111111",
  "student_name": "Ana Estudiante",
  "total_enrollments": 2,
  "active_enrollments": 1,
  "total_grades": 3,
  "average_grade": 88.17
}
```

Un docente sin una materia vinculada al estudiante recibe `403 Forbidden`.

## 6. Validación de roles y permisos

### Acceso permitido

1. Registrar y autenticar un estudiante.
2. Usar las cookies de login.
3. Ejecutar `GET /subjects/`.
4. Esperar `200 OK`.

Un estudiante autenticado también puede consultar sus propias inscripciones, calificaciones y reporte.

### Acceso denegado por rol

Con una sesión `student`, intentar:

```text
POST /subjects/
```

con un JSON válido y CSRF válido. La respuesta esperada es:

```json
{"detail":"No tiene permisos para esta operación"}
```

Código: `403 Forbidden`.

Con una sesión `teacher`, intentar:

```text
GET /users/
```

La respuesta esperada también es `403 Forbidden`.

### Acceso denegado por ownership

Con el estudiante A autenticado, consultar una inscripción perteneciente al estudiante B:

```text
GET /enrollments/{id_de_B}
```

Respuesta esperada: `403 Forbidden`.

Con un docente autenticado, consultar una materia no asignada:

```text
GET /subjects/{id_no_asignado}
```

Respuesta esperada: `403 Forbidden`.

Con un docente autenticado, registrar una nota sobre una inscripción cuya materia no tiene asignada:

```text
POST /grades/
```

Respuesta esperada: `403 Forbidden`.

## 7. Validación de errores comunes

### Datos inválidos

Enviar una nota fuera de rango:

```json
{"enrollment_id":"55555555-5555-4555-8555-555555555555","assessment_name":"Parcial 1","value":120}
```

Respuesta esperada: `422 Unprocessable Entity` con detalles Pydantic.

El dominio también puede responder `400 Bad Request` para una regla de negocio explícita, por ejemplo un token CSRF gestionado por la capa de errores de dominio. Las reglas de conflicto de recursos usan `409`.

### No autenticado

Solicitar:

```text
GET /auth/me
```

sin cookies.

Respuesta esperada: `401 Unauthorized`.

### No autorizado

Usar un estudiante para una operación exclusiva de admin o un docente sin la materia asignada.

Respuesta esperada: `403 Forbidden`.

### Recurso inexistente

Solicitar un UUID válido que no corresponda a un registro:

```text
GET /subjects/99999999-9999-4999-8999-999999999999
```

Respuesta esperada: `404 Not Found`.

### Error controlado de validación

Enviar una fecha final anterior o igual a la fecha inicial al crear un periodo:

```json
{
  "name":"Periodo inválido",
  "start_date":"2026-06-30",
  "end_date":"2026-01-01"
}
```

Respuesta esperada: `422 Unprocessable Entity` porque falla la validación Pydantic antes del servicio.

Para conflictos de negocio, como inscripción duplicada o materia inactiva, esperar `409 Conflict`.

### CSRF faltante

Ejecutar cualquier `POST`, `PUT` o `DELETE` autenticado sin `X-CSRF-Token`.

Respuesta esperada:

```json
{"detail":"Token CSRF inválido"}
```

Código: `403 Forbidden`.

## 8. Uso de Swagger / OpenAPI

1. Levantar el backend desde `backend`.
2. Abrir `http://127.0.0.1:8000/docs`.
3. Expandir el tag del dominio que se quiere revisar.
4. Abrir un endpoint y seleccionar `Try it out`.
5. Completar path parameters, query parameters y request body según el schema.
6. Ejecutar la solicitud y revisar el código HTTP, headers y response body.
7. Después de login, comprobar las cookies del navegador. Swagger conserva cookies del mismo origen; para mutaciones se debe enviar manualmente el header `X-CSRF-Token` con el valor de `csrf_token`.

El schema OpenAPI muestra restricciones de Pydantic como tipos, campos obligatorios, longitudes y rangos. Un error `422` indica normalmente que la solicitud no cumplió esas restricciones. La documentación OpenAPI está disponible también en:

```text
http://127.0.0.1:8000/openapi.json
```

## 9. Checklist de validación manual

- [ ] `GET /health` responde `200`.
- [ ] Swagger UI abre en `/docs`.
- [ ] El registro crea únicamente un estudiante.
- [ ] Login responde `200` y establece `access_token`.
- [ ] `access_token` aparece como cookie `HttpOnly`.
- [ ] `csrf_token` se conserva para mutaciones.
- [ ] Logout sin CSRF responde `403`.
- [ ] Logout con CSRF responde `204`.
- [ ] No se usa `localStorage` para el JWT.
- [ ] Un usuario sin sesión recibe `401`.
- [ ] Un estudiante no puede crear materias ni listar usuarios.
- [ ] Un estudiante solo ve sus inscripciones y calificaciones.
- [ ] Un docente solo ve materias asignadas.
- [ ] Un docente no puede modificar asignaciones docentes.
- [ ] Un admin puede gestionar usuarios, materias y periodos.
- [ ] Se validó el CRUD de usuarios.
- [ ] Se validó el CRUD de materias.
- [ ] Se validó el CRUD de inscripciones.
- [ ] Se validó el CRUD de calificaciones.
- [ ] Las eliminaciones aplicables cambian `is_active` o `status` sin borrar historial.
- [ ] Los duplicados responden `409`.
- [ ] Los UUID inexistentes responden `404`.
- [ ] Los bodies inválidos responden `422`.
- [ ] Las respuestas no exponen `password_hash`.
- [ ] El reporte de estudiante respeta ownership.

## 10. Conclusión

El backend puede validarse manualmente mediante Swagger UI, Postman y cURL usando sesiones basadas en cookies. La cobertura incluye autenticación, autorización por rol, ownership de estudiantes y docentes, CRUD académico, errores, CSRF y reportes.

El estado esperado para desarrollo es operativo cuando PostgreSQL está disponible, la base `universidad_digital` existe y las credenciales de `DATABASE_URL` son correctas. Para producción se debe usar HTTPS, cookies Secure, CORS explícito, secretos administrados y migraciones Alembic ejecutadas antes del arranque.

Este documento describe el comportamiento implementado actualmente. No incluye refresh token porque ese endpoint no existe en el backend.
