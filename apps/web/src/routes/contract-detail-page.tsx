import type { ContractStatus } from '@gestao-sst/shared'
import { contractStatuses } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
import { listClientEstablishments } from '@/services/clients.service'
import {
  addContractEstablishment,
  addContractService,
  changeContractStatus,
  getContractById,
  listContractEstablishments,
  listContractServices,
  removeContractEstablishment,
  removeContractService,
} from '@/services/contracts.service'
import {
  createContractFinancialPlan,
  getContractFinanceSummary,
  listContractInstallments,
  previewContractFinancialPlan,
} from '@/services/finance.service'
import { listServiceCatalog } from '@/services/service-catalog.service'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha ao processar contrato.'
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

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<ContractStatus>('IN_REVIEW')
  const [serviceCatalogId, setServiceCatalogId] = useState('')
  const [serviceQuantity, setServiceQuantity] = useState(1)
  const [serviceUnitValue, setServiceUnitValue] = useState('')
  const [establishmentId, setEstablishmentId] = useState('')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [planPreview, setPlanPreview] = useState<Array<{ number: number; dueDate: string; amount: string }> | null>(null)

  const contractQuery = useQuery({
    queryKey: ['contract', id],
    queryFn: () => getContractById(id as string),
    enabled: Boolean(id),
  })

  const contractServicesQuery = useQuery({
    queryKey: ['contract-services', id],
    queryFn: () =>
      listContractServices(id as string, {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(id),
  })

  const contractEstablishmentsQuery = useQuery({
    queryKey: ['contract-establishments', id],
    queryFn: () =>
      listContractEstablishments(id as string, {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(id),
  })

  const catalogQuery = useQuery({
    queryKey: ['service-catalog-active'],
    queryFn: () =>
      listServiceCatalog({
        page: 1,
        pageSize: 200,
        isActive: 'active',
      }),
  })

  const availableEstablishmentsQuery = useQuery({
    queryKey: ['contract-available-establishments', contractQuery.data?.contract.clientId],
    queryFn: () =>
      listClientEstablishments(contractQuery.data?.contract.clientId as string, {
        page: 1,
        pageSize: 200,
      }),
    enabled: Boolean(contractQuery.data?.contract.clientId),
  })

  const financeSummaryQuery = useQuery({
    queryKey: ['contract-finance-summary', id],
    queryFn: () => getContractFinanceSummary(id as string),
    enabled: Boolean(id),
  })

  const installmentsQuery = useQuery({
    queryKey: ['contract-installments', id],
    queryFn: () =>
      listContractInstallments(id as string, {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(id) && Boolean(financeSummaryQuery.data?.hasPlan),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contract', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-services', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-establishments', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-finance-summary', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-installments', id] })
  }

  const changeStatusMutation = useMutation({
    mutationFn: () => changeContractStatus(id as string, nextStatus),
    onSuccess() {
      setFeedback('Status do contrato atualizado.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const addServiceMutation = useMutation({
    mutationFn: () =>
      addContractService(id as string, {
        serviceCatalogId,
        quantity: serviceQuantity,
        unitValue: serviceUnitValue || undefined,
      }),
    onSuccess() {
      setFeedback('Servico adicionado ao contrato.')
      setError(null)
      setServiceCatalogId('')
      setServiceQuantity(1)
      setServiceUnitValue('')
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const removeServiceMutation = useMutation({
    mutationFn: (contractServiceId: string) => removeContractService(contractServiceId, 'Remocao administrativa'),
    onSuccess() {
      setFeedback('Servico removido do contrato (inativado).')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const addEstablishmentMutation = useMutation({
    mutationFn: () => addContractEstablishment(id as string, establishmentId),
    onSuccess() {
      setFeedback('Estabelecimento adicionado ao contrato.')
      setError(null)
      setEstablishmentId('')
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const removeEstablishmentMutation = useMutation({
    mutationFn: (item: { contractId: string; establishmentId: string }) =>
      removeContractEstablishment(item.contractId, item.establishmentId),
    onSuccess() {
      setFeedback('Estabelecimento removido do contrato.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const previewPlanMutation = useMutation({
    mutationFn: () =>
      previewContractFinancialPlan(id as string, {
        firstDueDate,
      }),
    onSuccess(data) {
      setPlanPreview(data.preview.installments)
      setError(null)
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const createPlanMutation = useMutation({
    mutationFn: () =>
      createContractFinancialPlan(id as string, {
        firstDueDate,
      }),
    onSuccess() {
      setFeedback('Plano financeiro gerado com sucesso.')
      setError(null)
      setPlanPreview(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const contract = contractQuery.data?.contract
  const contractServices = contractServicesQuery.data?.data ?? []
  const contractEstablishments = contractEstablishmentsQuery.data?.data
  const financeSummary = financeSummaryQuery.data
  const installments = installmentsQuery.data?.data ?? []
  const serviceCatalog = catalogQuery.data?.data ?? []
  const availableEstablishments = availableEstablishmentsQuery.data?.data

  const loading =
    contractQuery.isLoading ||
    contractServicesQuery.isLoading ||
    contractEstablishmentsQuery.isLoading ||
    catalogQuery.isLoading

  const establishmentOptions = useMemo(() => {
    const used = new Set((contractEstablishments ?? []).map((item) => item.establishmentId))
    return (availableEstablishments ?? []).filter((item) => !used.has(item.id))
  }, [availableEstablishments, contractEstablishments])

  if (!id) {
    return <EmptyState title="Contrato invalido" description="Identificador do contrato nao foi informado." />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={contract ? `Contrato ${contract.contractNumber}` : 'Detalhe do contrato'} subtitle="Visao geral, servicos contratados e estabelecimentos abrangidos." />

      <Link to="/contratos">
        <Button variant="ghost">Voltar para contratos</Button>
      </Link>

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {loading ? <Loading /> : null}

      {!loading && !contract ? <EmptyState title="Contrato nao encontrado" description="Verifique o link e tente novamente." /> : null}

      {contract ? (
        <>
          <Card title="Visao geral">
            <div className="grid gap-3 md:grid-cols-2">
              <p>
                <strong>Cliente:</strong> {contract.client.legalName}
              </p>
              <p>
                <strong>Status:</strong> <Badge>{contract.status}</Badge>
              </p>
              <p>
                <strong>Vigencia:</strong> {contract.startDate} ate {contract.endDate}
              </p>
              <p>
                <strong>Duracao:</strong> {contract.durationMonths} meses
              </p>
              <p>
                <strong>Valor total:</strong> {formatMoney(contract.totalValue)}
              </p>
              <p>
                <strong>Valor base mensal:</strong> {formatMoney(contract.monthlyBaseValue)}
              </p>
            </div>
          </Card>

          <Card title="Financeiro" subtitle="Parcelas, recebimentos e saldo do contrato.">
            {!financeSummary?.hasPlan ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Plano financeiro ainda nao gerado.</p>

                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(event) => setFirstDueDate(event.target.value)}
                    required
                  />
                  <Button onClick={() => previewPlanMutation.mutate()} disabled={!firstDueDate || previewPlanMutation.isPending}>
                    {previewPlanMutation.isPending ? 'Gerando preview...' : 'Gerar preview'}
                  </Button>
                  <Button onClick={() => createPlanMutation.mutate()} disabled={!firstDueDate || createPlanMutation.isPending}>
                    {createPlanMutation.isPending ? 'Persistindo...' : 'Gerar plano financeiro'}
                  </Button>
                </div>

                {planPreview ? (
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Preview das parcelas</p>
                    <div className="space-y-1 text-sm text-slate-700">
                      {planPreview.map((item) => (
                        <p key={item.number}>
                          {item.number} - {item.dueDate} - {formatMoney(item.amount)}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <p><strong>Valor contratado:</strong> {formatMoney(contract.totalValue)}</p>
                  <p><strong>Valor previsto:</strong> {formatMoney(financeSummary.summary?.totalPlanned ?? '0')}</p>
                  <p><strong>Recebido:</strong> {formatMoney(financeSummary.summary?.totalPaid ?? '0')}</p>
                  <p><strong>Saldo:</strong> {formatMoney(financeSummary.summary?.totalBalance ?? '0')}</p>
                  <p><strong>Vencido:</strong> {formatMoney(financeSummary.summary?.totalOverdue ?? '0')}</p>
                </div>

                {installments.length === 0 ? (
                  <p className="text-sm text-slate-600">Sem parcelas para exibir.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Parcela</th>
                          <th className="px-3 py-2">Vencimento</th>
                          <th className="px-3 py-2">Valor</th>
                          <th className="px-3 py-2">Pago</th>
                          <th className="px-3 py-2">Saldo</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-3 py-2">{item.number}</td>
                            <td className="px-3 py-2">{item.dueDate}</td>
                            <td className="px-3 py-2">{formatMoney(item.adjustedAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.paidAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.balance)}</td>
                            <td className="px-3 py-2"><Badge>{item.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Transicao de status">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full max-w-xs">
                <Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ContractStatus)}>
                  {contractStatuses.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </Select>
              </div>
              <Button onClick={() => changeStatusMutation.mutate()} disabled={changeStatusMutation.isPending}>
                {changeStatusMutation.isPending ? 'Atualizando...' : 'Alterar status'}
              </Button>
            </div>
          </Card>

          <Card title="Servicos contratados">
            {contractServices.length === 0 ? (
              <EmptyState title="Sem servicos" description="Adicione servicos do catalogo a este contrato." />
            ) : (
              <div className="space-y-3">
                {contractServices.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.serviceCodeSnapshot} - {item.serviceNameSnapshot}</p>
                        <p className="text-sm text-slate-600">Quantidade: {item.quantity} | Unitario: {item.unitValue ? formatMoney(item.unitValue) : '-'} | Total: {item.totalValue ? formatMoney(item.totalValue) : '-'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{item.isActive ? 'ATIVO' : 'INATIVO'}</Badge>
                        {item.isActive ? (
                          <Button variant="danger" onClick={() => removeServiceMutation.mutate(item.id)}>
                            Remover
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              className="mt-4 grid gap-3 md:grid-cols-3"
              onSubmit={(event) => {
                event.preventDefault()
                addServiceMutation.mutate()
              }}
            >
              <Select value={serviceCatalogId} onChange={(event) => setServiceCatalogId(event.target.value)} required>
                <option value="">Selecione um servico do catalogo</option>
                {serviceCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </Select>
              <Input type="number" min={1} value={serviceQuantity} onChange={(event) => setServiceQuantity(Number(event.target.value))} required />
              <Input placeholder="Valor unitario opcional (1200.00)" value={serviceUnitValue} onChange={(event) => setServiceUnitValue(event.target.value)} />
              <div className="md:col-span-3">
                <Button type="submit" disabled={addServiceMutation.isPending || !serviceCatalogId}>
                  {addServiceMutation.isPending ? 'Adicionando...' : 'Adicionar servico'}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Estabelecimentos abrangidos">
            {(contractEstablishments ?? []).length === 0 ? (
              <EmptyState title="Sem estabelecimentos" description="Adicione as unidades abrangidas por este contrato." />
            ) : (
              <div className="space-y-3">
                {(contractEstablishments ?? []).map((item) => (
                  <div key={`${item.contractId}:${item.establishmentId}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{item.establishment.nickname || 'Sem apelido'}</p>
                        <p className="text-sm text-slate-600">{item.establishment.city}/{item.establishment.state}</p>
                      </div>
                      <Button
                        variant="danger"
                        onClick={() =>
                          removeEstablishmentMutation.mutate({
                            contractId: item.contractId,
                            establishmentId: item.establishmentId,
                          })
                        }
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form
              className="mt-4 grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                addEstablishmentMutation.mutate()
              }}
            >
              <Select value={establishmentId} onChange={(event) => setEstablishmentId(event.target.value)} required>
                <option value="">Selecione um estabelecimento</option>
                {establishmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname || `${item.city}/${item.state}`} - {item.city}/{item.state}
                  </option>
                ))}
              </Select>
              <div>
                <Button type="submit" disabled={addEstablishmentMutation.isPending || !establishmentId}>
                  {addEstablishmentMutation.isPending ? 'Adicionando...' : 'Adicionar estabelecimento'}
                </Button>
              </div>
            </form>
          </Card>
        </>
      ) : null}
    </div>
  )
}
