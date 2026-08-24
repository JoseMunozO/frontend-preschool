import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../auth/auth.store'
import { adminRoles, financeRoles, internalRoles, teacherReportRoles } from '../../auth/roleAccess'
import { FinancialReport } from './FinancialReport'
import { AttendanceSummaryReport } from './AttendanceSummaryReport'
import { NotesHistoryReport } from './NotesHistoryReport'
import { HealthReport } from './HealthReport'
import { MaterialMovementsReport } from './MaterialMovementsReport'
import { TrashReport } from './TrashReport'

type ReportTabKey = 'financial' | 'attendance' | 'notesHistory' | 'health' | 'materials' | 'trash'

const REPORT_TABS: { key: ReportTabKey; labelKey: string; roles: string[] }[] = [
  { key: 'financial', labelKey: 'reports.tabs.financial', roles: financeRoles },
  { key: 'attendance', labelKey: 'reports.tabs.attendance', roles: teacherReportRoles },
  { key: 'notesHistory', labelKey: 'reports.tabs.notesHistory', roles: teacherReportRoles },
  { key: 'health', labelKey: 'reports.tabs.health', roles: teacherReportRoles },
  { key: 'materials', labelKey: 'reports.tabs.materials', roles: internalRoles },
  { key: 'trash', labelKey: 'reports.tabs.trash', roles: adminRoles },
]

export function ReportsPage() {
  const { t } = useTranslation()
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole)
  const visibleTabs = REPORT_TABS.filter((tab) => hasAnyRole(tab.roles))
  const [activeTab, setActiveTab] = useState<ReportTabKey>(() => visibleTabs[0]?.key ?? 'financial')

  return (
    <main className="page-content">
      <section className="page-heading page-heading-row">
        <div>
          <h2>{t('reports.title')}</h2>
        </div>
      </section>

      <div className="view-toggle">
        {visibleTabs.map((tab) => (
          <button
            className={activeTab === tab.key ? 'active' : undefined}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'financial' ? <FinancialReport /> : null}
      {activeTab === 'attendance' ? <AttendanceSummaryReport /> : null}
      {activeTab === 'notesHistory' ? <NotesHistoryReport /> : null}
      {activeTab === 'health' ? <HealthReport /> : null}
      {activeTab === 'materials' ? <MaterialMovementsReport /> : null}
      {activeTab === 'trash' ? <TrashReport /> : null}
    </main>
  )
}
