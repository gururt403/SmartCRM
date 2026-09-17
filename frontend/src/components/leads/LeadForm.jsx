import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateLead, useUpdateLead } from '@/hooks/use-crm'
import { COMPANY_TYPES, LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, LEAD_TRANSITIONS } from '@/lib/constants'

/** Client-side mirror of the server schema. The server still validates
 *  everything — this just gives instant feedback. */
const leadSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().regex(/^[0-9+\-()\s]{6,20}$/, 'Enter a valid phone number').or(z.literal('')),
  company: z.string().trim().min(1, 'Company is required').max(160),
  company_type: z.enum(COMPANY_TYPES),
  lead_source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  priority: z.enum(LEAD_PRIORITIES),
  budget: z.coerce.number().min(0, 'Budget cannot be negative'),
  response_rate: z.coerce.number().min(0).max(1, 'Use a value between 0 and 1'),
  interaction_count: z.coerce.number().int().min(0),
  previous_purchases: z.coerce.number().int().min(0),
  follow_up_date: z.string().optional(),
  last_contact_date: z.string().optional()
})

const EMPTY = {
  name: '', email: '', phone: '', company: '', company_type: 'SMB', lead_source: 'Website',
  status: 'New', priority: 'Medium', budget: 0, response_rate: 0, interaction_count: 0,
  previous_purchases: 0, follow_up_date: '', last_contact_date: ''
}

export function LeadFormDialog({ open, onOpenChange, lead }) {
  const editing = Boolean(lead?.id)
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const mutation = editing ? updateLead : createLead

  const form = useForm({ resolver: zodResolver(leadSchema), defaultValues: EMPTY, mode: 'onBlur' })
  const { register, handleSubmit, reset, setValue, watch, setError, formState } = form

  useEffect(() => {
    if (!open) return
    reset(lead ? { ...EMPTY, ...Object.fromEntries(Object.entries(lead).filter(([key]) => key in EMPTY)) } : EMPTY)
  }, [open, lead, reset])

  // Only offer statuses the server will actually accept from here.
  const statusOptions = editing ? LEAD_TRANSITIONS[lead.status] || LEAD_STATUSES : ['New', 'Contacted', 'Qualified']

  const onSubmit = handleSubmit(async (values) => {
    const payload = { ...values }
    if (!payload.follow_up_date) delete payload.follow_up_date
    if (!payload.last_contact_date) delete payload.last_contact_date

    try {
      await mutation.mutateAsync(editing ? { id: lead.id, ...payload } : payload)
      onOpenChange(false)
    } catch (error) {
      // Surface server-side field errors on the matching inputs.
      Object.entries(error.fieldErrors || {}).forEach(([field, message]) => setError(field, { message }))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit lead' : 'New lead'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the details for this lead.' : 'Capture a new lead. You can qualify it later from the pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Name" required error={formState.errors.name}>
            <Input {...register('name')} invalid={!!formState.errors.name} autoFocus placeholder="Jane Cooper" />
          </Field>
          <Field label="Email" required error={formState.errors.email}>
            <Input type="email" {...register('email')} invalid={!!formState.errors.email} placeholder="jane@acme.com" />
          </Field>
          <Field label="Company" required error={formState.errors.company}>
            <Input {...register('company')} invalid={!!formState.errors.company} placeholder="Acme Inc." />
          </Field>
          <Field label="Phone" error={formState.errors.phone}>
            <Input {...register('phone')} invalid={!!formState.errors.phone} placeholder="+1 555 0100" />
          </Field>

          <SelectField label="Company type" value={watch('company_type')} onChange={(v) => setValue('company_type', v)} options={COMPANY_TYPES} />
          <SelectField label="Source" value={watch('lead_source')} onChange={(v) => setValue('lead_source', v)} options={LEAD_SOURCES} />
          <SelectField label="Status" value={watch('status')} onChange={(v) => setValue('status', v)} options={statusOptions} />
          <SelectField label="Priority" value={watch('priority')} onChange={(v) => setValue('priority', v)} options={LEAD_PRIORITIES} />

          <Field label="Budget (USD)" error={formState.errors.budget}>
            <Input type="number" min="0" step="100" {...register('budget')} invalid={!!formState.errors.budget} />
          </Field>
          <Field label="Response rate (0–1)" error={formState.errors.response_rate} hint="Share of your outreach they reply to">
            <Input type="number" min="0" max="1" step="0.01" {...register('response_rate')} invalid={!!formState.errors.response_rate} />
          </Field>
          <Field label="Interactions" error={formState.errors.interaction_count}>
            <Input type="number" min="0" {...register('interaction_count')} />
          </Field>
          <Field label="Previous purchases" error={formState.errors.previous_purchases}>
            <Input type="number" min="0" {...register('previous_purchases')} />
          </Field>
          <Field label="Follow-up date" error={formState.errors.follow_up_date}>
            <Input type="date" {...register('follow_up_date')} />
          </Field>
          <Field label="Last contacted" error={formState.errors.last_contact_date}>
            <Input type="date" {...register('last_contact_date')} />
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}>
              {editing ? 'Save changes' : 'Create lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Field({ label, error, required, hint, children, className }) {
  return (
    <div className={className}>
      <Label required={required} className="mb-1.5 block">{label}</Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-destructive" role="alert">{error.message}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function SelectField({ label, value, onChange, options, className, placeholder }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const isObject = typeof option === 'object'
            return (
              <SelectItem key={isObject ? option.value : option} value={isObject ? option.value : option}>
                {isObject ? option.label : option}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </div>
  )
}
