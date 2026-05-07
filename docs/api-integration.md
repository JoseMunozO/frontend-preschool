# API Integration

El frontend consume el backend `backend-preschool`. Swagger y OpenAPI viven en el backend y deben usarse como contrato API.

## Backend Local

URL base local:

```text
http://localhost:8080
```

Variable del frontend:

```properties
VITE_API_BASE_URL=http://localhost:8080
```

No hardcodear `http://localhost:8080` dentro de componentes. Usar siempre la variable de entorno desde una capa central de configuracion.

## Swagger / OpenAPI

Swagger UI:

```text
http://localhost:8080/swagger-ui/index.html
```

OpenAPI JSON:

```text
http://localhost:8080/v3/api-docs
```

Uso recomendado:

- Revisar Swagger antes de crear o modificar un endpoint frontend.
- Mantener tipos TypeScript alineados con el contrato real del backend.
- Si cambia un DTO en backend, actualizar primero los tipos en `src/types`.
- Si cambia una ruta, actualizar el archivo correspondiente en `src/api`.

## Cliente API

Estructura recomendada:

```text
src/api/
  client.ts
  auth.api.ts
  dashboard.api.ts
  students.api.ts
  parents.api.ts
  payments.api.ts
  materials.api.ts
  schedules.api.ts
  users.api.ts
```

Reglas:

- `client.ts` centraliza `fetch`, headers, JSON y errores.
- Los componentes no llaman `fetch` directamente.
- Los modulos llaman funciones de `src/api`.
- La autenticacion agrega `Authorization: Bearer <token>` desde el cliente API.
- Los errores de `401` o `403` deben manejarse de forma consistente.

## Auth

Flujo esperado:

1. Login contra el backend.
2. Guardar JWT en el estado de auth.
3. Enviar JWT en cada request privada.
4. Redirigir a login si no hay sesion.
5. Cerrar sesion si el token expira o el backend responde `401`.

No usar secretos reales en el frontend. Todo valor expuesto con prefijo `VITE_` queda disponible en el bundle del navegador.

## Validacion De Contratos

Antes de conectar una pantalla:

```bash
curl http://localhost:8080/v3/api-docs
```

Tambien se puede usar el smoke tester del backend cuando aplique:

```bash
API_BASE_URL=http://localhost:8080 node scripts/api-smoke-test.mjs
```
