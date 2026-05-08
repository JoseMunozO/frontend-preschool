import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle } from 'lucide-react'
import { getStudents } from '../../api/students.api'
import type { StudentListItem } from '../../api/students.api'
import { translateBackendSeed } from '../../utils/displayText'

const emptyStudents: StudentListItem[] = []

const statusLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  graduated: 'Graduado',
}

const statusDangerValues = new Set(['inactive'])

function formatStudentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

function formatDate(value?: string) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const { data, error, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    retry: false,
  })

  const students = data ?? emptyStudents
  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          students.flatMap((student) => (student.groupName ? [student.groupName] : [])),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [students],
  )
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return students.filter((student) => {
      const name = formatStudentName(student.firstName, student.lastName).toLowerCase()
      const code = student.studentCode?.toLowerCase() ?? ''
      const matchesSearch = !normalizedSearch || name.includes(normalizedSearch) || code.includes(normalizedSearch)
      const matchesGroup = groupFilter === 'all' || student.groupName === groupFilter

      return matchesSearch && matchesGroup
    })
  }, [groupFilter, search, students])

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Estudiantes</h2>
          <p>Administra la informacion de los estudiantes.</p>
        </div>
        <button className="primary-button inline-button" type="button">
          <Plus size={17} aria-hidden="true" />
          Nuevo estudiante
        </button>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de estudiantes.</div> : null}

      <section className="filters-row" aria-label="Filtros de estudiantes">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar estudiante..."
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Grupo"
          onChange={(event) => setGroupFilter(event.target.value)}
          value={groupFilter}
        >
          <option value="all">Todos los grupos</option>
          {groups.map((groupName) => (
            <option key={groupName} value={groupName}>
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
              <th>Foto</th>
              <th>Nombre</th>
              <th>Fecha de nacimiento</th>
              <th>Grupo</th>
              <th>Padre / Tutor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const statusLabel = statusLabels[student.status] ?? student.status

              return (
                <tr key={student.studentId}>
                  <td>
                    <span className="student-avatar">
                      {student.profilePhotoUrl ? (
                        <img src={student.profilePhotoUrl} alt="" />
                      ) : (
                        <UserCircle size={28} aria-hidden="true" />
                      )}
                    </span>
                  </td>
                  <td>{formatStudentName(student.firstName, student.lastName)}</td>
                  <td>{formatDate(student.birthDate)}</td>
                  <td>
                    {student.groupName ? translateBackendSeed(student.groupName) : student.groupId ?? '-'}
                  </td>
                  <td>No disponible</td>
                  <td>
                    <span
                      className={
                        statusDangerValues.has(student.status)
                          ? 'status-badge status-danger'
                          : 'status-badge'
                      }
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button title="Ver" type="button">
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button title="Editar" type="button">
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button title="Eliminar" type="button">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!isLoading && filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin estudiantes para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredStudents.length} de {students.length} estudiantes
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
