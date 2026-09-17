import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableRow } from './table'

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden {...props} />
}

function TableSkeleton({ rows = 6, columns = 6 }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <TableCell key={columnIndex}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function CardSkeleton({ className }) {
  return (
    <div className={cn('space-y-3 rounded-lg border p-5', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

export { Skeleton, TableSkeleton, CardSkeleton }
