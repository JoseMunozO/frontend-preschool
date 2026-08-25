import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getStudentHealthReport, getStudents } from '../../api/students.api'
import type { StudentHealthReportEntry, StudentListItem } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyEntries: StudentHealthReportEntry[] = []
const emptyStudents: StudentListItem[] = []

export function HealthReport() {
  const { t } = useTranslation()
  const [groupId, setGroupId] = useState('')

  const { data: allGroupsData } = useQuery({
    queryKey: ['students', 'groups-lookup'],
    queryFn: () => getStudents(),
    staleTime: Infinity,
  })

  const groups = useMemo(() => {
    const students = allGroupsData ?? emptyStudents
    const uniqueGroups = new Map<number, string>()

    students.forEach((student) => {
      if (student.groupId) {
        uniqueGroups.set(
          student.groupId,
          student.groupName ?? t('attendance.defaultGroupName', { id: student.groupId }),
        )
      }
    })

    return Array.from(uniqueGroups.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [allGroupsData, t])

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'health', groupId],
    queryFn: () => getStudentHealthReport({ groupId: groupId || undefined }),
    retry: false,
  })

  const entries = data ?? emptyEntries

  return (
    <>
      <p>{t('reports.health.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.health.filtersAriaLabel')}>
        <select
          aria-label={t('reports.health.groupFilterLabel')}
          onChange={(event) => setGroupId(event.target.value)}
          value={groupId}
        >
          <option value="">{t('reports.health.allGroups')}</option>
          {groups.map(([id, name]) => (
            <option key={id} value={id}>
              {translateBackendSeed(name)}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.health.forbidden') : t('reports.health.loadError')}
        </div>
      ) : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('reports.health.colStudent')}</th>
              <th>{t('reports.health.colGroup')}</th>
              <th>{t('reports.health.colAllergies')}</th>
              <th>{t('reports.health.colMedicalNotes')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.studentId}>
                <td>{entry.studentName}</td>
                <td>{translateBackendSeed(entry.groupName)}</td>
                <td>{entry.allergies || '-'}</td>
                <td>{entry.medicalNotes || '-'}</td>
              </tr>
            ))}
            {!isLoading && entries.length === 0 ? (
              <tr>
                <td colSpan={4}>{t('reports.health.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
