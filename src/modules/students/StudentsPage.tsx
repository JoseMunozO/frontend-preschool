import { useQuery } from '@tanstack/react-query'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle } from 'lucide-react'
import { getStudents } from '../../api/students.api'
import type { StudentListItem } from '../../api/students.api'

type StudentRow = StudentListItem & {
  birthDate?: string
  guardianName?: string
}

const demoStudents: StudentRow[] = [
  {
    id: 1,
    birthDate: '12/03/2020',
    fullName: 'Ana Sofia Lopez',
    groupName: 'Kinder A',
    guardianName: 'Maria Lopez',
    status: 'Activo',
  },
  {
    id: 2,
    birthDate: '25/07/2019',
    fullName: 'Mateo Hernandez',
    groupName: 'Kinder A',
    guardianName: 'Juan Hernandez',
    status: 'Activo',
  },
  {
    id: 3,
    birthDate: '05/11/2019',
    fullName: 'Camila Torres',
    groupName: 'Kinder B',
    guardianName: 'Paula Torres',
    status: 'Activo',
  },
  {
    id: 4,
    birthDate: '18/02/2020',
    fullName: 'Emiliano Garcia',
    groupName: 'Kinder B',
    guardianName: 'Luis Garcia',
    status: 'Activo',
  },
  {
    id: 5,
    birthDate: '30/09/2019',
    fullName: 'Valentina Diaz',
    groupName: 'Kinder A',
    guardianName: 'Andrea Diaz',
    status: 'Baja',
  },
]

export function StudentsPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    retry: false,
  })
  const students: StudentRow[] = data && data.length > 0 ? data : demoStudents

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
          <input placeholder="Buscar estudiante..." type="search" />
        </label>
        <select aria-label="Grupo">
          <option>Todos los grupos</option>
          <option>Kinder A</option>
          <option>Kinder B</option>
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
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <span className="student-avatar">
                    <UserCircle size={28} aria-hidden="true" />
                  </span>
                </td>
                <td>{student.fullName ?? `${student.firstName ?? ''} ${student.lastName ?? ''}`}</td>
                <td>{student.birthDate ?? '-'}</td>
                <td>{student.groupName ?? student.groupId ?? '-'}</td>
                <td>{student.guardianName ?? '-'}</td>
                <td>
                  <span
                    className={student.status === 'Baja' ? 'status-badge status-danger' : 'status-badge'}
                  >
                    {student.status ?? '-'}
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
            ))}
            {!isLoading && students.length === 0 ? (
              <tr>
                <td colSpan={7}>Sin estudiantes para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>Mostrando 1 a 5 de 32 estudiantes</span>
          <div className="pagination">
            <button aria-label="Pagina anterior" type="button">
              {'<'}
            </button>
            <button className="active" type="button">
              1
            </button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>...</span>
            <button type="button">7</button>
            <button aria-label="Pagina siguiente" type="button">
              {'>'}
            </button>
          </div>
        </footer>
      </div>
    </main>
  )
}
