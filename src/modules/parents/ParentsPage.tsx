import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, ListFilter, Pencil, Plus, Search, UserCheck, UserCircle, UserX, X } from 'lucide-react'
import {
  activateParent,
  createParent,
  deactivateParent,
  getParents,
  getParentStudents,
  updateParent,
} from '../../api/parents.api'
import type { ParentListItem, ParentRequest, ParentStatus } from '../../types/parents'

const emptyParents: ParentListItem[] = []

const statusLabels: Record<ParentStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
}

type ParentFormValues = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  preferredLanguage: string
  status: ParentStatus
  notes: string
  password: string
}

type ParentFormErrors = Partial<Record<keyof ParentFormValues, string>>

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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateParent(values: ParentFormValues) {
  const errors: ParentFormErrors = {}

  if (!values.firstName.trim()) {
    errors.firstName = 'El nombre es obligatorio.'
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Los apellidos son obligatorios.'
  }

  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = 'Ingresa un correo valido.'
  }

  if (values.password && values.password.length < 6) {
    errors.password = 'La contrasena debe tener al menos 6 caracteres.'
  }

  return errors
}

function formatParentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

export function ParentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingParent, setEditingParent] = useState<ParentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<ParentFormValues>(emptyFormValues)
  const [formErrors, setFormErrors] = useState<ParentFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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
      setFormErrors({})
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (parent: ParentListItem) =>
      parent.status === 'ACTIVE' ? deactivateParent(parent.parentId) : activateParent(parent.parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
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
    setFormValues(emptyFormValues())
    setFormErrors({})
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function openEditParentForm(parent: ParentListItem) {
    setEditingParent(parent)
    setFormValues(formValuesForParent(parent))
    setFormErrors({})
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function closeParentForm() {
    setIsFormOpen(false)
    setEditingParent(null)
    setFormErrors({})
    saveParentMutation.reset()
  }

  function updateField<Key extends keyof ParentFormValues>(key: Key, value: ParentFormValues[Key]) {
    setFormValues((currentValues) => ({ ...currentValues, [key]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateParent(formValues)

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const request: ParentRequest = {
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      email: optionalValue(formValues.email),
      phone: optionalValue(formValues.phone),
      address: optionalValue(formValues.address),
      preferredLanguage: optionalValue(formValues.preferredLanguage),
      status: formValues.status,
      notes: optionalValue(formValues.notes),
      password: optionalValue(formValues.password),
    }

    saveParentMutation.mutate({ parentId: editingParent?.parentId, request })
  }

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
      {error ? <div className="notice">No se pudo cargar la lista de padres o tutores.</div> : null}

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
          <form className="entity-form" onSubmit={handleSubmit}>
            <div className="entity-form-grid">
              <label>
                Nombre *
                <input
                  maxLength={100}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  value={formValues.firstName}
                />
                {formErrors.firstName ? <span className="field-error">{formErrors.firstName}</span> : null}
              </label>
              <label>
                Apellidos *
                <input
                  maxLength={100}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  value={formValues.lastName}
                />
                {formErrors.lastName ? <span className="field-error">{formErrors.lastName}</span> : null}
              </label>
              <label>
                Correo electronico
                <input
                  maxLength={150}
                  onChange={(event) => updateField('email', event.target.value)}
                  type="email"
                  value={formValues.email}
                />
                {formErrors.email ? <span className="field-error">{formErrors.email}</span> : null}
              </label>
              <label>
                Telefono
                <input
                  maxLength={30}
                  onChange={(event) => updateField('phone', event.target.value)}
                  value={formValues.phone}
                />
              </label>
              <label>
                Estado
                <select
                  onChange={(event) => updateField('status', event.target.value as ParentStatus)}
                  value={formValues.status}
                >
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Idioma preferido
                <input
                  maxLength={20}
                  onChange={(event) => updateField('preferredLanguage', event.target.value)}
                  placeholder="es"
                  value={formValues.preferredLanguage}
                />
              </label>
              <label className="entity-form-wide">
                Direccion
                <input
                  maxLength={255}
                  onChange={(event) => updateField('address', event.target.value)}
                  value={formValues.address}
                />
              </label>
              {!editingParent ? (
                <label>
                  Contrasena de acceso
                  <input
                    autoComplete="new-password"
                    maxLength={100}
                    onChange={(event) => updateField('password', event.target.value)}
                    type="password"
                    value={formValues.password}
                  />
                  {formErrors.password ? (
                    <span className="field-error">{formErrors.password}</span>
                  ) : (
                    <span className="field-hint">Opcional. Dejar vacio si no necesita acceso al portal.</span>
                  )}
                </label>
              ) : null}
              <label className="entity-form-full">
                Notas
                <textarea
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={2}
                  value={formValues.notes}
                />
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
                        onClick={() => toggleStatusMutation.mutate(parent)}
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
    </main>
  )
}