# API smoke tester

Script local para comprobar rapidamente que los endpoints principales del backend siguen funcionando.

## Comandos rapidos

Arrancar backend:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Ejecutar cobertura completa:

```bash
node scripts/api-smoke-test.mjs
```

Ejecutar sin crear ni modificar datos:

```bash
API_SMOKE_READ_ONLY=true node scripts/api-smoke-test.mjs
```

Ver ayuda:

```bash
node scripts/api-smoke-test.mjs --help
```

## Cuando usar cada modo

Usa el modo completo durante desarrollo local cuando quieras probar tambien `POST` y `PUT`. Este modo crea datos demo con prefijos `SMOKE-*`.

Usa el modo read-only antes de releases, en staging, o cuando no quieras ensuciar la base de datos:

```bash
API_SMOKE_READ_ONLY=true node scripts/api-smoke-test.mjs
```

## Que valida

- Auth/login.
- Dashboard principal.
- Roles y usuarios.
- Estudiantes, notas internas, consentimientos, albumes/fotos, padres y relaciones tutor-estudiante.
- Pagos y cargos.
- Materiales y movimientos.
- Horarios y asignaciones de staff.
- Casos negativos esperados: `400`, `401/403` y `404`.

## Logs

El script crea logs locales en `logs/`.

Por defecto conserva solo los ultimos 4 logs reales:

```bash
API_SMOKE_LOGS_TO_KEEP=4 node scripts/api-smoke-test.mjs
```

Tambien limpia archivos AppleDouble de macOS con formato `._api-smoke-test*.log`.

## Configuracion

Variables opcionales:

```bash
API_BASE_URL=http://localhost:8080 \
API_ADMIN_EMAIL=admin@school.com \
API_ADMIN_PASSWORD=123456 \
API_PARENT_EMAIL=parent.demo@school.com \
API_PARENT_PASSWORD=123456 \
API_SMOKE_READ_ONLY=false \
API_SMOKE_LOGS_TO_KEEP=4 \
API_SMOKE_GROUP_ID=1 \
API_SMOKE_STAFF_ID=1 \
API_SMOKE_LOG_DIR=logs \
node scripts/api-smoke-test.mjs
```

## Resultado esperado

Modo completo actual:

```text
Summary: 87 passed, 0 failed, 0 skipped
```

Modo read-only actual:

```text
Summary: 59 passed, 0 failed, 7 skipped
```

Si alguna comprobacion falla, el script termina con exit code `1` y deja el detalle en el log.

## Release oficial

Antes de entregar al cliente, ejecuta contra staging o el entorno final en modo read-only:

```bash
API_SMOKE_READ_ONLY=true node scripts/api-smoke-test.mjs
```

Para produccion, la base de datos debe estar limpia de datos demo/locales y de registros `SMOKE-*`.
