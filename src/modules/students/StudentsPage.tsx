import { useQuery } from '@tanstack/react-query'
import { getStudents } from '../../api/students.api'

export function StudentsPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: getStudents,
    retry: false,
  })

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">Modulo</p>
        <h2>Estudiantes</h2>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de estudiantes.</div> : null}

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Grupo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((student) => (
              <tr key={student.id}>
                <td>{student.fullName ?? `${student.firstName ?? ''} ${student.lastName ?? ''}`}</td>
                <td>{student.groupName ?? student.groupId ?? '-'}</td>
                <td>{student.status ?? '-'}</td>
              </tr>
            ))}
            {!isLoading && !data?.length ? (
              <tr>
                <td colSpan={3}>Sin estudiantes para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  )
}
