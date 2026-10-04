import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { Loading } from '@/components/loading'
import { Select } from '@/components/select'
import { listClientPortalFinanceInstallments } from '@/services/client-portal.service'

function formatMoney(value: string): string {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return value
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(parsed)
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function ClientPortalFinancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const clientId = searchParams.get('clientId') ?? undefined
  const contractId = searchParams.get('contractId') ?? undefined

  const financeQuery = useQuery({
    queryKey: ['client-portal-finance', clientId, contractId],
    queryFn: () => listClientPortalFinanceInstallments(clientId, contractId),
  })

  const contractOptions = useMemo(() => financeQuery.data?.contracts ?? [], [financeQuery.data])

  if (financeQuery.isLoading) {
    return <Loading />
  }

  if (!financeQuery.data) {
    return <EmptyState title="Financeiro indisponivel" description="Nao foi possivel carregar os dados financeiros." />
  }

  const { summary, data, access } = financeQuery.data

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#D7DADF] bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Financeiro</p>
            <h1 className="mt-1 text-2xl font-bold text-[#202327]">Parcelas e recebimentos</h1>
          </div>
          <Link to={`/portal${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ''}`}>
            <Button variant="ghost">Voltar ao portal</Button>
          </Link>
        </div>

        {access.message ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{access.message}</div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Valor previsto">
          <p className="text-xl font-semibold text-slate-900">{formatMoney(summary.totalPlanned)}</p>
        </Card>
        <Card title="Recebido">
          <p className="text-xl font-semibold text-emerald-700">{formatMoney(summary.totalPaid)}</p>
        </Card>
        <Card title="Saldo">
          <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.totalBalance)}</p>
        </Card>
        <Card title="Proximo vencimento">
          <p className="text-sm font-semibold text-slate-900">
            {summary.nextDueDate ? `${formatDate(summary.nextDueDate)} - ${formatMoney(summary.nextDueAmount ?? '0')}` : 'Sem parcelas em aberto'}
          </p>
        </Card>
      </section>

      <Card title="Filtro por contrato">
        <div className="max-w-sm">
          <Select
            value={contractId ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams)
              if (event.target.value) {
                next.set('contractId', event.target.value)
              } else {
                next.delete('contractId')
              }
              setSearchParams(next)
            }}
          >
            <option value="">Todos os contratos</option>
            {contractOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.contractNumber}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card title="Historico financeiro" subtitle="Somente visualizacao nesta fase.">
        {data.length === 0 ? (
          <EmptyState title="Sem parcelas" description="Nao existem parcelas para os filtros atuais." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Contrato</th>
                  <th className="px-3 py-2">Parcela</th>
                  <th className="px-3 py-2">Vencimento</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Pago</th>
                  <th className="px-3 py-2">Saldo</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{item.contract.contractNumber}</td>
                    <td className="px-3 py-2">{item.number}</td>
                    <td className="px-3 py-2">{formatDate(item.dueDate)}</td>
                    <td className="px-3 py-2">{formatMoney(item.adjustedAmount)}</td>
                    <td className="px-3 py-2">{formatMoney(item.paidAmount)}</td>
                    <td className="px-3 py-2">{formatMoney(item.balance)}</td>
                    <td className="px-3 py-2">
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
