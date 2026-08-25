import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getAttendanceSummaryReport } from '../../api/attendance.api'
import type { AttendanceReportEntry } from '../../api/attendance.api'
import { getStudents } from '../../api/students.api'
import type { StudentListItem } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyEntries: AttendanceReportEntry[] = []
const emptyStudents: StudentListItem[] = []

export function AttendanceSummaryReport() {
  const { t } = useTranslation()
  const [groupId, setGroupId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

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
    queryKey: ['reports', 'attendance-summary', groupId, from, to],
    queryFn: () => getAttendanceSummaryReport({ groupId: groupId || undefined, from: from || undefined, to: to || undefined }),
    retry: false,
  })

  const entries = data ?? emptyEntries

  return (
    <>
      <p>{t('reports.attendance.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.attendance.filtersAriaLabel')}>
        <select
          aria-label={t('reports.attendance.groupFilterLabel')}
          onChange={(event) => setGroupId(event.target.value)}
          value={groupId}
        >
          <option value="">{t('reports.attendance.allGroups')}</option>
          {groups.map(([id, name]) => (
            <option key={id} value={id}>
              {translateBackendSeed(name)}
            </option>
          ))}
        </select>
        <input
          aria-label={t('reports.attendance.fromLabel')}
          onChange={(event) => setFrom(event.target.value)}
          type="date"
          value={from}
        />
        <input
          aria-label={t('reports.attendance.toLabel')}
          onChange={(event) => setTo(event.target.value)}
          type="date"
          value={to}
        />
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.attendance.forbidden') : t('reports.attendance.loadError')}
        </div>
      ) : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('reports.attendance.colStudent')}</th>
              <th>{t('reports.attendance.colGroup')}</th>
              <th>{t('reports.attendance.colPresent')}</th>
              <th>{t('reports.attendance.colAbsent')}</th>
              <th>{t('reports.attendance.colLate')}</th>
              <th>{t('reports.attendance.colSick')}</th>
              <th>{t('reports.attendance.colUnmarked')}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.studentId}>
                <td>{entry.studentName}</td>
                <td>{translateBackendSeed(entry.groupName)}</td>
                <td>{entry.presentCount}</td>
                <td>{entry.absentCount}</td>
                <td>{entry.lateCount}</td>
                <td>{entry.sickCount}</td>
                <td>{entry.unmarkedCount}</td>
              </tr>
            ))}
            {!isLoading && entries.length === 0 ? (
              <tr>
                <td colSpan={7}>{t('reports.attendance.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
