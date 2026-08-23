import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Ban, Eye, FilePlus2, FileText, ListFilter, Pencil, Plus, RotateCcw, Search, X } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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

const statusLabels: Record<PaymentChargeStatus, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Parcial',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
  OVERDUE: 'Atrasado',
}

const statusClassNames: Record<PaymentChargeStatus, string> = {
  PENDING: 'status-warning',
  PARTIALLY_PAID: 'status-warning',
  PAID: '',
  CANCELLED: 'status-neutral',
  OVERDUE: 'status-danger',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    style: 'currency',
  }).format(value)
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

function formatBillingPeriod(charge: StudentCharge) {
  if (!charge.billingPeriodStart || !charge.billingPeriodEnd) {
    return '-'
  }

  return `${formatDate(charge.billingPeriodStart)} - ${formatDate(charge.billingPeriodEnd)}`
}

const paymentFormSchema = z.object({
  studentChargeId: z.string().min(1, 'Selecciona un cargo.'),
  paymentDate: z.string().min(1, 'La fecha de pago es obligatoria.'),
  amount: z
    .string()
    .refine((value) => value.trim() !== '' && Number(value) > 0, 'Indica un monto valido, mayor a 0.'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']),
  referenceNumber: z.string(),
  notes: z.string(),
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

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

const chargeEditFormSchema = z
  .object({
    dueDate: z.string().min(1, 'La fecha de vencimiento es obligatoria.'),
    billingPeriodStart: z.string(),
    billingPeriodEnd: z.string(),
    amountDue: z
      .string()
      .refine((value) => value.trim() !== '' && Number(value) > 0, 'Indica un monto valido, mayor a 0.'),
    description: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodStart > values.billingPeriodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El periodo debe terminar despues de que empieza.',
        path: ['billingPeriodEnd'],
      })
    }
  })

type ChargeEditFormValues = z.infer<typeof chargeEditFormSchema>

function editFormValuesForCharge(charge: StudentCharge): ChargeEditFormValues {
  return {
    dueDate: charge.dueDate,
    billingPeriodStart: charge.billingPeriodStart ?? '',
    billingPeriodEnd: charge.billingPeriodEnd ?? '',
    amountDue: String(charge.amountDue),
    description: charge.description ?? '',
  }
}

const newChargeFormSchema = z
  .object({
    studentId: z.string().min(1, 'Selecciona un estudiante.'),
    chargeTypeId: z.string().min(1, 'Selecciona un tipo de cargo.'),
    dueDate: z.string().min(1, 'La fecha de vencimiento es obligatoria.'),
    billingPeriodStart: z.string(),
    billingPeriodEnd: z.string(),
    amountDue: z
      .string()
      .refine((value) => value.trim() !== '' && Number(value) > 0, 'Indica un monto valido, mayor a 0.'),
    description: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.billingPeriodStart && values.billingPeriodEnd && values.billingPeriodStart > values.billingPeriodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El periodo debe terminar despues de que empieza.',
        path: ['billingPeriodEnd'],
      })
    }
  })

type NewChargeFormValues = z.infer<typeof newChargeFormSchema>

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
    formState: { errors: newChargeErrors },
  } = useForm<NewChargeFormValues>({
    resolver: zodResolver(newChargeFormSchema),
    defaultValues: emptyNewChargeValues(),
  })

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
      setSuccessMessage('Pago registrado correctamente.')
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
      setSuccessMessage('Cargo actualizado correctamente.')
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
      setSuccessMessage('Cargo creado correctamente.')
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
    setIsNewChargeFormOpen(true)
  }

  function closeNewChargeForm() {
    setIsNewChargeFormOpen(false)
    createChargeMutation.reset()
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
        message: `El monto no puede superar el saldo pendiente (${formatCurrency(charge.balance)}).`,
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
          <h2>Pagos mensuales</h2>
          <p>Controla los pagos mensuales de los estudiantes.</p>
        </div>
        <div className="page-heading-actions">
          <button className="secondary-button" onClick={openNewChargeForm} type="button">
            <FilePlus2 size={17} aria-hidden="true" />
            Nuevo cargo
          </button>
          <button className="primary-button inline-button" onClick={() => openPaymentForm()} type="button">
            <Plus size={17} aria-hidden="true" />
            Registrar pago
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
          {isForbiddenError(error)
            ? 'No tienes permiso para ver la lista de cargos.'
            : 'No se pudo cargar la lista de cargos.'}
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
              <h3 id="payment-form-title">Registrar pago</h3>
              <p>Aplica un pago a un cargo pendiente, parcial o atrasado.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
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
                Cargo *
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
                    <option value="">Selecciona un cargo</option>
                    {payableCharges.map((charge) => (
                      <option key={charge.studentChargeId} value={charge.studentChargeId}>
                        {charge.studentName} - {translateBackendSeed(charge.chargeTypeName)} -{' '}
                        {formatCurrency(charge.balance)}
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
                  Saldo pendiente
                  <input disabled value={formatCurrency(activeCharge.balance)} />
                </label>
              ) : null}
              <label>
                Fecha de pago *
                <input type="date" {...register('paymentDate')} />
                {formErrors.paymentDate ? (
                  <span className="field-error">{formErrors.paymentDate.message}</span>
                ) : null}
              </label>
              <label>
                Monto *
                <input min={0} step="0.01" type="number" {...register('amount')} />
                {formErrors.amount ? <span className="field-error">{formErrors.amount.message}</span> : null}
              </label>
              <label>
                Metodo de pago
                <select {...register('paymentMethod')}>
                  {Object.entries(paymentMethodLabels).map(([method, label]) => (
                    <option key={method} value={method}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {paymentMethod === 'TRANSFER' ? (
                <label>
                  Numero de referencia
                  <input maxLength={100} {...register('referenceNumber')} />
                </label>
              ) : null}
              <label className="entity-form-full">
                Comentario administrativo
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {savePaymentMutation.error ? (
              <p className="form-error" role="alert">
                {savePaymentMutation.error instanceof Error
                  ? savePaymentMutation.error.message
                  : 'No se pudo registrar el pago.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={savePaymentMutation.isPending}
                onClick={closePaymentForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={savePaymentMutation.isPending} type="submit">
                {savePaymentMutation.isPending ? 'Guardando...' : 'Registrar pago'}
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
              <h3 id="charge-edit-form-title">Editar cargo</h3>
              <p>
                {editingCharge.studentName} - {translateBackendSeed(editingCharge.chargeTypeName)}
              </p>
            </div>
            <button
              aria-label="Cerrar formulario"
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
                Fecha de vencimiento *
                <input type="date" {...registerEdit('dueDate')} />
                {editFormErrors.dueDate ? (
                  <span className="field-error">{editFormErrors.dueDate.message}</span>
                ) : null}
              </label>
              <label>
                Monto *
                <input min={0} step="0.01" type="number" {...registerEdit('amountDue')} />
                {editFormErrors.amountDue ? (
                  <span className="field-error">{editFormErrors.amountDue.message}</span>
                ) : null}
              </label>
              <label>
                Inicio de periodo
                <input type="date" {...registerEdit('billingPeriodStart')} />
              </label>
              <label>
                Fin de periodo
                <input type="date" {...registerEdit('billingPeriodEnd')} />
                {editFormErrors.billingPeriodEnd ? (
                  <span className="field-error">{editFormErrors.billingPeriodEnd.message}</span>
                ) : null}
              </label>
              <label className="entity-form-full">
                Descripcion
                <textarea rows={2} {...registerEdit('description')} />
              </label>
            </div>
            {updateChargeMutation.error ? (
              <p className="form-error" role="alert">
                {updateChargeMutation.error instanceof Error
                  ? updateChargeMutation.error.message
                  : 'No se pudo actualizar el cargo.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={updateChargeMutation.isPending}
                onClick={closeEditForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={updateChargeMutation.isPending} type="submit">
                {updateChargeMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
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
              <h3 id="new-charge-form-title">Nuevo cargo</h3>
              <p>Crea un cargo nuevo para un estudiante.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
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
                Estudiante *
                <select {...registerNewCharge('studentId')}>
                  <option value="">Selecciona un estudiante</option>
                  {studentOptions.map((student) => (
                    <option key={student.studentId} value={student.studentId}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
                {newChargeErrors.studentId ? (
                  <span className="field-error">{newChargeErrors.studentId.message}</span>
                ) : null}
              </label>
              <label>
                Tipo de cargo *
                <select
                  {...registerNewCharge('chargeTypeId', {
                    onChange: (event) => handleChargeTypeChange(event.target.value),
                  })}
                >
                  <option value="">Selecciona un tipo de cargo</option>
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
                Fecha de vencimiento *
                <input type="date" {...registerNewCharge('dueDate')} />
                {newChargeErrors.dueDate ? (
                  <span className="field-error">{newChargeErrors.dueDate.message}</span>
                ) : null}
              </label>
              <label>
                Monto *
                <input min={0} step="0.01" type="number" {...registerNewCharge('amountDue')} />
                {newChargeErrors.amountDue ? (
                  <span className="field-error">{newChargeErrors.amountDue.message}</span>
                ) : null}
              </label>
              <label>
                Inicio de periodo
                <input type="date" {...registerNewCharge('billingPeriodStart')} />
              </label>
              <label>
                Fin de periodo
                <input type="date" {...registerNewCharge('billingPeriodEnd')} />
                {newChargeErrors.billingPeriodEnd ? (
                  <span className="field-error">{newChargeErrors.billingPeriodEnd.message}</span>
                ) : null}
              </label>
              <label className="entity-form-full">
                Descripcion
                <textarea rows={2} {...registerNewCharge('description')} />
              </label>
            </div>
            {createChargeMutation.error ? (
              <p className="form-error" role="alert">
                {createChargeMutation.error instanceof Error
                  ? createChargeMutation.error.message
                  : 'No se pudo crear el cargo.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={createChargeMutation.isPending}
                onClick={closeNewChargeForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={createChargeMutation.isPending} type="submit">
                {createChargeMutation.isPending ? 'Guardando...' : 'Crear cargo'}
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
              <h3 id="payment-history-title">Historial de pagos</h3>
              <p>{historyStudent.studentName}</p>
            </div>
            <button
              aria-label="Cerrar historial"
              className="icon-button"
              onClick={closePaymentHistory}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          {isHistoryLoading ? <p>Cargando...</p> : null}

          {!isHistoryLoading && historyPayments.length === 0 ? (
            <p>Sin pagos registrados para este estudiante.</p>
          ) : null}

          {!isHistoryLoading && historyPayments.length > 0 ? (
            <ul className="payment-history-list">
              {historyPayments.map((payment) => (
                <li className="payment-history-item" key={payment.paymentId}>
                  <div className="payment-history-item-header">
                    <strong>{formatCurrency(payment.totalAmount)}</strong>
                    <span className="status-badge">{paymentMethodLabels[payment.paymentMethod]}</span>
                    <span className="field-hint">{formatDate(payment.paymentDate)}</span>
                  </div>
                  {payment.referenceNumber ? (
                    <p className="field-hint">Referencia: {payment.referenceNumber}</p>
                  ) : null}
                  {payment.notes ? <p className="field-hint">{payment.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        </div>
      ) : null}

      <section className="filters-row filters-row-payments" aria-label="Filtros de pagos">
        <input
          aria-label="Mes"
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
        <select
          aria-label="Estado"
          onChange={(event) => setStatus(event.target.value as PaymentChargeStatus | 'ALL')}
          value={status}
        >
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="PARTIALLY_PAID">Parcial</option>
          <option value="PAID">Pagado</option>
          <option value="OVERDUE">Atrasado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar estudiante..."
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
              <th>Estudiante</th>
              <th>Concepto</th>
              <th>Periodo</th>
              <th>Monto</th>
              <th>Pagado</th>
              <th>Saldo</th>
              <th>Estado</th>
              <th>Vence</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCharges.map((charge) => (
              <tr key={charge.studentChargeId}>
                <td>{charge.studentName}</td>
                <td>{translateBackendSeed(charge.chargeTypeName)}</td>
                <td>{formatBillingPeriod(charge)}</td>
                <td>{formatCurrency(charge.amountDue)}</td>
                <td>{formatCurrency(charge.amountPaid)}</td>
                <td>{formatCurrency(charge.balance)}</td>
                <td>
                  <span className={`status-badge ${statusClassNames[charge.status]}`}>
                    {statusLabels[charge.status]}
                  </span>
                </td>
                <td>{formatDate(charge.dueDate)}</td>
                <td>
                  <div className="row-actions">
                    <button onClick={() => openPaymentHistory(charge)} title="Ver historial de pagos" type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    {payableStatuses.has(charge.status) ? (
                      <button onClick={() => openPaymentForm(charge)} title="Registrar pago" type="button">
                        <FileText size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <button onClick={() => openEditForm(charge)} title="Editar" type="button">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setConfirmingStatusCharge(charge)}
                      title={charge.status === 'CANCELLED' ? 'Reactivar' : 'Cancelar cargo'}
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
                <td colSpan={9}>Sin cargos para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredCharges.length} de {charges.length} cargos
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
        cancelLabel="Cerrar"
        confirmLabel={confirmingStatusCharge?.status === 'CANCELLED' ? 'Reactivar' : 'Si, cancelar cargo'}
        description={
          confirmingStatusCharge
            ? confirmingStatusCharge.status === 'CANCELLED'
              ? `${confirmingStatusCharge.studentName} - ${translateBackendSeed(confirmingStatusCharge.chargeTypeName)} volvera a estar pendiente y podra recibir pagos.`
              : `${confirmingStatusCharge.studentName} - ${translateBackendSeed(confirmingStatusCharge.chargeTypeName)} quedara cancelado y no podra recibir pagos hasta que lo reactives.`
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
        title={confirmingStatusCharge?.status === 'CANCELLED' ? 'Reactivar este cargo?' : 'Cancelar este cargo?'}
        variant={confirmingStatusCharge?.status === 'CANCELLED' ? 'default' : 'danger'}
      />
    </main>
  )
}