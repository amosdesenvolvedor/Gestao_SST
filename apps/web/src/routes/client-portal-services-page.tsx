import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { IconBriefcase } from '@/components/icons'
import { Loading } from '@/components/loading'
import { listClientPortalServices } from '@/services/client-portal.service'

export function ClientPortalServicesPage() {
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? undefined
  const establishmentId = searchParams.get('establishmentId') ?? undefined

  const servicesQuery = useQuery({
    queryKey: ['client-portal-services', clientId, establishmentId],
    queryFn: () => listClientPortalServices(clientId, establishmentId),
  })

  if (servicesQuery.isLoading) {
    return <Loading />
  }

  if (!servicesQuery.data) {
    return <EmptyState title="Servicos indisponiveis" description="Nao foi possivel carregar os servicos do cliente." />
  }

  const { access, data } = servicesQuery.data

  if (!access.canUseOperationalModules) {
    return <EmptyState title="Acesso informativo" description={access.message || 'Modulos operacionais indisponiveis no momento.'} />
  }

  if (data.length === 0) {
    return <EmptyState title="Nenhum servico contratado" description="Nao ha servicos contratados disponiveis no momento." />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#202327]">Servicos contratados</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((service) => (
          <article key={service.serviceCode} className="rounded-2xl border border-[#D7DADF] bg-white p-5 shadow-panel">
            <p className="inline-flex rounded-lg bg-[#ECEDEF] p-2 text-slate-700">
              <IconBriefcase className="h-5 w-5" />
            </p>
            <h2 className="mt-3 text-base font-semibold text-slate-900">{service.serviceName}</h2>
            <p className="mt-1 text-sm text-slate-600">{service.description || 'Servico contratado disponivel no portal.'}</p>
            <p className="mt-2 text-xs text-slate-500">{service.contractCount} contrato(s) relacionado(s)</p>
            <Link to={`/portal/servicos/${encodeURIComponent(service.serviceCode)}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}>
              <Button className="mt-4">Abrir servico</Button>
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
