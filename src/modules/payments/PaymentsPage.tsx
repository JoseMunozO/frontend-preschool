import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { Ban, Eye, FilePlus2, FileText, ListFilter, Pencil, Percent, Plus, RotateCcw, Search, X } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StudentDiscountsPanel } from '../../components/ui/StudentDiscountsPanel'
import {
  createCharge,
  createPayment,
  getChargeTypes,
  getPaymentsByStudent,
  getStudentCharges,
  updateCharge,
} from '../../api/payments.api'
import type {
  ChargeType,
  PaymentChargeStatus,
  PaymentMethod,
  PaymentRequest,
  StudentCharge,
  StudentChargeRequest,
} from '../../types/payments'
import { getStudents } from '../../api/students.api'
import type { StudentListItem } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyCharges: StudentCharge[] = []
const emptyChargeTypes: ChargeType[] = []
const emptyStudentOptions: StudentListItem[] = []

const statusClassNames: Record<PaymentChargeStatus, string> = {
  PENDING: 'status-warning',
  PARTIALLY_PAID: 'status-warning',
  PAID: '',
  CANCELLED: 'status-neutral',
  OVERDUE: 'status-danger',
}

const payableStatuses = new Set<PaymentChargeStatus>(['PENDING', 'PARTIALLY_PAID', 'OVERDUE'])

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function todayInputValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: 'MXN',
    style: 'currency',
  }).format(value)
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

function formatBillingPeriod(charge: StudentCharge, locale: string) {
  if (!charge.billingPeriodStart || !charge.billingPeriodEnd) {
    return '-'
  }

  return `${formatDate(charge.billingPeriodStart, locale)} - ${formatDate(charge.billingPeriodEnd, locale)}`
}

function createPaymentFormSchema(t: TFunction) {
  return z.object({
    studentChargeId: z.string().min(1, t('payments.selectChargeRequired')),
    paymentDate: z.string().min(1, t('payments.paymentDateRequired')),
    amount: z
      .string()
      .refine((value) => value.trim() !== '' && Number(value) > 0, t('payments.amountInvalid')),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'SWISH', 'OTHER']),
    referenceNumber: z.string(),
    notes: z.string(),
  })
}

type PaymentFormValues = z.infer<ReturnType<typeof createPaymentFormSchema>>

function emptyFormValues(charge?: StudentCharge): PaymentFormValues {
  return {
    studentChargeId: charge ? String(charge.studentChargeId) : '',
    paymentDate: todayInputValue(),
    amount: charge ? String(charge.balance) : '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function createChargeEditFormSchema(t: TFunction) {
  return z
    .object({
      dueDate: z.string().min(1, t('payments.dueDateRequired')),
      billingPeriodStart: z.string(),
      billingPeriodEnd: z.string(),
      amountDue: z
        .string()
        .refine((value) => value.trim() !== '' && Number(value) > 0, t('payments.amountInvalid')),
      description: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodStart > values.billingPeriodEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('payments.periodEndAfterStart'),
          path: ['billingPeriodEnd'],
        })
      }
    })
}

type ChargeEditFormValues = z.infer<ReturnType<typeof createChargeEditFormSchema>>

function editFormValuesForCharge(charge: StudentCharge): ChargeEditFormValues {
  return {
    dueDate: charge.dueDate,
    billingPeriodStart: charge.billingPeriodStart ?? '',
    billingPeriodEnd: charge.billingPeriodEnd ?? '',
    amountDue: String(charge.amountDue),
    description: charge.description ?? '',
  }
}

function createNewChargeFormSchema(t: TFunction) {
  return z
    .object({
      studentId: z.string().min(1, t('payments.selectStudentRequired')),
      chargeTypeId: z.string().min(1, t('payments.selectChargeTypeRequired')),
      dueDate: z.string().min(1, t('payments.dueDateRequired')),
      billingPeriodStart: z.string(),
      billingPeriodEnd: z.string(),
      amountDue: z
        .string()
        .refine((value) => value.trim() !== '' && Number(value) > 0, t('payments.amountInvalid')),
      description: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodStart > values.billingPeriodEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('payments.periodEndAfterStart'),
          path: ['billingPeriodEnd'],
        })
      }
    })
}

type NewChargeFormValues = z.infer<ReturnType<typeof createNewChargeFormSchema>>

function emptyNewChargeValues(): NewChargeFormValues {
  return {
    studentId: '',
    chargeTypeId: '',
    dueDate: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    amountDue: '',
    description: '',
  }
}

function chargeRequestFromCharge(
  charge: StudentCharge,
  overrides: Partial<StudentChargeRequest> = {},
): StudentChargeRequest {
  return {
    studentId: charge.studentId,
    chargeTypeId: charge.chargeTypeId,
    dueDate: charge.dueDate,
    billingPeriodStart: charge.billingPeriodStart ?? undefined,
    billingPeriodEnd: charge.billingPeriodEnd ?? undefined,
    amountDue: charge.amountDue,
    description: charge.description ?? undefined,
    ...overrides,
  }
}

export function PaymentsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const statusLabels: Record<PaymentChargeStatus, string> = {
    PENDING: t('payments.statusPending'),
    PARTIALLY_PAID: t('payments.statusPartial'),
    PAID: t('payments.statusPaid'),
    CANCELLED: t('payments.statusCancelled'),
    OVERDUE: t('payments.statusOverdue'),
  }
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    CASH: t('payments.methodCash'),
    CARD: t('payments.methodCard'),
    TRANSFER: t('payments.methodTransfer'),
    SWISH: t('payments.methodSwish'),
    OTHER: t('payments.methodOther'),
  }
  const paymentFormSchema = useMemo(() => createPaymentFormSchema(t), [t])
  const chargeEditFormSchema = useMemo(() => createChargeEditFormSchema(t), [t])
  const newChargeFormSchema = useMemo(() => createNewChargeFormSchema(t), [t])
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(getCurrentMonth())
  const [status, setStatus] = useState<PaymentChargeStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState<StudentCharge | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [historyStudent, setHistoryStudent] = useState<{ studentId: number; studentName: string } | null>(null)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<StudentCharge | null>(null)
  const [isNewChargeFormOpen, setIsNewChargeFormOpen] = useState(false)
  const [discountsStudent, setDiscountsStudent] = useState<{ studentId: number; studentName: string } | null>(null)
  const [confirmingStatusCharge, setConfirmingStatusCharge] = useState<StudentCharge | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: { errors: formErrors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: emptyFormValues(),
  })
  const studentChargeId = useWatch({ control, name: 'studentChargeId' })
  const paymentMethod = useWatch({ control, name: 'paymentMethod' })
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editFormErrors },
  } = useForm<ChargeEditFormValues>({
    resolver: zodResolver(chargeEditFormSchema),
    defaultValues: {
      dueDate: '',
      billingPeriodStart: '',
      billingPeriodEnd: '',
      amountDue: '',
      description: '',
    },
  })
  const {
    register: registerNewCharge,
    handleSubmit: handleSubmitNewCharge,
    reset: resetNewCharge,
    setValue: setNewChargeValue,
    control: newChargeControl,
    formState: { errors: newChargeErrors },
  } = useForm<NewChargeFormValues>({
    resolver: zodResolver(newChargeFormSchema),
    defaultValues: emptyNewChargeValues(),
  })
  const newChargeStudentId = useWatch({ control: newChargeControl, name: 'studentId' })

  const { data, error, isLoading } = useQuery({
    queryKey: ['student-charges', month, status],
    queryFn: () => getStudentCharges({ month, status }),
    retry: false,
  })

  const { data: chargeTypesData } = useQuery({
    queryKey: ['payments', 'charge-types'],
    queryFn: () => getChargeTypes({ activeOnly: true }),
    staleTime: Infinity,
    enabled: isNewChargeFormOpen,
  })

  const { data: studentOptionsData } = useQuery({
    queryKey: ['students', 'charge-lookup'],
    queryFn: () => getStudents(),
    staleTime: Infinity,
    enabled: isNewChargeFormOpen,
  })

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['payments', 'history', historyStudent?.studentId],
    queryFn: () => getPaymentsByStudent(historyStudent!.studentId),
    enabled: historyStudent !== null,
  })

  const savePaymentMutation = useMutation({
    mutationFn: (request: PaymentRequest) => createPayment(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'student-charges',
      })
      setSuccessMessage(t('payments.paymentSuccess'))
      setIsFormOpen(false)
      setSelectedCharge(null)
    },
  })

  const updateChargeMutation = useMutation({
    mutationFn: ({ studentChargeId: id, request }: { studentChargeId: number; request: StudentChargeRequest }) =>
      updateCharge(id, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'student-charges',
      })
      setSuccessMessage(t('payments.chargeUpdateSuccess'))
      setIsEditFormOpen(false)
      setEditingCharge(null)
    },
  })

  const createChargeMutation = useMutation({
    mutationFn: (request: StudentChargeRequest) => createCharge(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'student-charges',
      })
      setSuccessMessage(t('payments.chargeCreateSuccess'))
      setIsNewChargeFormOpen(false)
    },
  })

  const statusChangeMutation = useMutation({
    mutationFn: ({ charge, status }: { charge: StudentCharge; status: PaymentChargeStatus }) =>
      updateCharge(charge.studentChargeId, chargeRequestFromCharge(charge, { status })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'student-charges',
      })
      setConfirmingStatusCharge(null)
    },
  })

  const charges = data ?? emptyCharges
  const chargeTypes = chargeTypesData ?? emptyChargeTypes
  const studentOptions = studentOptionsData ?? emptyStudentOptions
  const payableCharges = useMemo(() => charges.filter((charge) => payableStatuses.has(charge.status)), [charges])
  const filteredCharges = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return charges.filter((charge) => {
      const studentName = charge.studentName.toLowerCase()
      const chargeName = charge.chargeTypeName.toLowerCase()

      return (
        !normalizedSearch ||
        studentName.includes(normalizedSearch) ||
        chargeName.includes(normalizedSearch)
      )
    })
  }, [charges, search])

  const activeCharge =
    selectedCharge ?? payableCharges.find((charge) => String(charge.studentChargeId) === studentChargeId)
  const historyPayments = historyData ?? []

  function openPaymentHistory(charge: StudentCharge) {
    setIsFormOpen(false)
    setIsEditFormOpen(false)
    setIsNewChargeFormOpen(false)
    setDiscountsStudent(null)
    setHistoryStudent({ studentId: charge.studentId, studentName: charge.studentName })
  }

  function closePaymentHistory() {
    setHistoryStudent(null)
  }

  function openPaymentForm(charge?: StudentCharge) {
    setSelectedCharge(charge ?? null)
    reset(emptyFormValues(charge))
    savePaymentMutation.reset()
    setSuccessMessage(null)
    setHistoryStudent(null)
    setIsEditFormOpen(false)
    setIsNewChargeFormOpen(false)
    setDiscountsStudent(null)
    setIsFormOpen(true)
  }

  function closePaymentForm() {
    setIsFormOpen(false)
    setSelectedCharge(null)
    savePaymentMutation.reset()
  }

  function openEditForm(charge: StudentCharge) {
    setEditingCharge(charge)
    resetEdit(editFormValuesForCharge(charge))
    updateChargeMutation.reset()
    setSuccessMessage(null)
    setHistoryStudent(null)
    setIsFormOpen(false)
    setSelectedCharge(null)
    setIsNewChargeFormOpen(false)
    setDiscountsStudent(null)
    setIsEditFormOpen(true)
  }

  function closeEditForm() {
    setIsEditFormOpen(false)
    setEditingCharge(null)
    updateChargeMutation.reset()
  }

  function openNewChargeForm() {
    resetNewCharge(emptyNewChargeValues())
    createChargeMutation.reset()
    setSuccessMessage(null)
    setHistoryStudent(null)
    setIsFormOpen(false)
    setIsEditFormOpen(false)
    setDiscountsStudent(null)
    setIsNewChargeFormOpen(true)
  }

  function closeNewChargeForm() {
    setIsNewChargeFormOpen(false)
    createChargeMutation.reset()
  }

  function openDiscountsPanel(student: { studentId: number; studentName: string }) {
    setIsFormOpen(false)
    setIsEditFormOpen(false)
    setHistoryStudent(null)
    setDiscountsStudent(student)
  }

  function closeDiscountsPanel() {
    setDiscountsStudent(null)
  }

  function handleChargeTypeChange(newChargeTypeId: string) {
    const chargeType = chargeTypes.find((item) => String(item.chargeTypeId) === newChargeTypeId)

    if (chargeType) {
      setNewChargeValue('amountDue', String(chargeType.defaultAmount))
    }
  }

  function handleChargeChange(newStudentChargeId: string) {
    const charge = payableCharges.find((item) => String(item.studentChargeId) === newStudentChargeId)

    if (charge) {
      setValue('amount', String(charge.balance))
    }
  }

  const onSubmit = handleSubmit((values) => {
    const amount = Number(values.amount)
    const charge = activeCharge

    if (charge && amount > charge.balance) {
      setError('amount', {
        type: 'manual',
        message: t('payments.amountExceedsBalance', { balance: formatCurrency(charge.balance, locale) }),
      })
      return
    }

    const request: PaymentRequest = {
      paymentDate: values.paymentDate,
      totalAmount: amount,
      paymentMethod: values.paymentMethod,
      referenceNumber: optionalValue(values.referenceNumber),
      notes: optionalValue(values.notes),
      allocations: [{ studentChargeId: Number(values.studentChargeId), amountAllocated: amount }],
    }

    savePaymentMutation.mutate(request)
  })

  const onSubmitEdit = handleSubmitEdit((values) => {
    if (!editingCharge) {
      return
    }

    const request: StudentChargeRequest = {
      studentId: editingCharge.studentId,
      chargeTypeId: editingCharge.chargeTypeId,
      dueDate: values.dueDate,
      billingPeriodStart: optionalValue(values.billingPeriodStart),
      billingPeriodEnd: optionalValue(values.billingPeriodEnd),
      amountDue: Number(values.amountDue),
      description: optionalValue(values.description),
    }

    updateChargeMutation.mutate({ studentChargeId: editingCharge.studentChargeId, request })
  })

  const onSubmitNewCharge = handleSubmitNewCharge((values) => {
    const request: StudentChargeRequest = {
      studentId: Number(values.studentId),
      chargeTypeId: Number(values.chargeTypeId),
      dueDate: values.dueDate,
      billingPeriodStart: optionalValue(values.billingPeriodStart),
      billingPeriodEnd: optionalValue(values.billingPeriodEnd),
      amountDue: Number(values.amountDue),
      description: optionalValue(values.description),
    }

    createChargeMutation.mutate(request)
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('payments.title')}</h2>
          <p>{t('payments.subtitle')}</p>
        </div>
        <div className="page-heading-actions">
          <button className="secondary-button" onClick={openNewChargeForm} type="button">
            <FilePlus2 size={17} aria-hidden="true" />
            {t('payments.newCharge')}
          </button>
          <button className="primary-button inline-button" onClick={() => openPaymentForm()} type="button">
            <Plus size={17} aria-hidden="true" />
            {t('payments.registerPayment')}
          </button>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('payments.forbiddenList') : t('payments.loadError')}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="dialog-overlay" onClick={closePaymentForm} role="presentation">
        <section
          aria-labelledby="payment-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="payment-form-title">{t('payments.registerPaymentTitle')}</h3>
              <p>{t('payments.registerPaymentSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
              className="icon-button"
              disabled={savePaymentMutation.isPending}
              onClick={closePaymentForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label className="entity-form-wide">
                {t('payments.chargeLabel')}
                {selectedCharge ? (
                  <input
                    disabled
                    value={`${selectedCharge.studentName} - ${translateBackendSeed(selectedCharge.chargeTypeName)}`}
                  />
                ) : (
                  <select
                    {...register('studentChargeId', {
                      onChange: (event) => handleChargeChange(event.target.value),
                    })}
                  >
                    <option value="">{t('payments.selectCharge')}</option>
                    {payableCharges.map((charge) => (
                      <option key={charge.studentChargeId} value={charge.studentChargeId}>
                        {charge.studentName} - {translateBackendSeed(charge.chargeTypeName)} -{' '}
                        {formatCurrency(charge.balance, locale)}
                      </option>
                    ))}
                  </select>
                )}
                {formErrors.studentChargeId ? (
                  <span className="field-error">{formErrors.studentChargeId.message}</span>
                ) : null}
              </label>
              {activeCharge ? (
                <label>
                  {t('payments.pendingBalanceLabel')}
                  <input disabled value={formatCurrency(activeCharge.balance, locale)} />
                </label>
              ) : null}
              <label>
                {t('payments.paymentDateLabel')}
                <input type="date" {...register('paymentDate')} />
                {formErrors.paymentDate ? (
                  <span className="field-error">{formErrors.paymentDate.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.amountLabel')}
                <input min={0} step="0.01" type="number" {...register('amount')} />
                {formErrors.amount ? <span className="field-error">{formErrors.amount.message}</span> : null}
              </label>
              <label>
                {t('payments.paymentMethodLabel')}
                <select {...register('paymentMethod')}>
                  {Object.entries(paymentMethodLabels).map(([method, label]) => (
                    <option key={method} value={method}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {paymentMethod === 'TRANSFER' || paymentMethod === 'SWISH' ? (
                <label>
                  {t('payments.referenceNumberLabel')}
                  <input maxLength={100} {...register('referenceNumber')} />
                </label>
              ) : null}
              <label className="entity-form-full">
                {t('payments.adminCommentLabel')}
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {savePaymentMutation.error ? (
              <p className="form-error" role="alert">
                {savePaymentMutation.error instanceof Error
                  ? savePaymentMutation.error.message
                  : t('payments.savePaymentError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={savePaymentMutation.isPending}
                onClick={closePaymentForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={savePaymentMutation.isPending} type="submit">
                {savePaymentMutation.isPending ? t('common.saving') : t('payments.registerPayment')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {isEditFormOpen && editingCharge ? (
        <div className="dialog-overlay" onClick={closeEditForm} role="presentation">
        <section
          aria-labelledby="charge-edit-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="charge-edit-form-title">{t('payments.editChargeTitle')}</h3>
              <p>
                {editingCharge.studentName} - {translateBackendSeed(editingCharge.chargeTypeName)}
              </p>
            </div>
            <button
              aria-label={t('common.closeForm')}
              className="icon-button"
              disabled={updateChargeMutation.isPending}
              onClick={closeEditForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmitEdit}>
            <div className="entity-form-grid">
              <label>
                {t('payments.dueDateLabel')}
                <input type="date" {...registerEdit('dueDate')} />
                {editFormErrors.dueDate ? (
                  <span className="field-error">{editFormErrors.dueDate.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.amountLabel')}
                <input min={0} step="0.01" type="number" {...registerEdit('amountDue')} />
                {editFormErrors.amountDue ? (
                  <span className="field-error">{editFormErrors.amountDue.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.periodStartLabel')}
                <input type="date" {...registerEdit('billingPeriodStart')} />
              </label>
              <label>
                {t('payments.periodEndLabel')}
                <input type="date" {...registerEdit('billingPeriodEnd')} />
                {editFormErrors.billingPeriodEnd ? (
                  <span className="field-error">{editFormErrors.billingPeriodEnd.message}</span>
                ) : null}
              </label>
              <label className="entity-form-full">
                {t('payments.descriptionLabel')}
                <textarea rows={2} {...registerEdit('description')} />
              </label>
            </div>
            {updateChargeMutation.error ? (
              <p className="form-error" role="alert">
                {updateChargeMutation.error instanceof Error
                  ? updateChargeMutation.error.message
                  : t('payments.updateChargeError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={updateChargeMutation.isPending}
                onClick={closeEditForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={updateChargeMutation.isPending} type="submit">
                {updateChargeMutation.isPending ? t('common.saving') : t('payments.saveChanges')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {isNewChargeFormOpen ? (
        <div className="dialog-overlay" onClick={closeNewChargeForm} role="presentation">
        <section
          aria-labelledby="new-charge-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="new-charge-form-title">{t('payments.newChargeTitle')}</h3>
              <p>{t('payments.newChargeSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
              className="icon-button"
              disabled={createChargeMutation.isPending}
              onClick={closeNewChargeForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmitNewCharge}>
            <div className="entity-form-grid">
              <label>
                {t('payments.studentLabel')}
                <select {...registerNewCharge('studentId')}>
                  <option value="">{t('payments.selectStudent')}</option>
                  {studentOptions.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
                {newChargeErrors.studentId ? (
                  <span className="field-error">{newChargeErrors.studentId.message}</span>
                ) : null}
                {newChargeStudentId ? (
                  <button
                    className="text-action"
                    onClick={() => {
                      const selectedStudent = studentOptions.find(
                        (student) => String(student.studentId) === newChargeStudentId,
                      )

                      if (selectedStudent) {
                        openDiscountsPanel({
                          studentId: selectedStudent.studentId,
                          studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                        })
                      }
                    }}
                    type="button"
                  >
                    {t('payments.viewStudentDiscounts')}
                  </button>
                ) : null}
              </label>
              <label>
                {t('payments.chargeTypeLabel')}
                <select
                  {...registerNewCharge('chargeTypeId', {
                    onChange: (event) => handleChargeTypeChange(event.target.value),
                  })}
                >
                  <option value="">{t('payments.selectChargeType')}</option>
                  {chargeTypes.map((chargeType) => (
                    <option key={chargeType.chargeTypeId} value={chargeType.chargeTypeId}>
                      {translateBackendSeed(chargeType.name)}
                    </option>
                  ))}
                </select>
                {newChargeErrors.chargeTypeId ? (
                  <span className="field-error">{newChargeErrors.chargeTypeId.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.dueDateLabel')}
                <input type="date" {...registerNewCharge('dueDate')} />
                {newChargeErrors.dueDate ? (
                  <span className="field-error">{newChargeErrors.dueDate.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.amountLabel')}
                <input min={0} step="0.01" type="number" {...registerNewCharge('amountDue')} />
                {newChargeErrors.amountDue ? (
                  <span className="field-error">{newChargeErrors.amountDue.message}</span>
                ) : null}
              </label>
              <label>
                {t('payments.periodStartLabel')}
                <input type="date" {...registerNewCharge('billingPeriodStart')} />
              </label>
              <label>
                {t('payments.periodEndLabel')}
                <input type="date" {...registerNewCharge('billingPeriodEnd')} />
                {newChargeErrors.billingPeriodEnd ? (
                  <span className="field-error">{newChargeErrors.billingPeriodEnd.message}</span>
                ) : null}
              </label>
              <label className="entity-form-full">
                {t('payments.descriptionLabel')}
                <textarea rows={2} {...registerNewCharge('description')} />
              </label>
            </div>
            {createChargeMutation.error ? (
              <p className="form-error" role="alert">
                {createChargeMutation.error instanceof Error
                  ? createChargeMutation.error.message
                  : t('payments.createChargeError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={createChargeMutation.isPending}
                onClick={closeNewChargeForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={createChargeMutation.isPending} type="submit">
                {createChargeMutation.isPending ? t('common.saving') : t('payments.createCharge')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {historyStudent ? (
        <div className="dialog-overlay" onClick={closePaymentHistory} role="presentation">
        <section
          aria-labelledby="payment-history-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="payment-history-title">{t('payments.paymentHistoryTitle')}</h3>
              <p>{historyStudent.studentName}</p>
            </div>
            <button
              aria-label={t('payments.closeHistory')}
              className="icon-button"
              onClick={closePaymentHistory}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {isHistoryLoading ? <p>{t('common.loading')}</p> : null}

          {!isHistoryLoading && historyPayments.length === 0 ? (
            <p>{t('payments.emptyHistory')}</p>
          ) : null}

          {!isHistoryLoading && historyPayments.length > 0 ? (
            <ul className="payment-history-list">
              {historyPayments.map((payment) => (
                <li className="payment-history-item" key={payment.paymentId}>
                  <div className="payment-history-item-header">
                    <strong>{formatCurrency(payment.totalAmount, locale)}</strong>
                    <span className="status-badge">{paymentMethodLabels[payment.paymentMethod]}</span>
                    <span className="field-hint">{formatDate(payment.paymentDate, locale)}</span>
                  </div>
                  {payment.referenceNumber ? (
                    <p className="field-hint">
                      {t('payments.referenceLabel')} {payment.referenceNumber}
                    </p>
                  ) : null}
                  {payment.notes ? <p className="field-hint">{payment.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        </div>
      ) : null}

      <section className="filters-row filters-row-payments" aria-label={t('payments.filtersAriaLabel')}>
        <input
          aria-label={t('payments.monthAriaLabel')}
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
        <select
          aria-label={t('payments.statusAriaLabel')}
          onChange={(event) => setStatus(event.target.value as PaymentChargeStatus | 'ALL')}
          value={status}
        >
          <option value="ALL">{t('payments.allStatuses')}</option>
          <option value="PENDING">{t('payments.statusPending')}</option>
          <option value="PARTIALLY_PAID">{t('payments.statusPartial')}</option>
          <option value="PAID">{t('payments.statusPaid')}</option>
          <option value="OVERDUE">{t('payments.statusOverdue')}</option>
          <option value="CANCELLED">{t('payments.statusCancelled')}</option>
        </select>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('payments.searchPlaceholder')}
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
              <th>{t('payments.colStudent')}</th>
              <th>{t('payments.colConcept')}</th>
              <th>{t('payments.colPeriod')}</th>
              <th>{t('payments.colAmount')}</th>
              <th>{t('payments.colPaid')}</th>
              <th>{t('payments.colBalance')}</th>
              <th>{t('payments.colStatus')}</th>
              <th>{t('payments.colDue')}</th>
              <th>{t('payments.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map((charge) => (
              <tr key={charge.studentChargeId}>
                <td>{charge.studentName}</td>
                <td>{translateBackendSeed(charge.chargeTypeName)}</td>
                <td>{formatBillingPeriod(charge, locale)}</td>
                <td>{formatCurrency(charge.amountDue, locale)}</td>
                <td>{formatCurrency(charge.amountPaid, locale)}</td>
                <td>{formatCurrency(charge.balance, locale)}</td>
                <td>
                  <span className={`status-badge ${statusClassNames[charge.status]}`}>
                    {statusLabels[charge.status]}
                  </span>
                </td>
                <td>{formatDate(charge.dueDate, locale)}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => openPaymentHistory(charge)} title={t('payments.viewPaymentHistory')} type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() =>
                        openDiscountsPanel({ studentId: charge.studentId, studentName: charge.studentName })
                      }
                      title={t('payments.discountsAction')}
                      type="button"
                    >
                      <Percent size={16} aria-hidden="true" />
                    </button>
                    {payableStatuses.has(charge.status) ? (
                      <button onClick={() => openPaymentForm(charge)} title={t('payments.registerPayment')} type="button">
                        <FileText size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <button onClick={() => openEditForm(charge)} title={t('common.edit')} type="button">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setConfirmingStatusCharge(charge)}
                      title={charge.status === 'CANCELLED' ? t('payments.reactivateAction') : t('payments.cancelChargeAction')}
                      type="button"
                    >
                      {charge.status === 'CANCELLED' ? (
                        <RotateCcw size={16} aria-hidden="true" />
                      ) : (
                        <Ban size={16} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredCharges.length === 0 ? (
              <tr>
                <td colSpan={9}>{t('payments.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            {t('payments.showingCount', { filtered: filteredCharges.length, total: charges.length })}
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
        cancelLabel={t('payments.closeCancel')}
        confirmLabel={confirmingStatusCharge?.status === 'CANCELLED' ? t('payments.reactivateAction') : t('payments.cancelChargeConfirmYes')}
        description={
          confirmingStatusCharge
            ? confirmingStatusCharge.status === 'CANCELLED'
              ? t('payments.reactivateChargeDescription', {
                  charge: `${confirmingStatusCharge.studentName} - ${translateBackendSeed(confirmingStatusCharge.chargeTypeName)}`,
                })
              : t('payments.cancelChargeDescription', {
                  charge: `${confirmingStatusCharge.studentName} - ${translateBackendSeed(confirmingStatusCharge.chargeTypeName)}`,
                })
            : ''
        }
        isConfirming={statusChangeMutation.isPending}
        onCancel={() => setConfirmingStatusCharge(null)}
        onConfirm={() => {
          if (confirmingStatusCharge) {
            statusChangeMutation.mutate({
              charge: confirmingStatusCharge,
              status: confirmingStatusCharge.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED',
            })
          }
        }}
        open={confirmingStatusCharge !== null}
        title={confirmingStatusCharge?.status === 'CANCELLED' ? t('payments.reactivateChargeTitle') : t('payments.cancelChargeTitle')}
        variant={confirmingStatusCharge?.status === 'CANCELLED' ? 'default' : 'danger'}
      />

      {discountsStudent ? (
        <StudentDiscountsPanel
          onClose={closeDiscountsPanel}
          studentId={discountsStudent.studentId}
          studentName={discountsStudent.studentName}
        />
      ) : null}
    </main>
  )
}