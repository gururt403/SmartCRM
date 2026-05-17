export default function LoadingSpinner({ label = 'Loading data...' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200 shadow-glow">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
      <span>{label}</span>
    </div>
  )
}
