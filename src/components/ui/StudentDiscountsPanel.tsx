import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { Ban, X } from 'lucide-react'
import { createDiscount, deactivateDiscount, getStudentDiscounts } from '../../api/payments.api'
import type { DiscountType, StudentDiscount, StudentDiscountRequest } from '../../types/payments'
import { ConfirmDialog } from './ConfirmDialog'

const emptyDiscounts: StudentDiscount[] = []

function todayInputValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
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

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: 'MXN',
    style: 'currency',
  }).format(value)
}

function formatDiscountValue(discount: StudentDiscount, locale: string) {
  return discount.discountType === 'PERCENTAGE' ? `${discount.value}%` : formatCurrency(discount.value, locale)
}

function createDiscountFormSchema(t: TFunction) {
  return z
    .object({
      discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
      value: z.string().refine((value) => value.trim() !== '' && Number(value) > 0, t('discounts.valueInvalid')),
      reason: z.string().trim().min(1, t('discounts.reasonRequired')),
      validFrom: z.string().min(1, t('discounts.validFromRequired')),
      validUntil: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.validUntil && values.validFrom && values.validUntil < values.validFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('discounts.validUntilAfterFrom'),
          path: ['validUntil'],
        })
      }
    })
}

type DiscountFormValues = z.infer<ReturnType<typeof createDiscountFormSchema>>

function emptyDiscountFormValues(): DiscountFormValues {
  return {
    discountType: 'PERCENTAGE',
    value: '',
    reason: '',
    validFrom: todayInputValue(),
    validUntil: '',
  }
}

type StudentDiscountsPanelProps = {
  studentId: number
  studentName: string
  onClose: () => void
}

export function StudentDiscountsPanel({ studentId, studentName, onClose }: StudentDiscountsPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const discountTypeLabels: Record<DiscountType, string> = {
    PERCENTAGE: t('discounts.typePercentage'),
    FIXED_AMOUNT: t('discounts.typeFixedAmount'),
  }
  const discountFormSchema = useMemo(() => createDiscountFormSchema(t), [t])
  const queryClient = useQueryClient()
  const [deactivateTarget, setDeactivateTarget] = useState<StudentDiscount | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: emptyDiscountFormValues(),
  })

  const { data, error, isLoading } = useQuery({
    queryKey: ['student-discounts', studentId],
    queryFn: () => getStudentDiscounts(studentId),
  })

  const createMutation = useMutation({
    mutationFn: (request: StudentDiscountRequest) => createDiscount(studentId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-discounts', studentId] })
      reset(emptyDiscountFormValues())
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (discountId: number) => deactivateDiscount(studentId, discountId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student-discounts', studentId] })
      setDeactivateTarget(null)
    },
  })

  const discounts = data ?? emptyDiscounts

  const onSubmit = handleSubmit((values) => {
    const request: StudentDiscountRequest = {
      discountType: values.discountType,
      value: Number(values.value),
      reason: values.reason.trim(),
      validFrom: values.validFrom,
      validUntil: values.validUntil || undefined,
    }

    createMutation.mutate(request)
  })

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} role="presentation">
        <section
          aria-labelledby="discounts-panel-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="discounts-panel-title">{t('discounts.title')}</h3>
              <p>{studentName}</p>
            </div>
            <button aria-label={t('common.close')} className="icon-button" onClick={onClose} type="button">
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                {t('discounts.typeLabel')}
                <select {...register('discountType')}>
                  {Object.entries(discountTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('discounts.valueLabel')}
                <input min={0} step="0.01" type="number" {...register('value')} />
                {errors.value ? <span className="field-error">{errors.value.message}</span> : null}
              </label>
              <label>
                {t('discounts.validFromLabel')}
                <input type="date" {...register('validFrom')} />
                {errors.validFrom ? <span className="field-error">{errors.validFrom.message}</span> : null}
              </label>
              <label>
                {t('discounts.validUntilLabel')}
                <input type="date" {...register('validUntil')} />
                {errors.validUntil ? <span className="field-error">{errors.validUntil.message}</span> : null}
                <span className="field-hint">{t('discounts.validUntilHint')}</span>
              </label>
              <label className="entity-form-full">
                {t('discounts.reasonLabel')}
                <input maxLength={255} {...register('reason')} />
                {errors.reason ? <span className="field-error">{errors.reason.message}</span> : null}
              </label>
            </div>
            {createMutation.error ? (
              <p className="form-error" role="alert">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : t('discounts.createError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button className="primary-button" disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? t('common.saving') : t('discounts.addDiscount')}
              </button>
            </footer>
          </form>

          <p className="panel-section-label">{t('discounts.historyTitle')}</p>

          {error ? <p className="notice">{t('discounts.loadError')}</p> : null}
          {isLoading ? <p>{t('common.loading')}</p> : null}
          {!isLoading && !error && discounts.length === 0 ? <p>{t('discounts.emptyHistory')}</p> : null}

          {!isLoading && discounts.length > 0 ? (
            <ul className="contact-list">
              {discounts.map((discount) => (
                <li className="contact-item" key={discount.studentDiscountId}>
                  <div className="contact-item-header">
                    <span className="contact-item-title">
                      <strong>
                        {discountTypeLabels[discount.discountType]} - {formatDiscountValue(discount, locale)}
                      </strong>
                      <span className={discount.active ? 'status-badge' : 'status-badge status-neutral'}>
                        {discount.active ? t('discounts.active') : t('discounts.inactive')}
                      </span>
                    </span>
                    {discount.active ? (
                      <button onClick={() => setDeactivateTarget(discount)} title={t('discounts.deactivate')} type="button">
                        <Ban size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <p className="field-hint">{discount.reason}</p>
                  <p className="field-hint">
                    {t('discounts.validFromPrefix')} {formatDate(discount.validFrom, locale)}
                    {discount.validUntil
                      ? ` ${t('discounts.validUntilPrefix')} ${formatDate(discount.validUntil, locale)}`
                      : ` ${t('discounts.indefinite')}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={t('discounts.deactivateConfirmYes')}
        description={
          deactivateTarget
            ? t('discounts.deactivateConfirmDescription', {
                discount: `${discountTypeLabels[deactivateTarget.discountType]} - ${formatDiscountValue(deactivateTarget, locale)}`,
                student: studentName,
              })
            : ''
        }
        isConfirming={deactivateMutation.isPending}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (deactivateTarget) {
            deactivateMutation.mutate(deactivateTarget.studentDiscountId)
          }
        }}
        open={deactivateTarget !== null}
        title={t('discounts.deactivateConfirmTitle')}
        variant="danger"
      />
    </>
  )
}
