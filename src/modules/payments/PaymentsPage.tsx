import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Eye, FileText, ListFilter, Plus, Search, X } from 'lucide-react'
import { createPayment, getPaymentsByStudent, getStudentCharges } from '../../api/payments.api'
import type { PaymentChargeStatus, PaymentMethod, PaymentRequest, StudentCharge } from '../../types/payments'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyCharges: StudentCharge[] = []

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

export function PaymentsPage() {
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(getCurrentMonth())
  const [status, setStatus] = useState<PaymentChargeStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCharge, setSelectedCharge] = useState<StudentCharge | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [historyStudent, setHistoryStudent] = useState<{ studentId: number; studentName: string } | null>(null)
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

  const { data, error, isLoading } = useQuery({
    queryKey: ['student-charges', month, status],
    queryFn: () => getStudentCharges({ month, status }),
    retry: false,
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

  const charges = data ?? emptyCharges
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
    setIsFormOpen(true)
  }

  function closePaymentForm() {
    setIsFormOpen(false)
    setSelectedCharge(null)
    savePaymentMutation.reset()
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

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Pagos mensuales</h2>
          <p>Controla los pagos mensuales de los estudiantes.</p>
        </div>
        <button className="primary-button inline-button" onClick={() => openPaymentForm()} type="button">
          <Plus size={17} aria-hidden="true" />
          Registrar pago
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
            ? 'No tienes permiso para ver la lista de cargos.'
            : 'No se pudo cargar la lista de cargos.'}
        </div>
      ) : null}

      {isFormOpen ? (
        <section className="panel entity-form-panel" aria-labelledby="payment-form-title">
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
      ) : null}

      {historyStudent ? (
        <section className="panel entity-form-panel" aria-labelledby="payment-history-title">
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
    </main>
  )
}