import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle, X } from 'lucide-react'
import { createStudent, getStudents, updateStudent } from '../../api/students.api'
import type { StudentListItem, StudentRequest, StudentStatus } from '../../api/students.api'
import { translateBackendSeed } from '../../utils/displayText'

const emptyStudents: StudentListItem[] = []

const statusLabels: Record<StudentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  graduated: 'Graduado',
}

const statusDangerValues = new Set(['inactive'])

type StudentFormValues = {
  studentCode: string
  firstName: string
  lastName: string
  birthDate: string
  groupId: string
  status: StudentStatus
  enrollmentDate: string
  withdrawalDate: string
  medicalNotes: string
  allergies: string
  notes: string
}

type StudentFormErrors = Partial<Record<keyof StudentFormValues, string>>

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

function validateStudent(values: StudentFormValues) {
  const errors: StudentFormErrors = {}

  if (!values.firstName.trim()) {
    errors.firstName = 'El nombre es obligatorio.'
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Los apellidos son obligatorios.'
  }

  if (!values.birthDate) {
    errors.birthDate = 'La fecha de nacimiento es obligatoria.'
  }

  if (!values.enrollmentDate) {
    errors.enrollmentDate = 'La fecha de ingreso es obligatoria.'
  }

  if (values.birthDate && values.enrollmentDate && values.birthDate > values.enrollmentDate) {
    errors.enrollmentDate = 'La fecha de ingreso debe ser posterior al nacimiento.'
  }

  if (values.withdrawalDate && values.enrollmentDate && values.withdrawalDate < values.enrollmentDate) {
    errors.withdrawalDate = 'La fecha de baja debe ser posterior al ingreso.'
  }

  return errors
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
  const [groupFilter, setGroupFilter] = useState('all')
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<StudentFormValues>(emptyFormValues)
  const [formErrors, setFormErrors] = useState<StudentFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { data, error, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    retry: false,
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
      setFormErrors({})
    },
  })

  const students = data ?? emptyStudents
  const formGroups = useMemo(
    () =>
      Array.from(
        new Map(
          students.flatMap((student) =>
            student.groupId && student.groupName ? [[student.groupId, student.groupName]] : [],
          ),
        ),
      ).sort(([, firstName], [, secondName]) => firstName.localeCompare(secondName)),
    [students],
  )
  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          students.flatMap((student) => (student.groupName ? [student.groupName] : [])),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [students],
  )
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return students.filter((student) => {
      const name = formatStudentName(student.firstName, student.lastName).toLowerCase()
      const code = student.studentCode?.toLowerCase() ?? ''
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || code.includes(normalizedSearch)
      const matchesGroup = groupFilter === 'all' || student.groupName === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [groupFilter, search, students])

  function openNewStudentForm() {
    setEditingStudent(null)
    setFormValues(emptyFormValues())
    setFormErrors({})
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function openEditStudentForm(student: StudentListItem) {
    setEditingStudent(student)
    setFormValues(formValuesForStudent(student))
    setFormErrors({})
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function closeStudentForm() {
    setIsFormOpen(false)
    setEditingStudent(null)
    setFormErrors({})
    saveStudentMutation.reset()
  }

  function updateField<Key extends keyof StudentFormValues>(key: Key, value: StudentFormValues[Key]) {
    setFormValues((currentValues) => ({ ...currentValues, [key]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateStudent(formValues)

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const request: StudentRequest = {
      studentCode: optionalValue(formValues.studentCode),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      birthDate: formValues.birthDate,
      groupId: formValues.groupId ? Number(formValues.groupId) : undefined,
      status: formValues.status,
      enrollmentDate: formValues.enrollmentDate,
      withdrawalDate: optionalValue(formValues.withdrawalDate),
      medicalNotes: optionalValue(formValues.medicalNotes),
      allergies: optionalValue(formValues.allergies),
      notes: optionalValue(formValues.notes),
    }

    saveStudentMutation.mutate({ studentId: editingStudent?.studentId, request })
  }

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
      {error ? <div className="notice">No se pudo cargar la lista de estudiantes.</div> : null}

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
                Codigo
                <input
                  maxLength={50}
                  onChange={(event) => updateField('studentCode', event.target.value)}
                  value={formValues.studentCode}
                />
              </label>
              <label>
                Estado
                <select
                  onChange={(event) => updateField('status', event.target.value as StudentStatus)}
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
                Fecha de nacimiento *
                <input
                  onChange={(event) => updateField('birthDate', event.target.value)}
                  type="date"
                  value={formValues.birthDate}
                />
                {formErrors.birthDate ? <span className="field-error">{formErrors.birthDate}</span> : null}
              </label>
              <label>
                Fecha de ingreso *
                <input
                  onChange={(event) => updateField('enrollmentDate', event.target.value)}
                  type="date"
                  value={formValues.enrollmentDate}
                />
                {formErrors.enrollmentDate ? (
                  <span className="field-error">{formErrors.enrollmentDate}</span>
                ) : null}
              </label>
              <label>
                Grupo
                <select
                  onChange={(event) => updateField('groupId', event.target.value)}
                  value={formValues.groupId}
                >
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
                <input
                  onChange={(event) => updateField('withdrawalDate', event.target.value)}
                  type="date"
                  value={formValues.withdrawalDate}
                />
                {formErrors.withdrawalDate ? (
                  <span className="field-error">{formErrors.withdrawalDate}</span>
                ) : null}
              </label>
              <label className="entity-form-wide">
                Alergias
                <textarea
                  onChange={(event) => updateField('allergies', event.target.value)}
                  rows={2}
                  value={formValues.allergies}
                />
              </label>
              <label className="entity-form-wide">
                Notas medicas
                <textarea
                  onChange={(event) => updateField('medicalNotes', event.target.value)}
                  rows={2}
                  value={formValues.medicalNotes}
                />
              </label>
              <label className="entity-form-full">
                Observaciones
                <textarea
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={2}
                  value={formValues.notes}
                />
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
          {groups.map((groupName) => (
            <option key={groupName} value={groupName}>
              {translateBackendSeed(groupName)}
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
            {filteredStudents.map((student) => {
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
            {!isLoading && filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin estudiantes para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredStudents.length} de {students.length} estudiantes
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
