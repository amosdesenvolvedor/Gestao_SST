import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '@/components/loading'
import { useAuth } from '@/features/auth/auth-context'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}