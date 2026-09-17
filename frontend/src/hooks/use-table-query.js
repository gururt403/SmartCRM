import { useCallback, useMemo, useState } from 'react'
import { useDebounce } from './use-debounce'

/**
 * Server-side table state: search, filters, sort and pagination.
 * Returns the exact params object the API expects, so no list endpoint ever
 * over-fetches and filters in the browser.
 */
export function useTableQuery({ defaultSort = 'updated_at', defaultDir = 'desc', pageSize = 20, filters: initialFilters = {} } = {}) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [sort, setSort] = useState({ sort_by: defaultSort, sort_dir: defaultDir })
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(pageSize)

  const debouncedSearch = useDebounce(search, 350)

  const params = useMemo(
    () => ({ ...filters, search: debouncedSearch, ...sort, page, page_size: size }),
    [filters, debouncedSearch, sort, page, size]
  )

  const setFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }, [])

  const onSort = useCallback((column, direction) => {
    setSort({ sort_by: column, sort_dir: direction })
    setPage(1)
  }, [])

  const onSearch = useCallback((value) => {
    setSearch(value)
    setPage(1)
  }, [])

  const reset = useCallback(() => {
    setSearch('')
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters])

  const activeFilterCount = Object.values(filters).filter((value) => value && value !== 'all').length + (search ? 1 : 0)

  return {
    params, search, onSearch, filters, setFilter, sort, onSort,
    page, setPage, pageSize: size, setPageSize: (value) => { setSize(value); setPage(1) },
    reset, activeFilterCount
  }
}
