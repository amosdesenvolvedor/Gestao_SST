import type { SelectHTMLAttributes } from 'react'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export function Select(props: Props) {
  const { className = '', ...rest } = props

  return (
    <select
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring ${className}`}
      {...rest}
    />
  )
}
