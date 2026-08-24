import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
  UserMinus,
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
  linkStudentToParent,
  restoreParent,
  unlinkStudentFromParent,
  updateParent,
} from '../../api/parents.api'
import type { StudentGuardianRequest } from '../../api/parents.api'
import { getStudents } from '../../api/students.api'
import type { StudentGuardian, StudentListItem as StudentOption } from '../../api/students.api'
import { ApiError } from '../../api/client'
import type { ParentListItem, ParentRequest, ParentStatus } from '../../types/parents'
import { isForbiddenError } from '../../utils/apiErrors'

const UNDO_WINDOW_MS = 8000

const emptyParents: ParentListItem[] = []
const emptyGuardianLinks: StudentGuardian[] = []
const emptyStudentOptions: StudentOption[] = []

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createParentFormSchema(t: TFunction) {
  return z.object({
    firstName: z.string().trim().min(1, t('parents.firstNameRequired')),
    lastName: z.string().trim().min(1, t('parents.lastNameRequired')),
    email: z
      .string()
      .trim()
      .refine((value) => value === '' || emailPattern.test(value), t('parents.emailInvalid')),
    phone: z.string(),
    address: z.string(),
    preferredLanguage: z.string(),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    notes: z.string(),
    password: z
      .string()
      .refine((value) => value === '' || value.length >= 6, t('parents.passwordInvalid')),
  })
}

type ParentFormValues = z.infer<ReturnType<typeof createParentFormSchema>>

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

function claimErrorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiError && error.status === 409) {
    return t('parents.claimWindowExpiredError')
  }

  if (error instanceof ApiError && error.status === 404) {
    return t('parents.claimNotArchivedError')
  }

  return t('parents.claimGenericError')
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function formatParentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

function createLinkFormSchema(t: TFunction) {
  return z.object({
    studentId: z.string().min(1, t('parents.linkStudentRequired')),
    relationshipType: z.enum(['FATHER', 'MOTHER', 'GUARDIAN', 'RELATIVE', 'OTHER']),
    primaryContact: z.boolean(),
    billingContact: z.boolean(),
    authorizedPickup: z.boolean(),
    livesWithStudent: z.boolean(),
  })
}

type LinkFormValues = z.infer<ReturnType<typeof createLinkFormSchema>>

function emptyLinkFormValues(): LinkFormValues {
  return {
    studentId: '',
    relationshipType: 'GUARDIAN',
    primaryContact: false,
    billingContact: false,
    authorizedPickup: false,
    livesWithStudent: false,
  }
}

function linkErrorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiError) {
    return error.message
  }

  return t('parents.linkGenericError')
}

export function ParentsPage() {
  const { t } = useTranslation()
  const statusLabels: Record<ParentStatus, string> = {
    ACTIVE: t('parents.statusActive'),
    INACTIVE: t('parents.statusInactive'),
  }
  const relationshipLabels: Record<StudentGuardianRequest['relationshipType'], string> = {
    FATHER: t('parents.relationFather'),
    MOTHER: t('parents.relationMother'),
    GUARDIAN: t('parents.relationGuardian'),
    RELATIVE: t('parents.relationRelative'),
    OTHER: t('parents.relationOther'),
  }
  const parentFormSchema = useMemo(() => createParentFormSchema(t), [t])
  const linkFormSchema = useMemo(() => createLinkFormSchema(t), [t])
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
  const [linkingParent, setLinkingParent] = useState<ParentListItem | null>(null)
  const [unlinkTarget, setUnlinkTarget] = useState<StudentGuardian | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ParentFormValues>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: emptyFormValues(),
  })
  const {
    register: registerLink,
    handleSubmit: handleLinkSubmit,
    reset: resetLinkForm,
    formState: { errors: linkFormErrors },
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: emptyLinkFormValues(),
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

  const {
    data: linkedStudentsData,
    error: linkedStudentsError,
    isLoading: isLinkedStudentsLoading,
  } = useQuery({
    queryKey: ['parent-students', linkingParent?.parentId],
    queryFn: () => getParentStudents(linkingParent!.parentId),
    enabled: linkingParent !== null,
  })

  const { data: studentOptionsData } = useQuery({
    queryKey: ['students', 'link-lookup'],
    queryFn: () => getStudents(),
    staleTime: Infinity,
    enabled: linkingParent !== null,
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
        variables.parentId ? t('parents.updateSuccess') : t('parents.createSuccess'),
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
      setSuccessMessage(t('parents.claimSuccess'))
      setIsFormOpen(false)
      setClaimTarget(null)
    },
  })

  const linkStudentMutation = useMutation({
    mutationFn: (request: StudentGuardianRequest) => {
      if (!linkingParent) {
        return Promise.reject(new Error(t('parents.noParentSelectedError')))
      }

      return linkStudentToParent(linkingParent.parentId, request)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parent-students', linkingParent?.parentId] })
      resetLinkForm(emptyLinkFormValues())
    },
  })

  const unlinkStudentMutation = useMutation({
    mutationFn: (studentId: number) => {
      if (!linkingParent) {
        return Promise.reject(new Error(t('parents.noParentSelectedError')))
      }

      return unlinkStudentFromParent(linkingParent.parentId, studentId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['parent-students', linkingParent?.parentId] })
      setUnlinkTarget(null)
    },
  })

  const parents = data ?? emptyParents
  const trashedParents = (trashData ?? emptyParents).filter((parent) => parent.deletedAt && !parent.archivedAt)
  const archivedParents = (trashData ?? emptyParents).filter((parent) => parent.archivedAt)
  const linkedStudents = linkedStudentsData ?? emptyGuardianLinks
  const linkableStudents = useMemo(() => {
    const allStudents = studentOptionsData ?? emptyStudentOptions
    const linkedIds = new Set(linkedStudents.map((link) => link.studentId))
    return allStudents.filter((student) => !linkedIds.has(student.studentId))
  }, [studentOptionsData, linkedStudents])

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
    setLinkingParent(null)
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
    setLinkingParent(null)
    setIsFormOpen(true)
  }

  function openClaimForm(parent: ParentListItem) {
    setEditingParent(null)
    setClaimTarget(parent)
    reset(claimFormValues(parent))
    claimParentMutation.reset()
    setSuccessMessage(null)
    setIsArchivedOpen(false)
    setLinkingParent(null)
    setIsFormOpen(true)
  }

  function openLinkPanel(parent: ParentListItem) {
    setLinkingParent(parent)
    setUnlinkTarget(null)
    resetLinkForm(emptyLinkFormValues())
    linkStudentMutation.reset()
    setIsFormOpen(false)
    setIsTrashOpen(false)
    setIsArchivedOpen(false)
  }

  function closeLinkPanel() {
    setLinkingParent(null)
    setUnlinkTarget(null)
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
    setLinkingParent(null)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  function openArchived() {
    setIsFormOpen(false)
    setIsTrashOpen(false)
    setLinkingParent(null)
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

  const onLinkSubmit = handleLinkSubmit((values) => {
    const request: StudentGuardianRequest = {
      studentId: Number(values.studentId),
      relationshipType: values.relationshipType,
      primaryContact: values.primaryContact,
      billingContact: values.billingContact,
      authorizedPickup: values.authorizedPickup,
      livesWithStudent: values.livesWithStudent,
    }

    linkStudentMutation.mutate(request)
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('parents.title')}</h2>
          <p>{t('parents.subtitle')}</p>
        </div>
        {canManage ? (
          <div className="page-heading-actions">
            <button className="secondary-button" onClick={openArchived} type="button">
              <Archive size={17} aria-hidden="true" />
              {t('parents.archivedButton')}
            </button>
            <button className="secondary-button" onClick={openTrash} type="button">
              <Trash2 size={17} aria-hidden="true" />
              {t('common.trash')}
            </button>
            <button className="primary-button inline-button" onClick={openNewParentForm} type="button">
              <Plus size={17} aria-hidden="true" />
              {t('parents.newParent')}
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
          {isForbiddenError(error) ? t('parents.forbiddenList') : t('parents.loadError')}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="dialog-overlay" onClick={closeParentForm} role="presentation">
        <section
          aria-labelledby="parent-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="parent-form-title">
                {claimTarget
                  ? t('parents.claimFormTitle')
                  : editingParent
                    ? t('parents.editParentTitle')
                    : t('parents.newParentTitle')}
              </h3>
              <p>{claimTarget ? t('parents.claimFormSubtitle') : t('parents.formSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
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
                {t('parents.firstNameLabel')}
                <input maxLength={100} {...register('firstName')} />
                {formErrors.firstName ? (
                  <span className="field-error">{formErrors.firstName.message}</span>
                ) : null}
              </label>
              <label>
                {t('parents.lastNameLabel')}
                <input maxLength={100} {...register('lastName')} />
                {formErrors.lastName ? <span className="field-error">{formErrors.lastName.message}</span> : null}
              </label>
              <label>
                {t('parents.emailLabel')}
                <input maxLength={150} type="email" {...register('email')} />
                {formErrors.email ? <span className="field-error">{formErrors.email.message}</span> : null}
              </label>
              <label>
                {t('parents.phoneLabel')}
                <input maxLength={30} {...register('phone')} />
              </label>
              <label>
                {t('parents.statusLabel')}
                <select {...register('status')}>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('parents.preferredLanguageLabel')}
                <input maxLength={20} placeholder="es" {...register('preferredLanguage')} />
              </label>
              <label className="entity-form-wide">
                {t('parents.addressLabel')}
                <input maxLength={255} {...register('address')} />
              </label>
              {!editingParent && !claimTarget ? (
                <label>
                  {t('parents.passwordLabel')}
                  <input
                    autoComplete="new-password"
                    maxLength={100}
                    type="password"
                    {...register('password')}
                  />
                  {formErrors.password ? (
                    <span className="field-error">{formErrors.password.message}</span>
                  ) : (
                    <span className="field-hint">{t('parents.passwordHint')}</span>
                  )}
                </label>
              ) : null}
              <label className="entity-form-full">
                {t('parents.notesLabel')}
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {claimTarget && claimParentMutation.error ? (
              <p className="form-error" role="alert">
                {claimErrorMessage(claimParentMutation.error, t)}
              </p>
            ) : null}
            {!claimTarget && saveParentMutation.error ? (
              <p className="form-error" role="alert">
                {saveParentMutation.error instanceof Error
                  ? saveParentMutation.error.message
                  : t('parents.saveParentError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveParentMutation.isPending || claimParentMutation.isPending}
                onClick={closeParentForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="primary-button"
                disabled={saveParentMutation.isPending || claimParentMutation.isPending}
                type="submit"
              >
                {claimTarget
                  ? claimParentMutation.isPending
                    ? t('parents.reactivating')
                    : t('parents.reactivateParent')
                  : saveParentMutation.isPending
                    ? t('common.saving')
                    : editingParent
                      ? t('parents.saveChanges')
                      : t('parents.createParent')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage={t('parents.deletedRecentlyEmpty')}
          getDeletedAt={(parent) => parent.deletedAt}
          getId={(parent) => parent.parentId}
          getLabel={(parent) => formatParentName(parent.firstName, parent.lastName)}
          isLoading={isTrashLoading}
          items={trashedParents}
          onClose={closeTrash}
          onRestore={(parent) => restoreParentMutation.mutate(parent.parentId)}
          restoringId={restoreParentMutation.isPending ? restoreParentMutation.variables : null}
          title={t('parents.deletedParentsTitle')}
        />
      ) : null}

      {isArchivedOpen ? (
        <section className="panel trash-panel" aria-labelledby="archived-panel-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="archived-panel-title">{t('parents.archivedTitle')}</h3>
              <p>{t('parents.archivedDescription')}</p>
            </div>
            <button aria-label={t('parents.closeArchived')} className="icon-button" onClick={closeArchived} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {isTrashLoading ? <p>{t('common.loading')}</p> : null}

          {!isTrashLoading && filteredArchivedParents.length === 0 ? (
            <p>{t('parents.emptyArchivedSearch')}</p>
          ) : null}

          {!isTrashLoading && filteredArchivedParents.length > 0 ? (
            <ul className="trash-list">
              {filteredArchivedParents.map((parent) => (
                <li className="trash-list-item" key={parent.parentId}>
                  <div>
                    <strong>{formatParentName(parent.firstName, parent.lastName)}</strong>
                    <span className="field-hint">{parent.email ?? t('parents.noEmail')}</span>
                  </div>
                  <button className="secondary-button" onClick={() => openClaimForm(parent)} type="button">
                    <UserPlus size={16} aria-hidden="true" />
                    {t('parents.claim')}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {linkingParent ? (
        <div className="dialog-overlay" onClick={closeLinkPanel} role="presentation">
        <section
          aria-labelledby="link-panel-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="link-panel-title">{formatParentName(linkingParent.firstName, linkingParent.lastName)}</h3>
              <p className="profile-summary">
                <span
                  className={
                    linkingParent.status === 'INACTIVE' ? 'status-badge status-danger' : 'status-badge'
                  }
                >
                  {statusLabels[linkingParent.status] ?? linkingParent.status}
                </span>
              </p>
            </div>
            <button aria-label={t('common.close')} className="icon-button" onClick={closeLinkPanel} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="profile-summary">
            <p>
              <strong>{t('parents.phoneColon')}</strong> {linkingParent.phone || t('parents.noPhone')}
            </p>
            <p>
              <strong>{t('parents.emailColon')}</strong> {linkingParent.email || t('parents.noEmail')}
            </p>
            <p>
              <strong>{t('parents.addressColon')}</strong> {linkingParent.address || t('parents.noAddress')}
            </p>
            <p>
              <strong>{t('parents.preferredLanguageColon')}</strong>{' '}
              {linkingParent.preferredLanguage || t('parents.notSpecified')}
            </p>
            {linkingParent.notes ? (
              <p>
                <strong>{t('parents.notesColon')}</strong> {linkingParent.notes}
              </p>
            ) : null}
          </div>

          <p className="panel-section-label">{t('parents.linkedStudentsTitle')}</p>

          {canManage ? (
            linkableStudents.length > 0 ? (
              <form className="entity-form" onSubmit={onLinkSubmit}>
                <div className="entity-form-grid">
                  <label className="entity-form-wide">
                    {t('parents.studentLabel')}
                    <select {...registerLink('studentId')}>
                      <option value="">{t('parents.selectStudent')}</option>
                      {linkableStudents.map((student) => (
                        <option key={student.studentId} value={student.studentId}>
                          {`${student.firstName} ${student.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                    {linkFormErrors.studentId ? (
                      <span className="field-error">{linkFormErrors.studentId.message}</span>
                    ) : null}
                  </label>
                  <label>
                    {t('parents.relationshipLabel')}
                    <select {...registerLink('relationshipType')}>
                      {Object.entries(relationshipLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" {...registerLink('primaryContact')} />
                    {t('parents.primaryContactLabel')}
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" {...registerLink('billingContact')} />
                    {t('parents.billingContactLabel')}
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" {...registerLink('authorizedPickup')} />
                    {t('parents.authorizedPickupLabel')}
                  </label>
                  <label className="checkbox-field">
                    <input type="checkbox" {...registerLink('livesWithStudent')} />
                    {t('parents.livesWithStudentLabel')}
                  </label>
                </div>
                {linkStudentMutation.error ? (
                  <p className="form-error" role="alert">
                    {linkErrorMessage(linkStudentMutation.error, t)}
                  </p>
                ) : null}
                <footer className="form-actions">
                  <button className="primary-button" disabled={linkStudentMutation.isPending} type="submit">
                    {linkStudentMutation.isPending ? t('parents.linking') : t('parents.linkStudent')}
                  </button>
                </footer>
              </form>
            ) : (
              <p className="field-hint">{t('parents.allStudentsLinked')}</p>
            )
          ) : null}

          <p className="panel-section-label">{t('parents.currentlyLinkedTitle')}</p>
          {linkedStudentsError ? (
            <p className="notice">
              {isForbiddenError(linkedStudentsError)
                ? t('parents.forbiddenLinked')
                : t('parents.loadLinkedError')}
            </p>
          ) : null}
          {isLinkedStudentsLoading ? <p>{t('common.loading')}</p> : null}
          {!isLinkedStudentsLoading && !linkedStudentsError && linkedStudents.length === 0 ? (
            <p>{t('parents.emptyLinked')}</p>
          ) : null}
          {!isLinkedStudentsLoading && linkedStudents.length > 0 ? (
            <ul className="contact-list">
              {linkedStudents.map((link) => {
                const extras = [
                  link.billingContact ? t('parents.billingExtra') : null,
                  link.authorizedPickup ? t('parents.pickupExtra') : null,
                  link.livesWithStudent ? t('parents.livesWithExtra') : null,
                ].filter(Boolean)

                return (
                  <li className="contact-item" key={link.studentId}>
                    <div className="contact-item-header">
                      <span className="contact-item-title">
                        <strong>{link.studentName}</strong>
                        {link.primaryContact ? <span className="status-badge">{t('parents.primaryBadge')}</span> : null}
                      </span>
                      {canManage ? (
                        <button onClick={() => setUnlinkTarget(link)} title={t('parents.unlink')} type="button">
                          <UserMinus size={16} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <p className="field-hint">{relationshipLabels[link.relationshipType]}</p>
                    <p className="field-hint">
                      {extras.length > 0 ? extras.join(' · ') : t('parents.noExtraPermissions')}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </section>
        </div>
      ) : null}

      <section className="filters-row filters-row-compact" aria-label={t('parents.filtersAriaLabel')}>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('parents.searchPlaceholder')}
            type="search"
            value={search}
          />
        </label>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          {t('common.filters')}
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('parents.colName')}</th>
              <th>{t('parents.colPhone')}</th>
              <th>{t('parents.colEmail')}</th>
              <th>{t('parents.colChildren')}</th>
              <th>{t('parents.colStatus')}</th>
              <th>{t('parents.colActions')}</th>
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
                      <button onClick={() => openLinkPanel(parent)} title={t('parents.viewProfile')} type="button">
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      {canManage ? (
                        <>
                          <button onClick={() => openEditParentForm(parent)} title={t('common.edit')} type="button">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            disabled={toggleStatusMutation.isPending}
                            onClick={() => setConfirmingStatusParent(parent)}
                            title={parent.status === 'ACTIVE' ? t('parents.deactivate') : t('parents.activate')}
                            type="button"
                          >
                            {parent.status === 'ACTIVE' ? (
                              <UserX size={16} aria-hidden="true" />
                            ) : (
                              <UserCheck size={16} aria-hidden="true" />
                            )}
                          </button>
                          <button onClick={() => openDeleteConfirm(parent)} title={t('common.delete')} type="button">
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
                <td colSpan={6}>{t('parents.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            {t('parents.showingCount', { filtered: filteredParents.length, total: parents.length })}
          </span>
          <div className="pagination">
            <button aria-label={t('common.previousPage')} type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button aria-label={t('common.nextPage')} type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={confirmingStatusParent?.status === 'ACTIVE' ? t('parents.deactivate') : t('parents.activate')}
        description={
          confirmingStatusParent
            ? confirmingStatusParent.status === 'ACTIVE'
              ? t('parents.deactivateDescription', {
                  name: formatParentName(confirmingStatusParent.firstName, confirmingStatusParent.lastName),
                })
              : t('parents.activateDescription', {
                  name: formatParentName(confirmingStatusParent.firstName, confirmingStatusParent.lastName),
                })
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
            ? t('parents.deactivateTitle')
            : t('parents.activateTitle')
        }
      />

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={deleteStep === 1 ? t('common.continue') : t('common.confirmDelete')}
        description={
          deleteTarget
            ? deleteStep === 1
              ? t('parents.deleteConfirmStep1', {
                  name: formatParentName(deleteTarget.firstName, deleteTarget.lastName),
                })
              : t('parents.deleteConfirmStep2', {
                  name: formatParentName(deleteTarget.firstName, deleteTarget.lastName),
                })
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
        title={deleteStep === 1 ? t('parents.deleteConfirmTitle') : t('common.confirmDeleteTitle')}
        variant="danger"
      />

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('parents.unlinkConfirmYes')}
        description={
          unlinkTarget && linkingParent
            ? t('parents.unlinkConfirmDescription', {
                student: unlinkTarget.studentName,
                parent: formatParentName(linkingParent.firstName, linkingParent.lastName),
              })
            : ''
        }
        isConfirming={unlinkStudentMutation.isPending}
        onCancel={() => setUnlinkTarget(null)}
        onConfirm={() => {
          if (unlinkTarget) {
            unlinkStudentMutation.mutate(unlinkTarget.studentId)
          }
        }}
        open={unlinkTarget !== null}
        title={t('parents.unlinkConfirmTitle')}
        variant="danger"
      />

      {deletedParent ? (
        <UndoToast
          isActing={restoreParentMutation.isPending}
          message={t('parents.deletedToast', {
            name: formatParentName(deletedParent.firstName, deletedParent.lastName),
          })}
          onAction={() => restoreParentMutation.mutate(deletedParent.parentId)}
          onDismiss={() => setDeletedParent(null)}
        />
      ) : null}
    </main>
  )
}