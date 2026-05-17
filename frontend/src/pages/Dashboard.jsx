import { useEffect, useState } from 'react'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import StatCard from '../components/StatCard'
import SalesChart from '../charts/SalesChart'
import PredictionChart from '../charts/PredictionChart'

const fallbackChartData = [{ month: '2026-05', revenue: 0 }]

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryResponse, analyticsResponse] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/analytics')
        ])
        setSummary(summaryResponse.data)
        setAnalytics(analyticsResponse.data)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return <LoadingSpinner label="Loading dashboard analytics..." />
  }

  const totals = summary?.totals || {}

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Leads" value={totals.leads ?? 0} subtitle="All tracked leads in SQLite" />
        <StatCard title="Converted" value={totals.converted_leads ?? 0} subtitle="Won opportunities" accent="from-emerald-500 to-green-600" />
        <StatCard title="Revenue" value={`$${Number(totals.revenue || 0).toLocaleString()}`} subtitle="Customer revenue overview" accent="from-amber-500 to-orange-600" />
        <StatCard title="Avg Conversion" value={`${((analytics?.average_conversion_probability || 0) * 100).toFixed(1)}%`} subtitle="Model output average" accent="from-fuchsia-500 to-pink-600" />
        <StatCard title="Avg Churn" value={`${((analytics?.average_churn_probability || 0) * 100).toFixed(1)}%`} subtitle="Risk monitoring" accent="from-rose-500 to-red-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SalesChart data={summary?.monthly_sales?.length ? summary.monthly_sales : fallbackChartData} />
        <PredictionChart data={summary?.prediction_mix?.length ? summary.prediction_mix : [{ name: 'lead_scoring', value: 1 }]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
          <h3 className="mb-4 text-lg font-semibold text-white">Lead Categories</h3>
          <div className="space-y-3">
            {(summary?.lead_sources || []).map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                  <span>{item.name}</span>
                  <span>{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${Math.min(100, item.value * 12)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-glow backdrop-blur">
          <h3 className="mb-4 text-lg font-semibold text-white">Prediction Analytics</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">High conversion leads</p>
              <p className="mt-2 text-2xl font-semibold text-white">{analytics?.high_conversion_leads ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">High churn risk</p>
              <p className="mt-2 text-2xl font-semibold text-white">{analytics?.high_churn_leads ?? 0}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            This dashboard combines stored CRM data, model outputs, and SQLite analytics to give a portfolio-friendly executive view.
          </p>
        </div>
      </div>
    </div>
  )
}
