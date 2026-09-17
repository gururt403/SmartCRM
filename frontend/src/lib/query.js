import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/** Stable query keys — every hook derives its key from here. */
export const queryKeys = {
  me: ['me'],
  users: ['users'],
  leads: (params) => ['leads', params],
  lead: (id) => ['lead', id],
  customers: (params) => ['customers', params],
  customer: (id) => ['customer', id],
  deals: (params) => ['deals', params],
  pipeline: ['deals', 'pipeline'],
  stages: ['deals', 'stages'],
  tasks: (params) => ['tasks', params],
  activities: (params) => ['activities', params],
  dashboardSummary: ['dashboard', 'summary'],
  dashboardAnalytics: ['dashboard', 'analytics'],
  predictionHistory: ['predictions', 'history']
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry a client error — the request itself is the problem.
        if (error?.status >= 400 && error?.status < 500) return false
        return failureCount < 2
      }
    },
    mutations: {
      onError: (error) => toast.error(error?.message || 'Something went wrong')
    }
  }
})
