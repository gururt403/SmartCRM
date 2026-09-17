import { http } from './api'

/** Strips empty filter values so the URL only carries active filters. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined && value !== 'all')
  )
}

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (payload) => http.post('/auth/login', payload),
  register: (payload) => http.post('/auth/register', payload),
  logout: () => http.post('/auth/logout'),
  changePassword: (payload) => http.post('/auth/change-password', payload),
  users: () => http.get('/auth/users')
}

export const leadsApi = {
  list: (params, signal) => http.get('/leads', { params: cleanParams(params), signal }),
  get: (id) => http.get(`/leads/${id}`),
  create: (payload) => http.post('/leads', payload),
  update: ({ id, ...payload }) => http.patch(`/leads/${id}`, payload),
  remove: (id) => http.delete(`/leads/${id}`),
  logActivity: ({ id, ...payload }) => http.post(`/leads/${id}/activities`, payload)
}

export const customersApi = {
  list: (params, signal) => http.get('/customers', { params: cleanParams(params), signal }),
  get: (id) => http.get(`/customers/${id}`),
  create: (payload) => http.post('/customers', payload),
  update: ({ id, ...payload }) => http.patch(`/customers/${id}`, payload),
  remove: (id) => http.delete(`/customers/${id}`)
}

export const dealsApi = {
  list: (params, signal) => http.get('/deals', { params: cleanParams(params), signal }),
  pipeline: () => http.get('/deals/pipeline'),
  stages: () => http.get('/deals/stages'),
  get: (id) => http.get(`/deals/${id}`),
  create: (payload) => http.post('/deals', payload),
  update: ({ id, ...payload }) => http.patch(`/deals/${id}`, payload),
  move: ({ id, stage_key }) => http.post(`/deals/${id}/stage`, { stage_key }),
  remove: (id) => http.delete(`/deals/${id}`)
}

export const tasksApi = {
  list: (params, signal) => http.get('/tasks', { params: cleanParams(params), signal }),
  create: (payload) => http.post('/tasks', payload),
  update: ({ id, ...payload }) => http.patch(`/tasks/${id}`, payload),
  remove: (id) => http.delete(`/tasks/${id}`)
}

export const notesApi = {
  create: (payload) => http.post('/notes', payload),
  remove: (id) => http.delete(`/notes/${id}`)
}

export const activitiesApi = {
  list: (params, signal) => http.get('/activities', { params: cleanParams(params), signal }),
  create: (payload) => http.post('/activities', payload)
}

export const dashboardApi = {
  summary: () => http.get('/dashboard/summary'),
  analytics: () => http.get('/dashboard/analytics')
}

export const predictionsApi = {
  leadScore: (payload) => http.post('/predictions/lead-score', payload),
  churn: (payload) => http.post('/predictions/churn', payload),
  sentiment: (payload) => http.post('/predictions/sentiment', payload),
  emailSuggestions: (payload) => http.post('/predictions/email-suggestions', payload),
  history: () => http.get('/predictions/history')
}
