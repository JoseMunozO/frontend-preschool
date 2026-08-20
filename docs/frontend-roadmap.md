# Frontend Roadmap

Este roadmap organiza el frontend antes de construir pantallas grandes. La prioridad inicial es tener estructura, contratos API claros y flujo de trabajo estable.

## Objetivo

Crear una aplicacion React administrativa conectada al backend `backend-preschool`, manteniendo frontend y backend como repos separados.

## Estado Actual

Ultima actualizacion: 2026-08-20.

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
- Estudiantes: boton "Eliminar" conectado con doble confirmacion (`ConfirmDialog` variant="danger", dos pasos) + `UndoToast` (nuevo componente, `src/components/ui/UndoToast.tsx`) que llama a `POST /api/students/{id}/restore` si se toca "Deshacer" dentro de 8 segundos. Verificado en navegador contra el backend real: dialogo de dos pasos, soft-delete real (desaparece de la lista), toast con mensaje y estilo correctos, auto-cierre del toast. **Pendiente de verificar**: click real en "Deshacer" restaurando (la logica esta revisada en codigo — `restoreStudentMutation` invalida `['students']` y limpia el toast en `onSuccess` — pero no se probo con un click exitoso en vivo por limitaciones de tooling en la sesion del 2026-08-20).

## Backend API — cambios pendientes de aprovechar (sync 2026-08-20)

El backend sincronizado en `docs/backend-api-reference.md` expone varias cosas que este frontend todavia no usa. Detalle de contratos en ese archivo; resumen de huecos confirmados en el codigo actual:

- **`guardians[]` en `StudentListItem`**: el tipo en `src/api/students.api.ts` solo tiene `primaryGuardianName`, no el array `guardians` que el backend ya devuelve en list y detail. Agregarlo eliminaria la necesidad de una llamada aparte a `getStudentGuardians()` en varios casos (incluyendo, potencialmente, simplificar el patron usado para la cuenta de hijos en `ParentsPage.tsx`).
- **Contactos de emergencia** (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`): no existe ningun modulo, tipo ni llamada en el frontend todavia.
- **Reporte mensual de pagos** (`GET /api/payments/reports/monthly?month=YYYY-MM`): no hay ninguna pantalla ni llamada que lo consuma; encaja con el punto 2 de abajo (historial/reportes de pagos).
- **No existe eliminar (ni soft-delete) para padres/tutores, materiales, horarios ni pagos** — confirmado revisando el backend el 2026-08-20 noche: de todo el modelo, solo `Student`, `StudentNote` y `PhotoAlbumPhoto` tienen `deletedAt`. Padres/tutores solo tiene activar/desactivar (no es un "eliminar"); Materiales, Horarios y Pagos no tienen ningun endpoint `DELETE` todavia, ni soft ni hard. Antes de construir una "papelera" con restaurar en esos modulos (punto 1 de abajo) hay que pedirle a la sesion de backend que agregue el soft-delete + restore ahi tambien (mismo patron que estudiantes) — no es trabajo de frontend hasta que exista la API.

## Siguiente Punto Recomendado

**Fecha limite: martes 2026-08-25.** Actualizado 2026-08-20 (noche) tras dejar `feat/students-delete-confirmation` commiteado localmente (sin pushear/PR todavia).

Prioridad para retomar manana, en orden:

1. **Verificar el click real de "Deshacer" en `StudentsPage.tsx`** (probar en navegador que `POST /api/students/{id}/restore` restaura al estudiante y lo devuelve a la tabla) y, si funciona, pushear y abrir el PR de `feat/students-delete-confirmation`. Es lo mas cerca de terminarse.
2. **Pantalla de "papelera" para estudiantes eliminados**: un boton/vista que use `GET /api/students?includeDeleted=true` para listar y restaurar estudiantes eliminados fuera de la ventana del toast de 8s (la restauracion via backend sigue disponible 7 dias completos, el toast es solo para el caso de "me equivoque ahora mismo"). Esto ya tiene API lista, se puede construir manana sin depender de nada mas.
3. **Pedirle a la sesion de backend soft-delete + restore para padres/tutores y materiales** (mismo patron que estudiantes: campo `deletedAt`, `DELETE` pasa a soft-delete, `POST /{id}/restore`, `?includeDeleted=true`) — hoy ninguno de los dos tiene ni siquiera un endpoint `DELETE`. Sin esto, no se puede construir la "papelera" en esas pestañas como se pidio.
4. Vista de historial de pagos por estudiante, aprovechando `GET /api/payments/reports/monthly` (no depende de nada bloqueado).
5. Modulo de contactos de emergencia por estudiante (no existe todavia; API ya lista: `GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`).

Con menor prioridad, no urgente para el martes:

- Implementar paginacion real de estudiantes (controles visuales sin logica todavia).
- Validar responsive real de dashboard y tablas principales.
- Cuando se agreguen roles diferenciados por ruta, pasar `roles` a `ProtectedRoute` en `router.tsx` (el componente ya soporta mostrar `ForbiddenPage`, pero ningun route lo usa todavia).
- **Tailwind incremental — degradado a prioridad minima por pedido explicito (2026-08-20 noche); no tocar hasta que el resto de la lista este resuelto.** Mapear las variables CSS actuales al `@theme` de Tailwind v4, usar solo en codigo nuevo. Ver decision registrada en memoria del proyecto.

Branch listo, sin pushear:

```text
feat/students-delete-confirmation
```

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
- [ ] Pagos: historial de pagos.
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
- [ ] Contactos de emergencia: modulo nuevo (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`), sin frontend todavia.

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
- [x] Confirmaciones para acciones sensibles: `ConfirmDialog` reutilizable conectado a activar/desactivar padre/tutor (unica accion sensible ya conectada a una mutation). Eliminar estudiante queda sin conectar hasta que el backend tenga soft-delete — ver "Backend API" y "Siguiente Punto Recomendado" arriba.
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
```

Siguientes:

```text
feat/students-pagination
feat/payment-history
feat/emergency-contacts
chore/tailwind-theme-tokens
feat/schedule-week-view
feat/responsive-polish
```
