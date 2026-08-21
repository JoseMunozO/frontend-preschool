import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { CalendarDays, Eye, ListFilter, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
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
import { isForbiddenError } from '../../utils/apiErrors'
import { translateBackendSeed } from '../../utils/displayText'

const UNDO_WINDOW_MS = 8000

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

function formatScheduleLabel(schedule: ScheduleItem) {
  return `${schedule.activityTitle} (${dayLabels[schedule.dayOfWeek]})`
}

const scheduleFormSchema = z
  .object({
    groupId: z.string().min(1, 'Selecciona un grupo.'),
    primaryStaffId: z.string(),
    dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
    startTime: z.string().min(1, 'La hora de inicio es obligatoria.'),
    endTime: z.string().min(1, 'La hora de fin es obligatoria.'),
    activityTitle: z.string().trim().min(1, 'La actividad es obligatoria.'),
    roomName: z.string(),
    notes: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.startTime && values.endTime && values.startTime >= values.endTime) {
      ctx.addIssue({
        code: 'custom',
        message: 'La hora de fin debe ser posterior al inicio.',
        path: ['endTime'],
      })
    }
  })

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

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
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState<DayOfWeek | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState('all')
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
        variables.scheduleSlotId ? 'Horario actualizado correctamente.' : 'Horario creado correctamente.',
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
          <h2>Horarios</h2>
          <p>Organiza rutinas por grupo, dia, aula y responsable asignado.</p>
        </div>
        <div className="page-heading-actions">
          <button className="secondary-button" onClick={openTrash} type="button">
            <Trash2 size={17} aria-hidden="true" />
            Papelera
          </button>
          <button className="primary-button inline-button" onClick={openNewScheduleForm} type="button">
            <Plus size={17} aria-hidden="true" />
            Nueva actividad
          </button>
        </div>
      </section>

      {successMessage ? (
        <div className="success-notice" role="status">
          {successMessage}
        </div>
      ) : null}
      {error ? (
        <div className="notice">
          {isForbiddenError(error)
            ? 'No tienes permiso para ver la lista de horarios.'
            : 'No se pudo cargar la lista de horarios.'}
        </div>
      ) : null}

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
          <form className="entity-form" onSubmit={onSubmit}>
            <div className="entity-form-grid">
              <label>
                Actividad *
                <input maxLength={150} {...register('activityTitle')} />
                {formErrors.activityTitle ? (
                  <span className="field-error">{formErrors.activityTitle.message}</span>
                ) : null}
              </label>
              <label>
                Grupo *
                <select {...register('groupId')}>
                  <option value="">Selecciona un grupo</option>
                  {groups.map(([groupId, groupName]) => (
                    <option key={groupId} value={groupId}>
                      {translateBackendSeed(groupName)}
                    </option>
                  ))}
                </select>
                {formErrors.groupId ? <span className="field-error">{formErrors.groupId.message}</span> : null}
                <span className="field-hint">Se muestran los grupos ya presentes en horarios.</span>
              </label>
              <label>
                Dia
                <select {...register('dayOfWeek')}>
                  {Object.entries(dayLabels).map(([day, label]) => (
                    <option key={day} value={day}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Aula
                <input maxLength={100} {...register('roomName')} />
              </label>
              <label>
                Hora de inicio *
                <input type="time" {...register('startTime')} />
                {formErrors.startTime ? <span className="field-error">{formErrors.startTime.message}</span> : null}
              </label>
              <label>
                Hora de fin *
                <input type="time" {...register('endTime')} />
                {formErrors.endTime ? <span className="field-error">{formErrors.endTime.message}</span> : null}
              </label>
              <label>
                Responsable
                <select {...register('primaryStaffId')}>
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
                <textarea rows={2} {...register('notes')} />
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

      {isTrashOpen ? (
        <TrashPanel
          emptyMessage="No hay actividades eliminadas recientemente."
          getDeletedAt={(schedule) => schedule.deletedAt}
          getId={(schedule) => schedule.scheduleSlotId}
          getLabel={formatScheduleLabel}
          isLoading={isTrashLoading}
          items={trashedSchedules}
          onClose={closeTrash}
          onRestore={(schedule) => restoreScheduleMutation.mutate(schedule.scheduleSlotId)}
          restoringId={restoreScheduleMutation.isPending ? restoreScheduleMutation.variables : null}
          title="Actividades eliminadas"
        />
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
                    <button onClick={() => openDeleteConfirm(schedule)} title="Eliminar" type="button">
                      <Trash2 size={16} aria-hidden="true" />
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

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel={deleteStep === 1 ? 'Continuar' : 'Si, eliminar'}
        description={
          deleteTarget
            ? deleteStep === 1
              ? `Se eliminara ${formatScheduleLabel(deleteTarget)}. Vas a tener unos segundos para deshacerlo justo despues, y se puede restaurar manualmente hasta 7 dias.`
              : `Confirma que quieres eliminar ${formatScheduleLabel(deleteTarget)} ahora.`
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
        title={deleteStep === 1 ? 'Eliminar esta actividad?' : 'Confirmar eliminacion'}
        variant="danger"
      />

      {deletedSchedule ? (
        <UndoToast
          isActing={restoreScheduleMutation.isPending}
          message={`${formatScheduleLabel(deletedSchedule)} fue eliminada.`}
          onAction={() => restoreScheduleMutation.mutate(deletedSchedule.scheduleSlotId)}
          onDismiss={() => setDeletedSchedule(null)}
        />
      ) : null}
    </main>
  )
}