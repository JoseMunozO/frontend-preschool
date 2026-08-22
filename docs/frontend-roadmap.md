# Frontend Roadmap

Este roadmap organiza el frontend antes de construir pantallas grandes. La prioridad inicial es tener estructura, contratos API claros y flujo de trabajo estable.

## Objetivo

Crear una aplicacion React administrativa conectada al backend `backend-preschool`, manteniendo frontend y backend como repos separados.

## Estado Actual

Ultima actualizacion: 2026-08-21.

- Base React/Vite/TypeScript creada.
- Documentacion inicial y workflow de desarrollo creados.
- GitHub Actions CI creado para `npm ci`, `npm run lint` y `npm run build`.
- Shell administrativo visual alineado con la referencia del cliente.
- Login inicial creado y conectado a `/api/auth/login`.
- Cliente API centralizado creado.
- Proxy local de Vite agregado para evitar CORS durante desarrollo.
- Dashboard visual inicial creado.
- Dashboard mapeado a la estructura real de `/api/dashboard/summary`.
- Tabla de estudiantes conectada a `GET /api/students`.
- Estudiantes mapeado a `StudentResponse` real del backend.
- Estudiantes: formulario de creacion/edicion.
- Estudiantes: tutor principal mostrado en la tabla (`primaryGuardianName`).
- Tabla de padres/tutores conectada a `GET /api/parents`.
- Padres/tutores mapeado a `ParentResponse` real del backend.
- Padres/tutores: formulario de creacion/edicion y accion activar/desactivar.
- Tabla de cargos conectada a `GET /api/payments/charges`.
- Pagos mapeado a `StudentChargeResponse` real del backend.
- Pagos: registrar pago contra un cargo existente.
- Tabla de materiales conectada a `GET /api/materials`.
- Materiales mapeado a `MaterialResponse` real del backend.
- Materiales: formulario de creacion/edicion y registro de movimientos (entrada/salida/ajuste).
- Tabla de horarios conectada a `GET /api/schedules`.
- Horarios mapeado a `ScheduleSlotResponse` real del backend.
- Horarios: formulario de creacion/edicion de actividades con asignacion de responsable.
- Estilos de formulario de entidad generalizados y reutilizados entre modulos.
- Padres/tutores: cantidad de hijos mostrada en la tabla, vía `GET /api/parents/{parentId}/students` por tutor (`useQueries` en `ParentsPage.tsx`). Mergeado a `main` (PR #18).
- Formularios de entidad (padres/tutores, estudiantes, materiales + movimientos, horarios, pagos) migrados de `useState`/validacion manual a React Hook Form + Zod (`useForm` + `zodResolver`); reglas cruzadas dentro del formulario via `superRefine`, y la regla de pagos que depende del cargo seleccionado (dato externo al formulario) via `setError` manual en el submit. Mismos campos, mensajes y estilos visuales que antes. Mergeado a `main` (PRs #19-#22, #24).
- Manejo de `403` distinto de `401`: `isForbiddenError()` en `src/utils/apiErrors.ts` detecta `ApiError` con `status === 403`; cada modulo (dashboard, estudiantes, padres/tutores, pagos, materiales, horarios) muestra un mensaje especifico "No tienes permiso para..." en vez del error generico. `ProtectedRoute` tambien muestra una pantalla `ForbiddenPage` ("No tienes permiso") cuando `roles` no coincide con el usuario, aunque ningun route todavia pasa `roles` (mecanismo listo, sin usar aun). Verificado con un usuario `TEACHER` real contra el backend.
- Confirmacion para accion sensible de padres/tutores: `src/components/ui/ConfirmDialog.tsx` (reutilizable) conectado a activar/desactivar en `ParentsPage.tsx`.
- Estudiantes: filtros migrados a server-side (`getStudents({ search, groupId, status })` en `src/api/students.api.ts`, `GET /api/students?search=&groupId=&status=`). Busqueda con debounce de 300ms. El selector de grupo (tabla y formulario) usa una query separada sin filtrar (`['students', 'groups-lookup']`, `staleTime: Infinity`) para no perder opciones cuando la tabla esta filtrada — no hay endpoint de grupos dedicado. Verificado en navegador inspeccionando las requests reales (`?search=Lucas`, `?groupId=1`, `?groupId=1&status=pending`).
- Backend: soft-delete + restore para estudiantes ya esta implementado y mergeado (`backend-preschool` PR #40, 2026-08-20 noche). `DELETE /api/students/{id}` marca `deletedAt` (mismo `204` externo), `POST /api/students/{id}/restore` limpia `deletedAt` dentro de una ventana de gracia de 7 dias (`200` con el Student, `404` si no existe/no esta eliminado, `409` si ya expiro), `GET /api/students?includeDeleted=true` muestra los eliminados recientes. Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: boton "Eliminar" conectado con doble confirmacion (`ConfirmDialog` variant="danger", dos pasos) + `UndoToast` (nuevo componente, `src/components/ui/UndoToast.tsx`) que llama a `POST /api/students/{id}/restore` si se toca "Deshacer" dentro de 8 segundos. Verificado end-to-end contra el backend real (2026-08-21), incluyendo inspeccionar las requests: `DELETE /api/students/{id}` → `204`, luego `POST /api/students/{id}/restore` → `200`, y el estudiante vuelve a aparecer en la tabla. Mergeado a `main` (PR #28).
- Backend: soft-delete + restore ahora tambien en Material, ScheduleSlot y Parent (mismo patron que estudiantes: `deletedAt`, `DELETE` pasa a soft-delete, `POST /{id}/restore`, `?includeDeleted=true`), rollout completo (`backend-preschool` PRs #42, #43, #44, 2026-08-21). En padres, `deletedAt` es independiente del campo `status` (activar/desactivar sigue siendo el toggle operativo de siempre). Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: papelera para ver y restaurar eliminados. `src/components/ui/TrashPanel.tsx` (componente generico reutilizable, pensado para los demas modulos) conectado en `StudentsPage.tsx` detras de un boton "Papelera"; usa `GET /api/students?includeDeleted=true` (devuelve todos, se filtra `deletedAt != null` en el cliente porque el backend no separa "solo eliminados") y reutiliza `restoreStudentMutation`. Verificado en navegador contra el backend real: lista los eliminados con su fecha, restaurar los saca de la papelera y los devuelve a la tabla principal (confirmado con `POST /api/students/{id}/restore` → `200` en las requests reales).
- Eliminar (doble confirmacion + `UndoToast`) y `TrashPanel` conectados tambien en Padres/Tutores (`deleteParent`/`restoreParent`, independiente del campo `status`), Materiales (`deleteMaterial`/`restoreMaterial`, etiqueta de papelera usa `translateBackendSeed`) y Horarios (`deleteSchedule`/`restoreSchedule`, etiqueta de papelera combina actividad + dia ya que un horario no tiene un campo "nombre" unico). Mismo patron exacto que Estudiantes en los 4 modulos. Verificado end-to-end contra el backend real en cada uno (doble confirmacion, soft-delete, deshacer, papelera + restaurar), inspeccionando las requests reales de cada modulo. Con esto quedan las 4 entidades con soft-delete en el backend (Student, Parent, Material, ScheduleSlot) completamente conectadas en el frontend. Los 5 branches apilados se pushearon y mergearon a `main` (PRs #28-#32, 2026-08-21).
- Backend: `Parent` gano un tercer estado de ciclo de vida, "archivado" (`backend-preschool` PR #47, 2026-08-21), distinto de Student/Material/ScheduleSlot: en vez de purgarse a los 7 dias, un job diario minimiza el registro (conserva `firstName`/`lastName`/`email`/login, borra telefono/direccion/etc.) y lo conserva 6 anios para que una familia que regresa no pierda el historial de hijos vinculados. Nuevo `POST /api/parents/{id}/claim` para reactivar un archivado (distinto de `restore`, que sigue siendo solo el "deshacer" de los primeros 7 dias). Sin frontend todavia — implica que la papelera de Padres/Tutores necesitara, mas adelante, un flujo distinto para archivados (buscar por nombre/email, completar datos faltantes, llamar a `claim` en vez de `restore`). Detalle completo en `docs/backend-api-reference.md` y `CLAUDE.md`.
- Pagos: historial de pagos por estudiante. `GET /api/payments/students/{studentId}` (`getPaymentsByStudent()` en `src/api/payments.api.ts`) conectado al boton "Ver historial de pagos" (icono ojo) de cada fila de cargo en `PaymentsPage.tsx`; abre un panel con la lista de pagos reales del estudiante (monto, metodo, fecha, referencia, notas). Mutuamente excluyente con el panel de registrar pago, mismo patron que los demas paneles del modulo. Verificado en navegador contra el backend real: pago con multiples asignaciones (Sofia Lindberg, $1,070 = suma de dos cargos), pago simple (Lucas Andersson, $1,500), y el estado vacio real "Sin pagos registrados para este estudiante" (Sofia Johansson) — los tres casos confirmados inspeccionando las requests reales (`GET /api/payments/students/{id}` → `200`). Mergeado a `main` (PR #33).
- Backend: `PUT /api/payments/charges/{studentChargeId}` para editar o cancelar un cargo existente sin registrar un pago (`backend-preschool` PR #49, 2026-08-21). Reemplazo completo (no patch), salvo `status`: si se omite, el estado actual no se toca (evita pisar un `PAID`/`PARTIALLY_PAID` calculado automaticamente); es la unica forma de mover un cargo a `CANCELLED`. Sin frontend todavia — no hay UI para editar/cancelar un cargo ya creado. Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: modulo de contactos de emergencia. El boton "Ver" (icono ojo) de cada fila abre un panel con CRUD completo (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`, funciones nuevas en `src/api/students.api.ts`). Formulario RHF+Zod (nombre completo, relacion, telefono, telefono alternativo, notas, contacto principal); eliminar usa `ConfirmDialog` de un solo paso ya que este recurso no tiene soft-delete/restore en el backend (es borrado real). Panel mutuamente excluyente con el formulario de estudiante y la papelera. Verificado end-to-end contra el backend real: estado vacio, crear (`POST` → `201`), editar (`PUT` → `200`), eliminar (`DELETE` → `204`), y validaciones de campos obligatorios.

## Backend API — cambios pendientes de aprovechar (sync 2026-08-21)

El backend sincronizado en `docs/backend-api-reference.md` expone varias cosas que este frontend todavia no usa. Detalle de contratos en ese archivo; resumen de huecos confirmados en el codigo actual:

- **`guardians[]` en `StudentListItem`**: el tipo en `src/api/students.api.ts` solo tiene `primaryGuardianName`, no el array `guardians` que el backend ya devuelve en list y detail. Agregarlo eliminaria la necesidad de una llamada aparte a `getStudentGuardians()` en varios casos (incluyendo, potencialmente, simplificar el patron usado para la cuenta de hijos en `ParentsPage.tsx`).
- **Estado "archivado" de Parent** (`archivedAt`, `POST /api/parents/{id}/claim`): no hay UI para buscar/reactivar un tutor archivado (solo la papelera de 0-7 dias existe, que sigue funcionando igual). Ver nota en Estado Actual.
- **Editar/cancelar cargo** (`PUT /api/payments/charges/{studentChargeId}`): sin UI todavia; solo se puede crear un cargo, no editarlo ni cancelarlo despues.
- Pagos sigue sin ningun endpoint `DELETE` en el backend (no se pidio, tiene sentido para no perder historial financiero) — es el unico modulo principal sin eliminar/papelera, a proposito.

## Siguiente Punto Recomendado

**Fecha limite: martes 2026-08-25.** Actualizado 2026-08-21: eliminar + papelera conectado en las 4 pestañas con soft-delete (estudiantes, padres/tutores, materiales, horarios) y ya pusheado/mergeado a `main` (PRs #28-#32). Historial de pagos por estudiante y contactos de emergencia tambien completos y verificados contra el backend real.

Prioridad, en orden:

1. UI para tutor archivado (buscar por nombre/email, completar datos faltantes, `POST /api/parents/{id}/claim`) — nuevo desde backend PR #47, sin frontend todavia.
2. UI para editar/cancelar un cargo existente (`PUT /api/payments/charges/{studentChargeId}`) — nuevo desde backend PR #49, sin frontend todavia.

Con menor prioridad, no urgente para el martes:

- Implementar paginacion real de estudiantes (controles visuales sin logica todavia).
- Validar responsive real de dashboard y tablas principales.
- Cuando se agreguen roles diferenciados por ruta, pasar `roles` a `ProtectedRoute` en `router.tsx` (el componente ya soporta mostrar `ForbiddenPage`, pero ningun route lo usa todavia).
- **Tailwind incremental — prioridad minima por pedido explicito (2026-08-20 noche); no tocar hasta que el resto de la lista este resuelto.** Mapear las variables CSS actuales al `@theme` de Tailwind v4, usar solo en codigo nuevo. Ver decision registrada en memoria del proyecto.

## Fase 0 - Base Del Proyecto

- [x] Confirmar stack React + Vite + TypeScript.
- [x] Crear `.env.example`.
- [x] Configurar `.gitignore`.
- [x] Documentar workflow de branches y commits.
- [x] Documentar conexion con backend y Swagger.
- [x] Confirmar que `npm run lint` y `npm run build` pasan.
- [x] Crear CI basico con GitHub Actions.

## Fase 1 - Fundacion De App

- [x] Crear `src/app` para router y providers.
- [x] Crear `src/api` para cliente HTTP y endpoints por modulo.
- [x] Crear `src/config/env.ts` para variables de entorno.
- [x] Crear `src/types` para contratos TypeScript.
- [x] Crear layout base con sidebar/topbar.
- [x] Crear rutas protegidas.
- [x] Alinear shell visual con la referencia del cliente.
- [ ] Revisar responsive real en mobile y desktop.

## Fase 2 - Auth

- [x] Crear login.
- [x] Conectar `POST /api/auth/login`.
- [x] Guardar JWT de forma controlada.
- [x] Enviar `Authorization: Bearer <token>` desde el cliente API.
- [x] Implementar logout.
- [x] Agregar error claro cuando el backend no responde.
- [x] Agregar proxy local de Vite para evitar CORS en desarrollo.
- [x] Validar login end-to-end desde navegador.
- [x] Manejar token expirado.
- [x] Redirigir automaticamente a login en `401`.

## Fase 3 - Dashboard

- [x] Crear layout visual inicial del dashboard.
- [x] Conectar llamada inicial al resumen principal del backend.
- [x] Ajustar tipos y mapeo a la respuesta real de `/api/dashboard/summary`.
- [x] Mostrar estudiantes activos.
- [x] Mostrar pagos pendientes y atrasados.
- [x] Mostrar materiales bajos.
- [x] Mostrar actividades del dia.
- [ ] Mostrar cumpleanos proximos si el backend lo expone.
- [x] Reemplazar datos demo principales por datos reales.
- [x] Validar visualmente con datos reales en navegador.

## Fase 4 - Modulos De Lectura

- [x] Estudiantes: tabla visual inicial.
- [x] Estudiantes: adaptar campos reales del backend.
- [x] Estudiantes: busqueda local por nombre o codigo.
- [x] Estudiantes: filtro local por grupo.
- [x] Estudiantes: mostrar tutor principal.
- [x] Estudiantes: filtros migrados a server-side (`search`, `groupId`, `status` en `GET /api/students`), busqueda con debounce.
- [ ] Estudiantes: paginacion real (controles visuales presentes, sin logica).
- [x] Padres/tutores: tabla visual inicial.
- [x] Padres/tutores: adaptar campos reales del backend.
- [x] Padres/tutores: busqueda local por nombre, correo o telefono.
- [x] Padres/tutores: mostrar cantidad de hijos (`GET /api/parents/{parentId}/students` por tutor en `ParentsPage.tsx`).
- [x] Pagos: tabla visual inicial.
- [x] Pagos: adaptar campos reales de cargos del backend.
- [x] Pagos: filtros por mes y estado.
- [x] Pagos: busqueda local por estudiante o concepto.
- [x] Pagos: registrar pago desde cargo.
- [x] Pagos: historial de pagos por estudiante (`GET /api/payments/students/{studentId}`), verificado contra el backend real.
- [x] Materiales: tabla visual inicial.
- [x] Materiales: adaptar campos reales del backend.
- [x] Materiales: busqueda local por nombre, SKU o categoria.
- [x] Materiales: filtros locales por categoria y stock bajo.
- [x] Materiales: registrar entradas, salidas y ajustes.
- [x] Horarios: tabla visual inicial.
- [x] Horarios: adaptar campos reales del backend.
- [x] Horarios: filtro por dia.
- [x] Horarios: busqueda local por actividad, aula, grupo o responsable.
- [x] Horarios: filtro local por grupo.
- [x] Horarios: crear/editar actividades.
- [ ] Horarios: vista semanal o calendario visual.
- [x] Contactos de emergencia: CRUD completo por estudiante (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`), verificado contra el backend real.

## Fase 5 - Formularios

- [x] Crear/editar estudiante.
- [x] Crear/editar padre o tutor.
- [x] Registrar cargos y pagos.
- [x] Crear/editar materiales.
- [x] Registrar movimientos de material.
- [x] Crear/editar horarios.
- [x] Migrar formulario de padres/tutores a React Hook Form + Zod.
- [x] Migrar formulario de estudiantes a React Hook Form + Zod (incluye reglas cruzadas de fechas via `superRefine`).
- [x] Migrar formularios de materiales (entidad + movimiento) a React Hook Form + Zod.
- [x] Migrar formulario de horarios a React Hook Form + Zod (incluye regla cruzada de horas via `superRefine`).
- [x] Migrar formulario de pagos a React Hook Form + Zod (el monto vs. saldo del cargo se valida con `setError` manual, ya que depende de un dato externo al formulario).

## Fase 6 - Calidad

- [x] Estados de carga.
- [x] Estados vacios.
- [x] Manejo de errores API: `isForbiddenError()` distingue `403` de otros errores en los 6 modulos con `useQuery`, mostrando "No tienes permiso para..." en vez del mensaje generico. `ProtectedRoute` muestra `ForbiddenPage` si el rol no coincide (mecanismo listo, sin rutas usandolo aun — ver Siguiente Punto Recomendado). Verificado con un usuario `TEACHER` real.
- [x] Confirmaciones para acciones sensibles: `ConfirmDialog` reutilizable conectado a activar/desactivar padre/tutor, y a eliminar (doble confirmacion) en las 4 entidades con soft-delete (estudiantes, padres/tutores, materiales, horarios), cada una con `UndoToast` + `TrashPanel`.
- [x] Filtros por modulo.
- [ ] Tests de formularios y flujos criticos.

## Orden Recomendado De Branches

Ya iniciados o completados:

```text
chore/scaffold-react-frontend
docs/frontend-working-agreement
ci/frontend-validation
feat/app-shell
fix/auth-login-fetch-error
feat/students-list
feat/parents-list
feat/payments-overview
feat/materials-list
feat/schedules-list
feat/student-form
feat/student-primary-guardian
feat/parents-children-count
chore/parents-form-rhf-zod
chore/students-form-rhf-zod
chore/materials-form-rhf-zod
chore/schedules-form-rhf-zod
chore/payments-form-rhf-zod
fix/403-permission-screen
feat/action-confirmations
feat/students-server-filters
feat/students-delete-confirmation
feat/students-trash-view
feat/parents-delete-trash
feat/materials-delete-trash
feat/schedules-delete-trash
feat/payment-history
feat/emergency-contacts
```

Siguientes:

```text
feat/parent-archived-claim
feat/charge-edit-cancel
feat/students-pagination
chore/tailwind-theme-tokens
feat/schedule-week-view
feat/responsive-polish
```
