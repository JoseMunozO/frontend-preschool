import { useQuery } from '@tanstack/react-query'
import { Box, DollarSign, UsersRound } from 'lucide-react'
import { getDashboardSummary } from '../api/dashboard.api'
import { StatCard } from '../components/ui/StatCard'

export function AdminDashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    retry: false,
  })

  const activeStudents = data?.activeStudents ?? 32
  const activeParents = data?.activeParents ?? 28
  const pendingCharges = data?.pendingCharges ?? 12
  const lowStockMaterials = data?.lowStockMaterials ?? 5

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>Panel Principal</h2>
          <p>Bienvenido, Administrador.</p>
        </div>
      </section>

      {error ? (
        <div className="notice">
          No se pudo cargar el dashboard. Verifica que el backend este iniciado y que tu usuario
          tenga permisos.
        </div>
      ) : null}

      <section className="stats-grid" aria-busy={isLoading}>
        <StatCard
          actionLabel="Ver todos"
          icon={<UsersRound size={28} aria-hidden="true" />}
          label="Estudiantes"
          value={activeStudents}
        />
        <StatCard
          actionLabel="Ver todos"
          icon={<UsersRound size={28} aria-hidden="true" />}
          label="Padres / Tutores"
          tone="green"
          value={activeParents}
        />
        <StatCard
          actionLabel="Ver detalles"
          icon={<DollarSign size={28} aria-hidden="true" />}
          label="Pagos pendientes"
          tone="orange"
          value={pendingCharges}
        />
        <StatCard
          actionLabel="Ver inventario"
          icon={<Box size={28} aria-hidden="true" />}
          label="Materiales bajos"
          tone="yellow"
          value={lowStockMaterials}
        />
      </section>

      <section className="work-grid">
        <article className="panel payments-panel">
          <h3>Pagos del mes</h3>
          <div className="donut-summary">
            <div className="donut-chart" aria-hidden="true" />
            <dl>
              <div>
                <dt>
                  <span className="legend-dot legend-paid" />
                  Pagado
                </dt>
                <dd>18</dd>
              </div>
              <div>
                <dt>
                  <span className="legend-dot legend-pending" />
                  Pendiente
                </dt>
                <dd>7</dd>
              </div>
              <div>
                <dt>
                  <span className="legend-dot legend-late" />
                  Atrasado
                </dt>
                <dd>5</dd>
              </div>
            </dl>
          </div>
          <button className="text-action" type="button">
            Ver todos los pagos
          </button>
        </article>
        <article className="panel notices-panel">
          <h3>Avisos importantes</h3>
          <ul>
            <li>
              <strong>Reunion de padres de familia</strong>
              <span>15 de mayo a las 5:00 PM</span>
            </li>
            <li>
              <strong>Festival del Dia del Nino</strong>
              <span>30 de abril</span>
            </li>
            <li>
              <strong>Cierre de inscripciones</strong>
              <span>20 de mayo</span>
            </li>
          </ul>
          <button className="text-action" type="button">
            Ver todos los avisos
          </button>
        </article>
      </section>
    </main>
  )
}
