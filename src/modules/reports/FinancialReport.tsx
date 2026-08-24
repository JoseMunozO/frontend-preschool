import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Clock3, DollarSign } from 'lucide-react'
import { getMonthlyPaymentsReport } from '../../api/payments.api'
import type { PaymentChargeStatus, StudentCharge } from '../../types/payments'
import { StatCard } from '../../components/ui/StatCard'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyCharges: StudentCharge[] = []

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: 'DOP',
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

type ChargesTableProps = {
  charges: StudentCharge[]
  emptyLabel: string
  locale: string
  statusLabels: Record<PaymentChargeStatus, string>
}

function ChargesTable({ charges, emptyLabel, locale, statusLabels }: ChargesTableProps) {
  const { t } = useTranslation()

  if (charges.length === 0) {
    return <p className="field-hint">{emptyLabel}</p>
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>{t('payments.colStudent')}</th>
            <th>{t('payments.colConcept')}</th>
            <th>{t('payments.colDue')}</th>
            <th>{t('payments.colAmount')}</th>
            <th>{t('payments.colBalance')}</th>
            <th>{t('payments.colStatus')}</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => (
            <tr key={charge.studentChargeId}>
              <td>{charge.studentName}</td>
              <td>{translateBackendSeed(charge.chargeTypeName)}</td>
              <td>{formatDate(charge.dueDate, locale)}</td>
              <td>{formatCurrency(charge.amountDue, locale)}</td>
              <td>{formatCurrency(charge.balance, locale)}</td>
              <td>{statusLabels[charge.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FinancialReport() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const statusLabels: Record<PaymentChargeStatus, string> = {
    PENDING: t('payments.statusPending'),
    PARTIALLY_PAID: t('payments.statusPartial'),
    PAID: t('payments.statusPaid'),
    CANCELLED: t('payments.statusCancelled'),
    OVERDUE: t('payments.statusOverdue'),
  }
  const [month, setMonth] = useState(getCurrentMonth())

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'monthly-payments', month],
    queryFn: () => getMonthlyPaymentsReport(month),
    retry: false,
  })

  return (
    <>
      <p>{t('reports.financial.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.financial.monthAriaLabel')}>
        <input
          aria-label={t('reports.financial.monthAriaLabel')}
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.financial.forbidden') : t('reports.financial.loadError')}
        </div>
      ) : null}

      <section className="stats-grid stats-grid-3" aria-busy={isLoading}>
        <StatCard
          icon={<Clock3 size={28} aria-hidden="true" />}
          label={t('reports.financial.pendingBalance')}
          tone="orange"
          value={data ? formatCurrency(data.pendingBalance, locale) : '-'}
        />
        <StatCard
          icon={<AlertTriangle size={28} aria-hidden="true" />}
          label={t('reports.financial.overdueBalance')}
          tone="danger"
          value={data ? formatCurrency(data.overdueBalance, locale) : '-'}
        />
        <StatCard
          icon={<DollarSign size={28} aria-hidden="true" />}
          label={t('reports.financial.paymentsReceived')}
          tone="green"
          value={data ? formatCurrency(data.paymentsReceived, locale) : '-'}
        />
      </section>

      <article className="panel">
        <h3>{t('reports.financial.pendingChargesTitle', { count: data?.pendingCount ?? 0 })}</h3>
        <ChargesTable
          charges={data?.pendingCharges ?? emptyCharges}
          emptyLabel={t('reports.financial.emptyPending')}
          locale={locale}
          statusLabels={statusLabels}
        />
      </article>

      <article className="panel">
        <h3>{t('reports.financial.overdueChargesTitle', { count: data?.overdueCount ?? 0 })}</h3>
        <ChargesTable
          charges={data?.overdueCharges ?? emptyCharges}
          emptyLabel={t('reports.financial.emptyOverdue')}
          locale={locale}
          statusLabels={statusLabels}
        />
      </article>
    </>
  )
}
