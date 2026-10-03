import type { PropsWithChildren } from 'react'
import type { Role } from '@gestao-sst/shared'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'

type Props = PropsWithChildren<{
  roles: Role[]
}>

export function RoleRoute({ roles, children }: Props) {
  const { hasAnyRole } = useAuth()

  if (!hasAnyRole(roles)) {
    return <Navigate to="/acesso-negado" replace />
  }

  return children
}