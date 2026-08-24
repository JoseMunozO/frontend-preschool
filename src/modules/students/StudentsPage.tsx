import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { Eye, ListFilter, Pencil, Percent, Plus, Search, Trash2, UserCircle, X } from 'lucide-react'
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
import { StudentDiscountsPanel } from '../../components/ui/StudentDiscountsPanel'
import { UndoToast } from '../../components/ui/UndoToast'
import { useAuthStore } from '../../auth/auth.store'
import { adminRoles, financeRoles } from '../../auth/roleAccess'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'
import { createStudentFormSchema } from './students.schema'
import type { StudentFormValues } from './students.schema'

const UNDO_WINDOW_MS = 8000
const STUDENTS_PAGE_SIZE = 10

const emptyStudents: StudentListItem[] = []
const emptyContacts: StudentEmergencyContact[] = []
const emptyGuardians: StudentGuardianSummary[] = []
const emptyNotes: StudentNote[] = []

const statusDangerValues = new Set(['inactive'])

function todayInputValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function nextStudentCode(students: StudentListItem[]): string {
  let bestPrefix = ''
  let bestWidth = 0
  let bestNumber = -1

  students.forEach((student) => {
    const match = student.studentCode ? /^(.*?)(\d+)$/.exec(student.studentCode) : null

    if (!match) {
      return
    }

    const [, prefix, digits] = match
    const number = Number(digits)

    if (number > bestNumber) {
      bestNumber = number
      bestPrefix = prefix
      bestWidth = digits.length
    }
  })

  if (bestNumber < 0) {
    return ''
  }

  return `${bestPrefix}${String(bestNumber + 1).padStart(bestWidth, '0')}`
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

function createContactFormSchema(t: TFunction) {
  return z.object({
    fullName: z.string().trim().min(1, t('students.contactFullNameRequired')),
    relationship: z.string().trim().min(1, t('students.contactRelationshipRequired')),
    phone: z.string().trim().min(1, t('students.contactPhoneRequired')),
    alternatePhone: z.string(),
    notes: z.string(),
    primary: z.boolean(),
  })
}

type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>

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

function createNoteFormSchema(t: TFunction) {
  return z.object({
    noteType: z.enum(['PEDAGOGICAL', 'BEHAVIOR', 'INCIDENT', 'HEALTH', 'FAMILY_FOLLOW_UP', 'ADMINISTRATIVE']),
    content: z.string().trim().min(1, t('students.noteContentRequired')),
  })
}

type NoteFormValues = z.infer<ReturnType<typeof createNoteFormSchema>>

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

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale, {
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

function formatDate(value: string | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function StudentsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const noteTypeLabels: Record<StudentNoteType, string> = {
    PEDAGOGICAL: t('students.noteTypePedagogical'),
    BEHAVIOR: t('students.noteTypeBehavior'),
    INCIDENT: t('students.noteTypeIncident'),
    HEALTH: t('students.noteTypeHealth'),
    FAMILY_FOLLOW_UP: t('students.noteTypeFamilyFollowUp'),
    ADMINISTRATIVE: t('students.noteTypeAdministrative'),
  }
  const statusLabels: Record<StudentStatus, string> = {
    active: t('students.statusActive'),
    inactive: t('students.statusInactive'),
    pending: t('students.statusPending'),
    graduated: t('students.statusGraduated'),
  }
  const guardianRelationshipLabels: Record<StudentGuardianSummary['relationshipType'], string> = {
    FATHER: t('students.relationFather'),
    MOTHER: t('students.relationMother'),
    GUARDIAN: t('students.relationGuardian'),
    RELATIVE: t('students.relationRelative'),
    OTHER: t('students.relationOther'),
  }
  const studentFormSchema = useMemo(() => createStudentFormSchema(t), [t])
  const contactFormSchema = useMemo(() => createContactFormSchema(t), [t])
  const noteFormSchema = useMemo(() => createNoteFormSchema(t), [t])
  const queryClient = useQueryClient()
  const canManage = useAuthStore((state) => state.hasAnyRole(adminRoles))
  const canViewDiscounts = useAuthStore((state) => state.hasAnyRole(financeRoles))
  const currentUserEmail = useAuthStore((state) => state.session?.user.email)
  const [isDiscountsPanelOpen, setIsDiscountsPanelOpen] = useState(false)
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
        variables.studentId ? t('students.updateSuccess') : t('students.createSuccess'),
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
        return Promise.reject(new Error(t('students.noStudentSelectedError')))
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
        return Promise.reject(new Error(t('students.noStudentSelectedError')))
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
        return Promise.reject(new Error(t('students.noStudentSelectedError')))
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
        return Promise.reject(new Error(t('students.noStudentSelectedError')))
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
    reset({ ...emptyFormValues(), studentCode: nextStudentCode(allGroups) })
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setContactsStudent(null)
    setIsFormOpen(true)
  }

  function openEditStudentForm(student: StudentListItem) {
    setEditingStudent(student)
    reset(formValuesForStudent(student))
    saveStudentMutation.reset()
    setSuccessMessage(null)
    setContactsStudent(null)
    setIsFormOpen(true)
  }

  function openContactsPanel(student: StudentListItem) {
    setIsFormOpen(false)
    setContactFormOpen(false)
    setEditingContact(null)
    setIsDiscountsPanelOpen(false)
    setContactsStudent(student)
  }

  function closeContactsPanel() {
    setContactsStudent(null)
    setContactFormOpen(false)
    setEditingContact(null)
    setNoteFormOpen(false)
    setEditingNote(null)
    setIsDiscountsPanelOpen(false)
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
          <h2>{t('students.title')}</h2>
          <p>{t('students.subtitle')}</p>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('students.forbiddenList') : t('students.loadError')}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="dialog-overlay" onClick={closeStudentForm} role="presentation">
        <section
          aria-labelledby="student-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="student-form-title">
                {editingStudent ? t('students.editStudentTitle') : t('students.newStudentTitle')}
              </h3>
              <p>{t('students.formSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
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
                {t('students.firstNameLabel')}
                <input maxLength={100} {...register('firstName')} />
                {formErrors.firstName ? (
                  <span className="field-error">{formErrors.firstName.message}</span>
                ) : null}
              </label>
              <label>
                {t('students.lastNameLabel')}
                <input maxLength={100} {...register('lastName')} />
                {formErrors.lastName ? <span className="field-error">{formErrors.lastName.message}</span> : null}
              </label>
              <label>
                {t('students.codeLabel')}
                <input maxLength={50} readOnly {...register('studentCode')} />
                <span className="field-hint">{t('students.codeHint')}</span>
              </label>
              <label>
                {t('students.statusLabel')}
                <select {...register('status')}>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('students.birthDateLabel')}
                <input type="date" {...register('birthDate')} />
                {formErrors.birthDate ? <span className="field-error">{formErrors.birthDate.message}</span> : null}
              </label>
              <label>
                {t('students.enrollmentDateLabel')}
                <input type="date" {...register('enrollmentDate')} />
                {formErrors.enrollmentDate ? (
                  <span className="field-error">{formErrors.enrollmentDate.message}</span>
                ) : null}
              </label>
              <label>
                {t('students.groupLabel')}
                <select {...register('groupId')}>
                  <option value="">{t('students.noGroupAssigned')}</option>
                  {formGroups.map(([groupId, groupName]) => (
                    <option key={groupId} value={groupId}>
                      {translateBackendSeed(groupName)}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{t('students.groupsHint')}</span>
              </label>
              <label>
                {t('students.withdrawalDateLabel')}
                <input type="date" {...register('withdrawalDate')} />
                {formErrors.withdrawalDate ? (
                  <span className="field-error">{formErrors.withdrawalDate.message}</span>
                ) : null}
              </label>
              <label className="entity-form-wide">
                {t('students.allergiesLabel')}
                <textarea rows={2} {...register('allergies')} />
              </label>
              <label className="entity-form-wide">
                {t('students.medicalNotesLabel')}
                <textarea rows={2} {...register('medicalNotes')} />
              </label>
              <label className="entity-form-full">
                {t('students.observationsLabel')}
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {saveStudentMutation.error ? (
              <p className="form-error" role="alert">
                {saveStudentMutation.error instanceof Error
                  ? saveStudentMutation.error.message
                  : t('students.saveStudentError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveStudentMutation.isPending}
                onClick={closeStudentForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={saveStudentMutation.isPending} type="submit">
                {saveStudentMutation.isPending
                  ? t('common.saving')
                  : editingStudent
                    ? t('students.saveChanges')
                    : t('students.createStudent')}
              </button>
            </footer>
          </form>
        </section>
        </div>
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
                    ? t('students.editContactTitle')
                    : t('students.newContactTitle')
                  : noteFormOpen
                    ? editingNote
                      ? t('students.editNoteTitle')
                      : t('students.newNoteTitle')
                    : formatStudentName(contactsStudent.firstName, contactsStudent.lastName)}
              </h3>
              {!contactFormOpen && !noteFormOpen ? (
                <p className="profile-summary">
                  {contactsStudent.groupName ? translateBackendSeed(contactsStudent.groupName) : t('students.noGroup')}
                  {' · '}
                  {t('students.birthLabel')}: {formatDate(contactsStudent.birthDate, locale)}
                </p>
              ) : null}
            </div>
            <button
              aria-label={t('common.close')}
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
                  <strong>{t('students.allergiesColon')}</strong> {contactsStudent.allergies}
                </p>
              ) : null}
              {contactsStudent.medicalNotes ? (
                <p>
                  <strong>{t('students.medicalNotesColon')}</strong> {contactsStudent.medicalNotes}
                </p>
              ) : null}
            </div>
          ) : null}

          {!contactFormOpen && !noteFormOpen && canViewDiscounts ? (
            <div className="panel-actions-row">
              <button
                className="secondary-button inline-button"
                onClick={() => setIsDiscountsPanelOpen(true)}
                type="button"
              >
                <Percent size={16} aria-hidden="true" />
                {t('students.discountsButton')}
              </button>
            </div>
          ) : null}

          {contactFormOpen ? (
            <form className="entity-form" onSubmit={onContactSubmit}>
              <div className="entity-form-grid">
                <label>
                  {t('students.fullNameLabel')}
                  <input maxLength={150} {...registerContact('fullName')} />
                  {contactErrors.fullName ? (
                    <span className="field-error">{contactErrors.fullName.message}</span>
                  ) : null}
                </label>
                <label>
                  {t('students.relationshipLabel')}
                  <input
                    maxLength={100}
                    placeholder={t('students.relationshipPlaceholder')}
                    {...registerContact('relationship')}
                  />
                  {contactErrors.relationship ? (
                    <span className="field-error">{contactErrors.relationship.message}</span>
                  ) : null}
                </label>
                <label>
                  {t('students.phoneLabel')}
                  <input maxLength={30} {...registerContact('phone')} />
                  {contactErrors.phone ? <span className="field-error">{contactErrors.phone.message}</span> : null}
                </label>
                <label>
                  {t('students.alternatePhoneLabel')}
                  <input maxLength={30} {...registerContact('alternatePhone')} />
                </label>
                <label className="entity-form-full">
                  {t('students.notesLabel')}
                  <textarea rows={2} {...registerContact('notes')} />
                </label>
                <label className="checkbox-field entity-form-full">
                  <input type="checkbox" {...registerContact('primary')} />
                  {t('students.primaryContactLabel')}
                </label>
              </div>
              {saveContactMutation.error ? (
                <p className="form-error" role="alert">
                  {saveContactMutation.error instanceof Error
                    ? saveContactMutation.error.message
                    : t('students.saveContactError')}
                </p>
              ) : null}
              <footer className="form-actions">
                <button
                  className="secondary-button"
                  disabled={saveContactMutation.isPending}
                  onClick={closeContactForm}
                  type="button"
                >
                  {t('common.cancel')}
                </button>
                <button className="primary-button" disabled={saveContactMutation.isPending} type="submit">
                  {saveContactMutation.isPending
                    ? t('common.saving')
                    : editingContact
                      ? t('students.saveChanges')
                      : t('students.addContact')}
                </button>
              </footer>
            </form>
          ) : noteFormOpen ? (
            <form className="entity-form" onSubmit={onNoteSubmit}>
              <div className="entity-form-grid">
                <label>
                  {t('students.typeLabel')}
                  <select {...registerNote('noteType')}>
                    {Object.entries(noteTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="entity-form-full">
                  {t('students.commentLabel')}
                  <textarea rows={4} {...registerNote('content')} />
                  {noteErrors.content ? <span className="field-error">{noteErrors.content.message}</span> : null}
                </label>
              </div>
              {saveNoteMutation.error ? (
                <p className="form-error" role="alert">
                  {saveNoteMutation.error instanceof Error
                    ? saveNoteMutation.error.message
                    : t('students.saveNoteError')}
                </p>
              ) : null}
              <footer className="form-actions">
                <button
                  className="secondary-button"
                  disabled={saveNoteMutation.isPending}
                  onClick={closeNoteForm}
                  type="button"
                >
                  {t('common.cancel')}
                </button>
                <button className="primary-button" disabled={saveNoteMutation.isPending} type="submit">
                  {saveNoteMutation.isPending
                    ? t('common.saving')
                    : editingNote
                      ? t('students.saveChanges')
                      : t('students.addComment')}
                </button>
              </footer>
            </form>
          ) : (
            <>
              <div className="panel-actions-row">
                <button className="secondary-button inline-button" onClick={openNewContactForm} type="button">
                  <Plus size={16} aria-hidden="true" />
                  {t('students.addContact')}
                </button>
              </div>
              {sortedGuardians.length > 0 ? (
                <>
                  <p className="panel-section-label">{t('students.legalGuardiansTitle')}</p>
                  <ul className="contact-list">
                    {sortedGuardians.map((guardian) => (
                      <li className="contact-item" key={guardian.parentId}>
                        <div className="contact-item-header">
                          <span className="contact-item-title">
                            <strong>{guardian.parentName}</strong>
                            {guardian.primaryContact ? (
                              <span className="status-badge">{t('students.primaryBadge')}</span>
                            ) : null}
                          </span>
                        </div>
                        <p className="field-hint">{guardianRelationshipLabels[guardian.relationshipType]}</p>
                        <p className="field-hint">
                          {t('students.phonePrefix')} {guardian.phone ?? t('students.noPhone')}
                          {guardian.email ? ` / ${guardian.email}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="panel-section-label">{t('students.additionalContactsTitle')}</p>
                </>
              ) : null}
              {contactsError ? (
                <p className="notice">
                  {isForbiddenError(contactsError)
                    ? t('students.forbiddenContacts')
                    : t('students.loadContactsError')}
                </p>
              ) : null}
              {isContactsLoading ? <p>{t('common.loading')}</p> : null}
              {!isContactsLoading && !contactsError && contacts.length === 0 ? (
                <p>{t('students.emptyContacts')}</p>
              ) : null}
              {!isContactsLoading && contacts.length > 0 ? (
                <ul className="contact-list">
                  {contacts.map((contact) => (
                    <li className="contact-item" key={contact.studentEmergencyContactId}>
                      <div className="contact-item-header">
                        <span className="contact-item-title">
                          <strong>{contact.fullName}</strong>
                          {contact.primary ? <span className="status-badge">{t('students.primaryBadge')}</span> : null}
                        </span>
                        <div className="row-actions">
                          <button onClick={() => openEditContactForm(contact)} title={t('common.edit')} type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setDeleteContactTarget(contact)}
                            title={t('common.delete')}
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <p className="field-hint">{contact.relationship}</p>
                      <p className="field-hint">
                        {t('students.phonePrefix')} {contact.phone}
                        {contact.alternatePhone ? ` / ${contact.alternatePhone}` : ''}
                      </p>
                      {contact.notes ? <p className="field-hint">{contact.notes}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="panel-section-label">{t('students.commentsTitle')}</p>
              <div className="panel-actions-row">
                <button className="secondary-button inline-button" onClick={openNewNoteForm} type="button">
                  <Plus size={16} aria-hidden="true" />
                  {t('students.addComment')}
                </button>
              </div>
              {notesError ? (
                <p className="notice">
                  {isForbiddenError(notesError) ? t('students.forbiddenComments') : t('students.loadCommentsError')}
                </p>
              ) : null}
              {isNotesLoading ? <p>{t('common.loading')}</p> : null}
              {!isNotesLoading && !notesError && sortedNotes.length === 0 ? (
                <p>{t('students.emptyComments')}</p>
              ) : null}
              {!isNotesLoading && sortedNotes.length > 0 ? (
                <ul className="contact-list">
                  {sortedNotes.map((note) => (
                    <li className="contact-item" key={note.studentNoteId}>
                      <div className="contact-item-header">
                        <span className="contact-item-title">
                          <strong>{noteTypeLabels[note.noteType]}</strong>
                          <span className="field-hint">{formatDateTime(note.createdAt, locale)}</span>
                        </span>
                        {canManage || note.authorEmail === currentUserEmail ? (
                          <div className="row-actions">
                            <button onClick={() => openEditNoteForm(note)} title={t('common.edit')} type="button">
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button onClick={() => setDeleteNoteTarget(note)} title={t('common.delete')} type="button">
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        ) : null}
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

      <section className="filters-row" aria-label={t('students.filtersAriaLabel')}>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('students.searchPlaceholder')}
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label={t('students.groupAriaLabel')}
          onChange={(event) => setGroupFilter(event.target.value)}
          value={groupFilter}
        >
          <option value="all">{t('students.allGroups')}</option>
          {formGroups.map(([groupId, groupName]) => (
            <option key={groupId} value={groupId}>
              {translateBackendSeed(groupName)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('students.statusAriaLabel')}
          onChange={(event) => setStatusFilter(event.target.value as StudentStatus | 'ALL')}
          value={statusFilter}
        >
          <option value="ALL">{t('students.allStatuses')}</option>
          {Object.entries(statusLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          {t('common.filters')}
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('students.colPhoto')}</th>
              <th>{t('students.colName')}</th>
              <th>{t('students.colBirthDate')}</th>
              <th>{t('students.colGroup')}</th>
              <th>{t('students.colGuardian')}</th>
              <th>{t('students.colStatus')}</th>
              <th>{t('students.colActions')}</th>
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
                  <td>{formatDate(student.birthDate, locale)}</td>
                  <td>
                    {student.groupName ? translateBackendSeed(student.groupName) : student.groupId ?? '-'}
                  </td>
                  <td>{student.primaryGuardianName ?? t('students.noPrimaryGuardian')}</td>
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
                        title={t('students.viewContactsTitle')}
                        type="button"
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      {canManage ? (
                        <>
                          <button onClick={() => openEditStudentForm(student)} title={t('common.edit')} type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button onClick={() => openDeleteConfirm(student)} title={t('common.delete')} type="button">
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
                <td colSpan={7}>{t('students.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            {students.length === 0
              ? t('students.showingZero')
              : t('students.showingRange', { start: rangeStart, end: rangeEnd, total: students.length })}
          </span>
          <div className="pagination">
            <button
              aria-label={t('common.previousPage')}
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
              aria-label={t('common.nextPage')}
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              type="button"
            >
              {'>'}
            </button>
          </div>
        </footer>
      </div>

      {canManage ? (
        <section className="page-footer-actions">
          <button className="primary-button inline-button" onClick={openNewStudentForm} type="button">
            <Plus size={17} aria-hidden="true" />
            {t('students.newStudent')}
          </button>
        </section>
      ) : null}

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={deleteStep === 1 ? t('common.continue') : t('common.confirmDelete')}
        description={
          deleteTarget
            ? deleteStep === 1
              ? t('students.deleteConfirmStep1', {
                  name: formatStudentName(deleteTarget.firstName, deleteTarget.lastName),
                })
              : t('students.deleteConfirmStep2', {
                  name: formatStudentName(deleteTarget.firstName, deleteTarget.lastName),
                })
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
        title={deleteStep === 1 ? t('students.deleteConfirmTitle') : t('common.confirmDeleteTitle')}
        variant="danger"
      />

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.confirmDelete')}
        description={
          deleteContactTarget
            ? t('students.deleteContactConfirmDescription', { name: deleteContactTarget.fullName })
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
        title={t('students.deleteContactConfirmTitle')}
        variant="danger"
      />

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('common.confirmDelete')}
        description={t('students.deleteNoteConfirmDescription')}
        isConfirming={deleteNoteMutation.isPending}
        onCancel={() => setDeleteNoteTarget(null)}
        onConfirm={() => {
          if (deleteNoteTarget) {
            deleteNoteMutation.mutate(deleteNoteTarget.studentNoteId)
          }
        }}
        open={deleteNoteTarget !== null}
        title={t('students.deleteNoteConfirmTitle')}
        variant="danger"
      />

      {deletedStudent ? (
        <UndoToast
          isActing={restoreStudentMutation.isPending}
          message={t('students.deletedToast', {
            name: formatStudentName(deletedStudent.firstName, deletedStudent.lastName),
          })}
          onAction={() => restoreStudentMutation.mutate(deletedStudent.studentId)}
          onDismiss={() => setDeletedStudent(null)}
        />
      ) : null}

      {contactsStudent && isDiscountsPanelOpen ? (
        <StudentDiscountsPanel
          onClose={() => setIsDiscountsPanelOpen(false)}
          studentId={contactsStudent.studentId}
          studentName={formatStudentName(contactsStudent.firstName, contactsStudent.lastName)}
        />
      ) : null}
    </main>
  )
}
