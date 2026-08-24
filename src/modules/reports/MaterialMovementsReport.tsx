import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getMaterialMovementsReport, getMaterials } from '../../api/materials.api'
import type { MaterialItem, MaterialMovementReportEntry } from '../../types/materials'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyEntries: MaterialMovementReportEntry[] = []
const emptyMaterials: MaterialItem[] = []

function formatDate(value: string | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function MaterialMovementsReport() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const [materialId, setMaterialId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState<'' | 'IN' | 'OUT'>('')

  const { data: materialsData } = useQuery({
    queryKey: ['materials', 'movements-lookup'],
    queryFn: () => getMaterials(),
    staleTime: Infinity,
  })

  const materials = materialsData ?? emptyMaterials

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'material-movements', materialId, from, to, type],
    queryFn: () =>
      getMaterialMovementsReport({
        materialId: materialId ? Number(materialId) : undefined,
        from: from || undefined,
        to: to || undefined,
        type: type || undefined,
      }),
    retry: false,
  })

  const entries = data ?? emptyEntries

  return (
    <>
      <p>{t('reports.materials.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.materials.filtersAriaLabel')}>
        <select
          aria-label={t('reports.materials.materialFilterLabel')}
          onChange={(event) => setMaterialId(event.target.value)}
          value={materialId}
        >
          <option value="">{t('reports.materials.allMaterials')}</option>
          {materials.map((material) => (
            <option key={material.materialId} value={material.materialId}>
              {translateBackendSeed(material.name)}
            </option>
          ))}
        </select>
        <input
          aria-label={t('reports.materials.fromLabel')}
          onChange={(event) => setFrom(event.target.value)}
          type="date"
          value={from}
        />
        <input
          aria-label={t('reports.materials.toLabel')}
          onChange={(event) => setTo(event.target.value)}
          type="date"
          value={to}
        />
        <select
          aria-label={t('reports.materials.typeFilterLabel')}
          onChange={(event) => setType(event.target.value as '' | 'IN' | 'OUT')}
          value={type}
        >
          <option value="">{t('reports.materials.allTypes')}</option>
          <option value="IN">{t('materials.movementIn')}</option>
          <option value="OUT">{t('materials.movementOut')}</option>
        </select>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.materials.forbidden') : t('reports.materials.loadError')}
        </div>
      ) : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('reports.materials.colMaterial')}</th>
              <th>{t('reports.materials.colType')}</th>
              <th>{t('reports.materials.colQuantity')}</th>
              <th>{t('reports.materials.colDate')}</th>
              <th>{t('reports.materials.colPerformedBy')}</th>
              <th>{t('reports.materials.colRunningBalance')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.materialMovementId}>
                <td>{translateBackendSeed(entry.materialName)}</td>
                <td>{entry.movementType === 'IN' ? t('materials.movementIn') : t('materials.movementOut')}</td>
                <td>{entry.quantity}</td>
                <td>{formatDate(entry.movementDate, locale)}</td>
                <td>{entry.performedByName ?? entry.performedByEmail ?? '-'}</td>
                <td>{entry.runningBalance ?? '-'}</td>
              </tr>
            ))}
            {!isLoading && entries.length === 0 ? (
              <tr>
                <td colSpan={6}>{t('reports.materials.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
