# Roadmap institucional futuro

Este documento es una guia para una version futura pensada para instituciones grandes, como cadenas de preescolares, colegios, campus o una organizacion con varias sedes.

El roadmap activo del proyecto actual sigue siendo `docs/roadmap.md`. Este archivo no bloquea el desarrollo del preescolar familiar actual.

## Objetivo

Preparar una arquitectura que pueda crecer sin mezclar permisos, datos sensibles ni responsabilidades entre areas.

La primera version real sigue enfocada en un preescolar pequeno. La version institucional debe poder activarse despues con feature flags, nuevos roles y endpoints separados.

## Principios

- Separar datos operativos, financieros, pedagogicos, RRHH y direccion.
- Proteger cada endpoint desde backend por rol y permiso.
- No confiar solo en ocultar botones en frontend.
- Permitir que una institucion grande active modulos por fases.
- Mantener compatibilidad con una instalacion pequena.
- Evitar que profesores, padres o usuarios operativos vean datos financieros sensibles.

## Roles futuros

- `SUPER_ADMIN`: soporte tecnico global, configuracion del sistema y administracion multi-institucion.
- `OWNER`: dueno o representante legal de la institucion.
- `DIRECTOR`: direccion de una sede o institucion.
- `ADMIN`: administracion interna.
- `FINANCE`: pagos, cargos, facturacion y reportes financieros.
- `HR`: personal, documentos laborales, ausencias y contratos.
- `TEACHER`: aula, estudiantes asignados, asistencia y observaciones.
- `ASSISTANT_TEACHER`: apoyo de aula con permisos reducidos.
- `NURSE`: salud, alergias, incidentes medicos y medicacion autorizada.
- `KITCHEN`: comedor, alergias alimentarias y planificacion de comidas.
- `MAINTENANCE`: incidencias de instalaciones y materiales.
- `GUARDIAN`: padre, madre o tutor legal.
- `AUDITOR`: lectura limitada para auditoria o supervision.

## Endpoints de dashboard por area

Endpoints base que se pueden dejar preparados con feature flags:

```text
GET /api/dashboard/teacher-summary
GET /api/dashboard/admin-summary
GET /api/dashboard/finance-summary
GET /api/dashboard/executive-summary
GET /api/dashboard/hr-summary
GET /api/dashboard/operations-summary
GET /api/dashboard/compliance-summary
GET /api/dashboard/campus-summary
GET /api/dashboard/support-summary
```

## Dashboard docente

Endpoint:

```text
GET /api/dashboard/teacher-summary
```

Roles:

```text
SUPER_ADMIN, ADMIN, DIRECTOR, TEACHER, ASSISTANT_TEACHER
```

Datos:

- Horarios de hoy.
- Estudiantes asignados.
- Cumpleanos proximos.
- Alertas de aula.
- Materiales bajos relevantes para aula.
- Asistencia pendiente.
- Observaciones pedagogicas pendientes.

No debe incluir pagos, balances, datos salariales ni datos administrativos sensibles.

## Dashboard administrativo

Endpoint:

```text
GET /api/dashboard/admin-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, ADMIN, DIRECTOR
```

Datos:

- Estudiantes activos.
- Padres/tutores activos.
- Grupos y capacidad.
- Materiales bajos.
- Horarios del dia.
- Alertas operativas.
- Incidencias abiertas.
- Documentos administrativos pendientes.

No debe incluir detalle financiero profundo salvo indicadores generales si la institucion lo permite.

## Dashboard financiero

Endpoint:

```text
GET /api/dashboard/finance-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, ADMIN, DIRECTOR, FINANCE
```

Datos:

- Cargos pendientes.
- Cargos atrasados.
- Balance pendiente.
- Balance atrasado.
- Pagos recibidos del mes.
- Pagos por metodo.
- Facturas o recibos pendientes.
- Deudas por antiguedad.
- Exportes contables futuros.

No debe estar disponible para `TEACHER`, `ASSISTANT_TEACHER`, `GUARDIAN`, `KITCHEN` ni `MAINTENANCE`.

## Dashboard ejecutivo

Endpoint:

```text
GET /api/dashboard/executive-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, DIRECTOR
```

Datos:

- Vision general de la institucion.
- Ocupacion por sede.
- Tendencias de pagos agregadas.
- Riesgos operativos.
- KPIs de asistencia.
- Rotacion de estudiantes.
- Indicadores de personal.

Debe evitar detalles innecesarios de estudiantes individuales, salvo alertas criticas.

## Dashboard RRHH

Endpoint:

```text
GET /api/dashboard/hr-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, DIRECTOR, HR
```

Datos:

- Staff activo.
- Ausencias.
- Contratos por vencer.
- Documentos pendientes.
- Certificaciones.
- Horarios de personal.

No debe exponer datos salariales fuera de `HR`, `OWNER` o roles explicitamente autorizados.

## Dashboard operaciones

Endpoint:

```text
GET /api/dashboard/operations-summary
```

Roles:

```text
SUPER_ADMIN, ADMIN, DIRECTOR, MAINTENANCE
```

Datos:

- Inventario critico.
- Incidencias de instalaciones.
- Mantenimiento pendiente.
- Materiales por reponer.
- Estado de aulas o sedes.

## Dashboard cumplimiento

Endpoint:

```text
GET /api/dashboard/compliance-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, DIRECTOR, ADMIN, AUDITOR
```

Datos:

- Consentimientos pendientes.
- Politicas aceptadas.
- Documentos obligatorios.
- Alertas de privacidad.
- Historial de auditoria.
- Requisitos legales por sede o pais.

## Dashboard sedes

Endpoint:

```text
GET /api/dashboard/campus-summary
```

Roles:

```text
SUPER_ADMIN, OWNER, DIRECTOR, ADMIN
```

Datos:

- Resumen por sede.
- Ocupacion por sede.
- Staff por sede.
- Incidencias por sede.
- Materiales por sede.
- Comparativas agregadas.

## Dashboard soporte

Endpoint:

```text
GET /api/dashboard/support-summary
```

Roles:

```text
SUPER_ADMIN, ADMIN
```

Datos:

- Errores tecnicos.
- Estado de integraciones.
- Jobs pendientes.
- Actividad del sistema.
- Alertas de configuracion.

## Feature flags recomendadas

En lugar de comentar endpoints, usar configuracion:

```properties
app.features.dashboard.teacher-summary=true
app.features.dashboard.admin-summary=true
app.features.dashboard.finance-summary=true
app.features.dashboard.executive-summary=false
app.features.dashboard.hr-summary=false
app.features.dashboard.operations-summary=false
app.features.dashboard.compliance-summary=false
app.features.dashboard.campus-summary=false
app.features.dashboard.support-summary=false
```

## Fases sugeridas

### Fase 1 - Preescolar actual

- Mantener dashboard simple.
- Proteger finanzas para `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` y `FINANCE`.
- Bloquear dashboard interno para padres.
- Preparar frontend para mostrar secciones segun roles.

### Fase 2 - Separacion por areas

- Separar dashboard en `teacher-summary`, `admin-summary` y `finance-summary`.
- Mantener `summary` como compatibilidad temporal o eliminarlo cuando frontend migre.
- Smoke tester por rol.
- Tests de seguridad por endpoint.

### Fase 3 - Institucion grande

- Activar `executive-summary`.
- Activar `hr-summary`.
- Activar `operations-summary`.
- Activar `compliance-summary`.
- Activar modulo de notas, fotos, albumes y consentimientos con permisos por grupo, sede y estudiante asignado.
- Agregar multi-sede si el cliente lo necesita.

### Fase 4 - Multi-institucion

- Separar datos por `institutionId`.
- Separar sedes por `campusId`.
- Agregar permisos por sede.
- Agregar auditoria avanzada.
- Agregar reportes exportables.

## Pendientes tecnicos

- Definir modelo de permisos fino ademas de roles.
- Definir reglas de jerarquia para gestion de roles: que roles puede asignar `SUPER_ADMIN`, `OWNER`, `ADMIN`, `DIRECTOR`, `HR` o `FINANCE`.
- Definir flujo seguro para crear nuevos roles: enum backend, migracion/seed, permisos en `SecurityConfig`, tests y actualizacion del frontend.
- Definir feature flags en configuracion.
- Definir si `DIRECTOR` ve detalle financiero completo o solo resumen.
- Definir si `OWNER` existe en la version pequena.
- Definir alcance multi-sede.
- Definir modelo de consentimiento de imagen/privacidad por estudiante, tutor, sede e institucion.
- Definir reglas de acceso a fotos y notas: profesor responsable, grupo asignado, director de sede, admin institucional y auditor.
- Definir almacenamiento de archivos: local en desarrollo, cloud/private bucket en produccion, politicas de borrado y URLs firmadas si aplica.
- Definir auditoria para datos sensibles.
- Definir retencion de logs y datos personales segun normativa aplicable.
