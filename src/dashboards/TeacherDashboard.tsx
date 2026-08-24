import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Cake, GraduationCap, Thermometer } from 'lucide-react'
import { getTeacherDashboardSummary } from '../api/dashboard.api'
import { StatCard } from '../components/ui/StatCard'
import type { DashboardScheduleItem } from '../types/dashboard'
import { isForbiddenError } from '../utils/apiErrors'
import { translateBackendSeed } from '../utils/displayText'

const numberFormatter = new Intl.NumberFormat('es-MX')

const DEFAULT_DAY_START_MINUTES = 8 * 60
const DEFAULT_DAY_END_MINUTES = 16 * 60
const PIXELS_PER_MINUTE = 1.2

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function formatHourLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:00`
}

function formatTimeRange(item: DashboardScheduleItem) {
  return `${item.startTime.slice(0, 5)} - ${item.endTime.slice(0, 5)}`
}

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-teacher-summary'],
    queryFn: getTeacherDashboardSummary,
    retry: false,
  })

  const todaySchedule = [...(data?.todaySchedule ?? [])].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )

  const dayStart = Math.min(
    DEFAULT_DAY_START_MINUTES,
    ...todaySchedule.map((item) => timeToMinutes(item.startTime)),
  )
  const dayEnd = Math.max(DEFAULT_DAY_END_MINUTES, ...todaySchedule.map((item) => timeToMinutes(item.endTime)))
  const trackHeight = (dayEnd - dayStart) * PIXELS_PER_MINUTE

  const hourMarks: number[] = []
  for (let minute = Math.ceil(dayStart / 60) * 60; minute <= dayEnd; minute += 60) {
    hourMarks.push(minute)
  }

  const breaks: { start: number; end: number }[] = []
  todaySchedule.forEach((item, index) => {
    const nextItem = todaySchedule[index + 1]
    if (!nextItem) {
      return
    }

    const gapStart = timeToMinutes(item.endTime)
    const gapEnd = timeToMinutes(nextItem.startTime)
    if (gapEnd > gapStart) {
      breaks.push({ start: gapStart, end: gapEnd })
    }
  })

  const attendance = data?.todayAttendanceSummary

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('dashboard.title')}</h2>
          <p>{t('dashboard.welcomeTeacher')}</p>
        </div>
      </section>

      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('dashboard.forbidden') : t('dashboard.loadError')}
        </div>
      ) : null}

      <section className="stats-grid stats-grid-3" aria-busy={isLoading}>
        <StatCard
          icon={<GraduationCap size={28} aria-hidden="true" />}
          label={t('dashboard.students')}
          value={data ? numberFormatter.format(data.activeStudents) : '-'}
        />
        <StatCard
          icon={<Cake size={28} aria-hidden="true" />}
          label={t('dashboard.upcomingBirthdays')}
          tone="green"
          value={data ? numberFormatter.format(data.upcomingBirthdays.length) : '-'}
        />
        <StatCard
          icon={<Thermometer size={28} aria-hidden="true" />}
          label={t('dashboard.sickChildrenToday')}
          tone={attendance && attendance.sickCount > 0 ? 'danger' : 'neutral'}
          value={attendance ? numberFormatter.format(attendance.sickCount) : '-'}
        />
      </section>

      <section className="work-grid work-grid-single">
        <article className="panel">
          <h3>{t('dashboard.todaysSchedule')}</h3>
          {isLoading ? <p className="empty-copy">{t('dashboard.loading')}</p> : null}
          {!isLoading && !error && todaySchedule.length === 0 ? (
            <p className="empty-copy">{t('dashboard.noActivitiesToday')}</p>
          ) : null}
          {!isLoading && todaySchedule.length > 0 ? (
            <div className="teacher-timeline">
              <div className="teacher-timeline-hours" style={{ height: trackHeight }}>
                {hourMarks.map((minute) => (
                  <span
                    className="teacher-timeline-hour"
                    key={minute}
                    style={{ top: (minute - dayStart) * PIXELS_PER_MINUTE }}
                  >
                    {formatHourLabel(minute)}
                  </span>
                ))}
              </div>
              <div className="teacher-timeline-track" style={{ height: trackHeight }}>
                {breaks.map((gap) => (
                  <div
                    className="teacher-timeline-break"
                    key={`break-${gap.start}`}
                    style={{
                      top: (gap.start - dayStart) * PIXELS_PER_MINUTE,
                      height: (gap.end - gap.start) * PIXELS_PER_MINUTE,
                    }}
                  >
                    <span>{t('dashboard.break')}</span>
                  </div>
                ))}
                {todaySchedule.map((item) => {
                  const start = timeToMinutes(item.startTime)
                  const end = timeToMinutes(item.endTime)

                  return (
                    <div
                      className="teacher-timeline-block"
                      key={item.scheduleSlotId}
                      style={{
                        top: (start - dayStart) * PIXELS_PER_MINUTE,
                        height: (end - start) * PIXELS_PER_MINUTE,
                      }}
                    >
                      <strong>{translateBackendSeed(item.activityTitle)}</strong>
                      <span>{formatTimeRange(item)}</span>
                      {item.roomName ? <span>{translateBackendSeed(item.roomName)}</span> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  )
}
