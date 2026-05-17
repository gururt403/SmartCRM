import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function PageShell({ user, onLogout, title, subtitle }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#0f172a_42%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <Sidebar user={user} onLogout={onLogout} />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Topbar title={title} subtitle={subtitle} />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
