import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/** Recharts is ~100kB; load it only when a chart is actually rendered. */
const Charts = lazy(() => import('./chart-impl'))

export function ChartBlock({ title, description, children }) {
  return (
    <section className="rounded-lg border bg-card p-4" aria-label={title}>
      <header className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </section>
  )
}

export function Chart(props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Charts {...props} />
    </Suspense>
  )
}
