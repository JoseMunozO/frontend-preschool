# Frontend start plan

Guia para iniciar el frontend React del proyecto Preschool Admin.

El backend actual vive en:

```text
/Volumes/KINGSTON/backend-preschool
```

El frontend recomendado debe vivir en una carpeta separada:

```text
/Volumes/KINGSTON/frontend-preschool
```

Esta guia esta pensada para el preescolar actual, pero deja la estructura preparada para una futura version institucional.

## Decision recomendada

Usar dos proyectos separados:

```text
KINGSTON/
  backend-preschool/
  frontend-preschool/
```

Ventajas:

- Backend y frontend pueden evolucionar de forma independiente.
- El frontend se puede desplegar separado del backend.
- Es mas cercano a una estructura profesional.
- Permite crear despues apps moviles o paneles externos sin mezclar codigo.
- Facilita vender la app a instituciones mas grandes en el futuro.

Desventaja:

- Hay que mantener documentadas las URLs, variables de entorno y contratos API.

## GitHub

Para GitHub hay dos opciones.

### Opcion recomendada ahora

Crear un repo nuevo:

```text
frontend-preschool
```

Y mantener:

```text
backend-preschool
frontend-preschool
```

Esto es lo mas limpio para una app que quiere crecer. Cada repo tendra su propio README, issues, commits, branches y despliegue.

### Opcion aceptable si quieres ir mas rapido

Mantener el frontend solo como carpeta local por ahora y crear el repo mas adelante.

No es lo ideal si ya vas a trabajar seriamente con React, porque perderias historial de commits del frontend.

Recomendacion final: crear repo nuevo en GitHub para `frontend-preschool`.

## Stack frontend

Stack recomendado:

- React
- Vite
- TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Tailwind CSS
- lucide-react

Crear proyecto:

```bash
cd /Volumes/KINGSTON
npm create vite@latest frontend-preschool -- --template react-ts
cd frontend-preschool
npm install
npm install react-router-dom @tanstack/react-query zustand react-hook-form zod lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

Comandos esperados:

```bash
npm run dev
npm run build
npm run preview
```

## Variables de entorno

Crear en el frontend:

```text
frontend-preschool/.env.local
```

Contenido:

```properties
VITE_API_BASE_URL=http://localhost:8080
```

Regla:

- Nunca hardcodear `http://localhost:8080` dentro de componentes.
- Siempre usar `import.meta.env.VITE_API_BASE_URL`.

## Backend local

Arrancar backend:

```bash
cd /Volumes/KINGSTON/backend-preschool
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Validar backend:

```bash
API_SMOKE_READ_ONLY=true node scripts/api-smoke-test.mjs
```

Resultado esperado actual:

```text
Summary: 59 passed, 0 failed, 7 skipped
```

## Estructura recomendada del frontend

```text
frontend-preschool/
  src/
    app/
      App.tsx
      router.tsx
      providers.tsx
    api/
      client.ts
      auth.api.ts
      dashboard.api.ts
      students.api.ts
      parents.api.ts
      payments.api.ts
      materials.api.ts
      schedules.api.ts
      users.api.ts
      roles.api.ts
    auth/
      LoginPage.tsx
      auth.store.ts
      ProtectedRoute.tsx
      roleAccess.ts
    layouts/
      AppLayout.tsx
      Sidebar.tsx
      Topbar.tsx
    dashboards/
      TeacherDashboard.tsx
      AdminDashboard.tsx
      FinanceDashboard.tsx
    modules/
      students/
      parents/
      payments/
      materials/
      schedules/
      users/
    components/
      ui/
      feedback/
      data/
    config/
      env.ts
    types/
      auth.ts
      dashboard.ts
      students.ts
      parents.ts
      payments.ts
      materials.ts
      schedules.ts
      users.ts
      roles.ts
    main.tsx
```

## Orden de implementacion

### Fase 1 - Shell de administracion

- Crear proyecto React.
- Crear `api/client.ts`.
- Crear login.
- Guardar JWT y roles.
- Crear rutas protegidas.
- Crear layout principal con sidebar y topbar.
- Crear dashboard por rol.
- Crear logout.

### Fase 2 - Modulos de lectura

- Estudiantes.
- Padres/tutores.
- Pagos.
- Materiales.
- Horarios.

### Fase 3 - Formularios

- Crear/editar estudiante.
- Crear/editar tutor.
- Crear cargos.
- Registrar pagos.
- Crear/editar materiales.
- Registrar movimientos de material.
- Crear/editar horarios.

### Fase 4 - Pulido

- Estados de carga.
- Estados vacios.
- Errores de API.
- Confirmaciones.
- Filtros.
- Busquedas.
- Responsive.

## Roles del backend

Roles actuales/futuros relevantes para frontend:

```ts
export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DIRECTOR"
  | "TEACHER"
  | "FINANCE"
  | "PARENT";
```

Reglas generales:

- `SUPER_ADMIN`: acceso maximo.
- `ADMIN`: acceso administrativo completo.
- `DIRECTOR`: acceso de direccion.
- `TEACHER`: dashboard docente, estudiantes, horarios y materiales en lectura.
- `FINANCE`: pagos, cargos, materiales en lectura y dashboard financiero.
- `PARENT`: portal familiar, no dashboard interno.

## Dashboard por rol

Endpoints activos:

```text
GET /api/dashboard/teacher-summary
GET /api/dashboard/admin-summary
GET /api/dashboard/finance-summary
```

Permisos backend:

| Endpoint | Roles |
| --- | --- |
| `/api/dashboard/teacher-summary` | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| `/api/dashboard/admin-summary` | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| `/api/dashboard/finance-summary` | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `FINANCE` |

Regla frontend:

- Si el usuario tiene `ADMIN`, `SUPER_ADMIN` o `DIRECTOR`, mostrar dashboard administrativo y financiero.
- Si solo tiene `TEACHER`, mostrar dashboard docente.
- Si solo tiene `FINANCE`, mostrar dashboard financiero.
- Si tiene `PARENT`, no entrar al dashboard interno.

## Cliente HTTP base

Archivo:

```text
src/api/client.ts
```

Ejemplo recomendado:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "message" in data
      ? String((data as { message: unknown }).message)
      : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}
```

## Auth

### Login

```text
POST /api/auth/login
```

Request:

```ts
export type LoginRequest = {
  email: string;
  password: string;
};
```

Response:

```ts
export type AuthResponse = {
  token: string;
  email: string;
  roles: string[];
};
```

Fetch:

```ts
export function login(request: LoginRequest) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: request,
  });
}
```

Auth storage recomendado:

- Guardar `token`, `email`, `roles` en Zustand.
- Persistir en `localStorage`.
- En logout borrar el store y redirigir a `/login`.

## Tipos base compartidos

```ts
export type ISODate = string;
export type ISODateTime = string;
export type LocalTime = string;

export type StudentStatus = "active" | "inactive" | "pending" | "graduated";
export type ParentStatus = "ACTIVE" | "INACTIVE";
export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED" | "PENDING_ACTIVATION";
export type MaterialStatus = "ACTIVE" | "ARCHIVED";
export type MaterialMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type StudentChargeStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" | "OVERDUE";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "SWISH" | "OTHER";
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
```

Nota: si algun enum no coincide al 100% con respuesta real, ajustar el tipo desde el primer fetch fallido.

## Dashboard types

```ts
export type DashboardScheduleItem = {
  scheduleSlotId: number;
  groupId: number;
  groupName: string;
  primaryStaffId: number | null;
  primaryStaffName: string | null;
  dayOfWeek: DayOfWeek;
  startTime: LocalTime;
  endTime: LocalTime;
  activityTitle: string;
  roomName: string | null;
};

export type DashboardBirthday = {
  studentId: number;
  studentName: string;
  birthDate: ISODate;
  nextBirthday: ISODate;
  daysUntilBirthday: number;
};

export type DashboardMaterialAlert = {
  materialId: number;
  sku: string | null;
  name: string;
  category: string | null;
  quantityOnHand: number;
  minimumQuantity: number;
  shortage: number;
};

export type DashboardTeacherSummary = {
  date: ISODate;
  activeStudents: number;
  todayScheduleSlots: number;
  lowStockMaterials: number;
  todaySchedule: DashboardScheduleItem[];
  upcomingBirthdays: DashboardBirthday[];
  lowStockMaterialAlerts: DashboardMaterialAlert[];
};

export type DashboardAdminSummary = {
  date: ISODate;
  totalStudents: number;
  activeStudents: number;
  totalParents: number;
  activeParents: number;
  totalMaterials: number;
  lowStockMaterials: number;
  todayScheduleSlots: number;
  lowStockMaterialAlerts: DashboardMaterialAlert[];
  todaySchedule: DashboardScheduleItem[];
  upcomingBirthdays: DashboardBirthday[];
};

export type DashboardFinanceSummary = {
  date: ISODate;
  month: string;
  pendingCharges: number;
  overdueCharges: number;
  pendingBalance: number;
  overdueBalance: number;
  monthPaymentsReceived: number;
};
```

Dashboard API:

```ts
export function getTeacherDashboard(token: string) {
  return apiRequest<DashboardTeacherSummary>("/api/dashboard/teacher-summary", { token });
}

export function getAdminDashboard(token: string) {
  return apiRequest<DashboardAdminSummary>("/api/dashboard/admin-summary", { token });
}

export function getFinanceDashboard(token: string) {
  return apiRequest<DashboardFinanceSummary>("/api/dashboard/finance-summary", { token });
}
```

## Students API

Base:

```text
/api/students
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/students` | Listar estudiantes |
| GET | `/api/students/{id}` | Obtener estudiante |
| GET | `/api/students/{id}/guardians` | Tutores del estudiante |
| GET | `/api/students/{id}/notes` | Notas/comentarios del estudiante |
| GET | `/api/students/{id}/consents` | Consentimientos del estudiante |
| POST | `/api/students` | Crear estudiante |
| POST | `/api/students/{id}/notes` | Crear nota/comentario |
| POST | `/api/students/{id}/consents` | Registrar consentimiento |
| PUT | `/api/students/{id}` | Actualizar estudiante |
| PUT | `/api/students/{id}/profile-photo` | Asignar URL de foto de perfil, requiere consentimiento activo `IMAGE_PROFILE_PHOTO` |
| PUT | `/api/students/{id}/notes/{noteId}` | Actualizar nota/comentario |
| PATCH | `/api/students/{id}/notes/{noteId}/moderate` | Marcar nota como moderada |
| PATCH | `/api/students/{id}/consents/{consentId}/revoke` | Revocar consentimiento |
| DELETE | `/api/students/{id}/profile-photo` | Quitar foto de perfil |
| DELETE | `/api/students/{id}/notes/{noteId}` | Eliminar nota/comentario |
| DELETE | `/api/students/{id}` | Eliminar estudiante |

Permisos de notas:

- `SUPER_ADMIN`, `ADMIN` y `DIRECTOR` pueden revisar, crear, moderar, actualizar y eliminar notas de cualquier estudiante.
- `TEACHER` puede revisar, crear, moderar, actualizar y eliminar notas solo si tiene una asignacion activa al grupo del estudiante.
- `PARENT` no puede acceder a notas internas.

Permisos de consentimientos:

- `SUPER_ADMIN`, `ADMIN` y `DIRECTOR` pueden revisar consentimientos y registrarlos/revocarlos para cualquier tutor vinculado al estudiante. Al crear desde administracion, `parentId` es requerido.
- `TEACHER` puede revisar consentimientos solo si tiene una asignacion activa al grupo del estudiante.
- `PARENT` puede revisar, aceptar y revocar solo sus propios consentimientos para estudiantes vinculados.

Types:

```ts
export type Student = {
  studentId: number;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  birthDate: ISODate;
  groupId: number | null;
  groupName: string | null;
  status: StudentStatus;
  enrollmentDate: ISODate;
  withdrawalDate: ISODate | null;
  medicalNotes: string | null;
  allergies: string | null;
  notes: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type StudentRequest = {
  studentCode?: string | null;
  firstName: string;
  lastName: string;
  birthDate: ISODate;
  groupId?: number | null;
  status?: StudentStatus | null;
  enrollmentDate: ISODate;
  withdrawalDate?: ISODate | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  notes?: string | null;
};

export type StudentProfilePhotoRequest = {
  profilePhotoUrl: string;
};

export type StudentNoteType =
  | "PEDAGOGICAL"
  | "BEHAVIOR"
  | "INCIDENT"
  | "HEALTH"
  | "FAMILY_FOLLOW_UP"
  | "ADMINISTRATIVE";

export type StudentNote = {
  studentNoteId: number;
  studentId: number;
  studentName: string;
  authorUserId: number;
  authorEmail: string;
  noteType: StudentNoteType;
  content: string;
  moderated: boolean;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type StudentNoteRequest = {
  noteType: StudentNoteType;
  content: string;
};

export type StudentConsentType =
  | "IMAGE_PROFILE_PHOTO"
  | "PHOTO_ALBUM"
  | "INTERNAL_DOCUMENTATION"
  | "MARKETING_PUBLICATION";

export type StudentConsent = {
  studentConsentId: number;
  studentId: number;
  studentName: string;
  parentId: number;
  parentName: string;
  recordedByUserId: number;
  recordedByEmail: string;
  consentType: StudentConsentType;
  granted: boolean;
  active: boolean;
  notes: string | null;
  acceptedAt: ISODateTime | null;
  revokedAt: ISODateTime | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type StudentConsentRequest = {
  parentId?: number | null;
  consentType: StudentConsentType;
  notes?: string | null;
};
```

## Photo Albums API

Base:

```text
/api/photo-albums
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/photo-albums?groupId=&studentId=` | Listar albumes visibles para el usuario |
| GET | `/api/photo-albums/{albumId}` | Obtener album con fotos |
| POST | `/api/photo-albums` | Crear album |
| PUT | `/api/photo-albums/{albumId}` | Actualizar album |
| DELETE | `/api/photo-albums/{albumId}` | Desactivar album |
| POST | `/api/photo-albums/{albumId}/photos` | Agregar foto por URL |
| PATCH | `/api/photo-albums/{albumId}/photos/{photoId}/approve` | Aprobar foto |
| DELETE | `/api/photo-albums/{albumId}/photos/{photoId}` | Eliminar foto |

Permisos:

- `SUPER_ADMIN`, `ADMIN` y `DIRECTOR` pueden revisar, crear, aprobar y eliminar cualquier album/foto.
- `TEACHER` puede revisar, crear, aprobar y eliminar albumes/fotos solo de grupos o estudiantes bajo su asignacion activa.
- `PARENT` no tiene acceso a albumes internos en esta version.
- Si el album o foto esta asociado a un estudiante, debe existir consentimiento activo `PHOTO_ALBUM`.

Types:

```ts
export type PhotoAlbum = {
  photoAlbumId: number;
  title: string;
  description: string | null;
  groupId: number | null;
  groupName: string | null;
  studentId: number | null;
  studentName: string | null;
  createdByUserId: number;
  createdByEmail: string;
  eventDate: ISODate | null;
  active: boolean;
  photos: PhotoAlbumPhoto[];
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type PhotoAlbumRequest = {
  title: string;
  description?: string | null;
  groupId?: number | null;
  studentId?: number | null;
  eventDate?: ISODate | null;
};

export type PhotoAlbumPhoto = {
  photoAlbumPhotoId: number;
  photoAlbumId: number;
  studentId: number | null;
  studentName: string | null;
  uploadedByUserId: number;
  uploadedByEmail: string;
  photoUrl: string;
  caption: string | null;
  approved: boolean;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type PhotoAlbumPhotoRequest = {
  studentId?: number | null;
  photoUrl: string;
  caption?: string | null;
};
```

## Parents API

Base:

```text
/api/parents
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/parents?status=&search=` | Listar/buscar tutores |
| GET | `/api/parents/me` | Perfil del tutor actual |
| GET | `/api/parents/me/students` | Estudiantes del tutor actual |
| GET | `/api/parents/{parentId}` | Obtener tutor |
| POST | `/api/parents` | Crear tutor |
| PUT | `/api/parents/{parentId}` | Actualizar tutor |
| PATCH | `/api/parents/{parentId}/activate` | Activar tutor |
| PATCH | `/api/parents/{parentId}/deactivate` | Desactivar tutor |
| GET | `/api/parents/{parentId}/students` | Estudiantes vinculados |
| POST | `/api/parents/{parentId}/students` | Vincular estudiante |
| DELETE | `/api/parents/{parentId}/students/{studentId}` | Desvincular estudiante |

Types:

```ts
export type Parent = {
  parentId: number;
  userId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  preferredLanguage: string | null;
  status: ParentStatus;
  notes: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type ParentRequest = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  preferredLanguage?: string | null;
  status?: ParentStatus | null;
  notes?: string | null;
  password?: string | null;
};

export type StudentGuardian = {
  studentId: number;
  studentName: string;
  parentId: number;
  parentName: string;
  relationshipType: string;
  primaryContact: boolean;
  billingContact: boolean;
  authorizedPickup: boolean;
  livesWithStudent: boolean;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};
```

## Payments API

Base:

```text
/api/payments
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/payments/charge-types?activeOnly=true` | Tipos de cargo |
| GET | `/api/payments/charges?studentId=&status=&month=YYYY-MM` | Cargos |
| GET | `/api/payments/charges/{studentChargeId}` | Obtener cargo |
| POST | `/api/payments/charges` | Crear cargo |
| GET | `/api/payments/me` | Pagos del padre actual |
| GET | `/api/payments/me/charges` | Cargos del padre actual |
| GET | `/api/payments?parentId=&dateFrom=&dateTo=` | Pagos |
| GET | `/api/payments/{paymentId}` | Obtener pago |
| GET | `/api/payments/students/{studentId}` | Pagos por estudiante |
| POST | `/api/payments` | Crear pago |

Types:

```ts
export type StudentCharge = {
  studentChargeId: number;
  studentId: number;
  studentName: string;
  chargeTypeId: number;
  chargeTypeCode: string;
  chargeTypeName: string;
  dueDate: ISODate;
  billingPeriodStart: ISODate | null;
  billingPeriodEnd: ISODate | null;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: StudentChargeStatus;
  description: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type StudentChargeRequest = {
  studentId: number;
  chargeTypeId: number;
  dueDate: ISODate;
  billingPeriodStart?: ISODate | null;
  billingPeriodEnd?: ISODate | null;
  amountDue: number;
  status?: StudentChargeStatus | null;
  description?: string | null;
};

export type Payment = {
  paymentId: number;
  parentId: number | null;
  parentName: string | null;
  receivedByStaffId: number | null;
  receivedByStaffName: string | null;
  paymentDate: ISODate;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
  allocations: PaymentAllocation[];
};

export type PaymentAllocation = {
  paymentAllocationId: number;
  studentChargeId: number;
  studentId: number;
  studentName: string;
  amountAllocated: number;
  createdAt: ISODateTime | null;
};
```

## Materials API

Base:

```text
/api/materials
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/materials?search=&category=&status=&lowStock=` | Listar/buscar materiales |
| GET | `/api/materials/low-stock` | Materiales con stock bajo |
| GET | `/api/materials/{materialId}` | Obtener material |
| POST | `/api/materials` | Crear material |
| PUT | `/api/materials/{materialId}` | Actualizar material |
| GET | `/api/materials/movements?materialId=` | Movimientos |
| POST | `/api/materials/{materialId}/movements` | Registrar movimiento |

Types:

```ts
export type Material = {
  materialId: number;
  sku: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  quantityOnHand: number;
  minimumQuantity: number;
  lowStock: boolean;
  status: MaterialStatus;
  notes: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type MaterialRequest = {
  sku?: string | null;
  name: string;
  category?: string | null;
  unit?: string | null;
  quantityOnHand: number;
  minimumQuantity: number;
  status?: MaterialStatus | null;
  notes?: string | null;
};

export type MaterialMovement = {
  materialMovementId: number;
  materialId: number;
  materialName: string;
  movementType: MaterialMovementType;
  quantity: number;
  movementDate: ISODateTime;
  performedByUserId: number | null;
  performedByEmail: string | null;
  notes: string | null;
  createdAt: ISODateTime | null;
};
```

## Schedules API

Base:

```text
/api/schedules
```

Endpoints:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/schedules?groupId=&dayOfWeek=` | Listar horarios |
| GET | `/api/schedules/{scheduleSlotId}` | Obtener actividad |
| GET | `/api/schedules/groups/{groupId}` | Horarios por grupo |
| GET | `/api/schedules/days/{dayOfWeek}` | Horarios por dia |
| GET | `/api/schedules/groups/{groupId}/days/{dayOfWeek}` | Horarios por grupo y dia |
| POST | `/api/schedules` | Crear actividad |
| PUT | `/api/schedules/{scheduleSlotId}` | Actualizar actividad |
| PUT | `/api/schedules/{scheduleSlotId}/primary-staff/{staffId}` | Asignar responsable |
| GET | `/api/schedules/staff-assignments?groupId=&staffId=` | Asignaciones |
| POST | `/api/schedules/staff-assignments` | Crear asignacion |

Types:

```ts
export type ScheduleSlot = {
  scheduleSlotId: number;
  groupId: number;
  groupName: string;
  primaryStaffId: number | null;
  primaryStaffName: string | null;
  dayOfWeek: DayOfWeek;
  startTime: LocalTime;
  endTime: LocalTime;
  activityTitle: string;
  roomName: string | null;
  notes: string | null;
  createdAt: ISODateTime | null;
  updatedAt: ISODateTime | null;
};

export type ScheduleSlotRequest = {
  groupId: number;
  primaryStaffId?: number | null;
  dayOfWeek: DayOfWeek;
  startTime: LocalTime;
  endTime: LocalTime;
  activityTitle: string;
  roomName?: string | null;
  notes?: string | null;
};

export type StaffGroupAssignment = {
  staffGroupAssignmentId: number;
  staffId: number;
  staffName: string;
  groupId: number;
  groupName: string;
  roleInGroup: string;
  primary: boolean;
  startDate: ISODate;
  endDate: ISODate | null;
  createdAt: ISODateTime | null;
};
```

## Users and roles API

Users:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/users?status=&search=` | Listar/buscar usuarios |
| GET | `/api/users/{userId}` | Obtener usuario |
| POST | `/api/users` | Crear usuario |
| PUT | `/api/users/{userId}` | Actualizar usuario |
| POST | `/api/users/{userId}/roles` | Asignar rol |
| DELETE | `/api/users/{userId}/roles` | Quitar rol |
| PATCH | `/api/users/{userId}/deactivate` | Desactivar usuario |
| PATCH | `/api/users/{userId}/activate` | Activar usuario |
| PATCH | `/api/users/{userId}/status` | Cambiar estado |

Roles:

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/roles` | Listar roles |
| GET | `/api/roles/{code}` | Obtener rol por codigo |

## Permisos por modulo

Resumen segun `SecurityConfig` actual:

| Modulo | Roles |
| --- | --- |
| Auth | Publico para login |
| Teacher dashboard | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| Admin dashboard | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| Finance dashboard | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `FINANCE` |
| Students | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| Schedules | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| Parents admin | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| Parent self portal | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `PARENT` |
| Users | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| Roles | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| Payments admin | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `FINANCE` |
| Parent payments self portal | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `FINANCE`, `PARENT` |
| Materials read | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER`, `FINANCE` |
| Materials write | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |

## Rutas frontend iniciales

```text
/login
/app
/app/dashboard
/app/students
/app/parents
/app/payments
/app/materials
/app/schedules
/app/users
```

Regla:

- `/app/dashboard` decide que dashboard renderizar segun roles.
- Si el usuario no tiene rol valido, mostrar pantalla `403`.
- Si no hay token, redirigir a `/login`.

## Navegacion por roles

Menu sugerido:

| Item | Roles |
| --- | --- |
| Dashboard | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER`, `FINANCE` |
| Estudiantes | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| Padres/Tutores | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |
| Pagos | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `FINANCE` |
| Materiales | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER`, `FINANCE` |
| Horarios | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR`, `TEACHER` |
| Usuarios | `SUPER_ADMIN`, `ADMIN`, `DIRECTOR` |

## TanStack Query naming

Usar keys estables:

```ts
["dashboard", "teacher"]
["dashboard", "admin"]
["dashboard", "finance"]
["students"]
["students", studentId]
["parents", filters]
["payments", filters]
["materials", filters]
["schedules", filters]
```

## Manejo de errores

Reglas UI:

- `401`: borrar sesion y redirigir a login.
- `403`: mostrar pantalla "No tienes permiso".
- `404`: mostrar "No encontrado".
- `400`: mostrar mensaje de validacion.
- error de red: mostrar "No se pudo conectar con el servidor".

El backend suele responder errores como:

```json
{
  "message": "Texto del error"
}
```

## CORS

Si el frontend en Vite corre en:

```text
http://localhost:5173
```

y el backend en:

```text
http://localhost:8080
```

puede ser necesario configurar CORS en backend. Si aparece error de CORS en navegador, crear un branch backend separado:

```bash
chore/configure-local-cors
```

Origen local esperado:

```text
http://localhost:5173
```

## Checklist antes de empezar frontend

- [ ] Backend mergeado y actualizado.
- [ ] Smoke read-only pasando.
- [ ] Repo `frontend-preschool` creado en GitHub.
- [ ] Proyecto React creado con Vite.
- [ ] `.env.local` creado.
- [ ] Login conectado.
- [ ] Token guardado.
- [ ] Rutas protegidas.
- [ ] Dashboard por rol conectado.

## Primer commit recomendado en frontend

```bash
git add .
git commit -m "chore: scaffold react admin frontend"
git push
```

## Primer branch frontend recomendado

```bash
feature/admin-shell
```

Objetivo:

- Login.
- App layout.
- Protected routes.
- Dashboard por rol.
- Logout.

No incluir todavia todos los CRUDs. Primero construir una base estable.
