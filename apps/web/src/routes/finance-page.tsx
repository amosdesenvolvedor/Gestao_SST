import { paymentMethods } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/alert'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { Input } from '@/components/input'
import { Loading } from '@/components/loading'
import { PageHeader } from '@/components/page-header'
import { Select } from '@/components/select'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import { listClients } from '@/services/clients.service'
import { createInstallmentPayment, getFinanceOverview, listFinanceReceivables } from '@/services/finance.service'
import type { FinanceInstallmentStatus } from '@/types/finance'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Falha ao processar financeiro.'
}

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

function formatDate(value: string | null): string {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

function statusTone(status: FinanceInstallmentStatus) {
  if (status === 'PAID') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (status === 'OVERDUE') {
    return 'bg-red-100 text-red-700'
  }

  if (status === 'PARTIALLY_PAID') {
    return 'bg-amber-100 text-amber-800'
  }

  if (status === 'CANCELLED') {
    return 'bg-slate-200 text-slate-700'
  }

  return 'bg-blue-100 text-blue-800'
}

function monthRefNow() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export function FinancePage() {
  const queryClient = useQueryClient()
  const { can } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<FinanceInstallmentStatus | ''>('')
  const [clientId, setClientId] = useState('')
  const [dueDateFrom, setDueDateFrom] = useState('')
  const [dueDateTo, setDueDateTo] = useState('')
  const [monthRef, setMonthRef] = useState(monthRefNow())
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [paymentTarget, setPaymentTarget] = useState<{ id: string; balance: string; label: string } | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paidAt: new Date().toISOString().slice(0, 16),
    method: 'PIX' as (typeof paymentMethods)[number],
    notes: '',
  })

  const overviewQuery = useQuery({
    queryKey: ['finance-overview', monthRef],
    queryFn: () => getFinanceOverview(monthRef || undefined),
  })

  const clientsQuery = useQuery({
    queryKey: ['clients-for-finance'],
    queryFn: () =>
      listClients({
        page: 1,
        pageSize: 200,
      }),
  })

  const receivablesQuery = useQuery({
    queryKey: ['finance-receivables', page, search, status, clientId, dueDateFrom, dueDateTo],
    queryFn: () =>
      listFinanceReceivables({
        page,
        pageSize: 12,
        search: search || undefined,
        clientId: clientId || undefined,
        status: status || undefined,
        dueDateFrom: dueDateFrom || undefined,
        dueDateTo: dueDateTo || undefined,
      }),
  })

  const payMutation = useMutation({
    mutationFn: (input: { installmentId: string; amount: string; paidAt: string; method: (typeof paymentMethods)[number]; notes?: string }) =>
      createInstallmentPayment(input.installmentId, {
        amount: input.amount,
        paidAt: new Date(input.paidAt).toISOString(),
        method: input.method,
        provider: 'MANUAL',
        notes: input.notes || undefined,
      }),
    onSuccess() {
      setFeedback('Pagamento registrado com sucesso.')
      setError(null)
      setPaymentTarget(null)
      setPaymentForm({
        amount: '',
        paidAt: new Date().toISOString().slice(0, 16),
        method: 'PIX',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['finance-receivables'] })
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const cards = overviewQuery.data?.cards
  const rows = receivablesQuery.data?.data ?? []
  const pagination = receivablesQuery.data?.pagination
  const clients = clientsQuery.data?.data ?? []

  const totalPages = pagination?.totalPages ?? 1

  const monthTitle = useMemo(() => {
    if (!monthRef) {
      return 'Periodo geral'
    }

    const [year, month] = monthRef.split('-')
    return `${month}/${year}`
  }, [monthRef])

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Motor financeiro interno, contas a receber e recebimentos manuais." />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Dashboard financeiro" subtitle={`Referencia: ${monthTitle}`}>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Input type="month" value={monthRef} onChange={(event) => setMonthRef(event.target.value)} />
        </div>

        {overviewQuery.isLoading ? (
          <Loading />
        ) : cards ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase text-slate-500">Receita prevista no mes</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{formatMoney(cards.expectedInMonth)}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase text-emerald-700">Recebido no mes</p>
              <p className="mt-2 text-xl font-semibold text-emerald-800">{formatMoney(cards.receivedInMonth)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs uppercase text-blue-700">A receber</p>
              <p className="mt-2 text-xl font-semibold text-blue-800">{formatMoney(cards.receivable)}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs uppercase text-red-700">Vencido</p>
              <p className="mt-2 text-xl font-semibold text-red-800">{formatMoney(cards.overdue)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase text-amber-700">Proximo vencimento</p>
              <p className="mt-2 text-sm font-semibold text-amber-900">
                {cards.nextDue ? `${formatDate(cards.nextDue.dueDate)} - ${formatMoney(cards.nextDue.amount)}` : 'Sem parcelas em aberto'}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState title="Sem dados" description="Nao foi possivel montar o dashboard financeiro." />
        )}
      </Card>

      <Card title="Contas a receber" subtitle="Lista paginada com filtros de cliente, status e periodo.">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            placeholder="Buscar por cliente ou contrato"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos os clientes</option>
            {clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.legalName}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as FinanceInstallmentStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="PARTIALLY_PAID">Parcial</option>
            <option value="PAID">Pago</option>
            <option value="OVERDUE">Vencido</option>
            <option value="CANCELLED">Cancelado</option>
          </Select>
          <Input type="date" value={dueDateFrom} onChange={(event) => setDueDateFrom(event.target.value)} />
          <Input type="date" value={dueDateTo} onChange={(event) => setDueDateTo(event.target.value)} />
        </div>

        <div className="mt-3">
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('')
              setClientId('')
              setStatus('')
              setDueDateFrom('')
              setDueDateTo('')
              setPage(1)
            }}
          >
            Limpar filtros
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {receivablesQuery.isLoading ? (
            <Loading />
          ) : rows.length === 0 ? (
            <EmptyState title="Sem contas a receber" description="Nenhuma parcela encontrada para os filtros atuais." />
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Contrato</th>
                  <th className="px-3 py-2">Parcela</th>
                  <th className="px-3 py-2">Vencimento</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Recebido</th>
                  <th className="px-3 py-2">Saldo</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{item.contract.client.tradeName || item.contract.client.legalName}</td>
                    <td className="px-3 py-2">{item.contract.contractNumber}</td>
                    <td className="px-3 py-2">{item.number}</td>
                    <td className="px-3 py-2">{formatDate(item.dueDate)}</td>
                    <td className="px-3 py-2">{formatMoney(item.adjustedAmount)}</td>
                    <td className="px-3 py-2">{formatMoney(item.paidAmount)}</td>
                    <td className="px-3 py-2">{formatMoney(item.balance)}</td>
                    <td className="px-3 py-2">
                      <Badge className={statusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {can('finance.payments.create') && item.status !== 'PAID' && item.status !== 'CANCELLED' ? (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setPaymentTarget({
                              id: item.id,
                              balance: item.balance,
                              label: `${item.contract.contractNumber} - Parcela ${item.number}`,
                            })
                            setPaymentForm((state) => ({
                              ...state,
                              amount: item.balance,
                            }))
                          }}
                        >
                          Registrar pagamento
                        </Button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Pagina {pagination?.page ?? 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={(pagination?.page ?? 1) <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={(pagination?.page ?? 1) >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Proxima
            </Button>
          </div>
        </div>
      </Card>

      {paymentTarget ? (
        <Card title="Registrar recebimento manual" subtitle={paymentTarget.label}>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              payMutation.mutate({
                installmentId: paymentTarget.id,
                amount: paymentForm.amount,
                paidAt: paymentForm.paidAt,
                method: paymentForm.method,
                notes: paymentForm.notes,
              })
            }}
          >
            <Input
              placeholder="Valor"
              value={paymentForm.amount}
              onChange={(event) => setPaymentForm((state) => ({ ...state, amount: event.target.value }))}
              required
            />
            <Input
              type="datetime-local"
              value={paymentForm.paidAt}
              onChange={(event) => setPaymentForm((state) => ({ ...state, paidAt: event.target.value }))}
              required
            />
            <Select
              value={paymentForm.method}
              onChange={(event) => setPaymentForm((state) => ({ ...state, method: event.target.value as (typeof paymentMethods)[number] }))}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Observacao"
              value={paymentForm.notes}
              onChange={(event) => setPaymentForm((state) => ({ ...state, notes: event.target.value }))}
            />
            <div className="md:col-span-4 flex items-center gap-2">
              <Button type="submit" disabled={payMutation.isPending}>
                {payMutation.isPending ? 'Registrando...' : 'Confirmar pagamento'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPaymentTarget(null)}>
                Cancelar
              </Button>
              <p className="text-sm text-slate-600">Saldo atual: {formatMoney(paymentTarget.balance)}</p>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
