# Preschool Admin Frontend

The admin panel a preschool's staff actually runs the place with: directors, administrators, finance, and teachers manage students and their families, billing, inventory, schedules, attendance, and reporting from one place, with access scoped to their role. It consumes the `backend-preschool` API, a separate repo and deployment.

This repo moves in small, ordered steps: small branches, clear commits, local validation before anything ships.

## What it does today

### Students
- Create, edit, and delete (soft-delete with a 7-day undo window).
- Profile with legal guardians, emergency contacts (create/edit/delete), allergies and medical notes, and authored comments (only the author or an admin can edit/delete).
- Auto-generated student code.
- Active discount shown on the profile (read-only; managed from Payments).
- Search, group/status filters, and pagination, all resolved server-side.

### Parents / Guardians
- Create, edit, activate/deactivate.
- Profile with contact details and linked students (link/unlink, with relationship type and primary-contact/billing/authorized-pickup/lives-with-student flags).
- Full lifecycle: deleted (undoable within 7 days) -> archived (data minimized, child history preserved) -> claimable for up to 6 years afterward.

### Payments
- Charges: create, edit, cancel, and reactivate.
- Record payments against a charge and view a student's payment history, with PDF receipt download.
- Discounts applied to a single charge (apply, edit, remove) - not a recurring per-student rule.
- Invoice download for already-paid charges.
- Late fee shown on overdue charges (5% of the amount per month late, non-compounding).

### Materials
- Inventory with create and edit.
- Movement log: stock in, out, and adjustments.

### Schedules
- Activities by group, day, room, and assigned staff.
- Table view and a week-style calendar view.

### Attendance
- Daily marking per group (present / absent / late / sick), with per-student notes.
- Per-student attendance history with a date filter.
- A closed day is archived and can no longer be edited.

### Staff
- Onboard staff, with or without a system login.
- Role management, restricted by rank (no one can grant or remove a role above their own).
- Deactivate and reactivate.

### Reports
A central screen with 7 tabs, each visible only to the roles allowed to see it:
- **Financial** - this month's pending and overdue charges, balances, and payments received.
- **Attendance** - per-student summary over a date range.
- **Notes** - full per-student notes history, with an edit audit trail.
- **Health** - allergies and medical notes by group.
- **Materials** - inventory movements.
- **Discounts** - every charge that currently has a discount applied.
- **Trash** - a unified view of deleted students, parents, materials, schedules, and staff, with restore (and a claim flow for archived parents).

### Account and preferences
- Login with six roles (super admin, owner, director, admin, finance, teacher); nav, routes, and actions adjust to the role.
- Separate dashboard for admin staff and for teachers.
- Light / dark / automatic theme (follows the system).
- Language: Spanish, English, and Swedish, with localized numbers and dates.

## Stack

- React + Vite + TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- react-i18next
- Tailwind CSS available (incremental adoption, not yet widespread)
- lucide-react

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```properties
VITE_API_BASE_URL=http://localhost:8080
```

3. Start the local backend (`backend-preschool` repo, separate from this one):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Needs a local MySQL on port 3306, or Docker Compose (see [`docs/docker.md`](docs/docker.md)) on port 3307.

4. Start the frontend:

```bash
npm run dev
```

Local frontend:

```text
http://localhost:5173
```

Local backend:

```text
http://localhost:8080
```

Backend Swagger:

```text
http://localhost:8080/swagger-ui/index.html
```

Recommended Node version:

```bash
nvm use
```

Commands:

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run preview
```

## CI

GitHub Actions validates every pull request and every push to `main` with:

```bash
npm ci
npm run lint
npm run test
npm run build
```

The workflow lives at `.github/workflows/frontend-ci.yml` and uses the Node version pinned in `.nvmrc`.

## Structure

```text
src/
  app/          router and providers
  api/          HTTP client and per-module endpoints
  auth/         login, session, protected routes, and roles
  layouts/      main shell
  dashboards/   internal dashboard
  modules/      per-module screens
  components/   shared components
  config/       environment variables
  types/        TypeScript contracts
```

## Documentation

- [Backend API reference](docs/backend-api-reference.md) - the complete backend contract this frontend relies on.
- [Frontend roadmap](docs/frontend-roadmap.md) - current state and next steps.
- [Development workflow](docs/development-workflow.md)
- [API integration](docs/api-integration.md)
- [CI and deployment](docs/ci-and-deployment.md)
- [Docker](docs/docker.md)
