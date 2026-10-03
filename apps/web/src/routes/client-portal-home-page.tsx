import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { IconBriefcase, IconBuilding, IconFile, IconShield } from '@/components/icons'
import { Loading } from '@/components/loading'
import { getClientPortalContext, listClientPortalServices } from '@/services/client-portal.service'

function getStatusMeta(status: string) {
  if (status === 'ACTIVE' || status === 'SIGNED') {
    return { label: 'Contrato vigente', className: 'bg-emerald-100 text-emerald-800' }
  }

  if (status === 'EXPIRING') {
    return { label: 'Proximo do vencimento', className: 'bg-amber-100 text-amber-800' }
  }

  if (status === 'TERMINATED' || status === 'CANCELLED' || status === 'ENDED') {
    return { label: 'Encerrado', className: 'bg-red-100 text-red-800' }
  }

  return { label: 'Em analise', className: 'bg-slate-100 text-slate-700' }
}

export function ClientPortalHomePage() {
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? undefined
  const establishmentId = searchParams.get('establishmentId') ?? undefined

  const contextQuery = useQuery({
    queryKey: ['client-portal-context', clientId],
    queryFn: () => getClientPortalContext(clientId),
  })

  const servicesQuery = useQuery({
    queryKey: ['client-portal-services', clientId, establishmentId],
    queryFn: () => listClientPortalServices(clientId, establishmentId),
  })

  if (contextQuery.isLoading || servicesQuery.isLoading) {
    return <Loading />
  }

  if (!contextQuery.data || !servicesQuery.data) {
    return <EmptyState title="Portal indisponivel" description="Nao foi possivel carregar os dados do portal." />
  }

  const context = contextQuery.data
  const services = servicesQuery.data.data
  const access = context.currentClient.access

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-[#D7DADF] bg-white p-6 shadow-panel">
          <p className="text-sm text-slate-500">Ola, {context.user.id ? 'bem-vindo(a) ao portal' : 'portal do cliente'}.</p>
          <h1 className="mt-2 text-2xl font-bold text-[#202327]">
            {context.currentClient.tradeName || context.currentClient.legalName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{context.currentClient.legalName}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Badge>{context.currentClient.status}</Badge>
            <span>{services.length} servicos ativos</span>
            <span>{context.establishments.length} estabelecimentos</span>
          </div>

          {access.message ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {access.message}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-[#D7DADF] bg-gradient-to-br from-[#ECEDEF] to-white p-6 shadow-panel">
          <div className="flex items-center gap-3 text-[#202327]">
            <div className="rounded-2xl bg-[#2D3035] p-3 text-white">
              <IconBuilding className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Nucleo visual da empresa</p>
              <p className="text-lg font-semibold">Central SST</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Seus servicos contratados aparecem abaixo de forma consolidada por tipo de servico.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#202327]">Servicos contratados</h2>
          <Link to={`/portal/servicos${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>
            <Button variant="ghost">Ver todos</Button>
          </Link>
        </div>

        {!access.canUseOperationalModules ? (
          <EmptyState title="Acesso informativo" description="Este cliente nao possui modulos operacionais habilitados no momento." />
        ) : services.length === 0 ? (
          <EmptyState title="Sem servicos disponiveis" description="Nenhum servico contratado esta disponivel no momento." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const topStatus = service.contracts[0]?.status ?? 'IN_REVIEW'
              const statusMeta = getStatusMeta(topStatus)

              return (
                <article key={service.serviceCode} className="rounded-2xl border border-[#D7DADF] bg-white p-5 shadow-panel transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="rounded-xl bg-[#ECEDEF] p-2 text-slate-700">
                      <IconBriefcase className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-[#202327]">{service.serviceName}</h3>
                  <p className="mt-1 min-h-10 text-sm text-slate-600">
                    {service.description || 'Servico contratado e disponivel no portal.'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <IconFile className="h-4 w-4" />
                    {service.contractCount} contrato(s) vinculando este servico
                  </div>

                  <Link
                    to={`/portal/servicos/${encodeURIComponent(service.serviceCode)}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                    className="mt-4 inline-flex"
                  >
                    <Button>
                      <IconShield className="mr-1 h-4 w-4" />
                      Acessar
                    </Button>
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <Card title="Contratos de referencia" subtitle="Visao resumida dos contratos que sustentam os servicos do portal.">
        {services.length === 0 ? (
          <p className="text-sm text-slate-600">Sem contratos operacionais para exibir.</p>
        ) : (
          <div className="space-y-3">
            {services.slice(0, 4).map((service) => (
              <div key={service.serviceCode} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">{service.serviceName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Contratos: {service.contracts.map((contract) => contract.contractNumber).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
