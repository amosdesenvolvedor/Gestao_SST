/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import type { LoginInput, Role, SafeUser } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api-client'
import * as authService from '@/services/auth.service'

type AuthContextValue = {
  user: SafeUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: LoginInput) => Promise<SafeUser>
  logout: () => Promise<void>
  hasAnyRole: (roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const authQueryKey = ['auth', 'me']

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      const response = await authService.me()
      return response.user
    },
    retry(failureCount, error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false
      }
      return failureCount < 2
    },
  })

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess(data) {
      queryClient.setQueryData(authQueryKey, data.user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess() {
      queryClient.setQueryData(authQueryKey, null)
      queryClient.invalidateQueries({ queryKey: authQueryKey })
    },
  })

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(meQuery.data),
      isLoading: meQuery.isLoading || meQuery.isFetching,
      login: async (input) => {
        const response = await loginMutation.mutateAsync(input)
        return response.user
      },
      logout: async () => {
        await logoutMutation.mutateAsync()
      },
      hasAnyRole: (roles) => {
        if (!meQuery.data) {
          return false
        }
        return roles.includes(meQuery.data.role)
      },
    }),
    [loginMutation, logoutMutation, meQuery.data, meQuery.isFetching, meQuery.isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}