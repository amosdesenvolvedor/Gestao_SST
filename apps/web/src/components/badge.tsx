import type { PropsWithChildren } from 'react'

export function Badge({ children }: PropsWithChildren) {
  return (
    <span className="inline-flex rounded-full bg-brand-contrast px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-900">
      {children}
    </span>
  )
}