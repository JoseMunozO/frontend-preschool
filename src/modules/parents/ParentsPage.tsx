import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Archive,
  Eye,
  ListFilter,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserCircle,
  UserPlus,
  UserX,
  X,
} from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TrashPanel } from '../../components/ui/TrashPanel'
import { UndoToast } from '../../components/ui/UndoToast'
import { useAuthStore } from '../../auth/auth.store'
import { adminRoles } from '../../auth/roleAccess'
import {
  activateParent,
  claimParent,
  createParent,
  deactivateParent,
  deleteParent,
  getParents,
  getParentStudents,
  restoreParent,
  updateParent,
} from '../../api/parents.api'
import { ApiError } from '../../api/client'
import type { ParentListItem, ParentRequest, ParentStatus } from '../../types/parents'
import { isForbiddenError } from '../../utils/apiErrors'

const UNDO_WINDOW_MS = 8000

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

function claimFormValues(parent: ParentListItem): ParentFormValues {
  return {
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email ?? '',
    phone: '',
    address: '',
    preferredLanguage: '',
    status: 'ACTIVE',
    notes: '',
    password: '',
  }
}

function claimErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return 'Ya pasaron mas de 6 anios desde que se archivo: no se puede reclamar.'
  }

  if (error instanceof ApiError && error.status === 404) {
    return 'Este padre o tutor ya no esta archivado.'
  }

  return 'No se pudo reactivar al padre o tutor.'
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
  const canManage = useAuthStore((state) => state.hasAnyRole(adminRoles))
  const [search, setSearch] = useState('')
  const [editingParent, setEditingParent] = useState<ParentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [confirmingStatusParent, setConfirmingStatusParent] = useState<ParentListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ParentListItem | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deletedParent, setDeletedParent] = useState<ParentListItem | null>(null)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [isArchivedOpen, setIsArchivedOpen] = useState(false)
  const [claimTarget, setClaimTarget] = useState<ParentListItem | null>(null)
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
    queryFn: () => getParents(),
    retry: false,
  })

  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ['parents', 'trash'],
    queryFn: () => getParents({ includeDeleted: true }),
    enabled: isTrashOpen || isArchivedOpen,
  })

  useEffect(() => {
    if (!deletedParent) {
      return
    }

    const timeoutId = setTimeout(() => setDeletedParent(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timeoutId)
  }, [deletedParent])

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

  const deleteParentMutation = useMutation({
    mutationFn: (parentId: number) => deleteParent(parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
      setDeletedParent(deleteTarget)
      setDeleteTarget(null)
      setDeleteStep(1)
    },
  })

  const restoreParentMutation = useMutation({
    mutationFn: (parentId: number) => restoreParent(parentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
      setDeletedParent(null)
    },
  })

  const claimParentMutation = useMutation({
    mutationFn: ({ parentId, request }: { parentId: number; request: ParentRequest }) =>
      claimParent(parentId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parents'] })
      setSuccessMessage('Padre o tutor reactivado correctamente.')
      setIsFormOpen(false)
      setClaimTarget(null)
    },
  })

  const parents = data ?? emptyParents
  const trashedParents = (trashData ?? emptyParents).filter((parent) => parent.deletedAt && !parent.archivedAt)
  const archivedParents = (trashData ?? emptyParents).filter((parent) => parent.archivedAt)

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

  const filteredArchivedParents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return archivedParents.filter((parent) => {
      const name = formatParentName(parent.firstName, parent.lastName).toLowerCase()
      const email = parent.email?.toLowerCase() ?? ''

      return !normalizedSearch || name.includes(normalizedSearch) || email.includes(normalizedSearch)
    })
  }, [archivedParents, search])

  function openNewParentForm() {
    setEditingParent(null)
    setClaimTarget(null)
    reset(emptyFormValues())
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsArchivedOpen(false)
    setIsFormOpen(true)
  }

  function openEditParentForm(parent: ParentListItem) {
    setEditingParent(parent)
    setClaimTarget(null)
    reset(formValuesForParent(parent))
    saveParentMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsArchivedOpen(false)
    setIsFormOpen(true)
  }

  function openClaimForm(parent: ParentListItem) {
    setEditingParent(null)
    setClaimTarget(parent)
    reset(claimFormValues(parent))
    claimParentMutation.reset()
    setSuccessMessage(null)
    setIsArchivedOpen(false)
    setIsFormOpen(true)
  }

  function closeParentForm() {
    setIsFormOpen(false)
    setEditingParent(null)
    setClaimTarget(null)
    saveParentMutation.reset()
    claimParentMutation.reset()
  }

  function openDeleteConfirm(parent: ParentListItem) {
    setDeleteTarget(parent)
    setDeleteStep(1)
    deleteParentMutation.reset()
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setDeleteStep(1)
    deleteParentMutation.reset()
  }

  function openTrash() {
    setIsFormOpen(false)
    setIsArchivedOpen(false)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  function openArchived() {
    setIsFormOpen(false)
    setIsTrashOpen(false)
    setIsArchivedOpen(true)
  }

  function closeArchived() {
    setIsArchivedOpen(false)
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

    if (claimTarget) {
      claimParentMutation.mutate({ parentId: claimTarget.parentId, request })
      return
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
        {canManage ? (
          <div className="page-heading-actions">
            <button className="secondary-button" onClick={openArchived} type="button">
              <Archive size={17} aria-hidden="true" />
              Archivados
            </button>
            <button className="secondary-button" onClick={openTrash} type="button">
              <Trash2 size={17} aria-hidden="true" />
              Papelera
            </button>
            <button className="primary-button inline-button" onClick={openNewParentForm} type="button">
              <Plus size={17} aria-hidden="true" />
              Nuevo padre / tutor
            </button>
          </div>
        ) : null}
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
              <h3 id="parent-form-title">
                {claimTarget
                  ? 'Reactivar padre / tutor archivado'
                  : editingParent
                    ? 'Editar padre / tutor'
                    : 'Nuevo padre / tutor'}
              </h3>
              <p>
                {claimTarget
                  ? 'Nombre y correo ya estan guardados. Completa el resto de los datos de contacto para reactivarlo.'
                  : 'Completa los datos de contacto del responsable.'}
              </p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={saveParentMutation.isPending || claimParentMutation.isPending}
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
              {!editingParent && !claimTarget ? (
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
            {claimTarget && claimParentMutation.error ? (
              <p className="form-error" role="alert">
                {claimErrorMessage(claimParentMutation.error)}
              </p>
            ) : null}
            {!claimTarget && saveParentMutation.error ? (
              <p className="form-error" role="alert">
                {saveParentMutation.error instanceof Error
                  ? saveParentMutation.error.message
                  : 'No se pudo guardar el padre o tutor.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveParentMutation.isPending || claimParentMutation.isPending}
                onClick={closeParentForm}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={saveParentMutation.isPending || claimParentMutation.isPending}
                type="submit"
              >
                {claimTarget
                  ? claimParentMutation.isPending
                    ? 'Reactivando...'
                    : 'Reactivar padre / tutor'
                  : saveParentMutation.isPending
                    ? 'Guardando...'
                    : editingParent
                      ? 'Guardar cambios'
                      : 'Crear padre / tutor'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage="No hay padres o tutores eliminados recientemente."
          getDeletedAt={(parent) => parent.deletedAt}
          getId={(parent) => parent.parentId}
          getLabel={(parent) => formatParentName(parent.firstName, parent.lastName)}
          isLoading={isTrashLoading}
          items={trashedParents}
          onClose={closeTrash}
          onRestore={(parent) => restoreParentMutation.mutate(parent.parentId)}
          restoringId={restoreParentMutation.isPending ? restoreParentMutation.variables : null}
          title="Padres / tutores eliminados"
        />
      ) : null}

      {isArchivedOpen ? (
        <section className="panel trash-panel" aria-labelledby="archived-panel-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="archived-panel-title">Padres / tutores archivados</h3>
              <p>
                Familias que no restauraron a tiempo (mas de 7 dias). Solo se conserva nombre, correo y su
                cuenta de acceso; el resto de los datos se limpio. Se pueden reactivar hasta 6 anios despues
                de archivarse.
              </p>
            </div>
            <button aria-label="Cerrar archivados" className="icon-button" onClick={closeArchived} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {isTrashLoading ? <p>Cargando...</p> : null}

          {!isTrashLoading && filteredArchivedParents.length === 0 ? (
            <p>No hay padres o tutores archivados que coincidan con la busqueda.</p>
          ) : null}

          {!isTrashLoading && filteredArchivedParents.length > 0 ? (
            <ul className="trash-list">
              {filteredArchivedParents.map((parent) => (
                <li className="trash-list-item" key={parent.parentId}>
                  <div>
                    <strong>{formatParentName(parent.firstName, parent.lastName)}</strong>
                    <span className="field-hint">{parent.email ?? 'Sin correo'}</span>
                  </div>
                  <button className="secondary-button" onClick={() => openClaimForm(parent)} type="button">
                    <UserPlus size={16} aria-hidden="true" />
                    Reclamar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
                      {canManage ? (
                        <>
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
                          <button onClick={() => openDeleteConfirm(parent)} title="Eliminar" type="button">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </>
                      ) : null}
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

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={deleteStep === 1 ? 'Continuar' : 'Si, eliminar'}
        description={
          deleteTarget
            ? deleteStep === 1
              ? `Se eliminara a ${formatParentName(deleteTarget.firstName, deleteTarget.lastName)}. Vas a tener unos segundos para deshacerlo justo despues, y se puede restaurar manualmente hasta 7 dias.`
              : `Confirma que quieres eliminar a ${formatParentName(deleteTarget.firstName, deleteTarget.lastName)} ahora.`
            : ''
        }
        isConfirming={deleteParentMutation.isPending}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          if (deleteStep === 1) {
            setDeleteStep(2)
            return
          }

          if (deleteTarget) {
            deleteParentMutation.mutate(deleteTarget.parentId)
          }
        }}
        open={deleteTarget !== null}
        title={deleteStep === 1 ? 'Eliminar a este padre o tutor?' : 'Confirmar eliminacion'}
        variant="danger"
      />

      {deletedParent ? (
        <UndoToast
          isActing={restoreParentMutation.isPending}
          message={`${formatParentName(deletedParent.firstName, deletedParent.lastName)} fue eliminado.`}
          onAction={() => restoreParentMutation.mutate(deletedParent.parentId)}
          onDismiss={() => setDeletedParent(null)}
        />
      ) : null}
    </main>
  )
}