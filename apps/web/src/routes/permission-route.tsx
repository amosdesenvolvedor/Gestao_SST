import type { PropsWithChildren } from 'react'
import type { Permission } from '@gestao-sst/shared'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'

type Props = PropsWithChildren<{
  permissions: Permission[]
  requireAll?: boolean
}>

export function PermissionRoute({ children, permissions, requireAll = false }: Props) {
  const { can, canAny } = useAuth()

  const isAllowed = requireAll
    ? permissions.every((permission) => can(permission))
    : canAny(permissions)

  if (!isAllowed) {
    return <Navigate to="/acesso-negado" replace />
  }

  return children
}
