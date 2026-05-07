# Preschool Admin Frontend

Frontend React para la aplicacion administrativa del preescolar.

## Stack

- React + Vite + TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Tailwind CSS disponible
- lucide-react

## Backend local

El backend esperado vive en:

```bash
/Volumes/KINGSTON/backend-preschool
```

Arranque recomendado:

```bash
cd /Volumes/KINGSTON/backend-preschool
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

## Frontend local

Crear o revisar `.env.local`:

```properties
VITE_API_BASE_URL=http://localhost:8080
```

Comandos:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

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

## Estado actual

La base inicial ya incluye login, JWT en localStorage, rutas protegidas, layout interno,
dashboard conectado a `/api/dashboard/summary` y primera tabla de estudiantes conectada
a `/api/students`.
