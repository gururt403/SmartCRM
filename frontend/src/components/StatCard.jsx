export default function StatCard({ title, value, subtitle, accent = 'from-cyan-500 to-blue-600' }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
      <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-r ${accent} px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white`}>
        {title}
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </div>
  )
}
