import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  actionLabel?: string
  icon?: ReactNode
  tone?: 'neutral' | 'green' | 'orange' | 'yellow' | 'danger'
}

export function StatCard({ actionLabel, icon, label, value, tone = 'neutral' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <div className="stat-card-main">
        {icon ? <span className="stat-icon">{icon}</span> : null}
        <div>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      </div>
      {actionLabel ? <button type="button">{actionLabel}</button> : null}
    </article>
  )
}
