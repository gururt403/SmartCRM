export default function Topbar({ title, subtitle }) {
  return (
    <header className="mb-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">SmartCRM AI</p>
      <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}
