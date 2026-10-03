import type { ClientStatus, DocumentType } from '@gestao-sst/shared'
import { formatCnpj, formatCpf } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import {
  activateClient,
  createClient,
  deactivateClient,
  listClients,
} from '@/services/clients.service'
import type { Client } from '@/types/clients'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha ao processar clientes.'
}

function formatTaxId(client: Client): string {
  if (!client.taxIdType || !client.taxIdNumberNormalized) {
    return '-'
  }

  if (client.taxIdType === 'CNPJ') {
    return formatCnpj(client.taxIdNumberNormalized)
  }

  if (client.taxIdType === 'CPF') {
    return formatCpf(client.taxIdNumberNormalized)
  }

  return client.taxIdNumberNormalized
}

export function ClientsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClientStatus | ''>('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    legalName: '',
    tradeName: '',
    taxIdType: '' as DocumentType | '',
    taxIdNumber: '',
    status: 'PROSPECT' as ClientStatus,    notes: '',
  })

  const clientsQuery = useQuery({
    queryKey: ['clients', page, search, status],
    queryFn: () =>
      listClients({
        page,
        pageSize: 10,
        search: search || undefined,
        status: status || undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess() {
      setFeedback('Cliente criado com sucesso.')
      setError(null)
      setCreateForm({
        legalName: '',
        tradeName: '',
        taxIdType: '',
        taxIdNumber: '',
        status: 'PROSPECT',
        notes: '',
      })
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        return activateClient(id)
      }
      return deactivateClient(id)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Cliente ativado.' : 'Cliente desativado.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const clients = clientsQuery.data?.data ?? []
  const pagination = clientsQuery.data?.pagination

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle="Cadastro de clientes, status comercial e acesso ao detalhe operacional." />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar por razao social ou nome fantasia"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ClientStatus | '')
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="PROSPECT">Prospect</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="SUSPENDED">Suspenso</option>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setStatus('')
                setPage(1)
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {can('clients.create') ? (
        <Card title="Novo cliente">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate({
                legalName: createForm.legalName,
                tradeName: createForm.tradeName || undefined,
                taxIdType: createForm.taxIdType || undefined,
                taxIdNumber: createForm.taxIdNumber || undefined,
                status: createForm.status,
                notes: createForm.notes || undefined,
              })
            }}
          >
            <Input
              placeholder="Razao social"
              value={createForm.legalName}
              onChange={(event) => setCreateForm((state) => ({ ...state, legalName: event.target.value }))}
              required
            />
            <Input
              placeholder="Nome fantasia"
              value={createForm.tradeName}
              onChange={(event) => setCreateForm((state) => ({ ...state, tradeName: event.target.value }))}
            />
            <Select
              value={createForm.taxIdType}
              onChange={(event) =>
                setCreateForm((state) => ({ ...state, taxIdType: event.target.value as DocumentType | '' }))
              }
            >
              <option value="">Documento (opcional)</option>
              <option value="CNPJ">CNPJ</option>
              <option value="CPF">CPF</option>
              <option value="OTHER">Outro</option>
            </Select>
            <Input
              placeholder="Numero do documento"
              value={createForm.taxIdNumber}
              onChange={(event) => setCreateForm((state) => ({ ...state, taxIdNumber: event.target.value }))}
            />
            <Select
              value={createForm.status}
              onChange={(event) => setCreateForm((state) => ({ ...state, status: event.target.value as ClientStatus }))}
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
              <option value="SUSPENDED">Suspenso</option>
            </Select>
            <Input
              placeholder="Observacoes"
              value={createForm.notes}
              onChange={(event) => setCreateForm((state) => ({ ...state, notes: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending || !createForm.legalName.trim()}>
                {createMutation.isPending ? 'Salvando...' : 'Criar cliente'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Clientes cadastrados">
        {clientsQuery.isLoading ? (
          <Loading />
        ) : clients.length === 0 ? (
          <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros ou crie um novo cliente." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Razao social</th>
                    <th className="px-3 py-2">Nome fantasia</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{client.legalName}</td>
                      <td className="px-3 py-2">{client.tradeName ?? '-'}</td>
                      <td className="px-3 py-2">{formatTaxId(client)}</td>
                      <td className="px-3 py-2">
                        <Badge>{client.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/clientes/${client.id}`}>
                            <Button variant="ghost">Detalhes</Button>
                          </Link>

                          {client.status !== 'ACTIVE' && can('clients.activate') ? (
                            <Button
                              variant="secondary"
                              onClick={() => statusMutation.mutate({ id: client.id, active: true })}
                            >
                              Ativar
                            </Button>
                          ) : null}

                          {client.status === 'ACTIVE' && can('clients.deactivate') ? (
                            <Button
                              variant="danger"
                              onClick={() => {
                                if (window.confirm('Confirma a desativacao deste cliente?')) {
                                  statusMutation.mutate({ id: client.id, active: false })
                                }
                              }}
                            >
                              Desativar
                            </Button>
                          ) : null}
                        </div>
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
