import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/badge'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { IconBuilding, IconMapPin } from '@/components/icons'
import { Loading } from '@/components/loading'
import { getClientPortalContext } from '@/services/client-portal.service'

export function ClientPortalCompanyPage() {
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? undefined

  const contextQuery = useQuery({
    queryKey: ['client-portal-context', clientId],
    queryFn: () => getClientPortalContext(clientId),
  })

  if (contextQuery.isLoading) {
    return <Loading />
  }

  if (!contextQuery.data) {
    return <EmptyState title="Empresa indisponivel" description="Nao foi possivel carregar dados da empresa no portal." />
  }

  const context = contextQuery.data

  return (
    <div className="space-y-6">
      <Card title="Empresa" subtitle="Contexto da empresa cliente vinculada ao seu acesso.">
        <div className="grid gap-3 md:grid-cols-2">
          <p>
            <strong>Razao social:</strong> {context.currentClient.legalName}
          </p>
          <p>
            <strong>Nome fantasia:</strong> {context.currentClient.tradeName || '-'}
          </p>
          <p>
            <strong>Status:</strong> <Badge>{context.currentClient.status}</Badge>
          </p>
          <p>
            <strong>Cliente atual:</strong> {context.currentClient.id}
          </p>
        </div>
      </Card>

      <Card title="Estabelecimentos" subtitle="Unidades cadastradas para o cliente selecionado.">
        {context.establishments.length === 0 ? (
          <EmptyState title="Sem estabelecimentos" description="Nao ha unidades cadastradas para esta empresa." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {context.establishments.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  <IconBuilding className="h-4 w-4" />
                  {item.nickname || `${item.city}/${item.state}`}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                  <IconMapPin className="h-4 w-4" />
                  {item.city}/{item.state} {item.isHeadquarters ? '(Matriz)' : ''}
                </p>
                <p className="mt-2 text-xs text-slate-500">Status: {item.status}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
