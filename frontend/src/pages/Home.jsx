import { Link } from 'react-router-dom'
import {
  ArrowUpRight, BarChart3, Building2, CalendarClock, CheckSquare, FileText, Kanban, LayoutGrid,
  Plus, Sparkles, UserRound
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/misc'
import { CardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardSummary, useLeads, useTasks, useUpdateTask } from '@/hooks/use-crm'
import { STATUS_VARIANTS } from '@/lib/constants'
import { cn, formatCompactCurrency, formatDate, formatNumber, formatPercent, formatRelative } from '@/lib/utils'

const QUICK_LINKS = [
  { to: '/leads', title: 'Leads', description: 'Capture and qualify new demand', icon: UserRound },
  { to: '/deals', title: 'Pipeline', description: 'Move deals through their stages', icon: Kanban },
  { to: '/customers', title: 'Customers', description: 'Accounts, revenue and churn risk', icon: Building2 },
  { to: '/tasks', title: 'Tasks', description: 'Follow-ups that keep deals alive', icon: CheckSquare },
  { to: '/dashboard', title: 'Dashboard', description: 'Conversion, revenue and activity', icon: BarChart3 },
  { to: '/predictions', title: 'AI Studio', description: 'Scoring, churn and reply drafts', icon: Sparkles }
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { user } = useAuth()
  const summary = useDashboardSummary()
  const updateTask = useUpdateTask()

  const tasks = useTasks({ status: 'Open', sort_by: 'due_date', sort_dir: 'asc', page: 1, page_size: 5 })
  const recentLeads = useLeads({ sort_by: 'updated_at', sort_dir: 'desc', page: 1, page_size: 5 })

  const kpis = summary.data?.kpis

  return (
    <div className="animate-fade-in">
      {/* Notion-style cover + page icon */}
      <div className="h-[140px] w-full bg-[linear-gradient(120deg,#dbeafe_0%,#ede9fe_45%,#fce7f3_100%)] dark:bg-[linear-gradient(120deg,#1e293b_0%,#312e40_50%,#3b2b3a_100%)]" />
      <div className="notion-page">
        <div className="-mt-9 mb-4 flex h-16 w-16 items-center justify-center rounded-xl border bg-card shadow-sm">
          <LayoutGrid className="h-8 w-8 text-primary" aria-hidden />
        </div>

        <h1 className="notion-title">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your sales workspace — every number below is read live from your CRM database.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/leads?new=1"><Plus className="h-4 w-4" />New lead</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/deals">Open pipeline</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/dashboard">View dashboard <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        {/* Inline metric row, like a Notion callout strip */}
        <section className="mt-10" aria-labelledby="today-heading">
          <h2 id="today-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            At a glance
          </h2>
          {summary.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)}
            </div>
          ) : summary.isError ? (
            <ErrorState error={summary.error} onRetry={summary.refetch} className="rounded-lg border" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Open leads" value={formatNumber(kpis.open_leads)} hint={`${formatNumber(kpis.total_leads)} total`} />
              <Metric label="Pipeline value" value={formatCompactCurrency(kpis.pipeline_value)} hint={`${formatNumber(kpis.open_deals)} open deals`} />
              <Metric label="Conversion rate" value={formatPercent(kpis.conversion_rate)} hint={`${formatNumber(kpis.converted_leads)} converted`} />
              <Metric
                label="Pending tasks"
                value={formatNumber(kpis.pending_tasks)}
                hint={kpis.overdue_tasks ? `${formatNumber(kpis.overdue_tasks)} overdue` : 'nothing overdue'}
                tone={kpis.overdue_tasks ? 'danger' : 'default'}
              />
            </div>
          )}
        </section>

        <section className="mt-10" aria-labelledby="jump-heading">
          <h2 id="jump-heading" className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jump to
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/60"
              >
                <link.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-medium">
                    {link.title}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{link.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="tasks-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="tasks-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Up next
              </h2>
              <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground">All tasks</Link>
            </div>
            {tasks.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}</div>
            ) : tasks.data?.data?.length ? (
              <ul className="space-y-0.5">
                {tasks.data.data.map((task) => {
                  const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString())
                  return (
                    <li key={task.id} className="notion-block flex items-center gap-2.5">
                      <Checkbox
                        checked={task.status === 'Done'}
                        onCheckedChange={(checked) => updateTask.mutate({ id: task.id, status: checked ? 'Done' : 'Open' })}
                        aria-label={`Mark "${task.title}" complete`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                      {task.due_date ? (
                        <span className={cn('flex shrink-0 items-center gap-1 text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                          <CalendarClock className="h-3 w-3" aria-hidden />
                          {formatDate(task.due_date, { month: 'short', day: 'numeric' })}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="No open tasks"
                description="Follow-ups you create on a lead or deal will show up here."
                className="rounded-lg border py-10"
              />
            )}
          </section>

          <section aria-labelledby="recent-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recently updated
              </h2>
              <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground">All leads</Link>
            </div>
            {recentLeads.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}</div>
            ) : recentLeads.data?.data?.length ? (
              <ul className="space-y-0.5">
                {recentLeads.data.data.map((lead) => (
                  <li key={lead.id}>
                    <Link to={`/leads?focus=${lead.id}`} className="notion-block flex items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{lead.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {lead.company} · {formatRelative(lead.updated_at)}
                        </span>
                      </span>
                      <Badge variant={STATUS_VARIANTS[lead.status]}>{lead.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={UserRound}
                title="No leads yet"
                description="Add your first lead to start tracking the pipeline."
                action={<Button asChild size="sm"><Link to="/leads?new=1">Add a lead</Link></Button>}
                className="rounded-lg border py-10"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, hint, tone = 'default' }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className={cn('mt-0.5 text-xs', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')}>{hint}</p> : null}
    </div>
  )
}
