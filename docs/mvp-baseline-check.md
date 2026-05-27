# MVP Baseline Check

Registro de verificacion del punto de partida antes de implementar formularios y operaciones de escritura del frontend.

## Fecha Y Alcance

- Fecha de verificacion: 2026-05-27.
- Frontend branch de trabajo: `chore/mvp-baseline-check`.
- Frontend base: `f52f80a` (`main` / `origin/main`).
- Backend branch ejecutada: `test/controller-api-coverage`.
- Backend commit ejecutado: `80e732d`.
- Objetivo: confirmar que auth, dashboard y modulos de lectura funcionan contra el backend local antes de iniciar `feat/student-form`.

## Estado De Los Repositorios

### Frontend

- `main` estaba alineado con `origin/main` al crear este branch.
- Existe un archivo no versionado previo a esta tarea: `docs/d44e6dcc-497b-4635-a2cc-b170c6177f99.png`.
- El archivo no se incluye en esta verificacion ni en su commit.

### Backend

La verificacion se ejecuto con cambios locales ya existentes en el repositorio backend:

```text
M docker/mysql/init/01-base-schema.sql
M docs/docker.md
```

Esos cambios amplian los datos/usuarios demo disponibles y no fueron modificados desde este repositorio. Antes de integrar nuevos cambios de frontend debe decidirse si esos cambios del backend se guardan en commit y que branch backend actuara como base estable.

## Entorno Ejecutado

- Docker Compose disponible y utilizado para MySQL y Spring Boot.
- MySQL Docker saludable en `localhost:3307`.
- Backend disponible en `http://localhost:8080`.
- OpenAPI disponible en `http://localhost:8080/v3/api-docs`.
- Vite iniciado para validacion en `http://127.0.0.1:5174`, porque el puerto `5173` ya estaba ocupado por otro proceso Node existente.

Comando backend:

```bash
docker compose up --build -d
```

## Validaciones Ejecutadas

### Frontend Estatico

```bash
npm run lint
npm run build
```

Resultado:

- [x] Lint correcto.
- [x] Build de produccion correcto.

### Backend API Smoke Test

Se uso modo de solo lectura para no crear o alterar datos durante la comprobacion inicial:

```bash
API_SMOKE_READ_ONLY=true API_SMOKE_LOG_DIR=/private/tmp/preschool-smoke-logs API_BASE_URL=http://localhost:8080 node scripts/api-smoke-test.mjs
```

Resultado:

```text
61 passed, 0 failed, 7 skipped
```

Las operaciones omitidas corresponden a comprobaciones de escritura deliberadamente no ejecutadas en este baseline.

### Frontend Contra Backend Por Proxy Vite

Se comprobo el flujo de autenticacion y las rutas que consumen las pantallas actuales utilizando `/api` a traves del proxy de Vite:

| Ruta | Resultado | Observacion |
| --- | --- | --- |
| `/` | `200` | HTML del frontend servido correctamente. |
| `POST /api/auth/login` | `200` | Login admin devuelve token. |
| `GET /api/dashboard/summary` | `200` | Respuesta de resumen recibida. |
| `GET /api/students` | `200` | 6 estudiantes recibidos. |
| `GET /api/parents` | `200` | 6 tutores recibidos. |
| `GET /api/payments/charges` | `200` | 7 cargos recibidos. |
| `GET /api/materials` | `200` | 10 materiales recibidos. |
| `GET /api/schedules` | `200` | 8 actividades recibidas. |

## Contratos Confirmados Para El Siguiente Paso

OpenAPI y los controllers del backend exponen operaciones necesarias para comenzar estudiantes editables:

| Operacion | Endpoint confirmado |
| --- | --- |
| Listar estudiantes | `GET /api/students` |
| Crear estudiante | `POST /api/students` |
| Actualizar estudiante | `PUT /api/students/{id}` |
| Consultar tutores asociados | `GET /api/students/{id}/guardians` |

El payload `StudentRequest` requiere:

- `firstName`.
- `lastName`.
- `birthDate`.
- `enrollmentDate`.

Tambien admite:

- `studentCode`.
- `groupId`.
- `status`.
- `withdrawalDate`.
- `medicalNotes`.
- `allergies`.
- `notes`.

## Hallazgos Y Riesgos

- [ ] El backend esta en una rama de trabajo con cambios locales de semillas/documentacion; debe estabilizarse antes de depender de ella para PRs posteriores.
- [ ] No se realizo validacion visual interactiva en navegador; se verifico servicio frontend, proxy y endpoints utilizados por sus pantallas.
- [ ] Antes del formulario de estudiantes debe confirmarse la fuente del selector de grupos; el contrato admite `groupId`, pero el frontend actual solo deriva nombres desde estudiantes listados.
- [ ] El puerto habitual de Vite (`5173`) estaba ocupado durante la verificacion; se utilizo `5174` sin interferir con el proceso existente.

## Salida Del Baseline

La integracion actual es suficiente para iniciar el siguiente paquete funcional:

```text
feat/student-form
```

Al comenzar ese branch, la primera decision tecnica pendiente es obtener la lista valida de grupos para crear o editar estudiantes sin depender de valores ya presentes en la tabla.
