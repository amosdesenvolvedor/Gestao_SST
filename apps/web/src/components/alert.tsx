import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  type?: 'error' | 'info'
}>

export function Alert({ children, type = 'info' }: Props) {
  const palette =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return <div className={`rounded-lg border px-3 py-2 text-sm ${palette}`}>{children}</div>
}