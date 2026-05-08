import { useQuery } from '@tanstack/react-query'
import type { CSSProperties } from 'react'
import { Box, DollarSign, UsersRound } from 'lucide-react'
import { getDashboardSummary } from '../api/dashboard.api'
import { StatCard } from '../components/ui/StatCard'
import { translateBackendSeed } from '../utils/displayText'

const numberFormatter = new Intl.NumberFormat('es-MX')

export function AdminDashboard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    retry: false,
  })

  const administration = data?.administration
  const finance = data?.finance
  const paidCharges = Math.max(
    0,
    (administration?.activeStudents ?? 0) - (finance?.pendingCharges ?? 0) - (finance?.overdueCharges ?? 0),
  )
  const totalPaymentItems = paidCharges + (finance?.pendingCharges ?? 0) + (finance?.overdueCharges ?? 0)
  const paidDegrees = totalPaymentItems > 0 ? (paidCharges / totalPaymentItems) * 360 : 0
  const overdueDegrees =
    totalPaymentItems > 0 ? ((finance?.overdueCharges ?? 0) / totalPaymentItems) * 360 : 0
  const pendingDegrees = Math.max(0, 360 - paidDegrees - overdueDegrees)

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
          value={administration ? numberFormatter.format(administration.activeStudents) : '-'}
        />
        <StatCard
          actionLabel="Ver todos"
          icon={<UsersRound size={28} aria-hidden="true" />}
          label="Padres / Tutores"
          tone="green"
          value={administration ? numberFormatter.format(administration.activeParents) : '-'}
        />
        <StatCard
          actionLabel="Ver detalles"
          icon={<DollarSign size={28} aria-hidden="true" />}
          label="Pagos pendientes"
          tone="orange"
          value={finance ? numberFormatter.format(finance.pendingCharges) : '-'}
        />
        <StatCard
          actionLabel="Ver inventario"
          icon={<Box size={28} aria-hidden="true" />}
          label="Materiales bajos"
          tone="yellow"
          value={administration ? numberFormatter.format(administration.lowStockMaterials) : '-'}
        />
      </section>

      <section className="work-grid">
        <article className="panel payments-panel">
          <h3>Pagos del mes</h3>
          <div className="donut-summary">
            <div
              className="donut-chart"
              style={
                {
                  '--paid-degrees': `${paidDegrees}deg`,
                  '--overdue-degrees': `${overdueDegrees}deg`,
                  '--pending-degrees': `${pendingDegrees}deg`,
                } as CSSProperties
              }
              aria-hidden="true"
            />
            <dl>
              <div>
                <dt>
                  <span className="legend-dot legend-paid" />
                  Pagado
                </dt>
                <dd>{numberFormatter.format(paidCharges)}</dd>
              </div>
              <div>
                <dt>
                  <span className="legend-dot legend-pending" />
                  Pendiente
                </dt>
                <dd>{numberFormatter.format(finance?.pendingCharges ?? 0)}</dd>
              </div>
              <div>
                <dt>
                  <span className="legend-dot legend-late" />
                  Atrasado
                </dt>
                <dd>{numberFormatter.format(finance?.overdueCharges ?? 0)}</dd>
              </div>
            </dl>
          </div>
          <button className="text-action" type="button">
            Ver todos los pagos
          </button>
        </article>
        <article className="panel notices-panel">
          <h3>Actividades de hoy</h3>
          {administration?.todaySchedule.length ? (
            <ul>
              {administration.todaySchedule.slice(0, 3).map((item) => (
                <li key={item.scheduleSlotId}>
                  <strong>{translateBackendSeed(item.activityTitle)}</strong>
                  <span>
                    {item.startTime} - {item.endTime}
                    {item.groupName ? ` · ${translateBackendSeed(item.groupName)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">No hay actividades programadas para hoy.</p>
          )}
          <button className="text-action" type="button">
            Ver horarios
          </button>
        </article>
      </section>
    </main>
  )
}
