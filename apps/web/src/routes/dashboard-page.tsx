import { Badge } from '@/components/badge'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'

const cards = [
  { title: 'Clientes ativos', value: '--' },
  { title: 'Contratos ativos', value: '--' },
  { title: 'Receita mensal', value: 'R$ --' },
  { title: 'A receber', value: 'R$ --' },
  { title: 'Documentos vencendo', value: '--' },
  { title: 'Aguardando assinatura', value: '--' },
]

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visao inicial da operacao da empresa de Saude e Seguranca do Trabalho"
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Dados exibidos em estado inicial de fundacao. Modulos de negocio serao implementados nas proximas fases.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} title={card.title}>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <div className="mt-3">
              <Badge>Sem dados</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card title="Proximos passos" subtitle="Fase 01 - Fundacao tecnica">
          <EmptyState
            title="Modulos em desenvolvimento"
            description="Clientes, contratos, financeiro e documentos SST serao construidos de forma incremental."
          />
        </Card>
      </div>
    </div>
  )
}