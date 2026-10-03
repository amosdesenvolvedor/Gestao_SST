import type { ContractStatus, PaymentMethod } from '@gestao-sst/shared'
import { contractStatuses, paymentMethods } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/alert'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { Input } from '@/components/input'
import { Loading } from '@/components/loading'
import { PageHeader } from '@/components/page-header'
import { Select } from '@/components/select'
import { ApiError } from '@/lib/api-client'
import { listClients } from '@/services/clients.service'
import { createContract, listContracts } from '@/services/contracts.service'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Falha ao processar contratos.'
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

export function ContractsPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ContractStatus | ''>('')
  const [clientIdFilter, setClientIdFilter] = useState(preselectedClientId)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    clientId: preselectedClientId,
    contractNumber: '',
    title: '',
    startDate: '',
    endDate: '',
    durationMonths: 12,
    totalValue: '',
    dueDay: 10,
    paymentMethod: 'PIX' as PaymentMethod,
    notes: '',
  })

  const contractsQuery = useQuery({
    queryKey: ['contracts', page, search, status, clientIdFilter],
    queryFn: () =>
      listContracts({
        page,
        pageSize: 10,
        search: search || undefined,
        status: status || undefined,
        clientId: clientIdFilter || undefined,
      }),
  })

  const clientsQuery = useQuery({
    queryKey: ['clients-for-contracts'],
    queryFn: () =>
      listClients({
        page: 1,
        pageSize: 200,
      }),
  })

  const createMutation = useMutation({
    mutationFn: createContract,
    onSuccess() {
      setFeedback('Contrato criado com sucesso.')
      setError(null)
      setCreateForm({
        clientId: preselectedClientId,
        contractNumber: '',
        title: '',
        startDate: '',
        endDate: '',
        durationMonths: 12,
        totalValue: '',
        dueDay: 10,
        paymentMethod: 'PIX',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const monthlyBasePreview = useMemo(() => {
    const total = Number(createForm.totalValue)
    const duration = Number(createForm.durationMonths)

    if (!Number.isFinite(total) || !Number.isFinite(duration) || duration <= 0) {
      return '-'
    }

    return formatMoney((total / duration).toFixed(2))
  }, [createForm.totalValue, createForm.durationMonths])

  const contracts = contractsQuery.data?.data ?? []
  const pagination = contractsQuery.data?.pagination
  const clients = clientsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos"
        subtitle="Gestao de vigencia, valores e servicos contratados por cliente."
      />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar por numero, titulo ou cliente"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ContractStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            {contractStatuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {statusOption}
              </option>
            ))}
          </Select>
          <Select
            value={clientIdFilter}
            onChange={(event) => {
              setClientIdFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.legalName}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('')
              setStatus('')
              setClientIdFilter('')
              setPage(1)
            }}
          >
            Limpar
          </Button>
        </div>
      </Card>

      <Card title="Novo contrato" subtitle="Dados gerais, valores e configuracao de vencimento.">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()

            createMutation.mutate({
              clientId: createForm.clientId,
              contractNumber: createForm.contractNumber,
              title: createForm.title,
              startDate: createForm.startDate,
              endDate: createForm.endDate || undefined,
              durationMonths: Number(createForm.durationMonths) || undefined,
              totalValue: createForm.totalValue,
              dueDay: Number(createForm.dueDay),
              paymentMethod: createForm.paymentMethod,
              notes: createForm.notes || undefined,
            })
          }}
        >
          <Select
            value={createForm.clientId}
            onChange={(event) => setCreateForm((state) => ({ ...state, clientId: event.target.value }))}
            required
          >
            <option value="">Selecione o cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.legalName}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Numero do contrato (ex.: 2026-0001)"
            value={createForm.contractNumber}
            onChange={(event) =>
              setCreateForm((state) => ({ ...state, contractNumber: event.target.value.toUpperCase() }))
            }
            required
          />
          <Input
            placeholder="Titulo"
            value={createForm.title}
            onChange={(event) => setCreateForm((state) => ({ ...state, title: event.target.value }))}
            required
          />
          <Input
            type="date"
            value={createForm.startDate}
            onChange={(event) => setCreateForm((state) => ({ ...state, startDate: event.target.value }))}
            required
          />
          <Input
            type="date"
            value={createForm.endDate}
            onChange={(event) => setCreateForm((state) => ({ ...state, endDate: event.target.value }))}
          />
          <Input
            type="number"
            min={1}
            max={360}
            value={createForm.durationMonths}
            onChange={(event) =>
              setCreateForm((state) => ({ ...state, durationMonths: Number(event.target.value) }))
            }
          />
          <Input
            placeholder="Valor total (ex.: 12000.00)"
            value={createForm.totalValue}
            onChange={(event) => setCreateForm((state) => ({ ...state, totalValue: event.target.value }))}
            required
          />
          <Input
            type="number"
            min={1}
            max={31}
            value={createForm.dueDay}
            onChange={(event) => setCreateForm((state) => ({ ...state, dueDay: Number(event.target.value) }))}
            required
          />
          <Select
            value={createForm.paymentMethod}
            onChange={(event) =>
              setCreateForm((state) => ({ ...state, paymentMethod: event.target.value as PaymentMethod }))
            }
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </Select>
          <Input
            className="md:col-span-3"
            placeholder="Observacoes"
            value={createForm.notes}
            onChange={(event) => setCreateForm((state) => ({ ...state, notes: event.target.value }))}
          />
          <div className="md:col-span-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Valor base mensal estimado: <strong>{monthlyBasePreview}</strong>
          </div>
          <div className="md:col-span-3">
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !createForm.clientId ||
                !createForm.contractNumber ||
                !createForm.title ||
                !createForm.startDate ||
                !createForm.totalValue
              }
            >
              {createMutation.isPending ? 'Salvando...' : 'Criar contrato'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Contratos cadastrados">
        {contractsQuery.isLoading ? (
          <Loading />
        ) : contracts.length === 0 ? (
          <EmptyState title="Nenhum contrato encontrado" description="Ajuste os filtros ou crie um novo contrato." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Numero</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Titulo</th>
                    <th className="px-3 py-2">Inicio</th>
                    <th className="px-3 py-2">Fim</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{contract.contractNumber}</td>
                      <td className="px-3 py-2">{contract.client.legalName}</td>
                      <td className="px-3 py-2">{contract.title}</td>
                      <td className="px-3 py-2">{contract.startDate}</td>
                      <td className="px-3 py-2">{contract.endDate}</td>
                      <td className="px-3 py-2">{formatMoney(contract.totalValue)}</td>
                      <td className="px-3 py-2">
                        <Badge>{contract.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Link to={`/contratos/${contract.id}`}>
                          <Button variant="ghost">Abrir</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination ? (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Pagina {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
