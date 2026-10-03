type Props = {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
    </header>
  )
}