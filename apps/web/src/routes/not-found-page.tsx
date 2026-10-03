import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { Card } from '@/components/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Pagina nao encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">A rota solicitada nao existe nesta aplicacao.</p>
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button>Ir para dashboard</Button>
        </Link>
      </Card>
    </div>
  )
}