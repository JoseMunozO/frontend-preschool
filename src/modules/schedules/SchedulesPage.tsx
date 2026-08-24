import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { z } from 'zod'
import { CalendarDays, Eye, LayoutGrid, ListFilter, Pencil, Plus, Search, Table, Trash2, X } from 'lucide-react'
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  restoreSchedule,
  updateSchedule,
} from '../../api/schedules.api'
import type { DayOfWeek, ScheduleItem, ScheduleRequest } from '../../types/schedules'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { TrashPanel } from '../../components/ui/TrashPanel'
import { UndoToast } from '../../components/ui/UndoToast'
import { useAuthStore } from '../../auth/auth.store'
import { adminRoles } from '../../auth/roleAccess'
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const UNDO_WINDOW_MS = 8000

const emptySchedules: ScheduleItem[] = []

const weekDays: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

const WEEK_VIEW_DEFAULT_START_MINUTES = 8 * 60
const WEEK_VIEW_DEFAULT_END_MINUTES = 16 * 60
const WEEK_VIEW_PIXELS_PER_MINUTE = 1

function formatTime(value?: string) {
  return value ? value.slice(0, 5) : '-'
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function formatHourLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`
}

function createScheduleFormSchema(t: TFunction) {
  return z
    .object({
      groupId: z.string().min(1, t('schedules.groupRequired')),
      primaryStaffId: z.string(),
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      startTime: z.string().min(1, t('schedules.startTimeRequired')),
      endTime: z.string().min(1, t('schedules.endTimeRequired')),
      activityTitle: z.string().trim().min(1, t('schedules.activityRequired')),
      roomName: z.string(),
      notes: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.startTime && values.endTime && values.startTime >= values.endTime) {
        ctx.addIssue({
          code: 'custom',
          message: t('schedules.endTimeAfterStart'),
          path: ['endTime'],
        })
      }
    })
}

type ScheduleFormValues = z.infer<ReturnType<typeof createScheduleFormSchema>>

function emptyFormValues(): ScheduleFormValues {
  return {
    groupId: '',
    primaryStaffId: '',
    dayOfWeek: 'MONDAY',
    startTime: '',
    endTime: '',
    activityTitle: '',
    roomName: '',
    notes: '',
  }
}

function formValuesForSchedule(schedule: ScheduleItem): ScheduleFormValues {
  return {
    groupId: String(schedule.groupId),
    primaryStaffId: schedule.primaryStaffId ? String(schedule.primaryStaffId) : '',
    dayOfWeek: schedule.dayOfWeek,
    startTime: formatTime(schedule.startTime),
    endTime: formatTime(schedule.endTime),
    activityTitle: schedule.activityTitle,
    roomName: schedule.roomName ?? '',
    notes: schedule.notes ?? '',
  }
}

function optionalValue(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

export function SchedulesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canManage = useAuthStore((state) => state.hasAnyRole(adminRoles))
  const dayLabels: Record<DayOfWeek, string> = {
    MONDAY: t('days.monday'),
    TUESDAY: t('days.tuesday'),
    WEDNESDAY: t('days.wednesday'),
    THURSDAY: t('days.thursday'),
    FRIDAY: t('days.friday'),
    SATURDAY: t('days.saturday'),
    SUNDAY: t('days.sunday'),
  }
  const scheduleFormSchema = useMemo(() => createScheduleFormSchema(t), [t])
  function formatScheduleLabel(schedule: ScheduleItem) {
    return `${schedule.activityTitle} (${dayLabels[schedule.dayOfWeek]})`
  }
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState<DayOfWeek | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'week'>('table')
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ScheduleItem | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deletedSchedule, setDeletedSchedule] = useState<ScheduleItem | null>(null)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: emptyFormValues(),
  })

  const { data, error, isLoading } = useQuery({
    queryKey: ['schedules', dayFilter],
    queryFn: () => getSchedules({ dayOfWeek: dayFilter }),
    retry: false,
  })

  const { data: trashData, isLoading: isTrashLoading } = useQuery({
    queryKey: ['schedules', 'trash'],
    queryFn: () => getSchedules({ includeDeleted: true }),
    enabled: isTrashOpen,
  })

  useEffect(() => {
    if (!deletedSchedule) {
      return
    }

    const timeoutId = setTimeout(() => setDeletedSchedule(null), UNDO_WINDOW_MS)
    return () => clearTimeout(timeoutId)
  }, [deletedSchedule])

  const saveScheduleMutation = useMutation({
    mutationFn: ({ scheduleSlotId, request }: { scheduleSlotId?: number; request: ScheduleRequest }) =>
      scheduleSlotId ? updateSchedule(scheduleSlotId, request) : createSchedule(request),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setSuccessMessage(
        variables.scheduleSlotId ? t('schedules.updateSuccess') : t('schedules.createSuccess'),
      )
      setIsFormOpen(false)
      setEditingSchedule(null)
    },
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleSlotId: number) => deleteSchedule(scheduleSlotId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setDeletedSchedule(deleteTarget)
      setDeleteTarget(null)
      setDeleteStep(1)
    },
  })

  const restoreScheduleMutation = useMutation({
    mutationFn: (scheduleSlotId: number) => restoreSchedule(scheduleSlotId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setDeletedSchedule(null)
    },
  })

  const schedules = data ?? emptySchedules
  const trashedSchedules = (trashData ?? emptySchedules).filter((schedule) => schedule.deletedAt)
  const groups = useMemo(
    () =>
      Array.from(
        new Map(schedules.map((schedule) => [String(schedule.groupId), schedule.groupName])),
      ).sort(([, firstName], [, secondName]) => firstName.localeCompare(secondName)),
    [schedules],
  )
  const staffOptions = useMemo(
    () =>
      Array.from(
        new Map(
          schedules.flatMap((schedule) =>
            schedule.primaryStaffId && schedule.primaryStaffName
              ? [[String(schedule.primaryStaffId), schedule.primaryStaffName]]
              : [],
          ),
        ),
      ).sort(([, firstName], [, secondName]) => firstName.localeCompare(secondName)),
    [schedules],
  )
  const filteredSchedules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return schedules.filter((schedule) => {
      const activity = schedule.activityTitle.toLowerCase()
      const groupName = schedule.groupName.toLowerCase()
      const roomName = schedule.roomName?.toLowerCase() ?? ''
      const staffName = schedule.primaryStaffName?.toLowerCase() ?? ''
      const matchesSearch =
        !normalizedSearch ||
        activity.includes(normalizedSearch) ||
        groupName.includes(normalizedSearch) ||
        roomName.includes(normalizedSearch) ||
        staffName.includes(normalizedSearch)
      const matchesGroup = groupFilter === 'all' || String(schedule.groupId) === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [groupFilter, schedules, search])

  const weekStart = Math.min(
    WEEK_VIEW_DEFAULT_START_MINUTES,
    ...filteredSchedules.map((item) => timeToMinutes(item.startTime)),
  )
  const weekEnd = Math.max(
    WEEK_VIEW_DEFAULT_END_MINUTES,
    ...filteredSchedules.map((item) => timeToMinutes(item.endTime)),
  )
  const weekTrackHeight = (weekEnd - weekStart) * WEEK_VIEW_PIXELS_PER_MINUTE
  const weekHourMarks: number[] = []
  for (let minute = Math.ceil(weekStart / 60) * 60; minute <= weekEnd; minute += 60) {
    weekHourMarks.push(minute)
  }
  const schedulesByDay = useMemo(() => {
    const map = new Map<DayOfWeek, ScheduleItem[]>()
    weekDays.forEach((day) => map.set(day, []))
    filteredSchedules.forEach((schedule) => {
      map.get(schedule.dayOfWeek)?.push(schedule)
    })
    return map
  }, [filteredSchedules])

  function openNewScheduleForm() {
    setEditingSchedule(null)
    reset(emptyFormValues())
    saveScheduleMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsFormOpen(true)
  }

  function openEditScheduleForm(schedule: ScheduleItem) {
    setEditingSchedule(schedule)
    reset(formValuesForSchedule(schedule))
    saveScheduleMutation.reset()
    setSuccessMessage(null)
    setIsTrashOpen(false)
    setIsFormOpen(true)
  }

  function closeScheduleForm() {
    setIsFormOpen(false)
    setEditingSchedule(null)
    saveScheduleMutation.reset()
  }

  function openDeleteConfirm(schedule: ScheduleItem) {
    setDeleteTarget(schedule)
    setDeleteStep(1)
    deleteScheduleMutation.reset()
  }

  function closeDeleteConfirm() {
    setDeleteTarget(null)
    setDeleteStep(1)
    deleteScheduleMutation.reset()
  }

  function openTrash() {
    setIsFormOpen(false)
    setIsTrashOpen(true)
  }

  function closeTrash() {
    setIsTrashOpen(false)
  }

  const onSubmit = handleSubmit((values) => {
    const request: ScheduleRequest = {
      groupId: Number(values.groupId),
      primaryStaffId: values.primaryStaffId ? Number(values.primaryStaffId) : undefined,
      dayOfWeek: values.dayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      activityTitle: values.activityTitle,
      roomName: optionalValue(values.roomName),
      notes: optionalValue(values.notes),
    }

    saveScheduleMutation.mutate({ scheduleSlotId: editingSchedule?.scheduleSlotId, request })
  })

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('schedules.title')}</h2>
          <p>{t('schedules.subtitle')}</p>
        </div>
        {canManage ? (
          <div className="page-heading-actions">
            <button className="secondary-button" onClick={openTrash} type="button">
              <Trash2 size={17} aria-hidden="true" />
              {t('common.trash')}
            </button>
            <button className="primary-button inline-button" onClick={openNewScheduleForm} type="button">
              <Plus size={17} aria-hidden="true" />
              {t('schedules.newActivity')}
            </button>
          </div>
        ) : null}
      </section>

      <div className="view-toggle">
        <button
          className={viewMode === 'table' ? 'active' : undefined}
          onClick={() => setViewMode('table')}
          type="button"
        >
          <Table size={16} aria-hidden="true" />
          {t('schedules.tableViewLabel')}
        </button>
        <button
          className={viewMode === 'week' ? 'active' : undefined}
          onClick={() => {
            setViewMode('week')
            setDayFilter('ALL')
          }}
          type="button"
        >
          <LayoutGrid size={16} aria-hidden="true" />
          {t('schedules.weekViewLabel')}
        </button>
      </div>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error) ? t('schedules.forbiddenList') : t('schedules.loadError')}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="dialog-overlay" onClick={closeScheduleForm} role="presentation">
        <section
          aria-labelledby="schedule-form-title"
          aria-modal="true"
          className="panel entity-form-panel dialog-panel-wide"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <header className="form-panel-heading">
            <div>
              <h3 id="schedule-form-title">
                {editingSchedule ? t('schedules.editActivity') : t('schedules.newActivity')}
              </h3>
              <p>{t('schedules.formSubtitle')}</p>
            </div>
            <button
              aria-label={t('common.closeForm')}
              className="icon-button"
              disabled={saveScheduleMutation.isPending}
              onClick={closeScheduleForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                {t('schedules.activityLabel')}
                <input maxLength={150} {...register('activityTitle')} />
                {formErrors.activityTitle ? (
                  <span className="field-error">{formErrors.activityTitle.message}</span>
                ) : null}
              </label>
              <label>
                {t('schedules.groupLabel')}
                <select {...register('groupId')}>
                  <option value="">{t('schedules.selectGroup')}</option>
                  {groups.map(([groupId, groupName]) => (
                    <option key={groupId} value={groupId}>
                      {translateBackendSeed(groupName)}
                    </option>
                  ))}
                </select>
                {formErrors.groupId ? <span className="field-error">{formErrors.groupId.message}</span> : null}
                <span className="field-hint">{t('schedules.groupsHint')}</span>
              </label>
              <label>
                {t('schedules.dayLabel')}
                <select {...register('dayOfWeek')}>
                  {Object.entries(dayLabels).map(([day, label]) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('schedules.roomLabel')}
                <input maxLength={100} {...register('roomName')} />
              </label>
              <label>
                {t('schedules.startTimeLabel')}
                <input type="time" {...register('startTime')} />
                {formErrors.startTime ? <span className="field-error">{formErrors.startTime.message}</span> : null}
              </label>
              <label>
                {t('schedules.endTimeLabel')}
                <input type="time" {...register('endTime')} />
                {formErrors.endTime ? <span className="field-error">{formErrors.endTime.message}</span> : null}
              </label>
              <label>
                {t('schedules.responsibleLabel')}
                <select {...register('primaryStaffId')}>
                  <option value="">{t('schedules.noResponsibleAssigned')}</option>
                  {staffOptions.map(([staffId, staffName]) => (
                    <option key={staffId} value={staffId}>
                      {translateBackendSeed(staffName)}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{t('schedules.staffHint')}</span>
              </label>
              <label className="entity-form-full">
                {t('schedules.notesLabel')}
                <textarea rows={2} {...register('notes')} />
              </label>
            </div>
            {saveScheduleMutation.error ? (
              <p className="form-error" role="alert">
                {saveScheduleMutation.error instanceof Error
                  ? saveScheduleMutation.error.message
                  : t('schedules.saveScheduleError')}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveScheduleMutation.isPending}
                onClick={closeScheduleForm}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button className="primary-button" disabled={saveScheduleMutation.isPending} type="submit">
                {saveScheduleMutation.isPending
                  ? t('common.saving')
                  : editingSchedule
                    ? t('schedules.saveChanges')
                    : t('schedules.createActivity')}
              </button>
            </footer>
          </form>
        </section>
        </div>
      ) : null}

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage={t('schedules.deletedRecentlyEmpty')}
          getDeletedAt={(schedule) => schedule.deletedAt}
          getId={(schedule) => schedule.scheduleSlotId}
          getLabel={formatScheduleLabel}
          isLoading={isTrashLoading}
          items={trashedSchedules}
          onClose={closeTrash}
          onRestore={(schedule) => restoreScheduleMutation.mutate(schedule.scheduleSlotId)}
          restoringId={restoreScheduleMutation.isPending ? restoreScheduleMutation.variables : null}
          title={t('schedules.deletedActivitiesTitle')}
        />
      ) : null}

      <section className="filters-row filters-row-schedules" aria-label={t('schedules.filtersAriaLabel')}>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('schedules.searchPlaceholder')}
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label={t('schedules.dayAriaLabel')}
          disabled={viewMode === 'week'}
          onChange={(event) => setDayFilter(event.target.value as DayOfWeek | 'ALL')}
          value={dayFilter}
        >
          <option value="ALL">{t('schedules.allDays')}</option>
          {Object.entries(dayLabels).map(([day, label]) => (
            <option key={day} value={day}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label={t('schedules.groupAriaLabel')}
          onChange={(event) => setGroupFilter(event.target.value)}
          value={groupFilter}
        >
          <option value="all">{t('schedules.allGroups')}</option>
          {groups.map(([groupId, groupName]) => (
            <option key={groupId} value={groupId}>
              {translateBackendSeed(groupName)}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          {t('common.filters')}
        </button>
      </section>

      {viewMode === 'table' ? (
      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>{t('schedules.colDay')}</th>
              <th>{t('schedules.colSchedule')}</th>
              <th>{t('schedules.colActivity')}</th>
              <th>{t('schedules.colGroup')}</th>
              <th>{t('schedules.colRoom')}</th>
              <th>{t('schedules.colResponsible')}</th>
              <th>{t('schedules.colNotes')}</th>
              <th>{t('schedules.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.map((schedule) => (
              <tr key={schedule.scheduleSlotId}>
                <td>
                  <span className="status-badge status-neutral">
                    {dayLabels[schedule.dayOfWeek]}
                  </span>
                </td>
                <td>
                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                </td>
                <td>
                  <span className="name-cell">
                    <span className="student-avatar">
                      <CalendarDays size={22} aria-hidden="true" />
                    </span>
                    {translateBackendSeed(schedule.activityTitle)}
                  </span>
                </td>
                <td>{translateBackendSeed(schedule.groupName)}</td>
                <td>{schedule.roomName ? translateBackendSeed(schedule.roomName) : '-'}</td>
                <td>
                  {schedule.primaryStaffName ? translateBackendSeed(schedule.primaryStaffName) : '-'}
                </td>
                <td>{schedule.notes ? translateBackendSeed(schedule.notes) : '-'}</td>
                <td>
                  <div className="row-actions">
                    <button title={t('schedules.viewScheduleTitle')} type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    {canManage ? (
                      <>
                        <button
                          onClick={() => openEditScheduleForm(schedule)}
                          title={t('schedules.editScheduleTitle')}
                          type="button"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => openDeleteConfirm(schedule)} title={t('common.delete')} type="button">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={8}>{t('schedules.emptyTable')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            {t('schedules.showingCount', { filtered: filteredSchedules.length, total: schedules.length })}
          </span>
          <div className="pagination">
            <button aria-label={t('common.previousPage')} type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button aria-label={t('common.nextPage')} type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>
      ) : null}

      {viewMode === 'week' ? (
        <div className="schedule-week-wrapper" aria-busy={isLoading}>
          <div className="schedule-week">
            <div />
            {weekDays.map((day) => (
              <div className="schedule-week-day-header" key={day}>
                {dayLabels[day]}
              </div>
            ))}
            <div className="schedule-week-hours" style={{ height: weekTrackHeight }}>
              {weekHourMarks.map((minute) => (
                <span
                  className="schedule-week-hour"
                  key={minute}
                  style={{ top: (minute - weekStart) * WEEK_VIEW_PIXELS_PER_MINUTE }}
                >
                  {formatHourLabel(minute)}
                </span>
              ))}
            </div>
            {weekDays.map((day) => (
              <div className="schedule-week-track" key={day} style={{ height: weekTrackHeight }}>
                {(schedulesByDay.get(day) ?? []).map((schedule) => {
                  const start = timeToMinutes(schedule.startTime)
                  const end = timeToMinutes(schedule.endTime)

                  return (
                    <div
                      className="schedule-week-block"
                      key={schedule.scheduleSlotId}
                      style={{
                        top: (start - weekStart) * WEEK_VIEW_PIXELS_PER_MINUTE,
                        height: (end - start) * WEEK_VIEW_PIXELS_PER_MINUTE,
                      }}
                    >
                      <strong>{translateBackendSeed(schedule.activityTitle)}</strong>
                      <span>
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </span>
                      <span>{translateBackendSeed(schedule.groupName)}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {!isLoading && filteredSchedules.length === 0 ? (
            <p className="empty-copy">{t('schedules.emptyTable')}</p>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        cancelLabel={t('common.cancel')}
        confirmLabel={deleteStep === 1 ? t('common.continue') : t('common.confirmDelete')}
        description={
          deleteTarget
            ? deleteStep === 1
              ? t('schedules.deleteConfirmStep1', { name: formatScheduleLabel(deleteTarget) })
              : t('schedules.deleteConfirmStep2', { name: formatScheduleLabel(deleteTarget) })
            : ''
        }
        isConfirming={deleteScheduleMutation.isPending}
        onCancel={closeDeleteConfirm}
        onConfirm={() => {
          if (deleteStep === 1) {
            setDeleteStep(2)
            return
          }

          if (deleteTarget) {
            deleteScheduleMutation.mutate(deleteTarget.scheduleSlotId)
          }
        }}
        open={deleteTarget !== null}
        title={deleteStep === 1 ? t('schedules.deleteConfirmTitle') : t('common.confirmDeleteTitle')}
        variant="danger"
      />

      {deletedSchedule ? (
        <UndoToast
          isActing={restoreScheduleMutation.isPending}
          message={t('schedules.deletedToast', { name: formatScheduleLabel(deletedSchedule) })}
          onAction={() => restoreScheduleMutation.mutate(deletedSchedule.scheduleSlotId)}
          onDismiss={() => setDeletedSchedule(null)}
        />
      ) : null}
    </main>
  )
}