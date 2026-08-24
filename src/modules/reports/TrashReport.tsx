import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RotateCcw, UserPlus } from 'lucide-react'
import { getTrash } from '../../api/reports.api'
import type { TrashEntityType, TrashEntry } from '../../types/reports'
import { restoreStudent } from '../../api/students.api'
import { restoreMaterial } from '../../api/materials.api'
import { getParents, restoreParent } from '../../api/parents.api'
import type { ParentListItem } from '../../types/parents'
import { restoreSchedule } from '../../api/schedules.api'
import { restoreStaff } from '../../api/staff.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { ClaimParentModal } from './ClaimParentModal'

const emptyEntries: TrashEntry[] = []
const emptyParents: ParentListItem[] = []

const entityTypes: TrashEntityType[] = ['STUDENT', 'MATERIAL', 'PARENT', 'PARENT_ARCHIVED', 'SCHEDULE_SLOT', 'STAFF']

function formatDate(value: string | null | undefined, locale: string | undefined) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function TrashReport() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const entityTypeLabels: Record<TrashEntityType, string> = {
    STUDENT: t('reports.trash.entityType.STUDENT'),
    MATERIAL: t('reports.trash.entityType.MATERIAL'),
    PARENT: t('reports.trash.entityType.PARENT'),
    PARENT_ARCHIVED: t('reports.trash.entityType.PARENT_ARCHIVED'),
    SCHEDULE_SLOT: t('reports.trash.entityType.SCHEDULE_SLOT'),
    STAFF: t('reports.trash.entityType.STAFF'),
  }
  const [entityTypeFilter, setEntityTypeFilter] = useState<TrashEntityType | 'ALL'>('ALL')
  const [claimTarget, setClaimTarget] = useState<ParentListItem | null>(null)

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'trash'],
    queryFn: getTrash,
    retry: false,
  })

  const entries = data ?? emptyEntries
  const hasArchivedParents = entries.some((entry) => entry.entityType === 'PARENT_ARCHIVED')

  const { data: parentsLookupData } = useQuery({
    queryKey: ['reports', 'parents-lookup'],
    queryFn: () => getParents({ includeDeleted: true }),
    enabled: hasArchivedParents,
  })

  const parentsLookup = parentsLookupData ?? emptyParents

  function invalidateAfterRestore(domainQueryKey: string) {
    return async () => {
      await queryClient.invalidateQueries({ queryKey: ['reports', 'trash'] })
      await queryClient.invalidateQueries({ queryKey: [domainQueryKey] })
    }
  }

  const restoreStudentMutation = useMutation({
    mutationFn: (id: number) => restoreStudent(id),
    onSuccess: invalidateAfterRestore('students'),
  })
  const restoreMaterialMutation = useMutation({
    mutationFn: (id: number) => restoreMaterial(id),
    onSuccess: invalidateAfterRestore('materials'),
  })
  const restoreParentMutation = useMutation({
    mutationFn: (id: number) => restoreParent(id),
    onSuccess: invalidateAfterRestore('parents'),
  })
  const restoreScheduleMutation = useMutation({
    mutationFn: (id: number) => restoreSchedule(id),
    onSuccess: invalidateAfterRestore('schedules'),
  })
  const restoreStaffMutation = useMutation({
    mutationFn: (id: number) => restoreStaff(id),
    onSuccess: invalidateAfterRestore('staff'),
  })

  const restoreMutations: Record<
    Exclude<TrashEntityType, 'PARENT_ARCHIVED'>,
    UseMutationResult<unknown, Error, number, unknown>
  > = {
    STUDENT: restoreStudentMutation,
    MATERIAL: restoreMaterialMutation,
    PARENT: restoreParentMutation,
    SCHEDULE_SLOT: restoreScheduleMutation,
    STAFF: restoreStaffMutation,
  }

  const filteredEntries = entries.filter(
    (entry) => entityTypeFilter === 'ALL' || entry.entityType === entityTypeFilter,
  )

  function openClaim(entry: TrashEntry) {
    const parent = parentsLookup.find((candidate) => candidate.parentId === entry.entityId)
    if (parent) {
      setClaimTarget(parent)
    }
  }

  return (
    <>
      <p>{t('reports.trash.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.trash.filtersAriaLabel')}>
        <select
          aria-label={t('reports.trash.entityTypeFilterLabel')}
          onChange={(event) => setEntityTypeFilter(event.target.value as TrashEntityType | 'ALL')}
          value={entityTypeFilter}
        >
          <option value="ALL">{t('reports.trash.allTypes')}</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {entityTypeLabels[type]}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.trash.forbidden') : t('reports.trash.loadError')}
        </div>
      ) : null}

      <div className="panel" aria-busy={isLoading}>
        {isLoading ? <p>{t('common.loading')}</p> : null}

        {!isLoading && filteredEntries.length === 0 ? <p>{t('reports.trash.emptyTable')}</p> : null}

        {!isLoading && filteredEntries.length > 0 ? (
          <ul className="trash-list">
            {filteredEntries.map((entry) => {
              const isArchivedParent = entry.entityType === 'PARENT_ARCHIVED'
              const restoreMutation = isArchivedParent
                ? null
                : restoreMutations[entry.entityType as Exclude<TrashEntityType, 'PARENT_ARCHIVED'>]
              const isRestoring = restoreMutation
                ? restoreMutation.isPending && restoreMutation.variables === entry.entityId
                : false
              const canClaim = !isArchivedParent || parentsLookup.some((p) => p.parentId === entry.entityId)

              return (
                <li className="trash-list-item" key={`${entry.entityType}-${entry.entityId}`}>
                  <div>
                    <strong>{entry.label}</strong>
                    <span className="field-hint">
                      {entityTypeLabels[entry.entityType]} · {t('common.deletedOn', { date: formatDate(entry.deletedAt, i18n.resolvedLanguage) })}
                      {entry.purgeDeadline
                        ? ` · ${t('reports.trash.purgeDeadlineLabel', { date: formatDate(entry.purgeDeadline, i18n.resolvedLanguage) })}`
                        : ''}
                    </span>
                  </div>
                  {isArchivedParent ? (
                    <button
                      className="secondary-button"
                      disabled={!canClaim}
                      onClick={() => openClaim(entry)}
                      type="button"
                    >
                      <UserPlus size={16} aria-hidden="true" />
                      {t('parents.claim')}
                    </button>
                  ) : (
                    <button
                      className="secondary-button"
                      disabled={isRestoring}
                      onClick={() => restoreMutation?.mutate(entry.entityId)}
                      type="button"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                      {isRestoring ? t('common.restoring') : t('common.restore')}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {claimTarget ? (
        <ClaimParentModal
          onClaimed={() => setClaimTarget(null)}
          onClose={() => setClaimTarget(null)}
          parent={claimTarget}
        />
      ) : null}
    </>
  )
}
