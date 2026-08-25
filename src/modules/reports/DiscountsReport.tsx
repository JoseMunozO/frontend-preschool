import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getStudentCharges } from '../../api/payments.api'
import type { DiscountType, PaymentChargeStatus, StudentCharge } from '../../types/payments'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyCharges: StudentCharge[] = []

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

function formatDiscountValue(charge: StudentCharge, locale: string) {
  if (charge.discountType === 'PERCENTAGE') {
    return `${charge.discountValue}%`
  }

  return formatCurrency(charge.discountValue ?? 0, locale)
}

export function DiscountsReport() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const discountTypeLabels: Record<DiscountType, string> = {
    PERCENTAGE: t('payments.discountTypePercentage'),
    FIXED_AMOUNT: t('payments.discountTypeFixedAmount'),
  }
  const statusLabels: Record<PaymentChargeStatus, string> = {
    PENDING: t('payments.statusPending'),
    PARTIALLY_PAID: t('payments.statusPartial'),
    PAID: t('payments.statusPaid'),
    CANCELLED: t('payments.statusCancelled'),
    OVERDUE: t('payments.statusOverdue'),
  }
  const [month, setMonth] = useState('')

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'discounts', month],
    queryFn: () => getStudentCharges({ month: month || undefined, hasDiscount: true }),
    retry: false,
  })

  // Defensive client-side filter: backend's hasDiscount param may not be live on
  // every deployment yet, so don't assume the server already narrowed the list.
  const discountedCharges = useMemo(
    () => (data ?? emptyCharges).filter((charge) => charge.discountType),
    [data],
  )

  return (
    <>
      <p>{t('reports.discounts.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.discounts.filtersAriaLabel')}>
        <input
          aria-label={t('reports.discounts.monthAriaLabel')}
          onChange={(event) => setMonth(event.target.value)}
          type="month"
          value={month}
        />
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.discounts.forbidden') : t('reports.discounts.loadError')}
        </div>
      ) : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('payments.colStudent')}</th>
              <th>{t('payments.colConcept')}</th>
              <th>{t('reports.discounts.colOriginalAmount')}</th>
              <th>{t('reports.discounts.colCurrentAmount')}</th>
              <th>{t('reports.discounts.colDiscountType')}</th>
              <th>{t('reports.discounts.colDiscountValue')}</th>
              <th>{t('reports.discounts.colReason')}</th>
              <th>{t('payments.colStatus')}</th>
              <th>{t('payments.colDue')}</th>
            </tr>
          </thead>
          <tbody>
            {discountedCharges.map((charge) => (
              <tr key={charge.studentChargeId}>
                <td>{charge.studentName}</td>
                <td>{translateBackendSeed(charge.chargeTypeName)}</td>
                <td>{formatCurrency(charge.originalAmount ?? charge.amountDue, locale)}</td>
                <td>{formatCurrency(charge.amountDue, locale)}</td>
                <td>{charge.discountType ? discountTypeLabels[charge.discountType] : '-'}</td>
                <td>{formatDiscountValue(charge, locale)}</td>
                <td>{charge.discountReason || '-'}</td>
                <td>{statusLabels[charge.status]}</td>
                <td>{formatDate(charge.dueDate, locale)}</td>
              </tr>
            ))}
            {!isLoading && discountedCharges.length === 0 ? (
              <tr>
                <td colSpan={9}>{t('reports.discounts.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
