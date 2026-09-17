import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CornerDownLeft, Search, UserRound } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCustomers, useLeads } from '@/hooks/use-crm'
import { cn } from '@/lib/utils'

const PAGES = [
  { label: 'Home', to: '/home' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Leads', to: '/leads' },
  { label: 'Customers', to: '/customers' },
  { label: 'Pipeline', to: '/deals' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'AI Studio', to: '/predictions' }
]

/** ⌘K search. Record results come from the server (debounced), not a
 *  client-side scan of a fully-downloaded table. */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')

  useEffect(() => {
    if (!open) setTerm('')
  }, [open])

  // Only hit the API once the palette is open and something has been typed.
  const params = { search: term, page: 1, page_size: 5 }
  const enabled = Boolean(open && term.trim())
  const { data: leads } = useLeads(params, { enabled })
  const { data: customers } = useCustomers(params, { enabled })

  const pages = useMemo(
    () => PAGES.filter((page) => page.label.toLowerCase().includes(term.toLowerCase())),
    [term]
  )

  const go = (to) => {
    onOpenChange(false)
    navigate(to)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-xl translate-y-0 gap-0 p-0">
        <DialogTitle className="sr-only">Search SmartCRM</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search leads, customers and pages…"
            className="h-11 border-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          <Group title="Pages">
            {pages.map((page) => (
              <Row key={page.to} onSelect={() => go(page.to)}>
                <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {page.label}
              </Row>
            ))}
          </Group>

          {term ? (
            <>
              <Group title="Leads">
                {(leads?.data || []).map((lead) => (
                  <Row key={lead.id} onSelect={() => go(`/leads?focus=${lead.id}`)}>
                    <UserRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="truncate">{lead.name}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{lead.company}</span>
                  </Row>
                ))}
              </Group>
              <Group title="Customers">
                {(customers?.data || []).map((customer) => (
                  <Row key={customer.id} onSelect={() => go(`/customers?focus=${customer.id}`)}>
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="truncate">{customer.name}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{customer.company}</span>
                  </Row>
                ))}
              </Group>
            </>
          ) : null}

          {term && !pages.length && !leads?.data?.length && !customers?.data?.length ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results for “{term}”</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Group({ title, children }) {
  if (!children || (Array.isArray(children) && !children.filter(Boolean).length)) return null
  return (
    <div className="mb-2">
      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function Row({ children, onSelect, className }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none', className)}
    >
      {children}
    </button>
  )
}
