import axios from 'axios'

/**
 * Single axios instance for the whole app. Every API call goes through here,
 * so envelope unwrapping, error normalisation and auth handling live in one
 * place instead of being repeated in components.
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
})

export class ApiError extends Error {
  constructor({ message, code, details, status }) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details || {}
    this.status = status
  }

  /** Field-level messages, ready to hand to react-hook-form. */
  get fieldErrors() {
    return Object.entries(this.details).reduce((acc, [field, message]) => {
      if (typeof message === 'string') acc[field] = message
      return acc
    }, {})
  }
}

/** Listeners notified when the session expires, so the app can log out once. */
const unauthorizedHandlers = new Set()
export function onUnauthorized(handler) {
  unauthorizedHandlers.add(handler)
  return () => unauthorizedHandlers.delete(handler)
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)

    const status = error.response?.status
    const payload = error.response?.data?.error

    if (status === 401 && !error.config?.url?.includes('/auth/')) {
      unauthorizedHandlers.forEach((handler) => handler())
    }

    if (!error.response) {
      return Promise.reject(
        new ApiError({
          message: navigator.onLine === false ? 'You are offline. Check your connection.' : 'Could not reach the server.',
          code: 'NETWORK_ERROR',
          status: 0
        })
      )
    }

    return Promise.reject(
      new ApiError({
        message: payload?.message || 'Something went wrong.',
        code: payload?.code || 'UNKNOWN_ERROR',
        details: payload?.details,
        status
      })
    )
  }
)

/** Unwraps `{ success, data, message, meta }` into `{ data, meta, message }`. */
async function request(method, url, { data, params, signal } = {}) {
  const response = await client.request({ method, url, data, params, signal })
  const body = response.data || {}
  return { data: body.data, meta: body.meta, message: body.message }
}

export const http = {
  get: (url, options) => request('get', url, options),
  post: (url, data, options) => request('post', url, { ...options, data }),
  put: (url, data, options) => request('put', url, { ...options, data }),
  patch: (url, data, options) => request('patch', url, { ...options, data }),
  delete: (url, options) => request('delete', url, options)
}

export default client
