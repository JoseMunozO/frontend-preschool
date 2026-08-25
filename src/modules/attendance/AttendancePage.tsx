import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { History, X } from 'lucide-react'
import { ApiError } from '../../api/client'
import { getAttendance, getStudentAttendanceHistory, saveAttendance } from '../../api/attendance.api'
import type { AttendanceStatus, StudentAttendance } from '../../api/attendance.api'
import { getStudents } from '../../api/students.api'
import type { StudentListItem } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const emptyRoster: StudentAttendance[] = []
const emptyStudents: StudentListItem[] = []

type LocalEntry = {
  status: AttendanceStatus | ''
  notes: string
}

function todayInputValue() {
  const date = new Date()
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function saveAttendanceErrorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiError && error.status === 409) {
    return t('attendance.saveArchivedError')
  }

  if (error instanceof ApiError && error.status === 400) {
    return t('attendance.saveFutureError')
  }

  if (error instanceof ApiError) {
    return error.message
  }

  return t('attendance.saveGenericError')
}

export function AttendancePage() {
  const { t, i18n } = useTranslation()
  const statusLabels: Record<AttendanceStatus, string> = {
    PRESENT: t('attendance.statusPresent'),
    ABSENT: t('attendance.statusAbsent'),
    SICK: t('attendance.statusSick'),
    LATE: t('attendance.statusLate'),
  }
  const queryClient = useQueryClient()
  const [groupId, setGroupId] = useState('')
  const [date, setDate] = useState(todayInputValue())
  const [entries, setEntries] = useState<Record<number, LocalEntry>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [historyStudent, setHistoryStudent] = useState<StudentAttendance | null>(null)
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const today = todayInputValue()
  const isToday = date === today

  const { data: allGroupsData, error: groupsError } = useQuery({
    queryKey: ['students', 'groups-lookup'],
    queryFn: () => getStudents(),
    retry: false,
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

  const {
    data: rosterData,
    error: rosterError,
    isLoading: isRosterLoading,
  } = useQuery({
    queryKey: ['attendance', groupId, date],
    queryFn: () => getAttendance({ groupId: Number(groupId), date }),
    enabled: groupId !== '',
  })

  const roster = rosterData ?? emptyRoster

  const [syncedRosterData, setSyncedRosterData] = useState(rosterData)
  if (rosterData !== syncedRosterData) {
    setSyncedRosterData(rosterData)
    const nextEntries: Record<number, LocalEntry> = {}
    roster.forEach((item) => {
      nextEntries[item.studentId] = {
        status: item.status ?? '',
        notes: item.notes ?? '',
      }
    })
    setEntries(nextEntries)
  }

  const saveAttendanceMutation = useMutation({
    mutationFn: () => {
      const records = roster
        .map((item) => ({ studentId: item.studentId, entry: entries[item.studentId] }))
        .filter((item): item is { studentId: number; entry: LocalEntry } => item.entry?.status !== '')
        .map(({ studentId, entry }) => ({
          studentId,
          status: entry.status as AttendanceStatus,
          notes: entry.notes.trim() || undefined,
        }))

      return saveAttendance({ groupId: Number(groupId), date, records })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance', groupId, date] })
      setSuccessMessage(t('attendance.saveSuccess'))
    },
  })

  const saveErrorMessage = saveAttendanceMutation.isError
    ? saveAttendanceErrorMessage(saveAttendanceMutation.error, t)
    : null

  const {
    data: historyData,
    error: historyError,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ['attendance-history', historyStudent?.studentId, historyFrom, historyTo],
    queryFn: () =>
      getStudentAttendanceHistory(historyStudent!.studentId, {
        from: historyFrom || undefined,
        to: historyTo || undefined,
      }),
    enabled: historyStudent !== null,
  })

  const history = historyData ?? emptyRoster

  function openHistoryPanel(student: StudentAttendance) {
    setHistoryStudent(student)
    setHistoryFrom('')
    setHistoryTo('')
  }

  function closeHistoryPanel() {
    setHistoryStudent(null)
  }

  function updateStatus(studentId: number, status: AttendanceStatus | '') {
    setSuccessMessage(null)
    setEntries((previous) => ({
      ...previous,
      [studentId]: { status, notes: previous[studentId]?.notes ?? '' },
    }))
  }

  function updateNotes(studentId: number, notes: string) {
    setSuccessMessage(null)
    setEntries((previous) => ({
      ...previous,
      [studentId]: { status: previous[studentId]?.status ?? '', notes },
    }))
  }

  function markAllPresent() {
    setSuccessMessage(null)
    setEntries((previous) => {
      const next = { ...previous }
      roster.forEach((item) => {
        if (!next[item.studentId]?.status) {
          next[item.studentId] = { status: 'PRESENT', notes: next[item.studentId]?.notes ?? '' }
        }
      })
      return next
    })
  }

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('attendance.title')}</h2>
          <p>{t('attendance.subtitle')}</p>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}

      <section className="filters-row filters-row-compact" aria-label={t('attendance.filtersAriaLabel')}>
        <select
          aria-label={t('attendance.groupAriaLabel')}
          onChange={(event) => {
            setGroupId(event.target.value)
            setSuccessMessage(null)
            saveAttendanceMutation.reset()
          }}
          value={groupId}
        >
          <option value="">{t('attendance.selectGroup')}</option>
          {groups.map(([id, name]) => (
            <option key={id} value={id}>
              {translateBackendSeed(name)}
            </option>
          ))}
        </select>
        <input
          aria-label={t('attendance.dateAriaLabel')}
          max={today}
          onChange={(event) => {
            setDate(event.target.value)
            setSuccessMessage(null)
            saveAttendanceMutation.reset()
          }}
          type="date"
          value={date}
        />
      </section>

      {groupsError ? (
        <div className="notice">
          {isForbiddenError(groupsError) ? t('attendance.forbiddenGroups') : t('attendance.loadGroupsError')}
        </div>
      ) : null}

      {!groupsError && groupId === '' ? <p className="empty-copy">{t('attendance.selectGroupPrompt')}</p> : null}

      {groupId !== '' && rosterError ? (
        <div className="notice">
          {isForbiddenError(rosterError) ? t('attendance.forbiddenRoster') : t('attendance.loadRosterError')}
        </div>
      ) : null}

      {groupId !== '' && !rosterError && !isToday ? (
        <div className="notice">{t('attendance.archivedDayNotice')}</div>
      ) : null}

      {groupId !== '' && !rosterError && saveErrorMessage ? <div className="notice">{saveErrorMessage}</div> : null}

      {groupId !== '' && !rosterError ? (
        <div className="table-shell" aria-busy={isRosterLoading}>
          <div className="panel-actions-row">
            <button
              className="secondary-button inline-button"
              disabled={!isToday || roster.length === 0}
              onClick={markAllPresent}
              type="button"
            >
              {t('attendance.markAllPresent')}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>{t('attendance.colStudent')}</th>
                <th>{t('attendance.colStatus')}</th>
                <th>{t('attendance.colNotes')}</th>
                <th>{t('attendance.colRecordedBy')}</th>
                <th>{t('attendance.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((item) => {
                const entry = entries[item.studentId] ?? { status: '', notes: '' }

                return (
                  <tr key={item.studentId}>
                    <td>{item.studentName}</td>
                    <td>
                      <select
                        disabled={!isToday}
                        onChange={(event) =>
                          updateStatus(item.studentId, event.target.value as AttendanceStatus | '')
                        }
                        value={entry.status}
                      >
                        <option value="">{t('attendance.unmarked')}</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        disabled={!isToday}
                        maxLength={255}
                        onChange={(event) => updateNotes(item.studentId, event.target.value)}
                        value={entry.notes}
                      />
                    </td>
                    <td>{item.recordedByEmail ?? '-'}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          onClick={() => openHistoryPanel(item)}
                          title={t('attendance.viewHistoryTitle')}
                          type="button"
                        >
                          <History size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!isRosterLoading && roster.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t('attendance.emptyRoster')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <footer className="form-actions">
            <button
              className="primary-button"
              disabled={!isToday || saveAttendanceMutation.isPending || roster.length === 0}
              onClick={() => saveAttendanceMutation.mutate()}
              type="button"
            >
              {saveAttendanceMutation.isPending ? t('common.saving') : t('attendance.saveAttendance')}
            </button>
          </footer>
        </div>
      ) : null}

      {historyStudent ? (
        <div className="dialog-overlay" onClick={closeHistoryPanel} role="presentation">
          <section
            aria-labelledby="attendance-history-title"
            aria-modal="true"
            className="panel entity-form-panel dialog-panel-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="form-panel-heading">
              <div>
                <h3 id="attendance-history-title">{t('attendance.historyTitle')}</h3>
                <p className="profile-summary">{historyStudent.studentName}</p>
              </div>
              <button aria-label={t('common.close')} className="icon-button" onClick={closeHistoryPanel} type="button">
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <section className="filters-row filters-row-compact" aria-label={t('attendance.filtersHistoryAriaLabel')}>
              <input
                aria-label={t('attendance.fromLabel')}
                max={historyTo || today}
                onChange={(event) => setHistoryFrom(event.target.value)}
                type="date"
                value={historyFrom}
              />
              <input
                aria-label={t('attendance.toLabel')}
                max={today}
                min={historyFrom || undefined}
                onChange={(event) => setHistoryTo(event.target.value)}
                type="date"
                value={historyTo}
              />
            </section>
            <p className="empty-copy">
              {historyFrom || historyTo ? null : t('attendance.historyDefaultRangeNotice')}
            </p>

            {historyError ? (
              <div className="notice">
                {isForbiddenError(historyError)
                  ? t('attendance.forbiddenHistory')
                  : t('attendance.loadHistoryError')}
              </div>
            ) : (
              <div className="table-shell" aria-busy={isHistoryLoading}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('attendance.colDate')}</th>
                      <th>{t('attendance.colStatus')}</th>
                      <th>{t('attendance.colNotes')}</th>
                      <th>{t('attendance.colRecordedBy')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.date}>
                        <td>{formatDate(item.date, i18n.resolvedLanguage ?? 'es')}</td>
                        <td>{item.status ? statusLabels[item.status] : t('attendance.unmarked')}</td>
                        <td>{item.notes ?? '-'}</td>
                        <td>{item.recordedByEmail ?? '-'}</td>
                      </tr>
                    ))}
                    {!isHistoryLoading && history.length === 0 ? (
                      <tr>
                        <td colSpan={4}>{t('attendance.emptyHistory')}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}
