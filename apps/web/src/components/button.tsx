import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

const variantMap: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-900',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'bg-red-700 text-white hover:bg-red-800',
}

export function Button({ className = '', variant = 'primary', ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantMap[variant]} ${className}`}
      {...props}
    />
  )
}