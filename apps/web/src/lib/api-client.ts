export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiClient<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (response.status === 204) {
    return {} as TResponse
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Erro de comunicacao com a API.', response.status)
  }

  return payload as TResponse
}