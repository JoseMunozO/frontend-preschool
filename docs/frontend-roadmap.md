# Frontend Roadmap

Este roadmap organiza el frontend antes de construir pantallas grandes. La prioridad inicial es tener estructura, contratos API claros y flujo de trabajo estable.

## Objetivo

Crear una aplicacion React administrativa conectada al backend `backend-preschool`, manteniendo frontend y backend como repos separados.

## Orden Recomendado De Branches

```text
chore/scaffold-react-frontend
chore/frontend-docs
feat/auth-login
feat/app-shell
feat/dashboard-summary
feat/students-list
```

## Fase 0 - Base Del Proyecto

- [ ] Confirmar stack React + Vite + TypeScript.
- [ ] Crear `.env.example`.
- [ ] Configurar `.gitignore`.
- [ ] Documentar workflow de branches y commits.
- [ ] Documentar conexion con backend y Swagger.
- [ ] Confirmar que `npm run lint` y `npm run build` pasan.

## Fase 1 - Fundacion De App

- [ ] Crear `src/app` para router y providers.
- [ ] Crear `src/api` para cliente HTTP y endpoints por modulo.
- [ ] Crear `src/config/env.ts` para variables de entorno.
- [ ] Crear `src/types` para contratos TypeScript.
- [ ] Crear layout base con sidebar/topbar.
- [ ] Crear rutas protegidas.

## Fase 2 - Auth

- [ ] Crear login.
- [ ] Conectar `POST /api/auth/login`.
- [ ] Guardar JWT de forma controlada.
- [ ] Enviar `Authorization: Bearer <token>` desde el cliente API.
- [ ] Implementar logout.
- [ ] Manejar token expirado.

## Fase 3 - Dashboard

- [ ] Conectar resumen principal del backend.
- [ ] Mostrar estudiantes activos.
- [ ] Mostrar pagos pendientes y atrasados.
- [ ] Mostrar materiales bajos.
- [ ] Mostrar actividades del dia.
- [ ] Mostrar cumpleanos proximos si el backend lo expone.

## Fase 4 - Modulos De Lectura

- [ ] Estudiantes.
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
