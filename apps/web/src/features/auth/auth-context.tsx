/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { hasPermission, type LoginInput, type Permission, type Role, type SafeUser } from '@gestao-sst/shared'
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
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const authQueryKey = ['auth', 'me']

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [forceLoggedOut, setForceLoggedOut] = useState(false)

  const meQuery = useQuery({
    queryKey: authQueryKey,
    enabled: !forceLoggedOut,
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
      setForceLoggedOut(false)
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
        try {
          await logoutMutation.mutateAsync()
        } finally {
          setForceLoggedOut(true)
          queryClient.setQueryData(authQueryKey, null)
          queryClient.removeQueries({ queryKey: authQueryKey, exact: true })
        }
      },
      hasAnyRole: (roles) => {
        if (!meQuery.data) {
          return false
        }
        return roles.includes(meQuery.data.role)
      },
      can: (permission) => {
        if (!meQuery.data) {
          return false
        }
        return hasPermission(meQuery.data.role, permission)
      },
      canAny: (permissions) => {
        if (!meQuery.data) {
          return false
        }
        return permissions.some((permission) => hasPermission(meQuery.data.role, permission))
      },
    }),
    [loginMutation, logoutMutation, meQuery.data, meQuery.isFetching, meQuery.isLoading, queryClient],
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