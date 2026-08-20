import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Eye, ListFilter, Pencil, Plus, Search, UserCheck, UserCircle, UserX, X } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import {
  activateParent,
  createParent,
  deactivateParent,
  getParents,
  getParentStudents,
  updateParent,
} from '../../api/parents.api'
import type { ParentListItem, ParentRequest, ParentStatus } from '../../types/parents'
import { isForbiddenError } from '../../utils/apiErrors'

const emptyParents: ParentListItem[] = []

const statusLabels: Record<ParentStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const parentFormSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es obligatorio.'),
  lastName: z.string().trim().min(1, 'Los apellidos son obligatorios.'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || emailPattern.test(value), 'Ingresa un correo valido.'),
  phone: z.string(),
  address: z.string(),
  preferredLanguage: z.string(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  notes: z.string(),
  password: z
    .string()
    .refine((value) => value === '' || value.length >= 6, 'La contrasena debe tener al menos 6 caracteres.'),
})

type ParentFormValues = z.infer<typeof parentFormSchema>

function emptyFormValues(): ParentFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    preferredLanguage: '',
    status: 'ACTIVE',
    notes: '',
    password: '',
  }
}

function formValuesForParent(parent: ParentListItem): ParentFormValues {
  return {
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email ?? '',
    phone: parent.phone ?? '',
    address: parent.address ?? '',
    preferredLanguage: parent.preferredLanguage ?? '',
    status: parent.status,
    notes: parent.notes ?? '',
    password: '',
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function formatParentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

export function ParentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingParent, setEditingParent] = useState<ParentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [confirmingStatusParent, setConfirmingStatusParent] = useState<ParentListItem | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: emptyFormValues(),
  })
  const { data, error, isLoading } = useQuery({
    queryKey: ['parents'],
    queryFn: getParents,
    retry: false,
  })

  const saveParentMutation = useMutation({
    mutationFn: ({ parentId, request }: { parentId?: number; request: ParentRequest }) =>
      parentId ? updateParent(parentId, request) : createParent(request),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
      setSuccessMessage(
        variables.parentId ? 'Padre o tutor actualizado correctamente.' : 'Padre o tutor creado correctamente.',
      )
      setIsFormOpen(false)
      setEditingParent(null)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (parent: ParentListItem) =>
      parent.status === 'ACTIVE' ? deactivateParent(parent.parentId) : activateParent(parent.parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
      setConfirmingStatusParent(null)
    },
  })

  const parents = data ?? emptyParents

  const childrenQueries = useQueries({
    queries: parents.map((parent) => ({
      queryKey: ['parent-students', parent.parentId],
      queryFn: () => getParentStudents(parent.parentId),
      staleTime: 60_000,
    })),
  })

  const childrenCountByParentId = useMemo(() => {
    const map = new Map<number, number>()
    parents.forEach((parent, index) => {
      const students = childrenQueries[index]?.data
      if (students) {
        map.set(parent.parentId, students.length)
      }
    })
    return map
  }, [parents, childrenQueries])

  const filteredParents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return parents.filter((parent) => {
      const name = formatParentName(parent.firstName, parent.lastName).toLowerCase()
      const email = parent.email?.toLowerCase() ?? ''
      const phone = parent.phone?.toLowerCase() ?? ''

      return (
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        phone.includes(normalizedSearch)
      )
    })
  }, [parents, search])

  function openNewParentForm() {
    setEditingParent(null)
    reset(emptyFormValues())
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function openEditParentForm(parent: ParentListItem) {
    setEditingParent(parent)
    reset(formValuesForParent(parent))
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function closeParentForm() {
    setIsFormOpen(false)
    setEditingParent(null)
    saveParentMutation.reset()
  }

  const onSubmit = handleSubmit((values) => {
    const request: ParentRequest = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: optionalValue(values.email),
      phone: optionalValue(values.phone),
      address: optionalValue(values.address),
      preferredLanguage: optionalValue(values.preferredLanguage),
      status: values.status,
      notes: optionalValue(values.notes),
      password: optionalValue(values.password),
    }

    saveParentMutation.mutate({ parentId: editingParent?.parentId, request })
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Padres / Tutores</h2>
          <p>Administra la informacion de los padres o tutores.</p>
        </div>
        <button className="primary-button inline-button" onClick={openNewParentForm} type="button">
          <Plus size={17} aria-hidden="true" />
          Nuevo padre / tutor
        </button>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error)
            ? 'No tienes permiso para ver la lista de padres o tutores.'
            : 'No se pudo cargar la lista de padres o tutores.'}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="panel entity-form-panel" aria-labelledby="parent-form-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="parent-form-title">{editingParent ? 'Editar padre / tutor' : 'Nuevo padre / tutor'}</h3>
              <p>Completa los datos de contacto del responsable.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={saveParentMutation.isPending}
              onClick={closeParentForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                Nombre *
                <input maxLength={100} {...register('firstName')} />
                {formErrors.firstName ? (
                  <span className="field-error">{formErrors.firstName.message}</span>
                ) : null}
              </label>
              <label>
                Apellidos *
                <input maxLength={100} {...register('lastName')} />
                {formErrors.lastName ? <span className="field-error">{formErrors.lastName.message}</span> : null}
              </label>
              <label>
                Correo electronico
                <input maxLength={150} type="email" {...register('email')} />
                {formErrors.email ? <span className="field-error">{formErrors.email.message}</span> : null}
              </label>
              <label>
                Telefono
                <input maxLength={30} {...register('phone')} />
              </label>
              <label>
                Estado
                <select {...register('status')}>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Idioma preferido
                <input maxLength={20} placeholder="es" {...register('preferredLanguage')} />
              </label>
              <label className="entity-form-wide">
                Direccion
                <input maxLength={255} {...register('address')} />
              </label>
              {!editingParent ? (
                <label>
                  Contrasena de acceso
                  <input
                    autoComplete="new-password"
                    maxLength={100}
                    type="password"
                    {...register('password')}
                  />
                  {formErrors.password ? (
                    <span className="field-error">{formErrors.password.message}</span>
                  ) : (
                    <span className="field-hint">Opcional. Dejar vacio si no necesita acceso al portal.</span>
                  )}
                </label>
              ) : null}
              <label className="entity-form-full">
                Notas
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {saveParentMutation.error ? (
              <p className="form-error" role="alert">
                {saveParentMutation.error instanceof Error
                  ? saveParentMutation.error.message
                  : 'No se pudo guardar el padre o tutor.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveParentMutation.isPending}
                onClick={closeParentForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saveParentMutation.isPending} type="submit">
                {saveParentMutation.isPending
                  ? 'Guardando...'
                  : editingParent
                    ? 'Guardar cambios'
                    : 'Crear padre / tutor'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      <section className="filters-row filters-row-compact" aria-label="Filtros de padres o tutores">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar padre o tutor..."
            type="search"
            value={search}
          />
        </label>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          Filtros
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Correo electronico</th>
              <th>Hijos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredParents.map((parent) => {
              const statusLabel = statusLabels[parent.status] ?? parent.status

              return (
                <tr key={parent.parentId}>
                  <td>
                    <span className="name-cell">
                      <span className="student-avatar">
                        <UserCircle size={28} aria-hidden="true" />
                      </span>
                      {formatParentName(parent.firstName, parent.lastName)}
                    </span>
                  </td>
                  <td>{parent.phone ?? '-'}</td>
                  <td>{parent.email ?? '-'}</td>
                  <td>{childrenCountByParentId.get(parent.parentId) ?? '...'}</td>
                  <td>
                    <span
                      className={
                        parent.status === 'INACTIVE' ? 'status-badge status-danger' : 'status-badge'
                      }
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button title="Ver" type="button">
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button onClick={() => openEditParentForm(parent)} title="Editar" type="button">
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        disabled={toggleStatusMutation.isPending}
                        onClick={() => setConfirmingStatusParent(parent)}
                        title={parent.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                        type="button"
                      >
                        {parent.status === 'ACTIVE' ? (
                          <UserX size={16} aria-hidden="true" />
                        ) : (
                          <UserCheck size={16} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!isLoading && filteredParents.length === 0 ? (
              <tr>
                <td colSpan={6}>Sin padres o tutores para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredParents.length} de {parents.length} tutores
          </span>
          <div className="pagination">
            <button aria-label="Pagina anterior" type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button aria-label="Pagina siguiente" type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={confirmingStatusParent?.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
        description={
          confirmingStatusParent
            ? confirmingStatusParent.status === 'ACTIVE'
              ? `${formatParentName(confirmingStatusParent.firstName, confirmingStatusParent.lastName)} no podra acceder al portal ni aparecer como contacto activo hasta que lo reactives.`
              : `${formatParentName(confirmingStatusParent.firstName, confirmingStatusParent.lastName)} volvera a aparecer como contacto activo.`
            : ''
        }
        isConfirming={toggleStatusMutation.isPending}
        onCancel={() => setConfirmingStatusParent(null)}
        onConfirm={() => {
          if (confirmingStatusParent) {
            toggleStatusMutation.mutate(confirmingStatusParent)
          }
        }}
        open={confirmingStatusParent !== null}
        title={
          confirmingStatusParent?.status === 'ACTIVE'
            ? 'Desactivar a este padre o tutor?'
            : 'Activar a este padre o tutor?'
        }
      />
    </main>
  )
}