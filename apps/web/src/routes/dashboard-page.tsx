import { PageHeader } from '@/components/page-header'

const modules = [
  {
    title: 'Clientes ativos',
    value: '--',
    tone: 'from-blue-900 to-blue-800 border-blue-700',
  },
  {
    title: 'Contratos ativos',
    value: '--',
    tone: 'from-slate-700 to-slate-600 border-slate-500',
  },
  {
    title: 'Receita mensal',
    value: 'R$ --',
    tone: 'from-blue-800 to-blue-700 border-blue-600',
  },
  {
    title: 'A receber',
    value: 'R$ --',
    tone: 'from-slate-800 to-slate-700 border-slate-600',
  },
  {
    title: 'Documentos vencendo',
    value: '--',
    tone: 'from-blue-700 to-blue-600 border-blue-500',
  },
  {
    title: 'Aguardando assinatura',
    value: '--',
    tone: 'from-slate-600 to-slate-500 border-slate-400',
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visao inicial da operacao da empresa de Saude e Seguranca do Trabalho"
      />

      <section className="rounded-3xl border border-slate-700 bg-[#0c1f3e] p-6 shadow-panel lg:p-8">
        <div className="mb-6 rounded-2xl border border-blue-700/40 bg-blue-950/45 px-4 py-3 text-sm text-blue-100">
          Dados exibidos em estado inicial de fundacao. Modulos de negocio serao implementados nas proximas fases.
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.title}
              className={`rounded-2xl border bg-gradient-to-br p-5 text-white shadow-lg ${module.tone}`}
            >
              <p className="text-sm font-medium text-blue-100/90">{module.title}</p>
              <p className="mt-4 text-3xl font-bold tracking-tight">{module.value}</p>
              <div className="mt-4 inline-flex rounded-full border border-white/35 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                Sem dados
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-500 bg-slate-800/75 p-5 text-slate-100">
          <h3 className="text-lg font-semibold text-white">Proximos passos</h3>
          <p className="mt-1 text-sm text-slate-300">Fase 01 - Fundacao tecnica</p>
          <p className="mt-4 text-sm text-slate-200">
            Clientes, contratos, financeiro e documentos SST serao construidos de forma incremental.
          </p>
          <div className="mt-4 h-2 rounded-full bg-slate-700">
            <div className="h-2 w-1/4 rounded-full bg-blue-400" />
          </div>
          <p className="mt-2 text-xs uppercase tracking-wide text-blue-200">Roadmap em andamento</p>
        </div>
      </section>
    </div>
  )
}