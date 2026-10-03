import type { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{
  title?: string
  subtitle?: string
}>

export function Card({ children, title, subtitle }: Props) {
  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-panel">
      {title ? <h3 className="text-lg font-semibold text-slate-900">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className={title || subtitle ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}