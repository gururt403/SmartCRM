import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-white">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-glow">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-4 text-slate-300">This CRM route does not exist.</p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-2xl bg-white px-4 py-3 font-semibold text-slate-950">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
