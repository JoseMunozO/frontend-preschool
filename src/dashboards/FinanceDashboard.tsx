import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Box, Clock3, DollarSign } from 'lucide-react'
import { getFinanceDashboardSummary } from '../api/dashboard.api'
import { getMaterials } from '../api/materials.api'
import { getStudentCharges } from '../api/payments.api'
import { StatCard } from '../components/ui/StatCard'
import { isForbiddenError } from '../utils/apiErrors'
import { translateBackendSeed } from '../utils/displayText'

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: 'DOP',
    style: 'currency',
  }).format(value)
}

export function FinanceDashboard() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'

  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-finance-summary'],
    queryFn: getFinanceDashboardSummary,
    retry: false,
  })

  const { data: lowStockMaterials, isLoading: isLowStockLoading } = useQuery({
    queryKey: ['dashboard-finance-low-stock'],
    queryFn: () => getMaterials({ lowStock: true }),
    enabled: !error,
  })

  const { data: overdueCharges, isLoading: isOverdueLoading } = useQuery({
    queryKey: ['dashboard-finance-overdue'],
    queryFn: () => getStudentCharges({ status: 'OVERDUE' }),
    enabled: !error,
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <p>{t('dashboard.welcomeFinance')}</p>
        </div>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('dashboard.forbidden') : t('dashboard.loadError')}
        </div>
      ) : null}

      <section className="stats-grid" aria-busy={isLoading}>
        <StatCard
          icon={<DollarSign size={28} aria-hidden="true" />}
          label={t('dashboard.paymentsThisMonth')}
          tone="green"
          value={data ? formatCurrency(data.monthPaymentsReceived, locale) : '-'}
        />
        <StatCard
          icon={<Clock3 size={28} aria-hidden="true" />}
          label={data ? t('dashboard.pendingChargesLabel', { count: data.pendingCharges }) : t('dashboard.pendingPayments')}
          tone="orange"
          value={data ? formatCurrency(data.pendingBalance, locale) : '-'}
        />
        <StatCard
          icon={<AlertTriangle size={28} aria-hidden="true" />}
          label={data ? t('dashboard.overdueChargesLabel', { count: data.overdueCharges }) : t('dashboard.overdue')}
          tone="danger"
          value={data ? formatCurrency(data.overdueBalance, locale) : '-'}
        />
        <StatCard
          actionLabel={t('dashboard.viewInventory')}
          icon={<Box size={28} aria-hidden="true" />}
          label={t('dashboard.lowStockMaterials')}
          tone="yellow"
          value={lowStockMaterials ? lowStockMaterials.length : '-'}
        />
      </section>

      <section className="work-grid">
        <article className="panel notices-panel">
          <h3>{t('dashboard.overdueChargesTitle')}</h3>
          {isOverdueLoading ? <p className="empty-copy">{t('dashboard.loading')}</p> : null}
          {!isOverdueLoading && (overdueCharges?.length ?? 0) === 0 ? (
            <p className="empty-copy">{t('dashboard.noOverdueCharges')}</p>
          ) : null}
          {overdueCharges && overdueCharges.length > 0 ? (
            <ul>
              {overdueCharges.slice(0, 5).map((charge) => (
                <li key={charge.studentChargeId}>
                  <strong>{charge.studentName}</strong>
                  <span>
                    {translateBackendSeed(charge.chargeTypeName)} · {formatCurrency(charge.balance, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
        <article className="panel notices-panel">
          <h3>{t('dashboard.lowStockMaterialsTitle')}</h3>
          {isLowStockLoading ? <p className="empty-copy">{t('dashboard.loading')}</p> : null}
          {!isLowStockLoading && (lowStockMaterials?.length ?? 0) === 0 ? (
            <p className="empty-copy">{t('dashboard.noLowStockMaterials')}</p>
          ) : null}
          {lowStockMaterials && lowStockMaterials.length > 0 ? (
            <ul>
              {lowStockMaterials.slice(0, 5).map((material) => (
                <li key={material.materialId}>
                  <strong>{translateBackendSeed(material.name)}</strong>
                  <span>
                    {material.quantityOnHand} / {material.minimumQuantity ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </main>
  )
}
