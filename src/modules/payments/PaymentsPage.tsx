import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, FileText, ListFilter, Plus, Search } from 'lucide-react'
import { getStudentCharges } from '../../api/payments.api'
import type { PaymentChargeStatus, StudentCharge } from '../../types/payments'
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

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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

export function PaymentsPage() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [status, setStatus] = useState<PaymentChargeStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const { data, error, isLoading } = useQuery({
    queryKey: ['student-charges', month, status],
    queryFn: () => getStudentCharges({ month, status }),
    retry: false,
  })

  const charges = data ?? emptyCharges
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

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Pagos mensuales</h2>
          <p>Controla los pagos mensuales de los estudiantes.</p>
        </div>
        <button className="primary-button inline-button" type="button">
          <Plus size={17} aria-hidden="true" />
          Registrar pago
        </button>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de cargos.</div> : null}

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
                    <button title="Ver cargo" type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button title="Registrar pago" type="button">
                      <FileText size={16} aria-hidden="true" />
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
    </main>
  )
}
