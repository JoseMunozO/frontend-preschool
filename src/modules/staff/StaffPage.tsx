import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { Plus, RotateCcw, ShieldCheck, Trash2, UserCircle, X } from 'lucide-react'
import { ApiError } from '../../api/client'
import { getRoles } from '../../api/roles.api'
import type { Role, RoleCode } from '../../api/roles.api'
import {
  assignRole,
  createStaff,
  deleteStaff,
  getStaffList,
  removeRole,
  restoreStaff,
} from '../../api/staff.api'
import type { StaffMember, StaffRequest } from '../../api/staff.api'
import { useAuthStore } from '../../auth/auth.store'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { isForbiddenError } from '../../utils/apiErrors'

const emptyStaff: StaffMember[] = []
const emptyRoles: Role[] = []

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createStaffFormSchema(t: TFunction) {
  return z
    .object({
      firstName: z.string().trim().min(1, t('staff.firstNameRequired')),
      lastName: z.string().trim().min(1, t('staff.lastNameRequired')),
      email: z.string().trim(),
      phone: z.string(),
      employeeCode: z.string(),
      positionTitle: z.string().trim().min(1, t('staff.positionRequired')),
      staffType: z.string().trim().min(1, t('staff.staffTypeRequired')),
      hireDate: z.string(),
      createLogin: z.boolean(),
      password: z.string(),
      roles: z.array(z.string()),
    })
    .superRefine((values, ctx) => {
      if (!values.createLogin) {
        return
      }

      if (!emailPattern.test(values.email.trim())) {
        ctx.addIssue({ code: 'custom', message: t('staff.emailInvalid'), path: ['email'] })
      }

      if (values.password.trim().length < 6) {
        ctx.addIssue({
          code: 'custom',
          message: t('staff.passwordInvalid'),
          path: ['password'],
        })
      }

      if (values.roles.length === 0) {
        ctx.addIssue({ code: 'custom', message: t('staff.rolesRequired'), path: ['roles'] })
      }
    })
}

type StaffFormValues = z.infer<ReturnType<typeof createStaffFormSchema>>

function emptyFormValues(): StaffFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeCode: '',
    positionTitle: '',
    staffType: '',
    hireDate: '',
    createLogin: false,
    password: '',
    roles: [],
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function formatStaffName(staff: StaffMember) {
  return `${staff.firstName} ${staff.lastName}`.trim()
}

function roleErrorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiError) {
    return error.message
  }

  return t('staff.roleUpdateError')
}

function staffMaxRank(staff: StaffMember) {
  const ranks = staff.roles.map((role) => role.rankLevel)
  return ranks.length > 0 ? Math.max(...ranks) : 0
}

export function StaffPage() {
  const { t } = useTranslation()
  const staffFormSchema = useMemo(() => createStaffFormSchema(t), [t])
  const queryClient = useQueryClient()
  const session = useAuthStore((state) => state.session)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [manageRolesStaffId, setManageRolesStaffId] = useState<number | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors: formErrors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: emptyFormValues(),
  })
  const createLogin = useWatch({ control, name: 'createLogin' })

  const { data, error, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => getStaffList(),
    retry: false,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
    staleTime: Infinity,
  })

  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ['staff', 'trash'],
    queryFn: () => getStaffList({ includeDeleted: true }),
    enabled: isTrashOpen,
  })

  const staffList = data ?? emptyStaff
  const roles = rolesData ?? emptyRoles
  const trashedStaff = (trashData ?? emptyStaff).filter((staff) => staff.deletedAt)
  const managingStaff = staffList.find((staff) => staff.staffId === manageRolesStaffId) ?? null

  const currentMaxRank = useMemo(() => {
    const userRoleCodes = session?.user.roles ?? []
    const ranks = roles
      .filter((role) => userRoleCodes.some((code) => code === role.code))
      .map((role) => role.rankLevel)
    return ranks.length > 0 ? Math.max(...ranks) : 0
  }, [roles, session])

  const createStaffMutation = useMutation({
    mutationFn: (request: StaffRequest) => createStaff(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
      setSuccessMessage(t('staff.createSuccess'))
      setIsFormOpen(false)
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role, hasRole }: { userId: number; role: RoleCode; hasRole: boolean }) =>
      hasRole ? removeRole(userId, role) : assignRole(userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
      setRoleError(null)
    },
    onError: (mutationError) => {
      setRoleError(roleErrorMessage(mutationError, t))
    },
  })

  const deleteStaffMutation = useMutation({
    mutationFn: (staffId: number) => deleteStaff(staffId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
      setDeleteTarget(null)
      setDeleteError(null)
    },
    onError: (mutationError) => {
      setDeleteError(roleErrorMessage(mutationError, t))
    },
  })

  const restoreStaffMutation = useMutation({
    mutationFn: (staffId: number) => restoreStaff(staffId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  function openNewStaffForm() {
    reset(emptyFormValues())
    createStaffMutation.reset()
    setSuccessMessage(null)
    setManageRolesStaffId(null)
    setIsTrashOpen(false)
    setIsFormOpen(true)
  }

  function closeStaffForm() {
    setIsFormOpen(false)
    createStaffMutation.reset()
  }

  function openManageRoles(staff: StaffMember) {
    setManageRolesStaffId(staff.staffId)
    setRoleError(null)
    setIsFormOpen(false)
    setIsTrashOpen(false)
    setSuccessMessage(null)
  }

  function closeManageRoles() {
    setManageRolesStaffId(null)
    setRoleError(null)
  }

  function openDeleteConfirm(staff: StaffMember) {
    setDeleteTarget(staff)
    setDeleteError(null)
    deleteStaffMutation.reset()
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  function openTrash() {
    setIsFormOpen(false)
    setManageRolesStaffId(null)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  function toggleRole(role: Role, hasRole: boolean) {
    if (!managingStaff?.userId) {
      return
    }

    roleMutation.mutate({ userId: managingStaff.userId, role: role.code, hasRole })
  }

  const onSubmit = handleSubmit((values) => {
    const request: StaffRequest = {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: optionalValue(values.phone),
      employeeCode: optionalValue(values.employeeCode),
      positionTitle: optionalValue(values.positionTitle),
      staffType: optionalValue(values.staffType),
      hireDate: optionalValue(values.hireDate),
      ...(values.createLogin
        ? { email: values.email.trim(), password: values.password, roles: values.roles as RoleCode[] }
        : {}),
    }

    createStaffMutation.mutate(request)
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('staff.title')}</h2>
          <p>{t('staff.subtitle')}</p>
        </div>
        <div className="page-heading-actions">
          <button className="secondary-button" onClick={openTrash} type="button">
            <Trash2 size={17} aria-hidden="true" />
            {t('common.trash')}
          </button>
          <button className="primary-button inline-button" onClick={openNewStaffForm} type="button">
            <Plus size={17} aria-hidden="true" />
            {t('staff.newPosition')}
          </button>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">{isForbiddenError(error) ? t('staff.forbiddenList') : t('staff.loadError')}</div>
      ) : null}

      {isFormOpen ? (
        <div className="dialog-overlay" onClick={closeStaffForm} role="presentation">
        <section
          aria-labelledby="staff-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="staff-form-title">{t('staff.newPositionTitle')}</h3>
              <p>{t('staff.formSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
              className="icon-button"
              disabled={createStaffMutation.isPending}
              onClick={closeStaffForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                {t('staff.firstNameLabel')}
                <input maxLength={100} {...register('firstName')} />
                {formErrors.firstName ? (
                  <span className="field-error">{formErrors.firstName.message}</span>
                ) : null}
              </label>
              <label>
                {t('staff.lastNameLabel')}
                <input maxLength={100} {...register('lastName')} />
                {formErrors.lastName ? <span className="field-error">{formErrors.lastName.message}</span> : null}
              </label>
              <label>
                {t('staff.phoneLabel')}
                <input maxLength={30} {...register('phone')} />
              </label>
              <label>
                {t('staff.employeeCodeLabel')}
                <input maxLength={50} {...register('employeeCode')} />
              </label>
              <label>
                {t('staff.positionLabel')}
                <input
                  maxLength={100}
                  placeholder={t('staff.positionPlaceholder')}
                  {...register('positionTitle')}
                />
                {formErrors.positionTitle ? (
                  <span className="field-error">{formErrors.positionTitle.message}</span>
                ) : null}
              </label>
              <label>
                {t('staff.staffTypeLabel')}
                <input
                  maxLength={50}
                  placeholder={t('staff.staffTypePlaceholder')}
                  {...register('staffType')}
                />
                {formErrors.staffType ? (
                  <span className="field-error">{formErrors.staffType.message}</span>
                ) : null}
              </label>
              <label>
                {t('staff.hireDateLabel')}
                <input type="date" {...register('hireDate')} />
              </label>
              <label className="checkbox-field entity-form-full">
                <input type="checkbox" {...register('createLogin')} />
                {t('staff.createLoginLabel')}
              </label>
              {createLogin ? (
                <>
                  <label>
                    {t('staff.emailLabel')}
                    <input maxLength={150} type="email" {...register('email')} />
                    {formErrors.email ? <span className="field-error">{formErrors.email.message}</span> : null}
                  </label>
                  <label>
                    {t('staff.passwordLabel')}
                    <input autoComplete="new-password" maxLength={100} type="password" {...register('password')} />
                    {formErrors.password ? (
                      <span className="field-error">{formErrors.password.message}</span>
                    ) : null}
                  </label>
                  <fieldset className="entity-form-full">
                    <legend>{t('staff.rolesLabel')}</legend>
                    {roles.map((role) => (
                      <label className="checkbox-field" key={role.roleId}>
                        <input
                          disabled={role.rankLevel > currentMaxRank}
                          type="checkbox"
                          value={role.code}
                          {...register('roles')}
                        />
                        {role.name}
                      </label>
                    ))}
                    {formErrors.roles ? <span className="field-error">{formErrors.roles.message}</span> : null}
                  </fieldset>
                </>
              ) : null}
            </div>
            {createStaffMutation.error ? (
              <p className="form-error" role="alert">
                {createStaffMutation.error instanceof ApiError
                  ? createStaffMutation.error.message
                  : t('staff.createStaffError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={createStaffMutation.isPending}
                onClick={closeStaffForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={createStaffMutation.isPending} type="submit">
                {createStaffMutation.isPending ? t('common.saving') : t('staff.createPosition')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {managingStaff ? (
        <div className="dialog-overlay" onClick={closeManageRoles} role="presentation">
        <section
          aria-labelledby="manage-roles-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="manage-roles-title">{t('staff.rolesOf', { name: formatStaffName(managingStaff) })}</h3>
              <p>{t('staff.manageRolesSubtitle')}</p>
            </div>
            <button aria-label={t('common.close')} className="icon-button" onClick={closeManageRoles} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          {roleError ? (
            <p className="form-error" role="alert">
              {roleError}
            </p>
          ) : null}
          <ul className="contact-list">
            {roles.map((role) => {
              const hasRole = managingStaff.roles.some((r) => r.code === role.code)
              const disabled = role.rankLevel > currentMaxRank || roleMutation.isPending

              return (
                <li className="contact-item" key={role.roleId}>
                  <div className="contact-item-header">
                    <span className="contact-item-title">
                      <strong>{role.name}</strong>
                    </span>
                    <label className="checkbox-field">
                      <input
                        checked={hasRole}
                        disabled={disabled}
                        onChange={() => toggleRole(role, hasRole)}
                        type="checkbox"
                      />
                      {t('staff.active')}
                    </label>
                  </div>
                  <p className="field-hint">{role.description}</p>
                </li>
              )
            })}
          </ul>
        </section>
        </div>
      ) : null}

      {isTrashOpen ? (
        <section className="panel trash-panel" aria-labelledby="staff-trash-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="staff-trash-title">{t('staff.trashTitle')}</h3>
              <p>{t('staff.trashSubtitle')}</p>
            </div>
            <button aria-label={t('common.closeTrash')} className="icon-button" onClick={closeTrash} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {isTrashLoading ? <p>{t('common.loading')}</p> : null}

          {!isTrashLoading && trashedStaff.length === 0 ? <p>{t('staff.noStaffDeactivated')}</p> : null}

          {!isTrashLoading && trashedStaff.length > 0 ? (
            <ul className="trash-list">
              {trashedStaff.map((staff) => {
                const isRestoring = restoreStaffMutation.isPending && restoreStaffMutation.variables === staff.staffId

                return (
                  <li className="trash-list-item" key={staff.staffId}>
                    <div>
                      <strong>{formatStaffName(staff)}</strong>
                      <span className="field-hint">{staff.positionTitle ?? t('staff.noPosition')}</span>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={isRestoring}
                      onClick={() => restoreStaffMutation.mutate(staff.staffId)}
                      type="button"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      {isRestoring ? t('staff.reactivating') : t('staff.reactivate')}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('staff.colName')}</th>
              <th>{t('staff.colPosition')}</th>
              <th>{t('staff.colEmail')}</th>
              <th>{t('staff.colRoles')}</th>
              <th>{t('staff.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.staffId}>
                <td>
                  <span className="name-cell">
                    <span className="student-avatar">
                      <UserCircle size={28} aria-hidden="true" />
                    </span>
                    {formatStaffName(staff)}
                  </span>
                </td>
                <td>{staff.positionTitle ?? '-'}</td>
                <td>{staff.email ?? '-'}</td>
                <td>
                  {staff.roles.length > 0 ? (
                    <div className="badge-list">
                      {staff.roles.map((role) => (
                        <span className="status-badge" key={role.roleId}>
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    t('staff.noLoginAccount')
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {staff.userId ? (
                      <button onClick={() => openManageRoles(staff)} title={t('staff.manageRolesTitle')} type="button">
                        <ShieldCheck size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      disabled={staffMaxRank(staff) > currentMaxRank}
                      onClick={() => openDeleteConfirm(staff)}
                      title={t('staff.deactivateTitle')}
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && staffList.length === 0 ? (
              <tr>
                <td colSpan={5}>{t('staff.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('staff.deactivateConfirmYes')}
        description={
          deleteTarget ? (
            <>
              {t('staff.deactivateConfirmPrefix', { name: formatStaffName(deleteTarget) })}
              {deleteTarget.userId ? t('staff.deactivateConfirmAccountNote') : ''}
              {t('staff.deactivateConfirmSuffix')}
              {deleteError ? (
                <span className="field-error" role="alert">
                  {' '}
                  {deleteError}
                </span>
              ) : null}
            </>
          ) : (
            ''
          )
        }
        isConfirming={deleteStaffMutation.isPending}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          if (deleteTarget) {
            deleteStaffMutation.mutate(deleteTarget.staffId)
          }
        }}
        open={deleteTarget !== null}
        title={t('staff.deactivateConfirmTitle')}
        variant="danger"
      />
    </main>
  )
}
