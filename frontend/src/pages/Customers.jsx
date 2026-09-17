import { useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Meter, Separator } from '@/components/ui/misc'
import { Pagination } from '@/components/ui/pagination'
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHeader, TableRow, SortableHead } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { useCustomer, useCustomers } from '@/hooks/use-crm'
import { useTableQuery } from '@/hooks/use-table-query'
import { CUSTOMER_STATUSES, STATUS_VARIANTS } from '@/lib/constants'
import { formatCurrency, formatDate, formatPercent, formatRelative } from '@/lib/utils'

export default function Customers() {
  const table = useTableQuery({ defaultSort: 'updated_at', filters: { status: 'all' } })
  const { data, isLoading, isFetching, isError, error, refetch } = useCustomers(table.params)
  const [detailId, setDetailId] = useState(null)

  const customers = data?.data || []

  return (
    <div className="notion-page animate-fade-in">
      <PageHeader
        icon={Building2}
        title="Customers"
        description="Accounts that converted from a lead, with revenue, deals and churn risk."
      />

      <div className="rounded-lg border bg-card">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={table.search}
              onChange={(event) => table.onSearch(event.target.value)}
              placeholder="Search customers…"
              className="pl-8"
              aria-label="Search customers"
            />
          </div>
          <Select value={table.filters.status} onValueChange={(value) => table.setFilter('status', value)}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CUSTOMER_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Customers are created automatically when you move a lead to Converted."
          />
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead column="name" label="Customer" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="company" label="Company" sort={table.sort} onSort={table.onSort} className="hidden md:table-cell" />
                  <SortableHead column="status" label="Status" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="revenue" label="Revenue" sort={table.sort} onSort={table.onSort} />
                  <SortableHead column="updated_at" label="Churn risk" sort={table.sort} onSort={table.onSort} className="hidden lg:table-cell" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => setDetailId(customer.id)}>
                    <TableCell>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{customer.company}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[customer.status]}>{customer.status}</Badge></TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(customer.revenue)}</TableCell>
                    <TableCell className="hidden w-28 lg:table-cell">
                      <span className="text-xs tabular-nums">{formatPercent(customer.churn_probability, 0)}</span>
                      <Meter value={customer.churn_probability} tone="danger" className="mt-1" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination pagination={data?.meta?.pagination} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} />
          </div>
        )}
      </div>

      <CustomerDrawer customerId={detailId} open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)} />
    </div>
  )
}

function CustomerDrawer({ customerId, open, onOpenChange }) {
  const { data: customer, isLoading, isError, error, refetch } = useCustomer(open ? customerId : null)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {isLoading ? (
          <div className="space-y-4 p-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>
        ) : isError ? (
          <div className="p-6"><ErrorState error={error} onRetry={refetch} /></div>
        ) : customer ? (
          <>
            <header className="border-b px-6 py-5">
              <DrawerTitle className="text-xl font-semibold">{customer.name}</DrawerTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{customer.company}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANTS[customer.status]}>{customer.status}</Badge>
                <Badge variant="outline">{formatCurrency(customer.revenue)} revenue</Badge>
                <Badge variant="outline">{customer.deal_count} deals</Badge>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Tabs defaultValue="overview">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="deals">Deals ({customer.deals?.length || 0})</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline ({customer.activities?.length || 0})</TabsTrigger>
                  <TabsTrigger value="notes">Notes ({customer.notes?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Email</dt><dd className="truncate font-medium">{customer.email}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="font-medium">{customer.phone || '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="font-medium">{customer.owner_name || 'Unassigned'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Since</dt><dd className="font-medium">{formatDate(customer.created_at)}</dd></div>
                  </dl>
                  <Separator />
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Churn risk</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{formatPercent(customer.churn_probability, 0)}</p>
                    <Meter value={customer.churn_probability} tone="danger" className="mt-2" />
                  </div>
                </TabsContent>

                <TabsContent value="deals">
                  {customer.deals?.length ? (
                    <ul className="space-y-2">
                      {customer.deals.map((deal) => (
                        <li key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">{deal.stage_name}</p>
                          </div>
                          <span className="text-sm font-medium tabular-nums">{formatCurrency(deal.value)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No deals" className="py-10" />}
                </TabsContent>

                <TabsContent value="timeline">
                  {customer.activities?.length ? (
                    <ol className="space-y-3 border-l pl-4">
                      {customer.activities.map((activity) => (
                        <li key={activity.id} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                          <p className="text-sm font-medium">{activity.subject}</p>
                          <p className="text-xs text-muted-foreground">{activity.type} · {formatRelative(activity.occurred_at)}</p>
                        </li>
                      ))}
                    </ol>
                  ) : <EmptyState title="Nothing logged yet" className="py-10" />}
                </TabsContent>

                <TabsContent value="notes">
                  {customer.notes?.length ? (
                    <ul className="space-y-2">
                      {customer.notes.map((note) => (
                        <li key={note.id} className="rounded-lg border p-3">
                          <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{note.author_name} · {formatRelative(note.created_at)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No notes" className="py-10" />}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
