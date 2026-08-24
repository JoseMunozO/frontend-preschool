# Frontend Roadmap

Este roadmap organiza el frontend antes de construir pantallas grandes. La prioridad inicial es tener estructura, contratos API claros y flujo de trabajo estable.

## Objetivo

Crear una aplicacion React administrativa conectada al backend `backend-preschool`, manteniendo frontend y backend como repos separados.

## Estado Actual

Ultima actualizacion: 2026-08-24 (modo oscuro + selector de idioma, shell y dashboard).

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
- Manejo de `403` distinto de `401`: `isForbiddenError()` en `src/utils/apiErrors.ts` detecta `ApiError` con `status === 403`; cada modulo (dashboard, estudiantes, padres/tutores, pagos, materiales, horarios) muestra un mensaje especifico "No tienes permiso para..." en vez del error generico. `ProtectedRoute` tambien muestra una pantalla `ForbiddenPage` ("No tienes permiso") cuando `roles` no coincide con el usuario; desde el rollout de rol `TEACHER` (ver mas abajo) la ruta `/payments` ya pasa `roles={financeRoles}`, primer uso real del mecanismo. Verificado con un usuario `TEACHER` real contra el backend.
- Confirmacion para accion sensible de padres/tutores: `src/components/ui/ConfirmDialog.tsx` (reutilizable) conectado a activar/desactivar en `ParentsPage.tsx`.
- Estudiantes: filtros migrados a server-side (`getStudents({ search, groupId, status })` en `src/api/students.api.ts`, `GET /api/students?search=&groupId=&status=`). Busqueda con debounce de 300ms. El selector de grupo (tabla y formulario) usa una query separada sin filtrar (`['students', 'groups-lookup']`, `staleTime: Infinity`) para no perder opciones cuando la tabla esta filtrada — no hay endpoint de grupos dedicado. Verificado en navegador inspeccionando las requests reales (`?search=Lucas`, `?groupId=1`, `?groupId=1&status=pending`).
- Backend: soft-delete + restore para estudiantes ya esta implementado y mergeado (`backend-preschool` PR #40, 2026-08-20 noche). `DELETE /api/students/{id}` marca `deletedAt` (mismo `204` externo), `POST /api/students/{id}/restore` limpia `deletedAt` dentro de una ventana de gracia de 7 dias (`200` con el Student, `404` si no existe/no esta eliminado, `409` si ya expiro), `GET /api/students?includeDeleted=true` muestra los eliminados recientes. Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: boton "Eliminar" conectado con doble confirmacion (`ConfirmDialog` variant="danger", dos pasos) + `UndoToast` (nuevo componente, `src/components/ui/UndoToast.tsx`) que llama a `POST /api/students/{id}/restore` si se toca "Deshacer" dentro de 8 segundos. Verificado end-to-end contra el backend real (2026-08-21), incluyendo inspeccionar las requests: `DELETE /api/students/{id}` → `204`, luego `POST /api/students/{id}/restore` → `200`, y el estudiante vuelve a aparecer en la tabla. Mergeado a `main` (PR #28).
- Backend: soft-delete + restore ahora tambien en Material, ScheduleSlot y Parent (mismo patron que estudiantes: `deletedAt`, `DELETE` pasa a soft-delete, `POST /{id}/restore`, `?includeDeleted=true`), rollout completo (`backend-preschool` PRs #42, #43, #44, 2026-08-21). En padres, `deletedAt` es independiente del campo `status` (activar/desactivar sigue siendo el toggle operativo de siempre). Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: papelera para ver y restaurar eliminados. `src/components/ui/TrashPanel.tsx` (componente generico reutilizable, pensado para los demas modulos) conectado en `StudentsPage.tsx` detras de un boton "Papelera"; usa `GET /api/students?includeDeleted=true` (devuelve todos, se filtra `deletedAt != null` en el cliente porque el backend no separa "solo eliminados") y reutiliza `restoreStudentMutation`. Verificado en navegador contra el backend real: lista los eliminados con su fecha, restaurar los saca de la papelera y los devuelve a la tabla principal (confirmado con `POST /api/students/{id}/restore` → `200` en las requests reales).
- Eliminar (doble confirmacion + `UndoToast`) y `TrashPanel` conectados tambien en Padres/Tutores (`deleteParent`/`restoreParent`, independiente del campo `status`), Materiales (`deleteMaterial`/`restoreMaterial`, etiqueta de papelera usa `translateBackendSeed`) y Horarios (`deleteSchedule`/`restoreSchedule`, etiqueta de papelera combina actividad + dia ya que un horario no tiene un campo "nombre" unico). Mismo patron exacto que Estudiantes en los 4 modulos. Verificado end-to-end contra el backend real en cada uno (doble confirmacion, soft-delete, deshacer, papelera + restaurar), inspeccionando las requests reales de cada modulo. Con esto quedan las 4 entidades con soft-delete en el backend (Student, Parent, Material, ScheduleSlot) completamente conectadas en el frontend. Los 5 branches apilados se pushearon y mergearon a `main` (PRs #28-#32, 2026-08-21).
- Backend: `Parent` gano un tercer estado de ciclo de vida, "archivado" (`backend-preschool` PR #47, 2026-08-21), distinto de Student/Material/ScheduleSlot: en vez de purgarse a los 7 dias, un job diario minimiza el registro (conserva `firstName`/`lastName`/`email`/login, borra telefono/direccion/etc.) y lo conserva 6 anios para que una familia que regresa no pierda el historial de hijos vinculados. Nuevo `POST /api/parents/{id}/claim` para reactivar un archivado (distinto de `restore`, que sigue siendo solo el "deshacer" de los primeros 7 dias). Sin frontend todavia — implica que la papelera de Padres/Tutores necesitara, mas adelante, un flujo distinto para archivados (buscar por nombre/email, completar datos faltantes, llamar a `claim` en vez de `restore`). Detalle completo en `docs/backend-api-reference.md` y `CLAUDE.md`.
- Pagos: historial de pagos por estudiante. `GET /api/payments/students/{studentId}` (`getPaymentsByStudent()` en `src/api/payments.api.ts`) conectado al boton "Ver historial de pagos" (icono ojo) de cada fila de cargo en `PaymentsPage.tsx`; abre un panel con la lista de pagos reales del estudiante (monto, metodo, fecha, referencia, notas). Mutuamente excluyente con el panel de registrar pago, mismo patron que los demas paneles del modulo. Verificado en navegador contra el backend real: pago con multiples asignaciones (Sofia Lindberg, $1,070 = suma de dos cargos), pago simple (Lucas Andersson, $1,500), y el estado vacio real "Sin pagos registrados para este estudiante" (Sofia Johansson) — los tres casos confirmados inspeccionando las requests reales (`GET /api/payments/students/{id}` → `200`). Mergeado a `main` (PR #33).
- Backend: `PUT /api/payments/charges/{studentChargeId}` para editar o cancelar un cargo existente sin registrar un pago (`backend-preschool` PR #49, 2026-08-21). Reemplazo completo (no patch), salvo `status`: si se omite, el estado actual no se toca (evita pisar un `PAID`/`PARTIALLY_PAID` calculado automaticamente); es la unica forma de mover un cargo a `CANCELLED`. Detalle completo en `docs/backend-api-reference.md`.
- Estudiantes: modulo de contactos de emergencia. El boton "Ver" (icono ojo) de cada fila abre un panel con CRUD completo (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`, funciones nuevas en `src/api/students.api.ts`). Formulario RHF+Zod (nombre completo, relacion, telefono, telefono alternativo, notas, contacto principal); eliminar usa `ConfirmDialog` de un solo paso ya que este recurso no tiene soft-delete/restore en el backend (es borrado real). Panel mutuamente excluyente con el formulario de estudiante y la papelera. Verificado end-to-end contra el backend real: estado vacio, crear (`POST` → `201`), editar (`PUT` → `200`), eliminar (`DELETE` → `204`), y validaciones de campos obligatorios. Mergeado a `main` (PR #34).
- Padres/tutores: UI para tutor archivado. Boton "Archivados" en `ParentsPage.tsx` abre un panel (reutiliza la misma query `['parents', 'trash']` con `includeDeleted=true` que ya usaba la papelera, separando por `archivedAt` en vez de agregar una llamada nueva). La papelera existente (`TrashPanel`) ahora filtra explicitamente `deletedAt && !archivedAt` para no mezclar archivados con eliminados recientes de 0-7 dias (antes se hubiera podido intentar `restore` sobre un archivado y fallar con `409`). Cada archivado tiene un boton "Reclamar" que abre el mismo formulario de padre/tutor en un tercer modo (`claimTarget`, junto a crear/editar), prefilled con nombre y correo (los unicos datos que sobreviven al archivado), sin campo de contrasena (igual que editar), y llama a `POST /api/parents/{id}/claim` (`claimParent()` nueva en `parents.api.ts`) en vez de `PUT`. Mensajes especificos para `404` (ya no esta archivado) y `409` (pasaron mas de 6 anios). `ParentListItem` gano `archivedAt`. Verificado end-to-end contra el backend real simulando el job de archivado (backdate manual de `deleted_at`/`archived_at` en la base local, ya que el job real corre a los 7 dias): aparece en "Archivados" separado de "Papelera", reclamar con telefono nuevo llama a `claim` → `200`, y el tutor reaparece activo en la tabla principal con `deletedAt`/`archivedAt` en `null`. Mergeado a `main` (PR #35).
- Pagos: editar y cancelar/reactivar un cargo existente. Nuevos botones "Editar" (Pencil) y "Cancelar cargo"/"Reactivar" (Ban/RotateCcw, segun estado) por fila en `PaymentsPage.tsx`, ademas de los ya existentes "Ver historial" y "Registrar pago". Editar abre un panel con formulario RHF+Zod (fecha de vencimiento, monto, inicio/fin de periodo, descripcion — regla cruzada de periodo via `superRefine`, mismo patron que horarios); `studentId`/`chargeTypeId` no son editables en la UI y se reenvian sin cambios (el `PUT` del backend es reemplazo completo, no patch). Cancelar/reactivar reutiliza `ConfirmDialog` (variant `danger` para cancelar, `default` para reactivar) y llama al mismo `PUT` solo con `status` distinto, construyendo el resto del payload a partir del cargo actual (`chargeRequestFromCharge()`) para no pisar los demas campos — el resto de campos se omite unicamente cuando de verdad no se quieren tocar. `updateCharge()` nuevo en `payments.api.ts`, `StudentChargeRequest` nuevo en `types/payments.ts`. Verificado end-to-end contra el backend real: editar monto ($950 → $975, `PUT` → `200`, estado `PENDING` no se toco), cancelar (`PUT` con `status: CANCELLED` → `200`, desaparece el boton "Registrar pago"), reactivar (`PUT` con `status: PENDING` → `200`, "Registrar pago" vuelve a aparecer). Datos de prueba revertidos a su valor original al terminar. Mergeado a `main` (PR #36).
- Contactos de emergencia: tutores legales como contactos automaticos. El panel de "Contactos de emergencia" en `StudentsPage.tsx` ahora tiene una seccion "Tutores legales" arriba de los contactos manuales, poblada desde `guardians: StudentGuardianSummary[]` (nuevo campo en `StudentListItem`, `src/api/students.api.ts`) — sin llamada extra al backend, porque `GET /api/students` y `GET /api/students/{id}` ya la traen embebida (confirmado con la sesion de `backend-preschool`, cero cambios de backend). Filas de solo lectura (sin editar/eliminar, eso sigue siendo responsabilidad del modulo de Padres/Tutores), ordenadas con el/los tutor(es) marcados `primaryContact` primero y una etiqueta "Principal", igual que ya hacia la lista manual. Debajo, la lista editable de siempre bajo el titulo "Contactos adicionales". Verificado end-to-end contra el backend real logueado como `TEACHER`: Lucas Andersson (1 tutor, principal) y Maya Garcia (2 tutores, el marcado `primaryContact` aparece primero con la etiqueta) — datos reales del seed, sin necesitar datos de prueba. Mergeado a `main` (PR #37).
- Backend: `GET /api/parents` ahora permite `TEACHER` (antes solo `SUPER_ADMIN`/`ADMIN`/`DIRECTOR`), pedido de Jose para que un profesor pueda ver a los tutores de sus propios estudiantes. El backend filtra el resultado el solo: para `TEACHER` solo aparecen los padres/tutores de estudiantes en grupos con asignacion activa hoy (`staff_group_assignments`); sin grupo asignado, la lista viene vacia. `status`/`search`/`includeDeleted` siguen funcionando igual sobre ese subconjunto ya filtrado. `GET /api/parents/{parentId}` y `GET /api/parents/{parentId}/students` no cambiaron. Cero cambios de frontend: la navegacion y la ruta de "Padres / Tutores" nunca estuvieron ocultas por rol (`Sidebar.tsx` no filtra por rol, `router.tsx` no pasa `roles` a `ProtectedRoute` en ninguna ruta), asi que el 403 que veia antes un `TEACHER` era solo el resultado real de la llamada, manejado por el `isForbiddenError()` existente en `ParentsPage.tsx`. Verificado end-to-end en el navegador logueado como `TEACHER` contra el backend real: la tabla carga sin el aviso de permiso y muestra "5 de 5 tutores" (excluye correctamente al padre de Maya Garcia, en un grupo no asignado a ese profesor).
- Rol `TEACHER`: navegacion, perfil de estudiante y dashboard propios. Pedido directo de Jose (`docs/modificaciones.md`, no versionado), coordinado con la sesion de `backend-preschool`. Cuatro branches apiladas, mergeadas a `main` (PRs #38-#41):
  - **Nav/acciones por rol** (PR #38): `ProtectedRoute roles={financeRoles}` ahora si se usa en la ruta `/payments` (el mecanismo ya existia sin usar); `Sidebar.tsx` oculta el link "Pagos" con `hasAnyRole(financeRoles)`. En Estudiantes/Padres/Materiales/Horarios, los botones de crear/editar/eliminar/papelera (y en Padres, archivar/activar-desactivar) se ocultan del todo para roles fuera de `adminRoles` — no se muestran deshabilitados. El icono de hamburguesa en `Topbar.tsx` se dejo intacto (Jose pidio no tocarlo).
  - **Perfil del niño en popup** (PR #39): el boton "Ver" de Estudiantes paso de abrir un panel lateral a un modal centrado (mismo patron `dialog-overlay`/`dialog-panel` de `ConfirmDialog`, variante ancha `.dialog-panel-wide`), con nombre/grupo/nacimiento, alergias y notas medicas (`allergies`/`medicalNotes`, ya existian en `StudentListItem` pero nunca se mostraban), y las secciones de tutores legales + contactos de emergencia manuales movidas tal cual desde el panel anterior.
  - **Comentarios/historial** (PR #40): `getStudentNotes`/`createStudentNote`/`updateStudentNote`/`deleteStudentNote` nuevas en `students.api.ts`, contra `/api/students/{id}/notes` (endpoint que ya existia en el backend, sin usar en el frontend). Selector con los 6 `StudentNoteType` del backend. Permisos ya resueltos en el backend (`TEACHER` solo ve/escribe notas de estudiantes en su grupo con asignacion activa) — cero logica de rol nueva en frontend, mismo `isForbiddenError()` de siempre.
  - **Dashboard de profesor** (PR #41): nuevo `TeacherDashboard.tsx`, elegido por `DashboardHome.tsx` segun rol (`TEACHER` sin `adminRoles`/`financeRoles`) en la ruta index. Consume `GET /api/dashboard/teacher-summary` (resulto ser uno de 4 endpoints de dashboard por rol que ya existian en el backend, no documentados hasta ahora). Tarjetas: estudiantes activos, cumpleanos proximos (`upcomingBirthdays`), ninos enfermos hoy (`todayAttendanceSummary.sickCount`, tono rojo si > 0). El panel "Pagos del mes" + "Actividades de hoy" de `AdminDashboard` se reemplazan por un timeline proporcional del horario del dia (`todaySchedule`, bloques a escala por horario/duracion, huecos entre actividades marcados como "Descanso").
  - Verificado end-to-end contra el backend real logueado como `TEACHER`/`assistant@school.com` y como `admin@school.com` (sin cambios para ese rol). El timeline poblado se verifico parcheando temporalmente `window.fetch` en el navegador (hoy sabado no habia horario real que renderizar).
- Padres/tutores: vincular y desvincular estudiantes (PR #44). `linkStudentToParent`/`unlinkStudentFromParent` nuevas en `parents.api.ts` contra `POST`/`DELETE /api/parents/{parentId}/students[/{studentId}]` (contrato confirmado en vivo contra el OpenAPI real del backend, no estaba en `docs/backend-api-reference.md`). Boton "Ver estudiantes vinculados" en cada fila de `ParentsPage.tsx` abre un panel con la lista de vinculados actuales y, solo para `adminRoles`, un formulario para vincular un estudiante no vinculado (tipo de relacion + los 4 flags: contacto principal, facturacion, autorizado a recoger, vive con el estudiante) y un boton "Desvincular" por vinculo (`ConfirmDialog`). Reutiliza la misma `queryKey` (`['parent-students', parentId]`) que ya alimentaba el conteo de "Hijos" en la tabla, asi que vincular/desvincular actualiza ese conteo sin llamada extra. Verificado end-to-end contra el backend real: vincular (`POST` → `200`, aparece en la lista y sube el conteo), desvincular (`DELETE` → `204`, desaparece y baja el conteo), y el modo solo lectura logueado como `TEACHER` (sin formulario ni boton de desvincular).
- Asistencia: pagina real en `/attendance` (PR #42), reemplaza el `PlaceholderPage` de siempre. `src/api/attendance.api.ts` nuevo (`getAttendance`/`saveAttendance`) contra `GET`/`POST /api/attendance`. Selector de grupo reutiliza el mismo patron de `groups-lookup` client-side que ya usaba `StudentsPage` (no hay endpoint de "mis grupos"; el backend igual limita a `TEACHER` a sus grupos asignados con `403` si elige otro). Tabla con estado (Presente/Ausente/Enfermo/Tarde), notas y quien registro cada fila; guardado en lote solo de las filas con estado marcado; "Marcar todos presentes" solo llena las que estan sin marcar. Verificado end-to-end contra el backend real: cargo el roster real de un grupo (incluyendo un registro "Enfermo" preexistente), edito y guardo un cambio, confirmo que persistio, lo revirtio.
- Personal: alta de puestos de trabajo y administracion de roles por rango (PR #43). Pedido directo de Jose, coordinado con `backend-preschool` (rango numerico por rol: `SUPER_ADMIN=100` > `ADMIN`/`DIRECTOR=90` > `TEACHER`/`FINANCE=10` > `PARENT=0`; nadie puede otorgar/quitar un rol de rango superior al propio, nunca se puede quitar el ultimo `SUPER_ADMIN`). Nuevo `src/api/roles.api.ts` (`getRoles`, ahora con `rankLevel`) y `src/api/staff.api.ts` (`getStaffList`/`createStaff`/`assignRole`/`removeRole`/`deleteStaff`/`restoreStaff`). Nueva pagina `StaffPage.tsx` detras de un nav "Personal" y ruta `/staff`, ambos gateados a `adminRoles` (igual que el backend). "Nuevo puesto" crea personal con cuenta de acceso opcional (correo/contrasena/roles solo obligatorios juntos); "Gestionar roles" activa/desactiva roles con switches deshabilitados por encima del rango propio del admin logueado; "Dar de baja"/"Papelera" desactiva un puesto (y su login si tiene) sin limite de tiempo para reactivar — no reutiliza el componente `TrashPanel` compartido porque ese tiene hardcodeado el texto de "7 dias", que no aplica aca. Durante las pruebas goteo un bug real no documentado: `positionTitle`/`staffType` son obligatorios en el backend aunque no haya cuenta de acceso — ya validado en el frontend tambien. Verificado end-to-end contra el backend real: activar/desactivar un rol persiste, `SUPER_ADMIN` deshabilitado para un `ADMIN`, `TEACHER` bloqueado con `403` en `/staff` sin el link en el nav, ciclo completo de dar de baja → papelera → reactivar.
- Estudiantes: paginacion real en la tabla (PR #46). Los controles de paginacion (prev/siguiente, botones numerados, "Mostrando X-Y de Z estudiantes") eran solo visuales — ahora tienen logica real. Confirmado en vivo contra el OpenAPI real del backend que `GET /api/students` no soporta `page`/`size` (devuelve un array plano), asi que la paginacion es client-side sobre el resultado ya filtrado por servidor (`search`/`groupId`/`status` siguen siendo server-side, sin cambios ahi). `STUDENTS_PAGE_SIZE = 10`; cambiar cualquier filtro reinicia a la pagina 1. Verificado en el navegador: con el dataset real (6 estudiantes) cabe en una sola pagina, se probo bajando temporalmente el tamano de pagina a 2 para confirmar navegacion entre paginas, botones deshabilitados en los extremos, y el reseteo al filtrar.
- Backend: `POST /api/attendance` gano una regla de archivado (`backend-preschool` PR #58, 2026-08-23): `date` anterior a hoy ahora responde `409` (ya archivado), `date` futuro responde `400`; solo `date == hoy` sigue permitiendo upsert normal (corregir el mismo dia las veces que haga falta). `GET /api/attendance` no cambio, los dias anteriores se siguen pudiendo consultar. Frontend: `AttendancePage.tsx` no tenia ninguna restriccion para esto (se podia elegir cualquier fecha y el guardado fallaba en silencio, sin mensaje). Fix (PR #48): selector de fecha con `max={hoy}` (bloquea futuras en el picker nativo); para una fecha pasada se deshabilitan los controles de estado/notas por fila, "Marcar todos presentes" y "Guardar asistencia", con un aviso explicando que ese dia ya quedo archivado; nuevo manejo de error real en el guardado que distingue `409`/`400`/otros en vez de fallar en silencio. Verificado en el navegador contra el backend real: hoy sigue permitiendo editar y guardar (upsert confirmado), fecha pasada bloquea todo y muestra el aviso, el `max` del date picker bloquea fechas futuras.

- Asistencia: modal de historial por estudiante (PR #50). Backend nuevo: `GET /api/attendance/students/{studentId}?from=&to=` (`backend-preschool` PR #59, 2026-08-23, coordinado en vivo), `from`/`to` opcionales con default de ultimos 30 dias, orden descendente por fecha, mismo shape `StudentAttendanceResponse`, mismos permisos que el resto de asistencia (`TEACHER` solo su grupo asignado). Nuevo `getStudentAttendanceHistory()` en `attendance.api.ts`. Boton "Historial" (icono `History`) por fila en `AttendancePage.tsx` abre un modal (mismo patron `dialog-overlay`/`dialog-panel-wide` que otros paneles) con el historial del estudiante y filtros opcionales `Desde`/`Hasta`. Verificado en el navegador contra el backend real: historial con datos reales (incluyendo una nota), filtro de rango acotando correctamente los resultados.

- Formularios como modal, perfil de padre/tutor, codigo de estudiante autogenerado (PRs #52-#58). Tres pedidos de `docs/modificaciones.md` (Jose, no versionado):
  - **Formularios como modal** (PRs #52, #54, #55, #56, #57): los 10 paneles de crear/editar/acciones secundarias en los 6 modulos (Estudiantes, Materiales x2, Horarios, Pagos x3, Personal x2) pasan del patron inline `<section className="panel entity-form-panel">` al mismo patron `dialog-overlay`/`dialog-panel-wide` ya usado en el perfil de estudiante y el historial de asistencia — envolver en un `<div className="dialog-overlay" onClick={close}>`, agregar `dialog-panel-wide`/`aria-modal`/`role="dialog"` a la section, y `stopPropagation` en el click interno. Sin cambios de CSS. El panel de contactos de emergencia (Estudiantes) ya era modal, no se toco.
  - **Perfil de padre/tutor** (PR #53): resuelve que como admin no se podia abrir un perfil real de un padre/tutor (el estudiante ya lo tenia desde PR #39). El panel de vinculacion de estudiantes (PR #44) se extiende con un bloque de datos de contacto de solo lectura (telefono, correo, direccion, idioma preferido, notas, badge de estado) arriba de la seccion de vincular/desvincular que ya existia — mismos campos de `ParentListItem`, sin llamada nueva a la API. Boton de la tabla renombrado de "Ver estudiantes vinculados" a "Ver perfil".
  - **Codigo de estudiante autogenerado** (PR #58): `studentCode` era texto libre. El backend ya rechazaba duplicados (`400: "Ya existe un estudiante con ese codigo"`) y ese mensaje ya se mostraba sin cambios. Nueva `nextStudentCode()` en `StudentsPage.tsx` calcula el siguiente codigo disponible parseando el numero final de los codigos existentes (ej. `STU-006` -> `STU-007`); el campo pasa a `readOnly` tanto en creacion (prellenado) como en edicion (con el codigo actual del estudiante).
  - Verificado end-to-end contra el backend real en cada fase: los 10 paneles abren como modal centrado sobre overlay (clic afuera cierra, clic adentro no), el perfil de padre muestra datos reales del seed, y crear un estudiante con el codigo autogenerado se confirmo tanto en la UI como consultando la API (`studentCode: "STU-007"`).

- Fix: campos de ayuda (`.field-hint`) desbordando hacia la columna vecina en los formularios de entidad (PR #60). Jose reporto que en los nuevos modales los campos se veian practicamente superpuestos, sin margen. Causa raiz: `.entity-form label` es `display: grid` sin `grid-template-columns` explicito, asi que su columna implicita se auto-dimensiona al contenido mas ancho (el texto de ayuda) en vez de respetar el ancho que le asigna la grilla exterior, y como el `label` tiene `overflow: visible`, ese contenido se desbordaba hacia la columna siguiente — mas visible ahora que los formularios son modales (`dialog-panel-wide`, `max-width: 640px`) con columnas mucho mas angostas que en el panel de pagina completa de antes. Fix de una sola linea: `grid-template-columns: minmax(0, 1fr)` en `.entity-form label`, arregla los 6 modulos a la vez (regla CSS compartida). Verificado en el navegador contra el backend real en Estudiantes (campo "Codigo" con hint) y Padres/Tutores (checkboxes del panel de vinculacion): ya no hay overlap, el texto hace wrap dentro de su columna.

- Horarios: vista semanal/calendario visual (PR #62). Nuevo toggle "Tabla"/"Semana" arriba de los filtros de `SchedulesPage.tsx`; la tabla existente no cambia. La vista de calendario muestra 7 columnas (Lunes-Domingo) con bloques proporcionales por hora, mismo patron de timeline ya usado en `TeacherDashboard.tsx` ("Horario de hoy"), reutilizando los filtros de busqueda y grupo ya existentes. El filtro de "Dia" se deshabilita y resetea a "Todos los dias" en modo Semana (no aplica cuando se ve la semana completa). Nuevas clases CSS (`view-toggle`, `schedule-week*`) sin tocar estilos existentes. Verificado en el navegador contra el backend real: datos reales del seed posicionados correctamente por dia/hora, el filtro de grupo acota el calendario, el toggle entre vistas funciona en ambas direcciones sin perder el resto de filtros.

- Responsive: sidebar como drawer en mobile (PR #64). Al revisar "responsive real de dashboard y tablas principales" se encontro el problema real: en viewport mobile (≤1000px) el sidebar ocupaba toda la pantalla apilado arriba del contenido, asi que habia que scrollear las 10 opciones de navegacion antes de ver cualquier pagina. El boton de hamburguesa en `Topbar.tsx` ya existia pero sin funcion (dejado intacto a proposito en PR #38, con la nota de reintroducirlo como toggle real en este trabajo). Fix: el sidebar ahora es un drawer deslizable (`position: fixed`, `transform: translateX(-100%)` por defecto, clase `.sidebar-open` lo desliza a la vista) con overlay oscuro de fondo; el boton de hamburguesa ahora tiene `onClick` real que lo abre/cierra y se oculta automaticamente en desktop. Clic en un link de navegacion o en el overlay cierra el drawer. Estado (`isSidebarOpen`) vive en `AppLayout.tsx`, pasado como props a `Sidebar`/`Topbar`, sin store nuevo. El resto de la app (dashboard, formularios/modales, tablas principales) ya se comportaba bien en mobile/tablet gracias a los media queries existentes de Fase 1 — no se encontraron mas roturas. Verificado en el navegador contra el backend real en viewport mobile (390px) y desktop (1400px, sin cambios visuales).

- Pagos: boton "Nuevo cargo" (PR #67). Antes solo existian "Registrar pago" (contra un cargo ya creado) y "Editar cargo" (PUT); no habia forma de crear un cargo nuevo desde la UI. Nuevas `createCharge()`/`getChargeTypes()` en `payments.api.ts` contra `POST /api/payments/charges` y `GET /api/payments/charge-types?activeOnly=true` (contrato confirmado en vivo). Boton "Nuevo cargo" junto a "Registrar pago" abre un modal con estudiante, tipo de cargo, fecha de vencimiento, monto, periodo de facturacion y descripcion; seleccionar el tipo de cargo auto-rellena el monto con `defaultAmount` (editable despues). Verificado en el navegador contra el backend real: cargo de prueba creado para Oliver Brown, confirmado el registro exacto via API, cancelado despues (Pagos no tiene `DELETE` por diseno).

- Pagos: descuentos por estudiante (PR #68). Segunda mitad del pedido de Pagos. Contrato confirmado en vivo: `GET`/`POST /api/payments/students/{studentId}/discounts`, `PATCH .../discounts/{discountId}/deactivate` (`StudentDiscountRequest`: `discountType` `PERCENTAGE`/`FIXED_AMOUNT`, `value`, `reason` obligatorio, `validFrom`, `validUntil` opcional). Nuevo componente compartido `StudentDiscountsPanel.tsx` (`src/components/ui/`, formulario crear + historial con badge activo/inactivo + desactivar con `ConfirmDialog`), reutilizado en 3 puntos de entrada acordados con Jose: boton "Descuentos" por fila de cargo en `PaymentsPage.tsx`, enlace "Ver descuentos de este estudiante" dentro del modal "Nuevo cargo" (se apila encima sin cerrarlo), y una seccion nueva en el perfil del estudiante (`StudentsPage.tsx`) visible solo para `financeRoles` (`SUPER_ADMIN`/`OWNER`/`DIRECTOR`/`ADMIN`/`FINANCE`). Verificado en el navegador contra el backend real: descuento de prueba creado y desactivado en Lucas Andersson, datos reales confirmados (Sofia Lindberg con descuento activo "Hermanos inscritos"), apilado de modales correcto, boton oculto para `TEACHER`.

- Configuracion: modo oscuro con deteccion automatica del sistema (PR #70). Nueva pagina real de Configuracion (`/settings`, reemplaza el `PlaceholderPage` de siempre) con selector de tema: Automatico / Claro / Oscuro. Nuevo `src/theme/theme.store.ts` (mismo patron manual de `localStorage` que `auth.store.ts`, sin middleware `persist`): "Automatico" no fija ningun atributo y deja que `prefers-color-scheme` decida solo; "Claro"/"Oscuro" fijan `data-theme` en `<html>` como override manual, aplicado sincronicamente en `main.tsx` antes del primer render para no parpadear. Se agregaron los valores oscuros de todas las variables de tema en `index.css` y se reemplazaron ~15 colores hardcodeados (fondos blancos de inputs/botones/tablas, textos gris oscuro en badges/errores) por las variables CSS existentes. Verificado en el navegador: "Automatico" detecto correctamente el sistema en modo oscuro, forzar "Claro"/"Oscuro" funciona en ambas direcciones, tablas/filtros/modales/badges se ven bien en oscuro, la preferencia persiste tras recargar sin parpadeo.

- Configuracion: selector de idioma ingles/sueco, shell + dashboard traducidos (PR #71). Confirmado con Jose (AskUserQuestion) hacerlo **incremental** en vez de traducir toda la app de una vez — mismo criterio que la migracion a RHF+Zod de esta sesion (ver memoria del proyecto). `npm install react-i18next i18next`; nuevo `src/i18n/i18n.ts` (detecta idioma desde `localStorage` clave `preschool.language`, default `es`) + 3 locales completos en `src/i18n/locales/{es,en,sv}.json`. Nueva seccion "Idioma" en Configuracion junto a "Tema", cada idioma mostrado en su propio nombre (Español/English/Svenska, patron estandar, no se traduce el nombre del idioma). Traducidos con `useTranslation()`/`t()`: `Sidebar.tsx`, `Topbar.tsx`, `AdminDashboard.tsx`, `TeacherDashboard.tsx`, `SettingsPage.tsx`. **Fuera de alcance a proposito, pendiente para retomar**: los otros 9 modulos (Estudiantes, Padres, Pagos, Materiales, Horarios, Asistencia, Personal, Reportes, LoginPage/ForbiddenPage), y cualquier texto que venga del backend (`translateBackendSeed()` sigue siendo un mecanismo aparte, sin relacion con este i18n). Verificado en el navegador logueado como `TEACHER` y como `admin`: cambio de idioma sin recargar, persiste tras cerrar sesion, modulos fuera de alcance (ej. Estudiantes) se quedan intactos en espanol, texto del backend (nombres de actividades reales) se queda igual en los 3 idiomas.
  - Nota aparte encontrada al traducir (no arreglada, fuera de alcance): el bloque de cuenta en el sidebar (`.sidebar-account`, "Administrador"/"admin@preescolar.com") es texto fijo hardcodeado, nunca reflejo al usuario real logueado — mas visible ahora que se tradujo tambien. Revisar en algun momento si vale la pena conectarlo a `useAuthStore()` como ya hace `Topbar.tsx`.

## Backend API — cambios pendientes de aprovechar (sync 2026-08-21)

El backend sincronizado en `docs/backend-api-reference.md` expone varias cosas que este frontend todavia no usa. Detalle de contratos en ese archivo; resumen de huecos confirmados en el codigo actual:

- Pagos sigue sin ningun endpoint `DELETE` en el backend (no se pidio, tiene sentido para no perder historial financiero) — es el unico modulo principal sin eliminar/papelera, a proposito.
- **Backend: generacion automatica mensual de cargos** (2026-08-23). Jose reporto que los cargos se quedaban solo hasta mayo/junio porque nunca hubo generacion automatica, cada cargo se creaba a mano. Backend lo resolvio: un job corre solo todos los dias a las 02:00 (o manual, `POST /api/payments/generate-monthly-charges?month=YYYY-MM`, admin/finanzas) y genera el cargo del mes para cada estudiante activo, prorrateado si se inscribe a mitad de mes — cero cambio de frontend necesario para esto, los cargos nuevos simplemente aparecen en `GET /api/payments/charges` como cualquier otro (confirmado en el navegador: cargos de agosto ya generados automaticamente).

## Siguiente Punto Recomendado

**Fecha limite: martes 2026-08-25.** Actualizado 2026-08-22: UI de tutor archivado, editar/cancelar cargo, tutores como contactos de emergencia, la ronda completa de rol `TEACHER` (nav/acciones por rol, perfil de estudiante en popup, comentarios, dashboard de profesor), la pagina real de asistencia, y personal/roles por rango — todo completo y verificado end-to-end contra el backend real (ver Estado Actual). Con esto se cierra la lista de pendientes que tenia fecha limite; lo que sigue no es urgente para el martes.

Con menor prioridad, no urgente para el martes:

- Traducir los 9 modulos restantes (Estudiantes, Padres, Pagos, Materiales, Horarios, Asistencia, Personal, Reportes, LoginPage/ForbiddenPage) a ingles/sueco — infraestructura de i18n ya lista (`react-i18next`, `src/i18n/`), ver detalle en Estado Actual (PR #71). Mismo enfoque incremental, una rama por modulo o agrupados.
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
- [x] Revisar responsive real en mobile y desktop (sidebar convertido a drawer en mobile).

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
- [x] Mostrar cumpleanos proximos si el backend lo expone (en `TeacherDashboard.tsx`, via `GET /api/dashboard/teacher-summary`; `AdminDashboard.tsx` no lo muestra, no fue pedido ahi).
- [x] Reemplazar datos demo principales por datos reales.
- [x] Validar visualmente con datos reales en navegador.

## Fase 4 - Modulos De Lectura

- [x] Estudiantes: tabla visual inicial.
- [x] Estudiantes: adaptar campos reales del backend.
- [x] Estudiantes: busqueda local por nombre o codigo.
- [x] Estudiantes: filtro local por grupo.
- [x] Estudiantes: mostrar tutor principal.
- [x] Estudiantes: filtros migrados a server-side (`search`, `groupId`, `status` en `GET /api/students`), busqueda con debounce.
- [x] Estudiantes: paginacion real (client-side, el backend no soporta `page`/`size`).
- [x] Padres/tutores: tabla visual inicial.
- [x] Padres/tutores: adaptar campos reales del backend.
- [x] Padres/tutores: busqueda local por nombre, correo o telefono.
- [x] Padres/tutores: mostrar cantidad de hijos (`GET /api/parents/{parentId}/students` por tutor en `ParentsPage.tsx`).
- [x] Padres/tutores: buscar y reactivar tutor archivado (`POST /api/parents/{id}/claim`).
- [x] Padres/tutores: vincular y desvincular estudiantes (`POST`/`DELETE /api/parents/{parentId}/students[/{studentId}]`).
- [x] Pagos: tabla visual inicial.
- [x] Pagos: adaptar campos reales de cargos del backend.
- [x] Pagos: filtros por mes y estado.
- [x] Pagos: busqueda local por estudiante o concepto.
- [x] Pagos: registrar pago desde cargo.
- [x] Pagos: historial de pagos por estudiante (`GET /api/payments/students/{studentId}`), verificado contra el backend real.
- [x] Pagos: editar y cancelar/reactivar un cargo existente (`PUT /api/payments/charges/{studentChargeId}`), verificado contra el backend real.
- [x] Pagos: crear un cargo nuevo (`POST /api/payments/charges`), verificado contra el backend real.
- [x] Pagos: descuentos por estudiante (`GET`/`POST /api/payments/students/{studentId}/discounts`, `PATCH .../deactivate`), verificado contra el backend real.
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
- [x] Horarios: vista semanal o calendario visual.
- [x] Contactos de emergencia: CRUD completo por estudiante (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`), verificado contra el backend real.
- [x] Asistencia: pagina real por grupo/fecha con guardado en lote (`GET/POST /api/attendance`), verificada contra el backend real.
- [x] Asistencia: modal de historial por estudiante (`GET /api/attendance/students/{studentId}?from=&to=`), verificado contra el backend real.
- [x] Personal: alta de puestos, administracion de roles por rango, y dar de baja/reactivar (`GET/POST /api/staff`, `DELETE/POST /api/staff/{id}(/restore)`, `GET /api/roles`, `POST/DELETE /api/users/{userId}/roles`), verificado contra el backend real.

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
- [x] Manejo de errores API: `isForbiddenError()` distingue `403` de otros errores en los 6 modulos con `useQuery`, mostrando "No tienes permiso para..." en vez del mensaje generico. `ProtectedRoute` muestra `ForbiddenPage` si el rol no coincide; la ruta `/payments` ya usa `roles={financeRoles}`. Verificado con un usuario `TEACHER` real.
- [x] Acciones ocultas por rol: en Estudiantes/Padres/Materiales/Horarios, crear/editar/eliminar/papelera se ocultan (no deshabilitan) para roles fuera de `adminRoles`, via `useAuthStore().hasAnyRole()`. Verificado con `TEACHER` y `admin@school.com`.
- [x] Confirmaciones para acciones sensibles: `ConfirmDialog` reutilizable conectado a activar/desactivar padre/tutor, y a eliminar (doble confirmacion) en las 4 entidades con soft-delete (estudiantes, padres/tutores, materiales, horarios), cada una con `UndoToast` + `TrashPanel`.
- [x] Filtros por modulo.
- [x] Formularios de crear/editar como modal en los 6 modulos, en vez de panel inline.
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
feat/parent-archived-claim
feat/charge-edit-cancel
feat/student-guardians-as-emergency-contacts
feat/role-based-nav-and-actions
feat/student-profile-modal
feat/student-notes-comments
feat/teacher-dashboard
feat/attendance-taking
feat/staff-roles-admin
feat/parent-student-link
feat/students-pagination
fix/attendance-date-restrictions
feat/attendance-history-modal
feat/students-form-as-modal
feat/parent-profile-modal
feat/materials-forms-as-modal
feat/schedules-form-as-modal
feat/payments-forms-as-modal
feat/staff-forms-as-modal
feat/student-code-autogenerate
fix/entity-form-field-hint-overflow
feat/schedule-week-view
feat/responsive-sidebar-drawer
feat/payments-new-charge
feat/student-discounts
feat/dark-mode
feat/i18n-shell
```

Siguientes:

```text
chore/tailwind-theme-tokens
```
