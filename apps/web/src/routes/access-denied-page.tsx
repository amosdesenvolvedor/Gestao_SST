import { Link } from 'react-router-dom'
import { Button } from '@/components/button'
import { Card } from '@/components/card'

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card>
        <h1 className="text-2xl font-bold text-slate-900">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-600">Seu perfil nao possui permissao para acessar esta funcionalidade.</p>
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button>Voltar ao dashboard</Button>
        </Link>
      </Card>
    </div>
  )
}