import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-secondary text-secondary-foreground',
        primary: 'border-transparent bg-primary/10 text-primary',
        success: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
        info: 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
        purple: 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
        outline: 'text-foreground'
      }
    },
    defaultVariants: { variant: 'default' }
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
