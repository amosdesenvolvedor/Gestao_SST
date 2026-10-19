import type { ContractStatus } from '@gestao-sst/shared'
import { contractStatuses } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
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
  cancelAnnualAdvanceCharge,
  confirmAnnualAdvanceChargePayment,
  createAnnualAdvanceCharge,
  failAnnualAdvanceCharge,
  getContractCommercialHistory,
  createContractFinancialPlan,
  getContractFinanceSummary,
  listContractInstallments,
  previewContractFinancialPlan,
  reverseAnnualAdvanceChargePayment,
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
  const [commercialModality, setCommercialModality] = useState<'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'>('MONTHLY_RECURRING')
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountFixedAmount, setDiscountFixedAmount] = useState('')
  const [advanceMonths, setAdvanceMonths] = useState(12)
  const [coverageStartDate, setCoverageStartDate] = useState('')
  const [commercialJustification, setCommercialJustification] = useState('')
  const [annualAdvanceDueDate, setAnnualAdvanceDueDate] = useState('')
  const [annualAdvanceNote, setAnnualAdvanceNote] = useState('')
  const [annualAdvanceReason, setAnnualAdvanceReason] = useState('Ajuste administrativo')
  const [planPreview, setPlanPreview] = useState<Array<{
    number: number
    dueDate: string
    amount: string
    adjustedAmount: string
    discountAllocatedAmount: string
    coveredByAdvance: boolean
    referenceStartDate: string
    referenceEndDate: string
    chargeType: 'INTEGRAL' | 'PROPORCIONAL'
    proportion: string
  }> | null>(null)
  const [previewMeta, setPreviewMeta] = useState<{
    totalPlanned: string
    installmentCount: number
    proportionalCount: number
    generationFormula: string
    commercialCondition: {
      modality: 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE'
      paymentMethod: string
      eligibleAmount: string
      discountAmount: string
      netAmount: string
      coverageStartDate: string | null
      coverageEndDate: string | null
      advanceMonths: number | null
      justification: string | null
    } | null
  } | null>(null)

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

  const commercialHistoryQuery = useQuery({
    queryKey: ['contract-commercial-history', id],
    queryFn: () => getContractCommercialHistory(id as string),
    enabled: Boolean(id),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contract', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-services', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-establishments', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-finance-summary', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-installments', id] })
    queryClient.invalidateQueries({ queryKey: ['contract-commercial-history', id] })
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

  const commercialConditionPayload =
    commercialJustification.trim().length >= 3 && (discountPercent.trim() || discountFixedAmount.trim())
      ? {
          modality: commercialModality,
          discountPercent: discountPercent.trim() || undefined,
          discountFixedAmount: discountFixedAmount.trim() || undefined,
          advanceMonths: commercialModality === 'ANNUAL_PIX_ADVANCE' ? Number(advanceMonths) : undefined,
          coverageStartDate:
            commercialModality === 'ANNUAL_PIX_ADVANCE' && coverageStartDate.trim()
              ? coverageStartDate
              : undefined,
          commercialJustification: commercialJustification.trim(),
        }
      : undefined

  const previewPlanMutation = useMutation({
    mutationFn: () =>
      previewContractFinancialPlan(id as string, {
        firstDueDate,
        commercialCondition: commercialConditionPayload,
      }),
    onSuccess(data) {
      setPlanPreview(data.preview.installments)
      setPreviewMeta({
        totalPlanned: data.preview.totalPlanned,
        installmentCount: data.preview.installmentCount,
        proportionalCount: data.preview.proportionalCount,
        generationFormula: data.preview.generationFormula,
        commercialCondition: data.preview.commercialCondition,
      })
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
        commercialCondition: commercialConditionPayload,
      }),
    onSuccess() {
      setFeedback('Plano financeiro gerado com sucesso.')
      setError(null)
      setPlanPreview(null)
      setPreviewMeta(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const createAnnualAdvanceChargeMutation = useMutation({
    mutationFn: () =>
      createAnnualAdvanceCharge(id as string, {
        dueDate: annualAdvanceDueDate,
        idempotencyKey: `adv-${id}-${Date.now()}`,
        notes: annualAdvanceNote || undefined,
      }),
    onSuccess(data) {
      setFeedback(
        data.idempotencyReplay
          ? 'Cobranca anual ja existia para a chave de idempotencia informada.'
          : 'Cobranca consolidada anual criada com sucesso.',
      )
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const confirmAnnualAdvanceChargeMutation = useMutation({
    mutationFn: (advanceChargeId: string) =>
      confirmAnnualAdvanceChargePayment(advanceChargeId, {
        notes: annualAdvanceNote || undefined,
      }),
    onSuccess(data) {
      setFeedback(
        data.idempotencyReplay
          ? 'Pagamento anual ja estava confirmado anteriormente.'
          : 'Pagamento anual confirmado e periodo quitado com sucesso.',
      )
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const cancelAnnualAdvanceChargeMutation = useMutation({
    mutationFn: (advanceChargeId: string) => cancelAnnualAdvanceCharge(advanceChargeId, annualAdvanceReason),
    onSuccess() {
      setFeedback('Cobranca anual cancelada com sucesso.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const failAnnualAdvanceChargeMutation = useMutation({
    mutationFn: (advanceChargeId: string) => failAnnualAdvanceCharge(advanceChargeId, annualAdvanceReason),
    onSuccess() {
      setFeedback('Cobranca anual marcada como falha.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const reverseAnnualAdvanceChargeMutation = useMutation({
    mutationFn: (advanceChargeId: string) => reverseAnnualAdvanceChargePayment(advanceChargeId, annualAdvanceReason),
    onSuccess() {
      setFeedback('Pagamento anual estornado com sucesso.')
      setError(null)
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
  const commercialHistory = commercialHistoryQuery.data?.versions ?? []
  const annualAdvanceCharges = financeSummary?.plan?.annualAdvanceCharges ?? []
  const serviceCatalog = catalogQuery.data?.data ?? []
  const availableEstablishments = availableEstablishmentsQuery.data?.data

  const loading =
    contractQuery.isLoading ||
    contractServicesQuery.isLoading ||
    contractEstablishmentsQuery.isLoading ||
    catalogQuery.isLoading ||
    commercialHistoryQuery.isLoading

  const establishmentOptions = useMemo(() => {
    const used = new Set((contractEstablishments ?? []).map((item) => item.establishmentId))
    return (availableEstablishments ?? []).filter((item) => !used.has(item.id))
  }, [availableEstablishments, contractEstablishments])

  useEffect(() => {
    if (financeSummary?.hasPlan) {
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
      return
    }

    previewPlanMutation.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstDueDate, financeSummary?.hasPlan])

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

                <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-3">
                  <p><strong>Periodicidade:</strong> Mensal</p>
                  <p><strong>Regra de vencimento:</strong> Dia {contract.dueDay}</p>
                  <p><strong>Vigencia:</strong> {contract.startDate} ate {contract.endDate}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(event) => setFirstDueDate(event.target.value)}
                    required
                  />
                  <Select
                    value={commercialModality}
                    onChange={(event) =>
                      setCommercialModality(event.target.value as 'MONTHLY_RECURRING' | 'ANNUAL_PIX_ADVANCE')
                    }
                  >
                    <option value="MONTHLY_RECURRING">Mensal recorrente</option>
                    <option value="ANNUAL_PIX_ADVANCE">Anual antecipado via Pix</option>
                  </Select>
                  <Input
                    placeholder="Desconto percentual (ex.: 7.5)"
                    value={discountPercent}
                    onChange={(event) => setDiscountPercent(event.target.value)}
                  />
                  <Input
                    placeholder="Desconto fixo (ex.: 500.00)"
                    value={discountFixedAmount}
                    onChange={(event) => setDiscountFixedAmount(event.target.value)}
                  />
                  {commercialModality === 'ANNUAL_PIX_ADVANCE' ? (
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={advanceMonths}
                      onChange={(event) => setAdvanceMonths(Number(event.target.value))}
                    />
                  ) : (
                    <Input value="Nao aplicavel para modo mensal" disabled />
                  )}
                  {commercialModality === 'ANNUAL_PIX_ADVANCE' ? (
                    <Input
                      type="date"
                      value={coverageStartDate}
                      onChange={(event) => setCoverageStartDate(event.target.value)}
                    />
                  ) : (
                    <Input value="Inicio de cobertura anual nao aplicavel" disabled />
                  )}
                  <Input
                    className="md:col-span-3"
                    placeholder="Justificativa comercial (obrigatoria para aplicar desconto)"
                    value={commercialJustification}
                    onChange={(event) => setCommercialJustification(event.target.value)}
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
                    {previewMeta ? (
                      <div className="mb-3 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-4">
                        <p><strong>Parcelas:</strong> {previewMeta.installmentCount}</p>
                        <p><strong>Proporcionais:</strong> {previewMeta.proportionalCount}</p>
                        <p><strong>Total previsto:</strong> {formatMoney(previewMeta.totalPlanned)}</p>
                        <p><strong>Formula:</strong> dias cobertos / dias do ciclo</p>
                        {previewMeta.commercialCondition ? (
                          <>
                            <p><strong>Modalidade comercial:</strong> {previewMeta.commercialCondition.modality}</p>
                            <p><strong>Base elegivel:</strong> {formatMoney(previewMeta.commercialCondition.eligibleAmount)}</p>
                            <p><strong>Desconto:</strong> {formatMoney(previewMeta.commercialCondition.discountAmount)}</p>
                            <p><strong>Liquido:</strong> {formatMoney(previewMeta.commercialCondition.netAmount)}</p>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2">Parcela</th>
                            <th className="px-3 py-2">Periodo</th>
                            <th className="px-3 py-2">Vencimento</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Proporcao</th>
                            <th className="px-3 py-2">Original</th>
                            <th className="px-3 py-2">Desconto</th>
                            <th className="px-3 py-2">Ajustado</th>
                            <th className="px-3 py-2">Antecipada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planPreview.map((item) => (
                            <tr key={item.number} className="border-b border-slate-100">
                              <td className="px-3 py-2">{item.number}</td>
                              <td className="px-3 py-2">{item.referenceStartDate} a {item.referenceEndDate}</td>
                              <td className="px-3 py-2">{item.dueDate}</td>
                              <td className="px-3 py-2"><Badge>{item.chargeType}</Badge></td>
                              <td className="px-3 py-2">{item.proportion}</td>
                              <td className="px-3 py-2">{formatMoney(item.amount)}</td>
                              <td className="px-3 py-2">{formatMoney(item.discountAllocatedAmount)}</td>
                              <td className="px-3 py-2">{formatMoney(item.adjustedAmount)}</td>
                              <td className="px-3 py-2">{item.coveredByAdvance ? 'Sim' : 'Nao'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <p><strong>Periodicidade:</strong> Mensal</p>
                  <p><strong>Regra de vencimento:</strong> Dia {financeSummary.plan?.dueDay ?? contract.dueDay}</p>
                  <p><strong>Valor contratado:</strong> {formatMoney(contract.totalValue)}</p>
                  <p><strong>Valor previsto:</strong> {formatMoney(financeSummary.summary?.totalPlanned ?? '0')}</p>
                  <p><strong>Recebido:</strong> {formatMoney(financeSummary.summary?.totalPaid ?? '0')}</p>
                  <p><strong>Saldo:</strong> {formatMoney(financeSummary.summary?.totalBalance ?? '0')}</p>
                  <p><strong>Vencido:</strong> {formatMoney(financeSummary.summary?.totalOverdue ?? '0')}</p>
                </div>

                {financeSummary.plan?.commercialCondition ? (
                  <div className="grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 md:grid-cols-2 xl:grid-cols-4">
                    <p><strong>Condicao:</strong> {financeSummary.plan.commercialCondition.modality}</p>
                    <p><strong>Metodo:</strong> {financeSummary.plan.commercialCondition.paymentMethod}</p>
                    <p><strong>Base elegivel:</strong> {formatMoney(financeSummary.plan.commercialCondition.eligibleAmount)}</p>
                    <p><strong>Desconto:</strong> {formatMoney(financeSummary.plan.commercialCondition.discountAmount)}</p>
                    <p><strong>Liquido:</strong> {formatMoney(financeSummary.plan.commercialCondition.netAmount)}</p>
                    <p><strong>Cobertura:</strong> {financeSummary.plan.commercialCondition.coverageStartDate ?? '-'} ate {financeSummary.plan.commercialCondition.coverageEndDate ?? '-'}</p>
                    <p><strong>Meses antecipados:</strong> {financeSummary.plan.commercialCondition.advanceMonths ?? '-'}</p>
                    <p><strong>Versao:</strong> {financeSummary.plan.commercialCondition.version}</p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">Antecipacao anual consolidada</p>
                    <p className="text-xs text-slate-500">Status de cobranca e status de pagamento sao independentes.</p>
                  </div>

                  {annualAdvanceCharges.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">
                        Nenhuma cobranca consolidada foi emitida para a condicao atual.
                      </p>
                      <div className="grid gap-2 md:grid-cols-3">
                        <Input
                          type="date"
                          value={annualAdvanceDueDate}
                          onChange={(event) => setAnnualAdvanceDueDate(event.target.value)}
                        />
                        <Input
                          placeholder="Observacao opcional"
                          value={annualAdvanceNote}
                          onChange={(event) => setAnnualAdvanceNote(event.target.value)}
                        />
                        <Button
                          onClick={() => createAnnualAdvanceChargeMutation.mutate()}
                          disabled={!annualAdvanceDueDate || createAnnualAdvanceChargeMutation.isPending}
                        >
                          {createAnnualAdvanceChargeMutation.isPending ? 'Emitindo...' : 'Emitir cobranca anual'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Input
                        placeholder="Motivo para cancelar/falhar/estornar"
                        value={annualAdvanceReason}
                        onChange={(event) => setAnnualAdvanceReason(event.target.value)}
                      />

                      {annualAdvanceCharges.map((charge) => (
                        <div key={charge.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                            <p><strong>Referencia:</strong> {charge.referenceCode}</p>
                            <p><strong>Cobertura:</strong> {charge.coverageStartDate} ate {charge.coverageEndDate}</p>
                            <p><strong>Bruto:</strong> {formatMoney(charge.grossAmount)}</p>
                            <p><strong>Desconto:</strong> {formatMoney(charge.discountAmount)}</p>
                            <p><strong>Liquido:</strong> {formatMoney(charge.netAmount)}</p>
                            <p><strong>Vencimento:</strong> {charge.dueDate}</p>
                            <p><strong>Status cobranca:</strong> <Badge>{charge.effectiveBillingStatus}</Badge></p>
                            <p><strong>Status pagamento:</strong> <Badge>{charge.paymentStatus}</Badge></p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              disabled={confirmAnnualAdvanceChargeMutation.isPending || charge.paymentStatus === 'CONFIRMED'}
                              onClick={() => confirmAnnualAdvanceChargeMutation.mutate(charge.id)}
                            >
                              Confirmar pagamento
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={cancelAnnualAdvanceChargeMutation.isPending || charge.billingStatus === 'CANCELLED' || charge.paymentStatus === 'CONFIRMED'}
                              onClick={() => cancelAnnualAdvanceChargeMutation.mutate(charge.id)}
                            >
                              Cancelar cobranca
                            </Button>
                            <Button
                              variant="secondary"
                              disabled={failAnnualAdvanceChargeMutation.isPending || charge.billingStatus === 'FAILED' || charge.paymentStatus === 'CONFIRMED'}
                              onClick={() => failAnnualAdvanceChargeMutation.mutate(charge.id)}
                            >
                              Marcar falha
                            </Button>
                            <Button
                              variant="danger"
                              disabled={reverseAnnualAdvanceChargeMutation.isPending || charge.paymentStatus !== 'CONFIRMED'}
                              onClick={() => reverseAnnualAdvanceChargeMutation.mutate(charge.id)}
                            >
                              Estornar pagamento
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {installments.length === 0 ? (
                  <p className="text-sm text-slate-600">Sem parcelas para exibir.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Parcela</th>
                          <th className="px-3 py-2">Periodo</th>
                          <th className="px-3 py-2">Vencimento</th>
                          <th className="px-3 py-2">Tipo</th>
                          <th className="px-3 py-2">Proporcao</th>
                          <th className="px-3 py-2">Original</th>
                          <th className="px-3 py-2">Desconto</th>
                          <th className="px-3 py-2">Ajustado</th>
                          <th className="px-3 py-2">Pago</th>
                          <th className="px-3 py-2">Saldo</th>
                          <th className="px-3 py-2">Antecipada</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-3 py-2">{item.number}</td>
                            <td className="px-3 py-2">{item.referenceStartDate} a {item.referenceEndDate}</td>
                            <td className="px-3 py-2">{item.dueDate}</td>
                            <td className="px-3 py-2"><Badge>{item.chargeType}</Badge></td>
                            <td className="px-3 py-2">{item.proportion}</td>
                            <td className="px-3 py-2">{formatMoney(item.originalAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.discountAllocatedAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.adjustedAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.paidAmount)}</td>
                            <td className="px-3 py-2">{formatMoney(item.balance)}</td>
                            <td className="px-3 py-2">{item.coveredByAdvance ? 'Sim' : 'Nao'}</td>
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

          <Card title="Historico comercial" subtitle="Versoes, justificativas e vinculo com cobrancas anuais.">
            {commercialHistory.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhuma versao comercial registrada para este contrato.</p>
            ) : (
              <div className="space-y-3">
                {commercialHistory.map((version) => (
                  <div key={version.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>{version.status}</Badge>
                      <span className="text-sm font-semibold text-slate-800">Versao {version.version}</span>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-4">
                      <p><strong>Modalidade:</strong> {version.modality}</p>
                      <p><strong>Metodo:</strong> {version.paymentMethod}</p>
                      <p><strong>Percentual:</strong> {version.discountPercent ?? '-'}</p>
                      <p><strong>Desconto fixo:</strong> {formatMoney(version.discountFixedAmount)}</p>
                      <p><strong>Valor original:</strong> {formatMoney(version.eligibleAmount)}</p>
                      <p><strong>Desconto:</strong> {formatMoney(version.discountAmount)}</p>
                      <p><strong>Liquido:</strong> {formatMoney(version.netAmount)}</p>
                      <p><strong>Meses:</strong> {version.advanceMonths ?? '-'}</p>
                      <p><strong>Cobertura:</strong> {version.coverageStartDate ?? '-'} ate {version.coverageEndDate ?? '-'}</p>
                      <p><strong>Responsavel:</strong> {version.grantedByUserId}</p>
                      <p><strong>Data:</strong> {version.createdAt.slice(0, 10)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600"><strong>Justificativa:</strong> {version.commercialJustification}</p>

                    {version.annualAdvanceCharges.length > 0 ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm">
                        <p className="font-semibold text-slate-700">Cobrancas/Pagamentos vinculados</p>
                        {version.annualAdvanceCharges.map((charge) => (
                          <p key={charge.id} className="text-slate-700">
                            {charge.referenceCode} | Cobranca: {charge.effectiveBillingStatus} | Pagamento: {charge.paymentStatus} | Liquido: {formatMoney(charge.netAmount)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Sem cobrancas anuais vinculadas nesta versao.</p>
                    )}
                  </div>
                ))}
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
