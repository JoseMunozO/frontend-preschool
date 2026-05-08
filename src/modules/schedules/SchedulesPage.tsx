import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Eye, ListFilter, Pencil, Plus, Search } from 'lucide-react'
import { getSchedules } from '../../api/schedules.api'
import type { DayOfWeek, ScheduleItem } from '../../types/schedules'

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

export function SchedulesPage() {
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState<DayOfWeek | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState('all')
  const { data, error, isLoading } = useQuery({
    queryKey: ['schedules', dayFilter],
    queryFn: () => getSchedules({ dayOfWeek: dayFilter }),
    retry: false,
  })

  const schedules = data ?? emptySchedules
  const groups = useMemo(
    () =>
      Array.from(
        new Map(schedules.map((schedule) => [String(schedule.groupId), schedule.groupName])),
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

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Horarios</h2>
          <p>Organiza rutinas por grupo, dia, aula y responsable asignado.</p>
        </div>
        <button className="primary-button inline-button" type="button">
          <Plus size={17} aria-hidden="true" />
          Nueva actividad
        </button>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de horarios.</div> : null}

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
              {groupName}
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
                    {schedule.activityTitle}
                  </span>
                </td>
                <td>{schedule.groupName}</td>
                <td>{schedule.roomName ?? '-'}</td>
                <td>{schedule.primaryStaffName ?? '-'}</td>
                <td>{schedule.notes ?? '-'}</td>
                <td>
                  <div className="row-actions">
                    <button title="Ver horario" type="button">
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    <button title="Editar horario" type="button">
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
