# Frontend Roadmap

Este roadmap organiza el frontend antes de construir pantallas grandes. La prioridad inicial es tener estructura, contratos API claros y flujo de trabajo estable.

## Objetivo

Crear una aplicacion React administrativa conectada al backend `backend-preschool`, manteniendo frontend y backend como repos separados.

## Estado Actual

Ultima actualizacion: 2026-05-07.

- Base React/Vite/TypeScript creada.
- Documentacion inicial y workflow de desarrollo creados.
- GitHub Actions CI creado para `npm ci`, `npm run lint` y `npm run build`.
- Shell administrativo visual alineado con la referencia del cliente.
- Login inicial creado y conectado a `/api/auth/login`.
- Cliente API centralizado creado.
- Proxy local de Vite agregado para evitar CORS durante desarrollo.
- Dashboard visual inicial creado.
- Tabla visual inicial de estudiantes creada.

## Siguiente Punto Recomendado

Prioridad inmediata:

1. Validar login end-to-end con backend levantado.
2. Alinear contratos reales del backend con los tipos del frontend.
3. Corregir dashboard para leer la respuesta real de `/api/dashboard/summary`.
4. Corregir estudiantes para leer campos reales de `/api/students`.

Branch sugerido:

```text
fix/auth-login-fetch-error
```

Commit sugerido:

```text
fix(auth): handle login fetch failures
```

Despues de cerrar login:

```text
feat/dashboard-summary
feat/students-list
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
- [ ] Validar login end-to-end desde navegador.
- [ ] Manejar token expirado.
- [ ] Redirigir automaticamente a login en `401`.

## Fase 3 - Dashboard

- [x] Crear layout visual inicial del dashboard.
- [x] Conectar llamada inicial al resumen principal del backend.
- [ ] Ajustar tipos y mapeo a la respuesta real de `/api/dashboard/summary`.
- [ ] Mostrar estudiantes activos.
- [ ] Mostrar pagos pendientes y atrasados.
- [ ] Mostrar materiales bajos.
- [ ] Mostrar actividades del dia.
- [ ] Mostrar cumpleanos proximos si el backend lo expone.
- [ ] Reemplazar datos demo por datos reales.

## Fase 4 - Modulos De Lectura

- [x] Estudiantes: tabla visual inicial.
- [ ] Estudiantes: adaptar campos reales del backend.
- [ ] Padres/tutores.
- [ ] Pagos.
- [ ] Materiales.
- [ ] Horarios.

## Fase 5 - Formularios

- [ ] Crear/editar estudiante.
- [ ] Crear/editar padre o tutor.
- [ ] Registrar cargos y pagos.
- [ ] Crear/editar materiales.
- [ ] Registrar movimientos de material.
- [ ] Crear/editar horarios.

## Fase 6 - Calidad

- [ ] Estados de carga.
- [ ] Estados vacios.
- [ ] Manejo de errores API.
- [ ] Confirmaciones para acciones sensibles.
- [ ] Filtros por modulo.
- [ ] Tests de formularios y flujos criticos.

## Orden Recomendado De Branches

Ya iniciados o completados:

```text
chore/scaffold-react-frontend
docs/frontend-working-agreement
ci/frontend-validation
feat/app-shell
fix/auth-login-fetch-error
```

Siguientes:

```text
feat/dashboard-summary
feat/students-list
feat/parents-list
feat/payments-overview
```
