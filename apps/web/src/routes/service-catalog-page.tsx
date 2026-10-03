import type { ServiceCategory } from '@gestao-sst/shared'
import { serviceCategories } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
import {
  activateServiceCatalog,
  createServiceCatalog,
  deactivateServiceCatalog,
  listServiceCatalog,
  updateServiceCatalog,
} from '@/services/service-catalog.service'
import type { ServiceCatalog } from '@/types/contracts'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Falha ao processar catalogo de servicos.'
}

export function ServiceCatalogPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ServiceCategory | ''>('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ServiceCatalog | null>(null)

  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    category: 'TECHNICAL_DOCUMENT' as ServiceCategory,
    sortOrder: 0,
  })

  const [updateForm, setUpdateForm] = useState({
    code: '',
    name: '',
    description: '',
    category: 'TECHNICAL_DOCUMENT' as ServiceCategory,
    sortOrder: 0,
  })

  const listQuery = useQuery({
    queryKey: ['service-catalog', page, search, category, status],
    queryFn: () =>
      listServiceCatalog({
        page,
        pageSize: 10,
        search: search || undefined,
        category: category || undefined,
        isActive: status || undefined,
      }),
  })

  const createMutation = useMutation({
    mutationFn: createServiceCatalog,
    onSuccess() {
      setFeedback('Servico de catalogo criado com sucesso.')
      setError(null)
      setCreateForm({
        code: '',
        name: '',
        description: '',
        category: 'TECHNICAL_DOCUMENT',
        sortOrder: 0,
      })
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateServiceCatalog>[1] }) =>
      updateServiceCatalog(id, payload),
    onSuccess() {
      setFeedback('Servico atualizado com sucesso.')
      setError(null)
      setSelected(null)
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        return activateServiceCatalog(id)
      }
      return deactivateServiceCatalog(id)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Servico ativado.' : 'Servico desativado.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['service-catalog'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const services = listQuery.data?.data ?? []
  const pagination = listQuery.data?.pagination

  return (
    <div className="space-y-6">
      <PageHeader title="Configuracoes > Servicos" subtitle="Catalogo padrao de servicos oferecidos pela operacao SST." />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar por codigo ou nome"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ServiceCategory | '')
              setPage(1)
            }}
          >
            <option value="">Todas as categorias</option>
            {serviceCategories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as 'active' | 'inactive' | '')
              setPage(1)
            }}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => {
              setSearch('')
              setCategory('')
              setStatus('')
              setPage(1)
            }}
          >
            Limpar
          </Button>
        </div>
      </Card>

      <Card title="Novo servico do catalogo">
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            createMutation.mutate({
              code: createForm.code,
              name: createForm.name,
              description: createForm.description || undefined,
              category: createForm.category,
              sortOrder: createForm.sortOrder,
              isActive: true,
            })
          }}
        >
          <Input
            placeholder="Codigo (ex.: PGR)"
            value={createForm.code}
            onChange={(event) => setCreateForm((state) => ({ ...state, code: event.target.value.toUpperCase() }))}
            required
          />
          <Input
            placeholder="Nome"
            value={createForm.name}
            onChange={(event) => setCreateForm((state) => ({ ...state, name: event.target.value }))}
            required
          />
          <Select
            value={createForm.category}
            onChange={(event) =>
              setCreateForm((state) => ({ ...state, category: event.target.value as ServiceCategory }))
            }
          >
            {serviceCategories.map((categoryOption) => (
              <option key={categoryOption} value={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            placeholder="Ordem"
            value={createForm.sortOrder}
            onChange={(event) => setCreateForm((state) => ({ ...state, sortOrder: Number(event.target.value) }))}
            min={0}
          />
          <Input
            className="md:col-span-2"
            placeholder="Descricao"
            value={createForm.description}
            onChange={(event) => setCreateForm((state) => ({ ...state, description: event.target.value }))}
          />
          <div className="md:col-span-2">
            <Button type="submit" disabled={createMutation.isPending || !createForm.code || !createForm.name}>
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar servico'}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Catalogo de servicos">
        {listQuery.isLoading ? (
          <Loading />
        ) : services.length === 0 ? (
          <EmptyState title="Nenhum servico encontrado" description="Ajuste os filtros ou cadastre um novo servico." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Codigo</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Ordem</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium">{service.code}</td>
                      <td className="px-3 py-2">{service.name}</td>
                      <td className="px-3 py-2">{service.category}</td>
                      <td className="px-3 py-2">{service.sortOrder}</td>
                      <td className="px-3 py-2">
                        <Badge>{service.isActive ? 'ATIVO' : 'INATIVO'}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelected(service)
                              setUpdateForm({
                                code: service.code,
                                name: service.name,
                                description: service.description ?? '',
                                category: service.category,
                                sortOrder: service.sortOrder,
                              })
                            }}
                          >
                            Editar
                          </Button>

                          {service.isActive ? (
                            <Button
                              variant="danger"
                              onClick={() => statusMutation.mutate({ id: service.id, active: false })}
                            >
                              Desativar
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => statusMutation.mutate({ id: service.id, active: true })}
                            >
                              Ativar
                            </Button>
                          )}
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

      {selected ? (
        <Card title={`Editar: ${selected.name}`}>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              updateMutation.mutate({
                id: selected.id,
                payload: {
                  code: updateForm.code,
                  name: updateForm.name,
                  description: updateForm.description || null,
                  category: updateForm.category,
                  sortOrder: updateForm.sortOrder,
                },
              })
            }}
          >
            <Input
              placeholder="Codigo"
              value={updateForm.code}
              onChange={(event) => setUpdateForm((state) => ({ ...state, code: event.target.value.toUpperCase() }))}
              required
            />
            <Input
              placeholder="Nome"
              value={updateForm.name}
              onChange={(event) => setUpdateForm((state) => ({ ...state, name: event.target.value }))}
              required
            />
            <Select
              value={updateForm.category}
              onChange={(event) =>
                setUpdateForm((state) => ({ ...state, category: event.target.value as ServiceCategory }))
              }
            >
              {serviceCategories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Ordem"
              value={updateForm.sortOrder}
              onChange={(event) => setUpdateForm((state) => ({ ...state, sortOrder: Number(event.target.value) }))}
              min={0}
            />
            <Input
              className="md:col-span-2"
              placeholder="Descricao"
              value={updateForm.description}
              onChange={(event) => setUpdateForm((state) => ({ ...state, description: event.target.value }))}
            />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar alteracoes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
