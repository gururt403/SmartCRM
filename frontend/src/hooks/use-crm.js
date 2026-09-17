import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/query'
import {
  activitiesApi, customersApi, dashboardApi, dealsApi, leadsApi, notesApi, predictionsApi, tasksApi
} from '@/services/endpoints'

/** Invalidate everything a write could have changed — one place, no guessing. */
function useCrmInvalidation() {
  const queryClient = useQueryClient()
  return (...extra) => {
    ;[['leads'], ['customers'], ['deals'], ['tasks'], ['activities'], ['dashboard'], ...extra].forEach((key) =>
      queryClient.invalidateQueries({ queryKey: key })
    )
  }
}

function useCrmMutation(mutationFn, successMessage) {
  const invalidate = useCrmInvalidation()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate()
      if (successMessage) toast.success(successMessage)
    }
  })
}

export function useLeads(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.leads(params),
    queryFn: ({ signal }) => leadsApi.list(params, signal),
    placeholderData: (previous) => previous, // keeps the table stable while paging
    ...options
  })
}

export const useLead = (id) =>
  useQuery({ queryKey: queryKeys.lead(id), queryFn: () => leadsApi.get(id).then((r) => r.data), enabled: Boolean(id) })

export const useCreateLead = () => useCrmMutation(leadsApi.create, 'Lead created')
export const useUpdateLead = () => useCrmMutation(leadsApi.update, 'Lead updated')
export const useDeleteLead = () => useCrmMutation(leadsApi.remove, 'Lead deleted')
export const useLogLeadActivity = () => useCrmMutation(leadsApi.logActivity, 'Activity logged')

export function useCustomers(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.customers(params),
    queryFn: ({ signal }) => customersApi.list(params, signal),
    placeholderData: (previous) => previous,
    ...options
  })
}

export const useCustomer = (id) =>
  useQuery({ queryKey: queryKeys.customer(id), queryFn: () => customersApi.get(id).then((r) => r.data), enabled: Boolean(id) })

export const useCreateCustomer = () => useCrmMutation(customersApi.create, 'Customer created')
export const useUpdateCustomer = () => useCrmMutation(customersApi.update, 'Customer updated')
export const useDeleteCustomer = () => useCrmMutation(customersApi.remove, 'Customer deleted')

export const usePipeline = () =>
  useQuery({ queryKey: queryKeys.pipeline, queryFn: () => dealsApi.pipeline().then((r) => r.data) })

export const useStages = () =>
  useQuery({ queryKey: queryKeys.stages, queryFn: () => dealsApi.stages().then((r) => r.data), staleTime: 60 * 60_000 })

export function useDeals(params) {
  return useQuery({
    queryKey: queryKeys.deals(params),
    queryFn: ({ signal }) => dealsApi.list(params, signal),
    placeholderData: (previous) => previous
  })
}

export const useCreateDeal = () => useCrmMutation(dealsApi.create, 'Deal created')
export const useUpdateDeal = () => useCrmMutation(dealsApi.update, 'Deal updated')
export const useDeleteDeal = () => useCrmMutation(dealsApi.remove, 'Deal deleted')
export const useMoveDeal = () => useCrmMutation(dealsApi.move, 'Deal moved')

export function useTasks(params) {
  return useQuery({
    queryKey: queryKeys.tasks(params),
    queryFn: ({ signal }) => tasksApi.list(params, signal),
    placeholderData: (previous) => previous
  })
}

export const useCreateTask = () => useCrmMutation(tasksApi.create, 'Task created')
export const useUpdateTask = () => useCrmMutation(tasksApi.update)
export const useDeleteTask = () => useCrmMutation(tasksApi.remove, 'Task deleted')

export const useCreateNote = () => useCrmMutation(notesApi.create, 'Note added')
export const useDeleteNote = () => useCrmMutation(notesApi.remove, 'Note deleted')
export const useCreateActivity = () => useCrmMutation(activitiesApi.create, 'Activity logged')

export function useActivities(params) {
  return useQuery({
    queryKey: queryKeys.activities(params),
    queryFn: ({ signal }) => activitiesApi.list(params, signal),
    placeholderData: (previous) => previous
  })
}

export const useDashboardSummary = () =>
  useQuery({ queryKey: queryKeys.dashboardSummary, queryFn: () => dashboardApi.summary().then((r) => r.data) })

export const useDashboardAnalytics = () =>
  useQuery({ queryKey: queryKeys.dashboardAnalytics, queryFn: () => dashboardApi.analytics().then((r) => r.data) })

export const usePredictionHistory = () =>
  useQuery({ queryKey: queryKeys.predictionHistory, queryFn: () => predictionsApi.history().then((r) => r.data) })

export function usePrediction(kind) {
  const queryClient = useQueryClient()
  const callers = {
    'lead-score': predictionsApi.leadScore,
    churn: predictionsApi.churn,
    sentiment: predictionsApi.sentiment,
    email: predictionsApi.emailSuggestions
  }
  return useMutation({
    mutationFn: (payload) => callers[kind](payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.predictionHistory })
    }
  })
}
