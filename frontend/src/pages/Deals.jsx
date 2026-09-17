import { useState } from 'react'
import { GripVertical, Kanban, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Field, SelectField } from '@/components/leads/LeadForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreateDeal, useLeads, useMoveDeal, usePipeline, useStages } from '@/hooks/use-crm'
import { cn, formatCompactCurrency, formatCurrency, formatDate } from '@/lib/utils'

export default function Deals() {
  const { data: stages, isLoading, isError, error, refetch } = usePipeline()
  const moveDeal = useMoveDeal()
  const [dragging, setDragging] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const totalValue = (stages || []).reduce((sum, stage) => sum + (stage.is_won || stage.is_lost ? 0 : stage.total_value), 0)

  const drop = async (stage) => {
    setHovered(null)
    if (!dragging || dragging.stageKey === stage.key) return
    await moveDeal.mutateAsync({ id: dragging.id, stage_key: stage.key }).catch(() => {})
    setDragging(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 animate-fade-in md:px-10">
      <PageHeader
        icon={Kanban}
        title="Pipeline"
        description={`Drag a deal between stages. ${formatCompactCurrency(totalValue)} currently open — stage moves are validated server-side.`}
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New deal</Button>}
      />

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-80 w-72 shrink-0" />)}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {stages.map((stage) => (
            <section
              key={stage.id}
              onDragOver={(event) => { event.preventDefault(); setHovered(stage.key) }}
              onDragLeave={() => setHovered((current) => (current === stage.key ? null : current))}
              onDrop={() => drop(stage)}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors',
                hovered === stage.key && 'border-primary bg-primary/5'
              )}
              aria-label={`${stage.name} stage`}
            >
              <header className="flex items-center gap-2 border-b px-3 py-2.5">
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  stage.is_won ? 'bg-emerald-500' : stage.is_lost ? 'bg-red-500' : 'bg-primary'
                )} aria-hidden />
                <h2 className="text-sm font-medium">{stage.name}</h2>
                <Badge variant="outline" className="ml-auto">{stage.deals.length}</Badge>
              </header>
              <p className="px-3 pt-2 text-xs text-muted-foreground">{formatCompactCurrency(stage.total_value)}</p>

              <div className="flex-1 space-y-2 p-2">
                {stage.deals.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop a deal here</p>
                ) : (
                  stage.deals.map((deal) => (
                    <article
                      key={deal.id}
                      draggable
                      onDragStart={() => setDragging({ id: deal.id, stageKey: stage.key })}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        'group cursor-grab rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
                        dragging?.id === deal.id && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{deal.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{deal.customer_name || deal.lead_name || 'Unlinked'}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-medium tabular-nums">{formatCurrency(deal.value, deal.currency)}</span>
                        {deal.expected_close_date ? (
                          <span className="text-muted-foreground">{formatDate(deal.expected_close_date, { month: 'short', day: 'numeric' })}</span>
                        ) : null}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateDealDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

function CreateDealDialog({ open, onOpenChange }) {
  const { data: stages } = useStages()
  const { data: leadsPage } = useLeads({ page: 1, page_size: 50, sort_by: 'updated_at', sort_dir: 'desc' })
  const createDeal = useCreateDeal()

  const [form, setForm] = useState({ title: '', value: '', stage_key: 'new', lead_id: '', expected_close_date: '' })
  const [errors, setErrors] = useState({})

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (form.title.trim().length < 2) nextErrors.title = { message: 'Give the deal a title' }
    if (!form.lead_id) nextErrors.lead_id = { message: 'Link the deal to a lead' }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    try {
      await createDeal.mutateAsync({
        title: form.title.trim(),
        value: Number(form.value) || 0,
        stage_key: form.stage_key,
        lead_id: Number(form.lead_id),
        expected_close_date: form.expected_close_date || undefined
      })
      setForm({ title: '', value: '', stage_key: 'new', lead_id: '', expected_close_date: '' })
      onOpenChange(false)
    } catch (error) {
      setErrors(Object.fromEntries(Object.entries(error.fieldErrors || {}).map(([key, message]) => [key, { message }])))
    }
  }

  const leadOptions = (leadsPage?.data || []).map((lead) => ({ value: String(lead.id), label: `${lead.name} — ${lead.company}` }))
  const stageOptions = (stages || []).map((stage) => ({ value: stage.key, label: stage.name }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Deals track value and stage. Link one to the lead it came from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Title" required error={errors.title} className="sm:col-span-2">
            <Input value={form.title} onChange={(event) => set('title')(event.target.value)} placeholder="Acme — annual contract" invalid={!!errors.title} />
          </Field>
          <Field label="Lead" required error={errors.lead_id} className="sm:col-span-2">
            {leadOptions.length ? (
              <SelectField label="" value={form.lead_id} onChange={set('lead_id')} options={leadOptions} placeholder="Choose a lead" className="[&_label]:hidden" />
            ) : (
              <p className="text-sm text-muted-foreground">Create a lead first — deals attach to one.</p>
            )}
          </Field>
          <Field label="Value (USD)" error={errors.value}>
            <Input type="number" min="0" step="100" value={form.value} onChange={(event) => set('value')(event.target.value)} />
          </Field>
          <SelectField label="Stage" value={form.stage_key} onChange={set('stage_key')} options={stageOptions} />
          <Field label="Expected close" className="sm:col-span-2">
            <Input type="date" value={form.expected_close_date} onChange={(event) => set('expected_close_date')(event.target.value)} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={createDeal.isPending}>Create deal</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
