import type { LoginInput, SafeUser } from '@gestao-sst/shared'
import { apiClient } from '@/lib/api-client'

type AuthResponse = {
  user: SafeUser
}

export function login(input: LoginInput) {
  return apiClient<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function me() {
  return apiClient<AuthResponse>('/api/v1/auth/me', {
    method: 'GET',
  })
}

export function logout() {
  return apiClient<void>('/api/v1/auth/logout', {
    method: 'POST',
  })
}