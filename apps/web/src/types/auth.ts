import type { SafeUser } from '@gestao-sst/shared'

export type AuthState = {
  user: SafeUser | null
  isAuthenticated: boolean
  isLoading: boolean
}