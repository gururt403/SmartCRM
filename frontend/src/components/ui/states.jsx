import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

/** Nothing here yet — with the action that fixes that. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <div className="rounded-full bg-muted p-3">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

/** Something failed — show the user-safe message the API returned, plus retry. */
export function ErrorState({ error, onRetry, className, title = 'Could not load this' }) {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  const Icon = offline ? WifiOff : AlertTriangle
  const message = offline
    ? 'You appear to be offline. Check your connection and try again.'
    : error?.message || 'An unexpected error occurred.'

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)} role="alert">
      <div className="rounded-full bg-destructive/10 p-3">
        <Icon className="h-6 w-6 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{offline ? 'No connection' : title}</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
