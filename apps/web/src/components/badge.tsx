import type { PropsWithChildren } from 'react'

type BadgeProps = PropsWithChildren<{
  className?: string
}>

export function Badge({ children, className }: BadgeProps) {
  const tone = className ?? 'bg-brand-contrast text-brand-900'

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>
      {children}
    </span>
  )
}