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

OpenAPI JSON:

```text
http://localhost:8080/v3/api-docs
```

## Comandos

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Branches

Usar branches pequenos por tipo de cambio:

```text
chore/*
feature/*
fix/*
test/*
docs/*
```

Orden recomendado para los primeros branches:

```text
chore/scaffold-react-frontend
chore/frontend-docs
feat/auth-login
feat/app-shell
feat/dashboard-summary
feat/students-list
```

## Commits

Usar mensajes claros y con alcance cuando ayude:

```text
chore: scaffold react frontend
feat(auth): add login page
feat(dashboard): connect dashboard summary
fix(api): handle expired token
test(auth): add login form tests
docs: add frontend workflow
```

Checklist antes de cada commit:

```bash
npm run lint
npm run build
git status --short
```

No subir `.env.local`, secretos, tokens, credenciales reales ni archivos AppleDouble `._*`.

## Estructura Esperada

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
