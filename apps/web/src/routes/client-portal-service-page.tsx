import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/badge'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { IconBriefcase, IconBuilding, IconFile } from '@/components/icons'
import { Loading } from '@/components/loading'
import { getClientPortalServiceByCode } from '@/services/client-portal.service'

export function ClientPortalServicePage() {
  const { serviceCode } = useParams<{ serviceCode: string }>()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? undefined
  const establishmentId = searchParams.get('establishmentId') ?? undefined

  const serviceQuery = useQuery({
    queryKey: ['client-portal-service', serviceCode, clientId, establishmentId],
    queryFn: () => getClientPortalServiceByCode(serviceCode as string, clientId, establishmentId),
    enabled: Boolean(serviceCode),
  })

  if (!serviceCode) {
    return <EmptyState title="Servico invalido" description="Codigo de servico nao informado." />
  }

  if (serviceQuery.isLoading) {
    return <Loading />
  }

  if (!serviceQuery.data) {
    return <EmptyState title="Servico nao encontrado" description="Este servico nao esta disponivel para o cliente selecionado." />
  }

  const service = serviceQuery.data.service
  const access = serviceQuery.data.access

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Servico contratado</p>
            <h1 className="mt-1 text-2xl font-bold text-[#202327]">{service.serviceName}</h1>
            <p className="mt-2 text-sm text-slate-600">{service.description || 'Modulo tecnico em desenvolvimento.'}</p>
          </div>
          <div className="rounded-2xl bg-[#ECEDEF] p-3 text-slate-700">
            <IconBriefcase className="h-6 w-6" />
          </div>
        </div>

        {access.message ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {access.message}
          </div>
        ) : null}
      </Card>

      <Card title="Contratos relacionados" subtitle="Contratos que sustentam a disponibilidade deste servico.">
        {service.contracts.length === 0 ? (
          <EmptyState title="Sem contratos" description="Nao ha contratos operacionais relacionados para exibir." />
        ) : (
          <div className="space-y-3">
            {service.contracts.map((contract) => (
              <article key={contract.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{contract.contractNumber}</p>
                    <p className="text-sm text-slate-600">{contract.title}</p>
                  </div>
                  <Badge>{contract.status}</Badge>
                </div>

                <p className="mt-2 text-sm text-slate-700">
                  Vigencia: {contract.startDate} ate {contract.endDate}
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {contract.establishments.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                        <IconBuilding className="h-4 w-4" />
                        {item.nickname || `${item.city}/${item.state}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.city}/{item.state} {item.isHeadquarters ? '(Matriz)' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Estado do modulo" subtitle="Disponibilidade tecnica por fase de desenvolvimento.">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <IconFile className="h-4 w-4" />
            Modulo tecnico em desenvolvimento
          </p>
          <p className="mt-1 text-sm text-slate-600">
            O servico esta contratado e visivel no portal. A area tecnica detalhada sera liberada em fases futuras.
          </p>
        </div>
      </Card>
    </div>
  )
}
