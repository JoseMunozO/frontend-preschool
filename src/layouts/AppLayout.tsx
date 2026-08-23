import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
      {isSidebarOpen ? (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} role="presentation" />
      ) : null}
      <div className="app-main">
        <Topbar onMenuClick={() => setIsSidebarOpen((previous) => !previous)} />
        <Outlet />
      </div>
    </div>
  )
}
