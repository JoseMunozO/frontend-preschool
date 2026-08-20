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
- Padres/tutores: cantidad de hijos mostrada en la tabla, vía `GET /api/parents/{parentId}/students` por tutor (`useQueries` en `ParentsPage.tsx`). Implementado en el working tree de `feat/parents-children-count`, pendiente de verificar lint/build y commitear.

## Backend API — cambios pendientes de aprovechar (sync 2026-08-20)

El backend sincronizado en `docs/backend-api-reference.md` expone varias cosas que este frontend todavia no usa. Detalle de contratos en ese archivo; resumen de huecos confirmados en el codigo actual:

- **Filtros de estudiantes server-side** (`GET /api/students?search=&groupId=&status=`): `getStudents()` en `src/api/students.api.ts` no envia ningun parametro todavia; `StudentsPage.tsx` sigue filtrando 100% en cliente. Migrar antes de construir paginacion real (punto 2 de abajo), porque el filtrado local no pagina bien.
- **`guardians[]` en `StudentListItem`**: el tipo en `src/api/students.api.ts` solo tiene `primaryGuardianName`, no el array `guardians` que el backend ya devuelve en list y detail. Agregarlo eliminaria la necesidad de una llamada aparte a `getStudentGuardians()` en varios casos (incluyendo, potencialmente, simplificar el patron usado para la cuenta de hijos en `ParentsPage.tsx`).
- **Contactos de emergencia** (`GET/POST/PUT/DELETE /api/students/{id}/emergency-contacts`): no existe ningun modulo, tipo ni llamada en el frontend todavia.
- **Reporte mensual de pagos** (`GET /api/payments/reports/monthly?month=YYYY-MM`): no hay ninguna pantalla ni llamada que lo consuma; encaja con el punto 4 de abajo (historial/reportes de pagos).
- **Manejo de `403`**: `src/api/client.ts` solo tiene rama especial para `401` (`unauthorizedHandler`); un `403` cae al mismo `throw new ApiError(...)` generico, sin pantalla "No tienes permiso" en ningun componente. Antes esto se enmascaraba porque el backend real devolvia `401` en vez de `403` para peticiones sin permiso (bug ya corregido en backend), asi que ahora es visible y vale la pena cerrarlo — ver Fase 6.

## Siguiente Punto Recomendado

Prioridad inmediata:

1. Confirmar `npm run lint && npm run build` en `feat/parents-children-count` y abrir PR (cantidad de hijos en tabla de padres/tutores — implementacion ya en el working tree).
2. Migrar `GET /api/students` a filtros server-side (`search`, `groupId`, `status`) e implementar paginacion real (los controles de paginacion son visuales, sin logica todavia).
3. Agregar manejo de `403` distinto de `401` (pantalla "No tienes permiso"), ahora que el backend lo distingue correctamente.
4. Agregar confirmaciones para acciones sensibles (desactivar padre/tutor, eliminar, etc.) — no hay ningun dialogo de confirmacion en el frontend todavia.
5. Vista de historial de pagos por estudiante, aprovechando `GET /api/payments/reports/monthly`.
6. Modulo de contactos de emergencia por estudiante (no existe todavia).
7. Validar responsive real de dashboard y tablas principales.

Branch en curso:

```text
feat/parents-children-count
```

Commit sugerido:

```text
feat(parents): show children count in parents table
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
- [ ] Estudiantes: migrar busqueda/filtro de grupo a parametros server-side (`search`, `groupId`, `status` en `GET /api/students`) en vez de filtrado 100% local.
- [ ] Estudiantes: paginacion real (controles visuales presentes, sin logica).
- [x] Padres/tutores: tabla visual inicial.
- [x] Padres/tutores: adaptar campos reales del backend.
- [x] Padres/tutores: busqueda local por nombre, correo o telefono.
- [x] Padres/tutores: mostrar cantidad de hijos (`GET /api/parents/{parentId}/students` por tutor en `ParentsPage.tsx`; en `feat/parents-children-count`, pendiente de commit).
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

## Fase 6 - Calidad

- [x] Estados de carga.
- [x] Estados vacios.
- [ ] Manejo de errores API (validacion de formularios presente; falta manejo uniforme de errores de red/API). En concreto: `src/api/client.ts` solo tiene rama especial para `401`; falta pantalla "No tienes permiso" para `403`, ahora que el backend lo distingue correctamente de `401` (antes un bug en el backend real devolvia `401` para todo rechazo por rol).
- [ ] Confirmaciones para acciones sensibles (ninguna accion usa dialogo de confirmacion todavia).
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
```

En curso (working tree, sin commitear):

```text
feat/parents-children-count
```

Siguientes:

```text
feat/students-server-filters
feat/students-pagination
fix/403-permission-screen
feat/action-confirmations
feat/payment-history
feat/emergency-contacts
feat/schedule-week-view
feat/responsive-polish
```
