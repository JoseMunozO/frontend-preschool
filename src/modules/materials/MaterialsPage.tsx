import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, ListFilter, PackagePlus, Pencil, Plus, Search } from 'lucide-react'
import { getMaterials } from '../../api/materials.api'
import type { MaterialItem, MaterialStatus } from '../../types/materials'

const emptyMaterials: MaterialItem[] = []

const statusLabels: Record<MaterialStatus, string> = {
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
}

export function MaterialsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all')
  const { data, error, isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => getMaterials(),
    retry: false,
  })

  const materials = data ?? emptyMaterials
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          materials.flatMap((material) => (material.category ? [material.category] : [])),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [materials],
  )
  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return materials.filter((material) => {
      const name = material.name.toLowerCase()
      const sku = material.sku?.toLowerCase() ?? ''
      const category = material.category?.toLowerCase() ?? ''
      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        sku.includes(normalizedSearch) ||
        category.includes(normalizedSearch)
      const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter
      const matchesStock = stockFilter === 'all' || material.lowStock

      return matchesSearch && matchesCategory && matchesStock
    })
  }, [categoryFilter, materials, search, stockFilter])

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Material Escolar</h2>
          <p>Administra inventario, stock minimo y necesidades de reposicion.</p>
        </div>
        <button className="primary-button inline-button" type="button">
          <Plus size={17} aria-hidden="true" />
          Nuevo material
        </button>
      </section>

      {error ? <div className="notice">No se pudo cargar la lista de materiales.</div> : null}

      <section className="filters-row filters-row-materials" aria-label="Filtros de materiales">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar material..."
            type="search"
            value={search}
          />
        </label>
        <select
          aria-label="Categoria"
          onChange={(event) => setCategoryFilter(event.target.value)}
          value={categoryFilter}
        >
          <option value="all">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          aria-label="Stock"
          onChange={(event) => setStockFilter(event.target.value as 'all' | 'low')}
          value={stockFilter}
        >
          <option value="all">Todo el inventario</option>
          <option value="low">Stock bajo</option>
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
              <th>Material</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Cantidad</th>
              <th>Minimo</th>
              <th>Unidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((material) => (
              <tr key={material.materialId}>
                <td>
                  <span className="name-cell">
                    <span className="student-avatar">
                      <PackagePlus size={24} aria-hidden="true" />
                    </span>
                    {material.name}
                  </span>
                </td>
                <td>{material.sku ?? '-'}</td>
                <td>{material.category ?? '-'}</td>
                <td>{material.quantityOnHand}</td>
                <td>{material.minimumQuantity ?? '-'}</td>
                <td>{material.unit ?? '-'}</td>
                <td>
                  <span
                    className={
                      material.lowStock
                        ? 'status-badge status-warning'
                        : material.status === 'ARCHIVED'
                          ? 'status-badge status-neutral'
                          : 'status-badge'
                    }
                  >
                    {material.lowStock ? 'Stock bajo' : statusLabels[material.status]}
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
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={8}>Sin materiales para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <footer className="table-footer">
          <span>
            Mostrando {filteredMaterials.length} de {materials.length} materiales
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
