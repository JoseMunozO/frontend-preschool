import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle, X } from 'lucide-react'
import { createStudent, getStudents, updateStudent } from '../../api/students.api'
import type { StudentListItem, StudentRequest, StudentStatus } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyStudents: StudentListItem[] = []

const statusLabels: Record<StudentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  graduated: 'Graduado',
}

const statusDangerValues = new Set(['inactive'])

const studentFormSchema = z
  .object({
    studentCode: z.string(),
    firstName: z.string().trim().min(1, 'El nombre es obligatorio.'),
    lastName: z.string().trim().min(1, 'Los apellidos son obligatorios.'),
    birthDate: z.string().min(1, 'La fecha de nacimiento es obligatoria.'),
    groupId: z.string(),
    status: z.enum(['active', 'inactive', 'pending', 'graduated']),
    enrollmentDate: z.string().min(1, 'La fecha de ingreso es obligatoria.'),
    withdrawalDate: z.string(),
    medicalNotes: z.string(),
    allergies: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.birthDate && values.enrollmentDate && values.birthDate > values.enrollmentDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fecha de ingreso debe ser posterior al nacimiento.',
        path: ['enrollmentDate'],
      })
    }

    if (values.withdrawalDate && values.enrollmentDate && values.withdrawalDate < values.enrollmentDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'La fecha de baja debe ser posterior al ingreso.',
        path: ['withdrawalDate'],
      })
    }
  })

type StudentFormValues = z.infer<typeof studentFormSchema>

function todayInputValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function emptyFormValues(): StudentFormValues {
  return {
    studentCode: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    groupId: '',
    status: 'active',
    enrollmentDate: todayInputValue(),
    withdrawalDate: '',
    medicalNotes: '',
    allergies: '',
    notes: '',
  }
}

function formValuesForStudent(student: StudentListItem): StudentFormValues {
  return {
    studentCode: student.studentCode ?? '',
    firstName: student.firstName,
    lastName: student.lastName,
    birthDate: student.birthDate,
    groupId: student.groupId ? String(student.groupId) : '',
    status: student.status,
    enrollmentDate: student.enrollmentDate ?? todayInputValue(),
    withdrawalDate: student.withdrawalDate ?? '',
    medicalNotes: student.medicalNotes ?? '',
    allergies: student.allergies ?? '',
    notes: student.notes ?? '',
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function formatStudentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function StudentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'ALL'>('ALL')
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: emptyFormValues(),
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  const { data, error, isLoading } = useQuery({
    queryKey: ['students', { search: debouncedSearch, groupId: groupFilter, status: statusFilter }],
    queryFn: () =>
      getStudents({
        search: debouncedSearch || undefined,
        groupId: groupFilter === 'all' ? undefined : groupFilter,
        status: statusFilter,
      }),
    retry: false,
  })

  const { data: allGroupsData } = useQuery({
    queryKey: ['students', 'groups-lookup'],
    queryFn: () => getStudents(),
    staleTime: Infinity,
  })
  const saveStudentMutation = useMutation({
    mutationFn: ({
      studentId,
      request,
    }: {
      studentId?: number
      request: StudentRequest
    }) => (studentId ? updateStudent(studentId, request) : createStudent(request)),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['students'] })
      setSuccessMessage(
        variables.studentId ? 'Estudiante actualizado correctamente.' : 'Estudiante creado correctamente.',
      )
      setIsFormOpen(false)
      setEditingStudent(null)
    },
  })

  const students = data ?? emptyStudents
  const allGroups = allGroupsData ?? emptyStudents
  const formGroups = useMemo(
    () =>
      Array.from(
        new Map(
          allGroups.flatMap((student) =>
            student.groupId && student.groupName ? [[student.groupId, student.groupName]] : [],
          ),
        ),
      ).sort(([, firstName], [, secondName]) => firstName.localeCompare(secondName)),
    [allGroups],
  )

  function openNewStudentForm() {
    setEditingStudent(null)
    reset(emptyFormValues())
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function openEditStudentForm(student: StudentListItem) {
    setEditingStudent(student)
    reset(formValuesForStudent(student))
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function closeStudentForm() {
    setIsFormOpen(false)
    setEditingStudent(null)
    saveStudentMutation.reset()
  }

  const onSubmit = handleSubmit((values) => {
    const request: StudentRequest = {
      studentCode: optionalValue(values.studentCode),
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate,
      groupId: values.groupId ? Number(values.groupId) : undefined,
      status: values.status,
      enrollmentDate: values.enrollmentDate,
      withdrawalDate: optionalValue(values.withdrawalDate),
      medicalNotes: optionalValue(values.medicalNotes),
      allergies: optionalValue(values.allergies),
      notes: optionalValue(values.notes),
    }

    saveStudentMutation.mutate({ studentId: editingStudent?.studentId, request })
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Estudiantes</h2>
          <p>Administra la informacion de los estudiantes.</p>
        </div>
        <button className="primary-button inline-button" onClick={openNewStudentForm} type="button">
          <Plus size={17} aria-hidden="true" />
          Nuevo estudiante
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
            ? 'No tienes permiso para ver la lista de estudiantes.'
            : 'No se pudo cargar la lista de estudiantes.'}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="panel entity-form-panel" aria-labelledby="student-form-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="student-form-title">
                {editingStudent ? 'Editar estudiante' : 'Nuevo estudiante'}
              </h3>
              <p>Completa los datos administrativos basicos.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={saveStudentMutation.isPending}
              onClick={closeStudentForm}
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
                Codigo
                <input maxLength={50} {...register('studentCode')} />
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
                Fecha de nacimiento *
                <input type="date" {...register('birthDate')} />
                {formErrors.birthDate ? <span className="field-error">{formErrors.birthDate.message}</span> : null}
              </label>
              <label>
                Fecha de ingreso *
                <input type="date" {...register('enrollmentDate')} />
                {formErrors.enrollmentDate ? (
                  <span className="field-error">{formErrors.enrollmentDate.message}</span>
                ) : null}
              </label>
              <label>
                Grupo
                <select {...register('groupId')}>
                  <option value="">Sin grupo asignado</option>
                  {formGroups.map(([groupId, groupName]) => (
                    <option key={groupId} value={groupId}>
                      {translateBackendSeed(groupName)}
                    </option>
                  ))}
                </select>
                <span className="field-hint">Se muestran los grupos ya presentes en estudiantes.</span>
              </label>
              <label>
                Fecha de baja
                <input type="date" {...register('withdrawalDate')} />
                {formErrors.withdrawalDate ? (
                  <span className="field-error">{formErrors.withdrawalDate.message}</span>
                ) : null}
              </label>
              <label className="entity-form-wide">
                Alergias
                <textarea rows={2} {...register('allergies')} />
              </label>
              <label className="entity-form-wide">
                Notas medicas
                <textarea rows={2} {...register('medicalNotes')} />
              </label>
              <label className="entity-form-full">
                Observaciones
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {saveStudentMutation.error ? (
              <p className="form-error" role="alert">
                {saveStudentMutation.error instanceof Error
                  ? saveStudentMutation.error.message
                  : 'No se pudo guardar el estudiante.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveStudentMutation.isPending}
                onClick={closeStudentForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saveStudentMutation.isPending} type="submit">
                {saveStudentMutation.isPending
                  ? 'Guardando...'
                  : editingStudent
                    ? 'Guardar cambios'
                    : 'Crear estudiante'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      <section className="filters-row" aria-label="Filtros de estudiantes">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar estudiante..."
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Grupo"
          onChange={(event) => setGroupFilter(event.target.value)}
          value={groupFilter}
        >
          <option value="all">Todos los grupos</option>
          {formGroups.map(([groupId, groupName]) => (
            <option key={groupId} value={groupId}>
              {translateBackendSeed(groupName)}
            </option>
          ))}
        </select>
        <select
          aria-label="Estado"
          onChange={(event) => setStatusFilter(event.target.value as StudentStatus | 'ALL')}
          value={statusFilter}
        >
          <option value="ALL">Todos los estados</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          Filtros
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nombre</th>
              <th>Fecha de nacimiento</th>
              <th>Grupo</th>
              <th>Padre / Tutor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const statusLabel = statusLabels[student.status] ?? student.status

              return (
                <tr key={student.studentId}>
                  <td>
                    <span className="student-avatar">
                      {student.profilePhotoUrl ? (
                        <img src={student.profilePhotoUrl} alt="" />
                      ) : (
                        <UserCircle size={28} aria-hidden="true" />
                      )}
                    </span>
                  </td>
                  <td>{formatStudentName(student.firstName, student.lastName)}</td>
                  <td>{formatDate(student.birthDate)}</td>
                  <td>
                    {student.groupName ? translateBackendSeed(student.groupName) : student.groupId ?? '-'}
                  </td>
                  <td>{student.primaryGuardianName ?? 'Sin tutor principal'}</td>
                  <td>
                    <span
                      className={
                        statusDangerValues.has(student.status)
                          ? 'status-badge status-danger'
                          : 'status-badge'
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
                      <button onClick={() => openEditStudentForm(student)} title="Editar" type="button">
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button title="Eliminar" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!isLoading && students.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin estudiantes para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>Mostrando {students.length} estudiantes</span>
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
