import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getStudentNotesHistory, getStudents } from '../../api/students.api'
import type { StudentListItem, StudentNoteHistoryEntry, StudentNoteType } from '../../api/students.api'
import { isForbiddenError } from '../../utils/apiErrors'

const emptyEntries: StudentNoteHistoryEntry[] = []
const emptyStudents: StudentListItem[] = []

function formatDateTime(value: string | undefined, locale: string) {
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

export function NotesHistoryReport() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'es'
  const noteTypeLabels: Record<StudentNoteType, string> = {
    PEDAGOGICAL: t('students.noteTypePedagogical'),
    BEHAVIOR: t('students.noteTypeBehavior'),
    INCIDENT: t('students.noteTypeIncident'),
    HEALTH: t('students.noteTypeHealth'),
    FAMILY_FOLLOW_UP: t('students.noteTypeFamilyFollowUp'),
    ADMINISTRATIVE: t('students.noteTypeAdministrative'),
  }
  const [studentId, setStudentId] = useState('')

  const { data: allStudentsData } = useQuery({
    queryKey: ['students', 'groups-lookup'],
    queryFn: () => getStudents(),
    staleTime: Infinity,
  })

  const students = allStudentsData ?? emptyStudents

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', 'notes-history', studentId],
    queryFn: () => getStudentNotesHistory(Number(studentId)),
    enabled: studentId !== '',
    retry: false,
  })

  const entries = data ?? emptyEntries

  return (
    <>
      <p>{t('reports.notesHistory.subtitle')}</p>

      <section className="filters-row" aria-label={t('reports.notesHistory.filtersAriaLabel')}>
        <select
          aria-label={t('reports.notesHistory.studentSelectLabel')}
          onChange={(event) => setStudentId(event.target.value)}
          value={studentId}
        >
          <option value="">{t('reports.notesHistory.studentSelectPlaceholder')}</option>
          {students.map((student) => (
            <option key={student.studentId} value={student.studentId}>
              {`${student.firstName} ${student.lastName}`.trim()}
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('reports.notesHistory.forbidden') : t('reports.notesHistory.loadError')}
        </div>
      ) : null}

      {studentId === '' ? (
        <p className="field-hint">{t('reports.notesHistory.selectStudentPrompt')}</p>
      ) : (
        <div className="table-shell" aria-busy={isLoading}>
          {entries.length === 0 && !isLoading ? (
            <p className="field-hint">{t('reports.notesHistory.emptyTable')}</p>
          ) : (
            <ul className="contact-list">
              {entries.map((note) => (
                <li className="contact-item" key={note.studentNoteId}>
                  <div className="contact-item-header">
                    <span className="contact-item-title">
                      <strong>{noteTypeLabels[note.noteType]}</strong>
                      <span className="field-hint">{formatDateTime(note.createdAt, locale)}</span>
                    </span>
                  </div>
                  <p className="field-hint">{note.authorEmail}</p>
                  <p>{note.content}</p>
                  {note.auditLog.length > 0 ? (
                    <details>
                      <summary>{t('reports.notesHistory.auditLogTitle', { count: note.auditLog.length })}</summary>
                      <ul className="contact-list">
                        {note.auditLog.map((entry) => (
                          <li className="contact-item" key={entry.studentNoteAuditLogId}>
                            <p className="field-hint">
                              {entry.changedByEmail} — {formatDateTime(entry.changedAt, locale)}
                            </p>
                            <p className="field-hint">
                              {t('reports.notesHistory.colPreviousValue')}: {entry.previousValues}
                            </p>
                            <p className="field-hint">
                              {t('reports.notesHistory.colNewValue')}: {entry.newValues}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
}
