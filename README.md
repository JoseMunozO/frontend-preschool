# Preschool Admin Frontend

Frontend React para la aplicacion administrativa del preescolar. Este repo debe avanzar de forma ordenada, con branches pequenos, commits claros y validacion local antes de subir cambios.

## Stack

- React + Vite + TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Tailwind CSS disponible
- lucide-react

## Inicio Rapido

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local` a partir de `.env.example`:

```properties
VITE_API_BASE_URL=http://localhost:8080
```

3. Arrancar el backend local desde `/Volumes/KINGSTON/backend-preschool`.

4. Arrancar el frontend:

```bash
npm run dev
```

Frontend local:

```text
http://localhost:5173
```

Backend local:

```text
http://localhost:8080
```

Swagger del backend:

```text
http://localhost:8080/swagger-ui/index.html
```

Version de Node recomendada:

```bash
nvm use
```

Comandos:

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## CI

GitHub Actions valida cada pull request y cada push a `main` con:

```bash
npm ci
npm run lint
npm run build
```

El workflow vive en `.github/workflows/frontend-ci.yml` y usa la version de Node definida en `.nvmrc`.

## Estructura

```text
src/
  app/          router y providers
  api/          cliente HTTP y endpoints por modulo
  auth/         login, sesion, rutas protegidas y roles
  layouts/      shell principal
  dashboards/   dashboard interno
  modules/      pantallas por modulo
  components/   componentes compartidos
  config/       variables de entorno
  types/        contratos TypeScript
```

## Documentacion

- [Frontend roadmap](docs/frontend-roadmap.md)
- [Development workflow](docs/development-workflow.md)
- [API integration](docs/api-integration.md)
- [CI and deployment](docs/ci-and-deployment.md)
- [Docker](docs/docker.md)
