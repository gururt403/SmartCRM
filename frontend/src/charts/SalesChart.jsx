import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function SalesChart({ data }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Monthly Sales Trends</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#243042" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff' }} />
            <Area type="monotone" dataKey="revenue" stroke="#22d3ee" fill="url(#salesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
