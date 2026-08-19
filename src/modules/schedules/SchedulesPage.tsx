import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Eye, ListFilter, Pencil, Plus, Search, X } from 'lucide-react'
import { createSchedule, getSchedules, updateSchedule } from '../../api/schedules.api'
import type { DayOfWeek, ScheduleItem, ScheduleRequest } from '../../types/schedules'
import { translateBackendSeed } from '../../utils/displayText'

const emptySchedules: ScheduleItem[] = []

const dayLabels: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miercoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sabado',
  SUNDAY: 'Domingo',
}

function formatTime(value?: string) {
  return value ? value.slice(0, 5) : '-'
}

type ScheduleFormValues = {
  groupId: string
  primaryStaffId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
  activityTitle: string
  roomName: string
  notes: string
}

type ScheduleFormErrors = Partial<Record<keyof ScheduleFormValues, string>>

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

function validateSchedule(values: ScheduleFormValues) {
  const errors: ScheduleFormErrors = {}

  if (!values.groupId) {
    errors.groupId = 'Selecciona un grupo.'
  }

  if (!values.activityTitle.trim()) {
    errors.activityTitle = 'La actividad es obligatoria.'
  }

  if (!values.startTime) {
    errors.startTime = 'La hora de inicio es obligatoria.'
  }

  if (!values.endTime) {
    errors.endTime = 'La hora de fin es obligatoria.'
  }

  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errors.endTime = 'La hora de fin debe ser posterior al inicio.'
  }

  return errors
}

export function SchedulesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState<DayOfWeek | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState('all')
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<ScheduleFormValues>(emptyFormValues)
  const [formErrors, setFormErrors] = useState<ScheduleFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data, error, isLoading } = useQuery({
    queryKey: ['schedules', dayFilter],
    queryFn: () => getSchedules({ dayOfWeek: dayFilter }),
    retry: false,
  })

  const saveScheduleMutation = useMutation({
    mutationFn: ({ scheduleSlotId, request }: { scheduleSlotId?: number; request: ScheduleRequest }) =>
      scheduleSlotId ? updateSchedule(scheduleSlotId, request) : createSchedule(request),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setSuccessMessage(
        variables.scheduleSlotId ? 'Horario actualizado correctamente.' : 'Horario creado correctamente.',
      )
      setIsFormOpen(false)
      setEditingSchedule(null)
      setFormErrors({})
    },
  })

  const schedules = data ?? emptySchedules
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

  function openNewScheduleForm() {
    setEditingSchedule(null)
    setFormValues(emptyFormValues())
    setFormErrors({})
    saveScheduleMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function openEditScheduleForm(schedule: ScheduleItem) {
    setEditingSchedule(schedule)
    setFormValues(formValuesForSchedule(schedule))
    setFormErrors({})
    saveScheduleMutation.reset()
    setSuccessMessage(null)
    setIsFormOpen(true)
  }

  function closeScheduleForm() {
    setIsFormOpen(false)
    setEditingSchedule(null)
    setFormErrors({})
    saveScheduleMutation.reset()
  }

  function updateField<Key extends keyof ScheduleFormValues>(key: Key, value: ScheduleFormValues[Key]) {
    setFormValues((currentValues) => ({ ...currentValues, [key]: value }))
    setFormErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateSchedule(formValues)

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const request: ScheduleRequest = {
      groupId: Number(formValues.groupId),
      primaryStaffId: formValues.primaryStaffId ? Number(formValues.primaryStaffId) : undefined,
      dayOfWeek: formValues.dayOfWeek,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      activityTitle: formValues.activityTitle.trim(),
      roomName: optionalValue(formValues.roomName),
      notes: optionalValue(formValues.notes),
    }

    saveScheduleMutation.mutate({ scheduleSlotId: editingSchedule?.scheduleSlotId, request })
  }

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Horarios</h2>
          <p>Organiza rutinas por grupo, dia, aula y responsable asignado.</p>
        </div>
        <button className="primary-button inline-button" onClick={openNewScheduleForm} type="button">
          <Plus size={17} aria-hidden="true" />
          Nueva actividad
        </button>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? <div className="notice">No se pudo cargar la lista de horarios.</div> : null}

      {isFormOpen ? (
        <section className="panel entity-form-panel" aria-labelledby="schedule-form-title">
          <header className="form-panel-heading">
            <div>
              <h3 id="schedule-form-title">{editingSchedule ? 'Editar actividad' : 'Nueva actividad'}</h3>
              <p>Define el horario, grupo y responsable de la actividad.</p>
            </div>
            <button
              aria-label="Cerrar formulario"
              className="icon-button"
              disabled={saveScheduleMutation.isPending}
              onClick={closeScheduleForm}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <form className="entity-form" onSubmit={handleSubmit}>
            <div className="entity-form-grid">
              <label>
                Actividad *
                <input
                  maxLength={150}
                  onChange={(event) => updateField('activityTitle', event.target.value)}
                  value={formValues.activityTitle}
                />
                {formErrors.activityTitle ? (
                  <span className="field-error">{formErrors.activityTitle}</span>
                ) : null}
              </label>
              <label>
                Grupo *
                <select onChange={(event) => updateField('groupId', event.target.value)} value={formValues.groupId}>
                  <option value="">Selecciona un grupo</option>
                  {groups.map(([groupId, groupName]) => (
                    <option key={groupId} value={groupId}>
                      {translateBackendSeed(groupName)}
                    </option>
                  ))}
                </select>
                {formErrors.groupId ? <span className="field-error">{formErrors.groupId}</span> : null}
                <span className="field-hint">Se muestran los grupos ya presentes en horarios.</span>
              </label>
              <label>
                Dia
                <select
                  onChange={(event) => updateField('dayOfWeek', event.target.value as DayOfWeek)}
                  value={formValues.dayOfWeek}
                >
                  {Object.entries(dayLabels).map(([day, label]) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Aula
                <input
                  maxLength={100}
                  onChange={(event) => updateField('roomName', event.target.value)}
                  value={formValues.roomName}
                />
              </label>
              <label>
                Hora de inicio *
                <input
                  onChange={(event) => updateField('startTime', event.target.value)}
                  type="time"
                  value={formValues.startTime}
                />
                {formErrors.startTime ? <span className="field-error">{formErrors.startTime}</span> : null}
              </label>
              <label>
                Hora de fin *
                <input
                  onChange={(event) => updateField('endTime', event.target.value)}
                  type="time"
                  value={formValues.endTime}
                />
                {formErrors.endTime ? <span className="field-error">{formErrors.endTime}</span> : null}
              </label>
              <label>
                Responsable
                <select
                  onChange={(event) => updateField('primaryStaffId', event.target.value)}
                  value={formValues.primaryStaffId}
                >
                  <option value="">Sin responsable asignado</option>
                  {staffOptions.map(([staffId, staffName]) => (
                    <option key={staffId} value={staffId}>
                      {translateBackendSeed(staffName)}
                    </option>
                  ))}
                </select>
                <span className="field-hint">Se muestra el personal ya asignado en otros horarios.</span>
              </label>
              <label className="entity-form-full">
                Notas
                <textarea
                  onChange={(event) => updateField('notes', event.target.value)}
                  rows={2}
                  value={formValues.notes}
                />
              </label>
            </div>
            {saveScheduleMutation.error ? (
              <p className="form-error" role="alert">
                {saveScheduleMutation.error instanceof Error
                  ? saveScheduleMutation.error.message
                  : 'No se pudo guardar el horario.'}
              </p>
            ) : null}
            <footer className="form-actions">
              <button
                className="secondary-button"
                disabled={saveScheduleMutation.isPending}
                onClick={closeScheduleForm}
                type="button"
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={saveScheduleMutation.isPending} type="submit">
                {saveScheduleMutation.isPending
                  ? 'Guardando...'
                  : editingSchedule
                    ? 'Guardar cambios'
                    : 'Crear actividad'}
              </button>
            </footer>
          </form>
        </section>
      ) : null}

      <section className="filters-row filters-row-schedules" aria-label="Filtros de horarios">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar actividad, aula o responsable..."
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Dia"
          onChange={(event) => setDayFilter(event.target.value as DayOfWeek | 'ALL')}
          value={dayFilter}
        >
          <option value="ALL">Todos los dias</option>
          {Object.entries(dayLabels).map(([day, label]) => (
            <option key={day} value={day}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Grupo"
          onChange={(event) => setGroupFilter(event.target.value)}
          value={groupFilter}
        >
          <option value="all">Todos los grupos</option>
          {groups.map(([groupId, groupName]) => (
            <option key={groupId} value={groupId}>
              {translateBackendSeed(groupName)}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          Filtros
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Horario</th>
              <th>Actividad</th>
              <th>Grupo</th>
              <th>Aula</th>
              <th>Responsable</th>
              <th>Notas</th>
              <th>Acciones</th>
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
                    <button title="Ver horario" type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button onClick={() => openEditScheduleForm(schedule)} title="Editar horario" type="button">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={8}>Sin horarios para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredSchedules.length} de {schedules.length} actividades
          </span>
          <div className="pagination">
            <button aria-label="Pagina anterior" type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button aria-label="Pagina siguiente" type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>
    </main>
  )
}