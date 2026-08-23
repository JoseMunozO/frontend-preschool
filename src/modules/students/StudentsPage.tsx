import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle, X } from 'lucide-react'
import {
  createStudent,
  createStudentEmergencyContact,
  createStudentNote,
  deleteStudent,
  deleteStudentEmergencyContact,
  deleteStudentNote,
  getStudentEmergencyContacts,
  getStudentNotes,
  getStudents,
  restoreStudent,
  updateStudent,
  updateStudentEmergencyContact,
  updateStudentNote,
} from '../../api/students.api'
import type {
  StudentEmergencyContact,
  StudentEmergencyContactRequest,
  StudentGuardianSummary,
  StudentListItem,
  StudentNote,
  StudentNoteRequest,
  StudentNoteType,
  StudentRequest,
  StudentStatus,
} from '../../api/students.api'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TrashPanel } from '../../components/ui/TrashPanel'
import { UndoToast } from '../../components/ui/UndoToast'
import { useAuthStore } from '../../auth/auth.store'
import { adminRoles } from '../../auth/roleAccess'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const UNDO_WINDOW_MS = 8000
const STUDENTS_PAGE_SIZE = 10

const emptyStudents: StudentListItem[] = []
const emptyContacts: StudentEmergencyContact[] = []
const emptyGuardians: StudentGuardianSummary[] = []
const emptyNotes: StudentNote[] = []

const noteTypeLabels: Record<StudentNoteType, string> = {
  PEDAGOGICAL: 'Pedagogico',
  BEHAVIOR: 'Comportamiento',
  INCIDENT: 'Incidente',
  HEALTH: 'Salud',
  FAMILY_FOLLOW_UP: 'Seguimiento familiar',
  ADMINISTRATIVE: 'Administrativo',
}

const statusLabels: Record<StudentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  graduated: 'Graduado',
}

const statusDangerValues = new Set(['inactive'])

const guardianRelationshipLabels: Record<StudentGuardianSummary['relationshipType'], string> = {
  FATHER: 'Padre',
  MOTHER: 'Madre',
  GUARDIAN: 'Tutor legal',
  RELATIVE: 'Familiar',
  OTHER: 'Otro',
}

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

const contactFormSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es obligatorio.'),
  relationship: z.string().trim().min(1, 'La relacion es obligatoria.'),
  phone: z.string().trim().min(1, 'El telefono es obligatorio.'),
  alternatePhone: z.string(),
  notes: z.string(),
  primary: z.boolean(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

function emptyContactValues(): ContactFormValues {
  return {
    fullName: '',
    relationship: '',
    phone: '',
    alternatePhone: '',
    notes: '',
    primary: false,
  }
}

function formValuesForContact(contact: StudentEmergencyContact): ContactFormValues {
  return {
    fullName: contact.fullName,
    relationship: contact.relationship,
    phone: contact.phone,
    alternatePhone: contact.alternatePhone ?? '',
    notes: contact.notes ?? '',
    primary: contact.primary,
  }
}

const noteFormSchema = z.object({
  noteType: z.enum(['PEDAGOGICAL', 'BEHAVIOR', 'INCIDENT', 'HEALTH', 'FAMILY_FOLLOW_UP', 'ADMINISTRATIVE']),
  content: z.string().trim().min(1, 'El comentario no puede estar vacio.'),
})

type NoteFormValues = z.infer<typeof noteFormSchema>

function emptyNoteValues(): NoteFormValues {
  return {
    noteType: 'PEDAGOGICAL',
    content: '',
  }
}

function formValuesForNote(note: StudentNote): NoteFormValues {
  return {
    noteType: note.noteType,
    content: note.content,
  }
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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
  const canManage = useAuthStore((state) => state.hasAnyRole(adminRoles))
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StudentStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [syncedPageFiltersKey, setSyncedPageFiltersKey] = useState('|all|ALL')
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deletedStudent, setDeletedStudent] = useState<StudentListItem | null>(null)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [contactsStudent, setContactsStudent] = useState<StudentListItem | null>(null)
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<StudentEmergencyContact | null>(null)
  const [deleteContactTarget, setDeleteContactTarget] = useState<StudentEmergencyContact | null>(null)
  const [noteFormOpen, setNoteFormOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<StudentNote | null>(null)
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<StudentNote | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: emptyFormValues(),
  })

  const {
    register: registerContact,
    handleSubmit: handleContactSubmit,
    reset: resetContactForm,
    formState: { errors: contactErrors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: emptyContactValues(),
  })

  const {
    register: registerNote,
    handleSubmit: handleNoteSubmit,
    reset: resetNoteForm,
    formState: { errors: noteErrors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: emptyNoteValues(),
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (!deletedStudent) {
      return
    }

    const timeoutId = setTimeout(() => setDeletedStudent(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timeoutId)
  }, [deletedStudent])

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

  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ['students', 'trash'],
    queryFn: () => getStudents({ includeDeleted: true }),
    enabled: isTrashOpen,
  })

  const {
    data: contactsData,
    error: contactsError,
    isLoading: isContactsLoading,
  } = useQuery({
    queryKey: ['students', contactsStudent?.studentId, 'emergency-contacts'],
    queryFn: () => getStudentEmergencyContacts(contactsStudent!.studentId),
    enabled: contactsStudent !== null,
  })

  const {
    data: notesData,
    error: notesError,
    isLoading: isNotesLoading,
  } = useQuery({
    queryKey: ['students', contactsStudent?.studentId, 'notes'],
    queryFn: () => getStudentNotes(contactsStudent!.studentId),
    enabled: contactsStudent !== null,
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

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: number) => deleteStudent(studentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students'] })
      setDeletedStudent(deleteTarget)
      setDeleteTarget(null)
      setDeleteStep(1)
    },
  })

  const restoreStudentMutation = useMutation({
    mutationFn: (studentId: number) => restoreStudent(studentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students'] })
      setDeletedStudent(null)
    },
  })

  const saveContactMutation = useMutation({
    mutationFn: ({
      contactId,
      request,
    }: {
      contactId?: number
      request: StudentEmergencyContactRequest
    }) => {
      if (!contactsStudent) {
        return Promise.reject(new Error('No hay un estudiante seleccionado.'))
      }

      return contactId
        ? updateStudentEmergencyContact(contactsStudent.studentId, contactId, request)
        : createStudentEmergencyContact(contactsStudent.studentId, request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['students', contactsStudent?.studentId, 'emergency-contacts'],
      })
      setContactFormOpen(false)
      setEditingContact(null)
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: number) => {
      if (!contactsStudent) {
        return Promise.reject(new Error('No hay un estudiante seleccionado.'))
      }

      return deleteStudentEmergencyContact(contactsStudent.studentId, contactId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['students', contactsStudent?.studentId, 'emergency-contacts'],
      })
      setDeleteContactTarget(null)
    },
  })

  const saveNoteMutation = useMutation({
    mutationFn: ({ noteId, request }: { noteId?: number; request: StudentNoteRequest }) => {
      if (!contactsStudent) {
        return Promise.reject(new Error('No hay un estudiante seleccionado.'))
      }

      return noteId
        ? updateStudentNote(contactsStudent.studentId, noteId, request)
        : createStudentNote(contactsStudent.studentId, request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['students', contactsStudent?.studentId, 'notes'],
      })
      setNoteFormOpen(false)
      setEditingNote(null)
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => {
      if (!contactsStudent) {
        return Promise.reject(new Error('No hay un estudiante seleccionado.'))
      }

      return deleteStudentNote(contactsStudent.studentId, noteId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['students', contactsStudent?.studentId, 'notes'],
      })
      setDeleteNoteTarget(null)
    },
  })

  const students = data ?? emptyStudents

  const pageFiltersKey = `${debouncedSearch}|${groupFilter}|${statusFilter}`
  if (pageFiltersKey !== syncedPageFiltersKey) {
    setSyncedPageFiltersKey(pageFiltersKey)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(students.length / STUDENTS_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedStudents = useMemo(
    () => students.slice((safePage - 1) * STUDENTS_PAGE_SIZE, safePage * STUDENTS_PAGE_SIZE),
    [students, safePage],
  )
  const rangeStart = students.length === 0 ? 0 : (safePage - 1) * STUDENTS_PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * STUDENTS_PAGE_SIZE, students.length)

  const allGroups = allGroupsData ?? emptyStudents
  const trashedStudents = (trashData ?? emptyStudents).filter((student) => student.deletedAt)
  const contacts = contactsData ?? emptyContacts
  const notes = notesData ?? emptyNotes
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
    [notes],
  )
  const guardians = contactsStudent?.guardians ?? emptyGuardians
  const sortedGuardians = useMemo(
    () => [...guardians].sort((a, b) => Number(b.primaryContact) - Number(a.primaryContact)),
    [guardians],
  )
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
    setIsTrashOpen(false)
    setContactsStudent(null)
    setIsFormOpen(true)
  }

  function openTrash() {
    setIsFormOpen(false)
    setContactsStudent(null)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  function openEditStudentForm(student: StudentListItem) {
    setEditingStudent(student)
    reset(formValuesForStudent(student))
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setContactsStudent(null)
    setIsFormOpen(true)
  }

  function openContactsPanel(student: StudentListItem) {
    setIsFormOpen(false)
    setIsTrashOpen(false)
    setContactFormOpen(false)
    setEditingContact(null)
    setContactsStudent(student)
  }

  function closeContactsPanel() {
    setContactsStudent(null)
    setContactFormOpen(false)
    setEditingContact(null)
    setNoteFormOpen(false)
    setEditingNote(null)
  }

  function openNewContactForm() {
    setEditingContact(null)
    resetContactForm(emptyContactValues())
    saveContactMutation.reset()
    setNoteFormOpen(false)
    setContactFormOpen(true)
  }

  function openEditContactForm(contact: StudentEmergencyContact) {
    setEditingContact(contact)
    resetContactForm(formValuesForContact(contact))
    saveContactMutation.reset()
    setNoteFormOpen(false)
    setContactFormOpen(true)
  }

  function closeContactForm() {
    setContactFormOpen(false)
    setEditingContact(null)
    saveContactMutation.reset()
  }

  function openNewNoteForm() {
    setEditingNote(null)
    resetNoteForm(emptyNoteValues())
    saveNoteMutation.reset()
    setContactFormOpen(false)
    setNoteFormOpen(true)
  }

  function openEditNoteForm(note: StudentNote) {
    setEditingNote(note)
    resetNoteForm(formValuesForNote(note))
    saveNoteMutation.reset()
    setContactFormOpen(false)
    setNoteFormOpen(true)
  }

  function closeNoteForm() {
    setNoteFormOpen(false)
    setEditingNote(null)
    saveNoteMutation.reset()
  }

  function closeStudentForm() {
    setIsFormOpen(false)
    setEditingStudent(null)
    saveStudentMutation.reset()
  }

  function openDeleteConfirm(student: StudentListItem) {
    setDeleteTarget(student)
    setDeleteStep(1)
    deleteStudentMutation.reset()
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setDeleteStep(1)
    deleteStudentMutation.reset()
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

  const onContactSubmit = handleContactSubmit((values) => {
    const request: StudentEmergencyContactRequest = {
      fullName: values.fullName,
      relationship: values.relationship,
      phone: values.phone,
      alternatePhone: optionalValue(values.alternatePhone),
      notes: optionalValue(values.notes),
      primary: values.primary,
    }

    saveContactMutation.mutate({ contactId: editingContact?.studentEmergencyContactId, request })
  })

  const onNoteSubmit = handleNoteSubmit((values) => {
    const request: StudentNoteRequest = {
      noteType: values.noteType,
      content: values.content,
    }

    saveNoteMutation.mutate({ noteId: editingNote?.studentNoteId, request })
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Estudiantes</h2>
          <p>Administra la informacion de los estudiantes.</p>
        </div>
        {canManage ? (
          <div className="page-heading-actions">
            <button className="secondary-button" onClick={openTrash} type="button">
              <Trash2 size={17} aria-hidden="true" />
              Papelera
            </button>
            <button className="primary-button inline-button" onClick={openNewStudentForm} type="button">
              <Plus size={17} aria-hidden="true" />
              Nuevo estudiante
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

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage="No hay estudiantes eliminados recientemente."
          getDeletedAt={(student) => student.deletedAt}
          getId={(student) => student.studentId}
          getLabel={(student) => formatStudentName(student.firstName, student.lastName)}
          isLoading={isTrashLoading}
          items={trashedStudents}
          onClose={closeTrash}
          onRestore={(student) => restoreStudentMutation.mutate(student.studentId)}
          restoringId={restoreStudentMutation.isPending ? restoreStudentMutation.variables : null}
          title="Estudiantes eliminados"
        />
      ) : null}

      {contactsStudent ? (
        <div className="dialog-overlay" onClick={closeContactsPanel} role="presentation">
          <section
            aria-labelledby="emergency-contacts-title"
            aria-modal="true"
            className="panel entity-form-panel dialog-panel-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
          <header className="form-panel-heading">
            <div>
              <h3 id="emergency-contacts-title">
                {contactFormOpen
                  ? editingContact
                    ? 'Editar contacto de emergencia'
                    : 'Nuevo contacto de emergencia'
                  : noteFormOpen
                    ? editingNote
                      ? 'Editar comentario'
                      : 'Nuevo comentario'
                    : formatStudentName(contactsStudent.firstName, contactsStudent.lastName)}
              </h3>
              {!contactFormOpen && !noteFormOpen ? (
                <p className="profile-summary">
                  {contactsStudent.groupName ? translateBackendSeed(contactsStudent.groupName) : 'Sin grupo'}
                  {' · '}
                  Nacimiento: {formatDate(contactsStudent.birthDate)}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Cerrar"
              className="icon-button"
              onClick={closeContactsPanel}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {!contactFormOpen && !noteFormOpen && (contactsStudent.allergies || contactsStudent.medicalNotes) ? (
            <div className="profile-summary">
              {contactsStudent.allergies ? (
                <p>
                  <strong>Alergias:</strong> {contactsStudent.allergies}
                </p>
              ) : null}
              {contactsStudent.medicalNotes ? (
                <p>
                  <strong>Notas medicas:</strong> {contactsStudent.medicalNotes}
                </p>
              ) : null}
            </div>
          ) : null}

          {contactFormOpen ? (
            <form className="entity-form" onSubmit={onContactSubmit}>
              <div className="entity-form-grid">
                <label>
                  Nombre completo *
                  <input maxLength={150} {...registerContact('fullName')} />
                  {contactErrors.fullName ? (
                    <span className="field-error">{contactErrors.fullName.message}</span>
                  ) : null}
                </label>
                <label>
                  Relacion *
                  <input maxLength={100} placeholder="Abuela, tio, vecino..." {...registerContact('relationship')} />
                  {contactErrors.relationship ? (
                    <span className="field-error">{contactErrors.relationship.message}</span>
                  ) : null}
                </label>
                <label>
                  Telefono *
                  <input maxLength={30} {...registerContact('phone')} />
                  {contactErrors.phone ? <span className="field-error">{contactErrors.phone.message}</span> : null}
                </label>
                <label>
                  Telefono alternativo
                  <input maxLength={30} {...registerContact('alternatePhone')} />
                </label>
                <label className="entity-form-full">
                  Notas
                  <textarea rows={2} {...registerContact('notes')} />
                </label>
                <label className="checkbox-field entity-form-full">
                  <input type="checkbox" {...registerContact('primary')} />
                  Contacto principal
                </label>
              </div>
              {saveContactMutation.error ? (
                <p className="form-error" role="alert">
                  {saveContactMutation.error instanceof Error
                    ? saveContactMutation.error.message
                    : 'No se pudo guardar el contacto.'}
                </p>
              ) : null}
              <footer className="form-actions">
                <button
                  className="secondary-button"
                  disabled={saveContactMutation.isPending}
                  onClick={closeContactForm}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={saveContactMutation.isPending} type="submit">
                  {saveContactMutation.isPending
                    ? 'Guardando...'
                    : editingContact
                      ? 'Guardar cambios'
                      : 'Agregar contacto'}
                </button>
              </footer>
            </form>
          ) : noteFormOpen ? (
            <form className="entity-form" onSubmit={onNoteSubmit}>
              <div className="entity-form-grid">
                <label>
                  Tipo *
                  <select {...registerNote('noteType')}>
                    {Object.entries(noteTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="entity-form-full">
                  Comentario *
                  <textarea rows={4} {...registerNote('content')} />
                  {noteErrors.content ? <span className="field-error">{noteErrors.content.message}</span> : null}
                </label>
              </div>
              {saveNoteMutation.error ? (
                <p className="form-error" role="alert">
                  {saveNoteMutation.error instanceof Error
                    ? saveNoteMutation.error.message
                    : 'No se pudo guardar el comentario.'}
                </p>
              ) : null}
              <footer className="form-actions">
                <button
                  className="secondary-button"
                  disabled={saveNoteMutation.isPending}
                  onClick={closeNoteForm}
                  type="button"
                >
                  Cancelar
                </button>
                <button className="primary-button" disabled={saveNoteMutation.isPending} type="submit">
                  {saveNoteMutation.isPending
                    ? 'Guardando...'
                    : editingNote
                      ? 'Guardar cambios'
                      : 'Agregar comentario'}
                </button>
              </footer>
            </form>
          ) : (
            <>
              <div className="panel-actions-row">
                <button className="secondary-button inline-button" onClick={openNewContactForm} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Agregar contacto
                </button>
              </div>
              {sortedGuardians.length > 0 ? (
                <>
                  <p className="panel-section-label">Tutores legales</p>
                  <ul className="contact-list">
                    {sortedGuardians.map((guardian) => (
                      <li className="contact-item" key={guardian.parentId}>
                        <div className="contact-item-header">
                          <span className="contact-item-title">
                            <strong>{guardian.parentName}</strong>
                            {guardian.primaryContact ? <span className="status-badge">Principal</span> : null}
                          </span>
                        </div>
                        <p className="field-hint">{guardianRelationshipLabels[guardian.relationshipType]}</p>
                        <p className="field-hint">
                          Tel: {guardian.phone ?? 'Sin telefono'}
                          {guardian.email ? ` / ${guardian.email}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="panel-section-label">Contactos adicionales</p>
                </>
              ) : null}
              {contactsError ? (
                <p className="notice">
                  {isForbiddenError(contactsError)
                    ? 'No tienes permiso para ver los contactos de emergencia.'
                    : 'No se pudieron cargar los contactos de emergencia.'}
                </p>
              ) : null}
              {isContactsLoading ? <p>Cargando...</p> : null}
              {!isContactsLoading && !contactsError && contacts.length === 0 ? (
                <p>Sin contactos de emergencia registrados.</p>
              ) : null}
              {!isContactsLoading && contacts.length > 0 ? (
                <ul className="contact-list">
                  {contacts.map((contact) => (
                    <li className="contact-item" key={contact.studentEmergencyContactId}>
                      <div className="contact-item-header">
                        <span className="contact-item-title">
                          <strong>{contact.fullName}</strong>
                          {contact.primary ? <span className="status-badge">Principal</span> : null}
                        </span>
                        <div className="row-actions">
                          <button onClick={() => openEditContactForm(contact)} title="Editar" type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeleteContactTarget(contact)}
                            title="Eliminar"
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <p className="field-hint">{contact.relationship}</p>
                      <p className="field-hint">
                        Tel: {contact.phone}
                        {contact.alternatePhone ? ` / ${contact.alternatePhone}` : ''}
                      </p>
                      {contact.notes ? <p className="field-hint">{contact.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="panel-section-label">Comentarios</p>
              <div className="panel-actions-row">
                <button className="secondary-button inline-button" onClick={openNewNoteForm} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Agregar comentario
                </button>
              </div>
              {notesError ? (
                <p className="notice">
                  {isForbiddenError(notesError)
                    ? 'No tienes permiso para ver los comentarios.'
                    : 'No se pudieron cargar los comentarios.'}
                </p>
              ) : null}
              {isNotesLoading ? <p>Cargando...</p> : null}
              {!isNotesLoading && !notesError && sortedNotes.length === 0 ? (
                <p>Sin comentarios registrados.</p>
              ) : null}
              {!isNotesLoading && sortedNotes.length > 0 ? (
                <ul className="contact-list">
                  {sortedNotes.map((note) => (
                    <li className="contact-item" key={note.studentNoteId}>
                      <div className="contact-item-header">
                        <span className="contact-item-title">
                          <strong>{noteTypeLabels[note.noteType]}</strong>
                          <span className="field-hint">{formatDateTime(note.createdAt)}</span>
                        </span>
                        <div className="row-actions">
                          <button onClick={() => openEditNoteForm(note)} title="Editar" type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button onClick={() => setDeleteNoteTarget(note)} title="Eliminar" type="button">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <p className="field-hint">{note.authorEmail}</p>
                      <p>{note.content}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          </section>
        </div>
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
            {pagedStudents.map((student) => {
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
                      <button
                        onClick={() => openContactsPanel(student)}
                        title="Ver contactos de emergencia"
                        type="button"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      {canManage ? (
                        <>
                          <button onClick={() => openEditStudentForm(student)} title="Editar" type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button onClick={() => openDeleteConfirm(student)} title="Eliminar" type="button">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </>
                      ) : null}
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
          <span>
            {students.length === 0
              ? 'Mostrando 0 estudiantes'
              : `Mostrando ${rangeStart}-${rangeEnd} de ${students.length} estudiantes`}
          </span>
          <div className="pagination">
            <button
              aria-label="Pagina anterior"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              type="button"
            >
              {'<'}
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={pageNumber === safePage ? 'active' : undefined}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label="Pagina siguiente"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              type="button"
            >
              {'>'}
            </button>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={deleteStep === 1 ? 'Continuar' : 'Si, eliminar'}
        description={
          deleteTarget
            ? deleteStep === 1
              ? `Se eliminara a ${formatStudentName(deleteTarget.firstName, deleteTarget.lastName)}. Vas a tener unos segundos para deshacerlo justo despues, y se puede restaurar manualmente hasta 7 dias.`
              : `Confirma que quieres eliminar a ${formatStudentName(deleteTarget.firstName, deleteTarget.lastName)} ahora.`
            : ''
        }
        isConfirming={deleteStudentMutation.isPending}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          if (deleteStep === 1) {
            setDeleteStep(2)
            return
          }

          if (deleteTarget) {
            deleteStudentMutation.mutate(deleteTarget.studentId)
          }
        }}
        open={deleteTarget !== null}
        title={deleteStep === 1 ? 'Eliminar a este estudiante?' : 'Confirmar eliminacion'}
        variant="danger"
      />

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Si, eliminar"
        description={
          deleteContactTarget
            ? `Se eliminara el contacto ${deleteContactTarget.fullName}. Esta accion no se puede deshacer.`
            : ''
        }
        isConfirming={deleteContactMutation.isPending}
        onCancel={() => setDeleteContactTarget(null)}
        onConfirm={() => {
          if (deleteContactTarget) {
            deleteContactMutation.mutate(deleteContactTarget.studentEmergencyContactId)
          }
        }}
        open={deleteContactTarget !== null}
        title="Eliminar contacto de emergencia?"
        variant="danger"
      />

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Si, eliminar"
        description="Se eliminara este comentario. Esta accion no se puede deshacer."
        isConfirming={deleteNoteMutation.isPending}
        onCancel={() => setDeleteNoteTarget(null)}
        onConfirm={() => {
          if (deleteNoteTarget) {
            deleteNoteMutation.mutate(deleteNoteTarget.studentNoteId)
          }
        }}
        open={deleteNoteTarget !== null}
        title="Eliminar este comentario?"
        variant="danger"
      />

      {deletedStudent ? (
        <UndoToast
          isActing={restoreStudentMutation.isPending}
          message={`${formatStudentName(deletedStudent.firstName, deletedStudent.lastName)} fue eliminado.`}
          onAction={() => restoreStudentMutation.mutate(deletedStudent.studentId)}
          onDismiss={() => setDeletedStudent(null)}
        />
      ) : null}
    </main>
  )
}
