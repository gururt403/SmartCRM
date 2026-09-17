import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, BarChart3, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/misc'
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { PageHeader } from '@/components/layout/PageHeader'
import { Chart, ChartBlock } from '@/components/dashboard/charts'
import { useDashboardAnalytics, useDashboardSummary } from '@/hooks/use-crm'
import { STATUS_VARIANTS } from '@/lib/constants'
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

export default function Dashboard() {
  const summary = useDashboardSummary()
  const analytics = useDashboardAnalytics()

  if (summary.isError) {
    return (
      <div className="notion-page">
        <ErrorState error={summary.error} onRetry={summary.refetch} />
      </div>
    )
  }

  const kpis = summary.data?.kpis
  const monthLabel = (month) => (month ? new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '')

  const leadsOverTime = (summary.data?.leads_over_time || []).map((row) => ({ ...row, month: monthLabel(row.month) }))
  const revenueOverTime = (summary.data?.revenue_over_time || []).map((row) => ({ ...row, month: monthLabel(row.month) }))

  return (
    <div className="notion-page animate-fade-in">
      <PageHeader
        icon={BarChart3}
        title="Dashboard"
        description="Pipeline health, conversion and activity — computed directly from your CRM records."
      />

      {summary.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Total leads" value={formatNumber(kpis.total_leads)} hint={`${formatNumber(kpis.open_leads)} still open`} />
          <Kpi label="Active customers" value={formatNumber(kpis.active_customers)} hint={`${formatCompactCurrency(kpis.revenue)} revenue`} />
          <Kpi label="Open deals" value={formatNumber(kpis.open_deals)} hint={`${formatCompactCurrency(kpis.pipeline_value)} in play`} />
          <Kpi label="Weighted pipeline" value={formatCompactCurrency(kpis.weighted_pipeline_value)} hint="value × stage probability" />
          <Kpi label="Won deals" value={formatNumber(kpis.won_deals)} hint={`${formatCompactCurrency(kpis.won_value)} closed`} />
          <Kpi
            label="Conversion rate"
            value={formatPercent(kpis.conversion_rate)}
            hint={`${formatNumber(kpis.converted_leads)} of ${formatNumber(kpis.total_leads)} leads`}
            meter={kpis.conversion_rate}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartBlock title="Leads over time" description="New leads per month, and how many converted">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart
              type="area"
              data={leadsOverTime}
              xKey="month"
              series={[{ key: 'leads', label: 'Leads' }, { key: 'converted', label: 'Converted' }]}
            />
          )}
        </ChartBlock>

        <ChartBlock title="Revenue from won deals" description="Closed-won value by month">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart type="bar" data={revenueOverTime} xKey="month" series={[{ key: 'revenue', label: 'Revenue' }]} valueFormat="currency" />
          )}
        </ChartBlock>

        <ChartBlock title="Pipeline by stage" description="Deal value sitting in each stage">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart type="bar" data={summary.data.pipeline_by_stage} xKey="name" series={[{ key: 'value', label: 'Value' }]} valueFormat="currency" />
          )}
        </ChartBlock>

        <ChartBlock title="Lead sources" description="Where your leads come from">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart type="pie" data={summary.data.lead_sources} />
          )}
        </ChartBlock>

        <ChartBlock title="Activity trend" description="Logged calls, emails and meetings (last 30 days)">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart type="line" data={summary.data.activity_trend} xKey="day" series={[{ key: 'count', label: 'Activities' }]} height={220} />
          )}
        </ChartBlock>

        <ChartBlock title="Lead status mix" description="How the funnel is distributed right now">
          {summary.isLoading ? <Skeleton className="h-64 w-full" /> : (
            <Chart type="pie" data={summary.data.lead_status} height={220} />
          )}
        </ChartBlock>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <LeadList
          title="Most likely to convert"
          icon={TrendingUp}
          rows={analytics.data?.top_leads}
          loading={analytics.isLoading}
          field="conversion_probability"
          tone="success"
          emptyText="Score a few leads in the AI Studio to populate this list."
        />
        <LeadList
          title="At risk of churning"
          icon={AlertTriangle}
          rows={analytics.data?.at_risk_leads}
          loading={analytics.isLoading}
          field="churn_probability"
          tone="danger"
          emptyText="No leads currently cross the 50% churn threshold."
        />
      </div>
    </div>
  )
}

function Kpi({ label, value, hint, meter }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {meter !== undefined ? <Meter value={meter} className="mt-2" /> : null}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function LeadList({ title, icon: Icon, rows, loading, field, tone, emptyText }) {
  return (
    <section className="rounded-lg border bg-card" aria-label={title}>
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-medium">{title}</h3>
      </header>
      {loading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
      ) : rows?.length ? (
        <ul className="divide-y">
          {rows.map((lead) => (
            <li key={lead.id}>
              <Link to={`/leads?focus=${lead.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{lead.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{lead.company} · {formatCurrency(lead.budget)}</span>
                </span>
                <Badge variant={STATUS_VARIANTS[lead.status]}>{lead.status}</Badge>
                <span className="w-16 shrink-0 text-right">
                  <span className="text-sm font-medium tabular-nums">{formatPercent(lead[field], 0)}</span>
                  <Meter value={lead[field]} tone={tone} className="mt-1" />
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing to show" description={emptyText} className="py-10" />
      )}
    </section>
  )
}
