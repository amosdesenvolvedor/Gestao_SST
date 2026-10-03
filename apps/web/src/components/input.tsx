import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement>

export function Input(props: Props) {
  return (
    <input
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring"
      {...props}
    />
  )
}