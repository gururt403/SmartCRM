import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Leads', to: '/leads' },
  { label: 'Predictions', to: '/predictions' }
]

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="flex min-h-screen w-full flex-col border-r border-white/10 bg-slate-950/95 px-4 py-6 text-white lg:w-72">
      <div className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500 via-blue-600 to-slate-900 p-5 shadow-glow">
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-100">SmartCRM AI</p>
        <h1 className="mt-2 text-2xl font-semibold">Local AI CRM</h1>
        <p className="mt-2 text-sm text-cyan-100/80">Fully localhost, no paid APIs, designed for portfolio demos.</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">{user?.name || 'Guest user'}</p>
        <p className="text-slate-400">{user?.role || 'salesperson'}</p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-4 w-full rounded-2xl bg-rose-500 px-4 py-2 font-semibold text-white transition hover:bg-rose-600"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
