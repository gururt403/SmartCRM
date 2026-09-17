import { useState } from 'react'
import { CalendarClock, CheckSquare, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/misc'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/hooks/use-crm'
import { useTableQuery } from '@/hooks/use-table-query'
import { PRIORITY_VARIANTS, STATUS_VARIANTS, TASK_STATUSES } from '@/lib/constants'
import { cn, formatDate } from '@/lib/utils'

export default function Tasks() {
  const table = useTableQuery({ defaultSort: 'due_date', defaultDir: 'asc', filters: { status: 'Open' } })
  const { data, isLoading, isError, error, refetch } = useTasks(table.params)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const tasks = data?.data || []

  const addTask = async (event) => {
    event.preventDefault()
    if (title.trim().length < 2) return
    await createTask.mutateAsync({ title: title.trim(), due_date: dueDate || undefined })
    setTitle('')
    setDueDate('')
  }

  return (
    <div className="notion-page animate-fade-in">
      <PageHeader icon={CheckSquare} title="Tasks" description="Follow-ups assigned to you, ordered by what is due next." />

      <form onSubmit={addTask} className="mb-4 flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task…" aria-label="Task title" />
        <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="sm:w-44" aria-label="Due date" />
        <Button type="submit" loading={createTask.isPending} disabled={title.trim().length < 2}>
          <Plus className="h-4 w-4" />Add
        </Button>
      </form>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-2 border-b p-3">
          <Select value={table.filters.status} onValueChange={(value) => table.setFilter('status', value)}>
            <SelectTrigger className="w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              {TASK_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={table.search}
            onChange={(event) => table.onSearch(event.target.value)}
            placeholder="Search tasks…"
            className="flex-1"
            aria-label="Search tasks"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}</div>
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : tasks.length === 0 ? (
          <EmptyState title="Nothing here" description="Tasks you create on a lead or deal will appear in this list." />
        ) : (
          <>
            <ul className="divide-y">
              {tasks.map((task) => {
                const overdue = task.status !== 'Done' && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString())
                return (
                  <li key={task.id} className="group flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={task.status === 'Done'}
                      onCheckedChange={(checked) => updateTask.mutate({ id: task.id, status: checked ? 'Done' : 'Open' })}
                      aria-label={`Mark "${task.title}" complete`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm', task.status === 'Done' && 'text-muted-foreground line-through')}>{task.title}</p>
                      {task.lead_name || task.customer_name ? (
                        <p className="truncate text-xs text-muted-foreground">{task.lead_name || task.customer_name}</p>
                      ) : null}
                    </div>
                    <Badge variant={PRIORITY_VARIANTS[task.priority]} className="hidden sm:inline-flex">{task.priority}</Badge>
                    <Badge variant={STATUS_VARIANTS[task.status]} className="hidden md:inline-flex">{task.status}</Badge>
                    {task.due_date ? (
                      <span className={cn('flex shrink-0 items-center gap-1 text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                        <CalendarClock className="h-3 w-3" aria-hidden />
                        {formatDate(task.due_date, { month: 'short', day: 'numeric' })}
                      </span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => deleteTask.mutate(task.id)}
                      aria-label={`Delete "${task.title}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
            <Pagination pagination={data?.meta?.pagination} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
          </>
        )}
      </div>
    </div>
  )
}
