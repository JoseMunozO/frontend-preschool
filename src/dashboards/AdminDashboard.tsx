import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary } from '../api/dashboard.api'
import { StatCard } from '../components/ui/StatCard'

export function AdminDashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    retry: false,
  })

  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">Resumen</p>
        <h2>Estado general</h2>
      </section>

      {error ? (
        <div className="notice">
          No se pudo cargar el dashboard. Verifica que el backend este iniciado y que tu usuario
          tenga permisos.
        </div>
      ) : null}

      <section className="stats-grid" aria-busy={isLoading}>
        <StatCard label="Estudiantes activos" value={data?.activeStudents ?? '-'} />
        <StatCard label="Pagos pendientes" value={data?.pendingCharges ?? '-'} tone="warning" />
        <StatCard label="Pagos atrasados" value={data?.overdueCharges ?? '-'} tone="danger" />
        <StatCard label="Materiales bajos" value={data?.lowStockMaterials ?? '-'} tone="warning" />
      </section>

      <section className="work-grid">
        <article className="panel">
          <h3>Prioridad operativa</h3>
          <p>Conectar listados de estudiantes, pagos, materiales y horarios contra el backend.</p>
        </article>
        <article className="panel">
          <h3>Siguiente fase</h3>
          <p>Agregar formularios con validacion para crear y editar registros principales.</p>
        </article>
      </section>
    </main>
  )
}
