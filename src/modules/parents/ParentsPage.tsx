import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, ListFilter, Pencil, Plus, Search, Trash2, UserCircle } from 'lucide-react'
import { getParents } from '../../api/parents.api'
import type { ParentListItem } from '../../types/parents'

const emptyParents: ParentListItem[] = []

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
}

function formatParentName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

export function ParentsPage() {
  const [search, setSearch] = useState('')
  const { data, error, isLoading } = useQuery({
    queryKey: ['parents'],
    queryFn: getParents,
    retry: false,
  })

  const parents = data ?? emptyParents
  const filteredParents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return parents.filter((parent) => {
      const name = formatParentName(parent.firstName, parent.lastName).toLowerCase()
      const email = parent.email?.toLowerCase() ?? ''
      const phone = parent.phone?.toLowerCase() ?? ''

      return (
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        phone.includes(normalizedSearch)
      )
    })
  }, [parents, search])

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Padres / Tutores</h2>
          <p>Administra la informacion de los padres o tutores.</p>
        </div>
        <button className="primary-button inline-button" type="button">
          <Plus size={17} aria-hidden="true" />
          Nuevo padre / tutor
        </button>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de padres o tutores.</div> : null}

      <section className="filters-row filters-row-compact" aria-label="Filtros de padres o tutores">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar padre o tutor..."
            type="search"
            value={search}
          />
        </label>
        <button className="secondary-button" type="button">
          <ListFilter size={17} aria-hidden="true" />
          Filtros
        </button>
      </section>

      <div className="table-shell" aria-busy={isLoading}>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Telefono</th>
              <th>Correo electronico</th>
              <th>Hijos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredParents.map((parent) => {
              const statusLabel = statusLabels[parent.status] ?? parent.status

              return (
                <tr key={parent.parentId}>
                  <td>
                    <span className="name-cell">
                      <span className="student-avatar">
                        <UserCircle size={28} aria-hidden="true" />
                      </span>
                      {formatParentName(parent.firstName, parent.lastName)}
                    </span>
                  </td>
                  <td>{parent.phone ?? '-'}</td>
                  <td>{parent.email ?? '-'}</td>
                  <td>No disponible</td>
                  <td>
                    <span
                      className={
                        parent.status === 'INACTIVE' ? 'status-badge status-danger' : 'status-badge'
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
            {!isLoading && filteredParents.length === 0 ? (
              <tr>
                <td colSpan={6}>Sin padres o tutores para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredParents.length} de {parents.length} tutores
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
