import { cn } from '@/lib/utils'

/** Notion-style page heading: page icon, big title, quiet description. */
export function PageHeader({ icon: Icon, title, description, actions, className }) {
  return (
    <div className={cn('flex flex-col gap-4 pb-6 pt-8 md:flex-row md:items-end md:justify-between', className)}>
      <div className="min-w-0 space-y-2">
        {Icon ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
        ) : null}
        <h1 className="notion-title">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
