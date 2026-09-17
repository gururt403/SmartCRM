import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authApi } from '@/services/endpoints'
import { onUnauthorized } from '@/services/api'
import { queryKeys } from '@/lib/query'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => authApi.me().then((response) => response.data.user),
    retry: false,
    staleTime: 5 * 60_000
  })

  const clearSession = useCallback(() => {
    queryClient.setQueryData(queryKeys.me, null)
    queryClient.clear()
  }, [queryClient])

  // A 401 from any request means the cookie expired: drop the cached session once.
  useEffect(() => onUnauthorized(clearSession), [clearSession])

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.me, response.data.user)
      toast.success(`Welcome back, ${response.data.user.name.split(' ')[0]}`)
    }
  })

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => toast.success('Account created — you can sign in now')
  })

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearSession()
      toast.success('Signed out')
    }
  })

  const value = useMemo(
    () => ({
      user: data ?? null,
      isLoading,
      isError,
      isAuthenticated: Boolean(data),
      isPrivileged: ['admin', 'manager'].includes(data?.role),
      login,
      register,
      logout
    }),
    [data, isLoading, isError, login, register, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
