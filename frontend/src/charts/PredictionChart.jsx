import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#38bdf8', '#8b5cf6']

export default function PredictionChart({ data }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
      <h3 className="mb-4 text-lg font-semibold text-white">Prediction Analytics</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={4}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
