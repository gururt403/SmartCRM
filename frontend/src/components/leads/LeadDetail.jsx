import { useState } from 'react'
import { CalendarClock, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Input, Textarea } from '@/components/ui/input'
import { Meter, Separator } from '@/components/ui/misc'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { SelectField } from './LeadForm'
import { useCreateNote, useCreateTask, useDeleteNote, useLead, useLogLeadActivity, useUpdateTask } from '@/hooks/use-crm'
import { ACTIVITY_TYPES, PRIORITY_VARIANTS, STATUS_VARIANTS } from '@/lib/constants'
import { Checkbox } from '@/components/ui/misc'
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/utils'

export function LeadDetailDrawer({ leadId, open, onOpenChange, onEdit }) {
  const { data: lead, isLoading, isError, error, refetch } = useLead(open ? leadId : null)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <div className="p-6"><ErrorState error={error} onRetry={refetch} /></div>
        ) : lead ? (
          <>
            <header className="border-b px-6 py-5">
              <DrawerTitle className="text-xl font-semibold">{lead.name}</DrawerTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{lead.company} · {lead.company_type}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANTS[lead.status]}>{lead.status}</Badge>
                <Badge variant={PRIORITY_VARIANTS[lead.priority]}>{lead.priority} priority</Badge>
                <Badge variant="outline">{lead.lead_source}</Badge>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => onEdit(lead)}>Edit</Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activities">Activity ({lead.activities?.length || 0})</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks ({lead.tasks?.length || 0})</TabsTrigger>
                  <TabsTrigger value="notes">Notes ({lead.notes?.length || 0})</TabsTrigger>
                  <TabsTrigger value="deals">Deals ({lead.deals?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-5">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <Detail label="Email" value={<a className="text-primary hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>} icon={Mail} />
                    <Detail label="Phone" value={lead.phone || '—'} icon={Phone} />
                    <Detail label="Budget" value={formatCurrency(lead.budget)} />
                    <Detail label="Owner" value={lead.owner_name || 'Unassigned'} />
                    <Detail label="Follow-up" value={formatDate(lead.follow_up_date)} icon={CalendarClock} />
                    <Detail label="Last contact" value={formatDate(lead.last_contact_date)} />
                    <Detail label="Interactions" value={lead.interaction_count} />
                    <Detail label="Response rate" value={formatPercent(lead.response_rate, 0)} />
                  </dl>

                  <Separator />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Score label="Conversion probability" value={lead.conversion_probability} tone="success" />
                    <Score label="Churn risk" value={lead.churn_probability} tone="danger" />
                  </div>

                  <div className="rounded-lg border p-3 text-sm">
                    <p className="text-xs text-muted-foreground">Sentiment</p>
                    <p className="mt-1 font-medium">{lead.sentiment_label}</p>
                  </div>
                </TabsContent>

                <TabsContent value="activities">
                  <ActivityComposer leadId={lead.id} />
                  {lead.activities?.length ? (
                    <ol className="mt-4 space-y-3 border-l pl-4">
                      {lead.activities.map((activity) => (
                        <li key={activity.id} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                          <p className="text-sm font-medium">{activity.subject}</p>
                          {activity.notes ? <p className="mt-0.5 text-sm text-muted-foreground">{activity.notes}</p> : null}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {activity.type} · {formatRelative(activity.occurred_at)} · {activity.user_name || 'System'}
                          </p>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState title="No activity yet" description="Log a call, email or meeting to start the timeline." className="py-10" />
                  )}
                </TabsContent>

                <TabsContent value="tasks">
                  <TaskComposer leadId={lead.id} />
                  <TaskList tasks={lead.tasks} />
                </TabsContent>

                <TabsContent value="notes">
                  <NoteComposer leadId={lead.id} />
                  <NoteList notes={lead.notes} />
                </TabsContent>

                <TabsContent value="deals">
                  {lead.deals?.length ? (
                    <ul className="space-y-2">
                      {lead.deals.map((deal) => (
                        <li key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">{deal.stage_name} · {formatCurrency(deal.value)}</p>
                          </div>
                          <Badge variant="primary">{formatPercent(deal.probability, 0)}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="No deals" description="Deals are created automatically when a lead converts." className="py-10" />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}

function Score({ label, value, tone }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{formatPercent(value, 0)}</p>
      <Meter value={value} tone={tone} className="mt-2" />
    </div>
  )
}

function ActivityComposer({ leadId }) {
  const [type, setType] = useState('Call')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const logActivity = useLogLeadActivity()

  const submit = async (event) => {
    event.preventDefault()
    if (subject.trim().length < 2) return
    await logActivity.mutateAsync({ id: leadId, type, subject: subject.trim(), notes: notes.trim() })
    setSubject('')
    setNotes('')
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border p-3">
      <div className="flex gap-2">
        <SelectField label="" value={type} onChange={setType} options={ACTIVITY_TYPES} className="w-32 [&_label]:hidden" />
        <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What happened?" required minLength={2} />
      </div>
      <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" className="min-h-[60px]" />
      <Button type="submit" size="sm" loading={logActivity.isPending} disabled={subject.trim().length < 2}>
        <Plus className="h-3.5 w-3.5" />Log activity
      </Button>
    </form>
  )
}

function TaskComposer({ leadId }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const createTask = useCreateTask()

  const submit = async (event) => {
    event.preventDefault()
    if (title.trim().length < 2) return
    await createTask.mutateAsync({ title: title.trim(), lead_id: leadId, due_date: dueDate || undefined })
    setTitle('')
    setDueDate('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a follow-up task" />
      <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="sm:w-40" aria-label="Due date" />
      <Button type="submit" size="sm" loading={createTask.isPending} disabled={title.trim().length < 2}>Add</Button>
    </form>
  )
}

function TaskList({ tasks }) {
  const updateTask = useUpdateTask()
  if (!tasks?.length) {
    return <EmptyState title="No tasks" description="Add a follow-up so this lead does not go cold." className="py-10" />
  }
  return (
    <ul className="mt-4 space-y-1">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50">
          <Checkbox
            checked={task.status === 'Done'}
            onCheckedChange={(checked) => updateTask.mutate({ id: task.id, status: checked ? 'Done' : 'Open' })}
            aria-label={`Mark "${task.title}" complete`}
          />
          <span className={task.status === 'Done' ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm'}>{task.title}</span>
          {task.due_date ? <span className="text-xs text-muted-foreground">{formatDate(task.due_date, { month: 'short', day: 'numeric' })}</span> : null}
        </li>
      ))}
    </ul>
  )
}

function NoteComposer({ leadId }) {
  const [body, setBody] = useState('')
  const createNote = useCreateNote()

  const submit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return
    await createNote.mutateAsync({ body: body.trim(), lead_id: leadId })
    setBody('')
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border p-3">
      <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a note…" />
      <Button type="submit" size="sm" loading={createNote.isPending} disabled={!body.trim()}>Save note</Button>
    </form>
  )
}

function NoteList({ notes }) {
  const deleteNote = useDeleteNote()
  if (!notes?.length) {
    return <EmptyState title="No notes" description="Context you write here stays with the lead." className="py-10" />
  }
  return (
    <ul className="mt-4 space-y-2">
      {notes.map((note) => (
        <li key={note.id} className="group rounded-lg border p-3">
          <p className="whitespace-pre-wrap text-sm">{note.body}</p>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{note.author_name || 'Unknown'} · {formatRelative(note.created_at)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => deleteNote.mutate(note.id)}
              aria-label="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
