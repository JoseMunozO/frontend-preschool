import { useQueryClient, useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { X } from 'lucide-react'
import { ApiError } from '../../api/client'
import { claimParent } from '../../api/parents.api'
import type { ParentListItem, ParentRequest, ParentStatus } from '../../types/parents'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createClaimFormSchema(t: TFunction) {
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
  })
}

type ClaimFormValues = z.infer<ReturnType<typeof createClaimFormSchema>>

function claimFormValues(parent: ParentListItem): ClaimFormValues {
  return {
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email ?? '',
    phone: '',
    address: '',
    preferredLanguage: '',
    status: 'ACTIVE',
    notes: '',
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

type ClaimParentModalProps = {
  parent: ParentListItem
  onClose: () => void
  onClaimed: () => void
}

export function ClaimParentModal({ parent, onClose, onClaimed }: ClaimParentModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const statusLabels: Record<ParentStatus, string> = {
    ACTIVE: t('parents.statusActive'),
    INACTIVE: t('parents.statusInactive'),
  }
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(createClaimFormSchema(t)),
    defaultValues: claimFormValues(parent),
  })

  const claimParentMutation = useMutation({
    mutationFn: (request: ParentRequest) => claimParent(parent.parentId, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'trash'] })
      await queryClient.invalidateQueries({ queryKey: ['reports', 'parents-lookup'] })
      onClaimed()
    },
  })

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
    }

    claimParentMutation.mutate(request)
  })

  return (
    <div className="dialog-overlay" onClick={onClose} role="presentation">
      <section
        aria-labelledby="claim-parent-form-title"
        aria-modal="true"
        className="panel entity-form-panel dialog-panel-wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="form-panel-heading">
          <div>
            <h3 id="claim-parent-form-title">{t('parents.claimFormTitle')}</h3>
            <p>{t('parents.claimFormSubtitle')}</p>
          </div>
          <button
            aria-label={t('common.closeForm')}
            className="icon-button"
            disabled={claimParentMutation.isPending}
            onClick={onClose}
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
              {formErrors.firstName ? <span className="field-error">{formErrors.firstName.message}</span> : null}
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
            <label className="entity-form-full">
              {t('parents.notesLabel')}
              <textarea rows={2} {...register('notes')} />
            </label>
          </div>
          {claimParentMutation.error ? (
            <p className="form-error" role="alert">
              {claimErrorMessage(claimParentMutation.error, t)}
            </p>
          ) : null}
          <footer className="form-actions">
            <button
              className="secondary-button"
              disabled={claimParentMutation.isPending}
              onClick={onClose}
              type="button"
            >
              {t('common.cancel')}
            </button>
            <button className="primary-button" disabled={claimParentMutation.isPending} type="submit">
              {claimParentMutation.isPending ? t('parents.reactivating') : t('parents.reactivateParent')}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
