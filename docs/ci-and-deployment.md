# CI And Deployment

CI es recomendado desde el inicio para evitar merges con lint o build rotos.

## GitHub Actions

Workflow recomendado para cada pull request y push a `main`:

```yaml
name: Frontend CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 25
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

## Checks Minimos

CI debe ejecutar:

```bash
npm ci
npm run lint
npm run build
```

Cuando haya tests:

```bash
npm test
```

## Variables De Entorno En Deploy

Configurar en el proveedor de hosting:

```properties
VITE_API_BASE_URL=https://api.example.com
```

No usar secretos reales en variables `VITE_*`. Esas variables se empaquetan en el frontend y son visibles para el navegador.

## Docker

Docker no es obligatorio para desarrollo local del frontend. Para trabajar rapido:

```bash
npm run dev
```

Docker puede ser util mas adelante para:

- Deploy reproducible.
- Preview de produccion.
- Entornos compartidos.
- Ejecutar frontend junto con backend y base de datos.

En desarrollo local, lo mas practico por ahora es:

- Backend y MySQL con Docker desde `backend-preschool`, si se quiere.
- Frontend con `npm run dev`.

## Deploy

Build de produccion:

```bash
npm run build
```

Salida generada:

```text
dist/
```

El hosting elegido debe servir `dist/` como una SPA y redirigir rutas internas hacia `index.html`.
