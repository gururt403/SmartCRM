import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, MoreHorizontal, Pencil, Plus, Search, Target, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Meter } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableHead } from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { LeadFormDialog } from '@/components/leads/LeadForm'
import { LeadDetailDrawer } from '@/components/leads/LeadDetail'
import { useDeleteLead, useLeads } from '@/hooks/use-crm'
import { useTableQuery } from '@/hooks/use-table-query'
import { COMPANY_TYPES, LEAD_PRIORITIES, LEAD_SOURCES, LEAD_STATUSES, PRIORITY_VARIANTS, STATUS_VARIANTS } from '@/lib/constants'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams()
  const table = useTableQuery({ defaultSort: 'updated_at', filters: { status: 'all', priority: 'all', company_type: 'all', lead_source: 'all' } })
  const { data, isLoading, isFetching, isError, error, refetch } = useLeads(table.params)
  const deleteLead = useDeleteLead()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Deep links from the home page / command palette: ?focus=12, ?new=1
  useEffect(() => {
    const focus = searchParams.get('focus')
    if (focus) {
      setDetailId(Number(focus))
      searchParams.delete('focus')
      setSearchParams(searchParams, { replace: true })
    }
    if (searchParams.get('new')) {
      setEditing(null)
      setFormOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const leads = data?.data || []
  const openEdit = (lead) => {
    setEditing(lead)
    setFormOpen(true)
  }

  return (
    <div className="notion-page animate-fade-in">
      <PageHeader
        icon={Target}
        title="Leads"
        description="Every lead in your pipeline. Search, filtering and sorting all run on the server."
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" />New lead
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={table.search}
              onChange={(event) => table.onSearch(event.target.value)}
              placeholder="Search name, email, company…"
              className="pl-8"
              aria-label="Search leads"
            />
          </div>
          <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters((value) => !value)}>
            <Filter className="h-3.5 w-3.5" />
            Filters
            {table.activeFilterCount ? <Badge variant="primary">{table.activeFilterCount}</Badge> : null}
          </Button>
          {table.activeFilterCount ? (
            <Button variant="ghost" size="sm" onClick={table.reset}>
              <X className="h-3.5 w-3.5" />Clear
            </Button>
          ) : null}
        </div>

        {showFilters ? (
          <div className="grid gap-3 border-b bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Status" value={table.filters.status} onChange={(value) => table.setFilter('status', value)} options={LEAD_STATUSES} />
            <FilterSelect label="Priority" value={table.filters.priority} onChange={(value) => table.setFilter('priority', value)} options={LEAD_PRIORITIES} />
            <FilterSelect label="Company type" value={table.filters.company_type} onChange={(value) => table.setFilter('company_type', value)} options={COMPANY_TYPES} />
            <FilterSelect label="Source" value={table.filters.lead_source} onChange={(value) => table.setFilter('lead_source', value)} options={LEAD_SOURCES} />
          </div>
        ) : null}

        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : leads.length === 0 ? (
          <EmptyState
            title={table.activeFilterCount ? 'No leads match these filters' : 'No leads yet'}
            description={table.activeFilterCount ? 'Try clearing a filter or searching for something else.' : 'Create your first lead to get the pipeline moving.'}
            action={
              table.activeFilterCount
                ? <Button variant="outline" size="sm" onClick={table.reset}>Clear filters</Button>
                : <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4" />New lead</Button>
            }
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="name" label="Lead" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="company" label="Company" sort={table.sort} onSort={table.onSort} className="hidden md:table-cell" />
                  <SortableHead column="status" label="Status" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="priority" label="Priority" sort={table.sort} onSort={table.onSort} className="hidden lg:table-cell" />
                  <SortableHead column="budget" label="Budget" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="conversion_probability" label="Conversion" sort={table.sort} onSort={table.onSort} className="hidden lg:table-cell" />
                  <SortableHead column="updated_at" label="Updated" sort={table.sort} onSort={table.onSort} className="hidden xl:table-cell" />
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => setDetailId(lead.id)}>
                    <TableCell>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p>{lead.company}</p>
                      <p className="text-xs text-muted-foreground">{lead.company_type}</p>
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[lead.status]}>{lead.status}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell"><Badge variant={PRIORITY_VARIANTS[lead.priority]}>{lead.priority}</Badge></TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(lead.budget)}</TableCell>
                    <TableCell className="hidden w-28 lg:table-cell">
                      <span className="text-xs tabular-nums">{formatPercent(lead.conversion_probability, 0)}</span>
                      <Meter value={lead.conversion_probability} className="mt-1" />
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground xl:table-cell">
                      {formatDate(lead.updated_at)}
                    </TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${lead.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDetailId(lead.id)}>Open</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(lead)}><Pencil className="h-3.5 w-3.5" />Edit</DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setConfirmDelete(lead)}>
                            <Trash2 className="h-3.5 w-3.5" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination pagination={data?.meta?.pagination} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
          </div>
        )}
      </div>

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
      <LeadDetailDrawer
        leadId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        onEdit={(lead) => { setDetailId(null); openEdit(lead) }}
      />

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this lead?</DialogTitle>
            <DialogDescription>
              “{confirmDelete?.name}” will be archived. Its history stays in the audit log, but it will no longer appear in your lists.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={deleteLead.isPending}
              onClick={async () => {
                await deleteLead.mutateAsync(confirmDelete.id)
                setConfirmDelete(null)
              }}
            >
              Delete lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger className="h-8" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
