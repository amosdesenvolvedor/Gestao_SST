import { zodResolver } from '@hookform/resolvers/zod'
import { professionalTypes, type ProfessionalType } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Alert } from '@/components/alert'
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
  activateProfessional,
  createProfessional,
  deactivateProfessional,
  listProfessionals,
  type ProfessionalListItem,
  updateProfessional,
} from '@/services/professionals.service'

const professionalSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio.'),
  email: z.string().trim().email('E-mail invalido.').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  cpf: z.string().trim().optional(),
  professionalType: z.enum(professionalTypes),
  councilType: z.string().trim().optional(),
  councilNumber: z.string().trim().optional(),
  councilState: z
    .string()
    .trim()
    .length(2, 'UF deve ter 2 caracteres.')
    .optional()
    .or(z.literal('')),
  specialty: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  isActive: z.boolean().default(true),
})

type ProfessionalForm = z.infer<typeof professionalSchema>

function cleanOptional(value?: string): string | undefined {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha na operacao.'
}

export function ProfessionalsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [professionalType, setProfessionalType] = useState<ProfessionalType | ''>('')
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalListItem | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const professionalsQuery = useQuery({
    queryKey: ['professionals', page, search, status, professionalType],
    queryFn: () =>
      listProfessionals({
        page,
        pageSize: 10,
        search: search || undefined,
        status: status || undefined,
        professionalType: professionalType || undefined,
      }),
  })

  const createForm = useForm<ProfessionalForm>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      professionalType: 'OTHER',
      councilType: '',
      councilNumber: '',
      councilState: '',
      specialty: '',
      userId: '',
      isActive: true,
    },
  })

  const updateForm = useForm<ProfessionalForm>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      cpf: '',
      professionalType: 'OTHER',
      councilType: '',
      councilNumber: '',
      councilState: '',
      specialty: '',
      userId: '',
      isActive: true,
    },
  })

  const createMutation = useMutation({
    mutationFn: createProfessional,
    onSuccess() {
      setFeedback('Profissional cadastrado com sucesso.')
      setError(null)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProfessionalForm }) =>
      updateProfessional(id, {
        name: payload.name,
        email: cleanOptional(payload.email) ?? null,
        phone: cleanOptional(payload.phone) ?? null,
        cpf: cleanOptional(payload.cpf) ?? null,
        professionalType: payload.professionalType,
        councilType: cleanOptional(payload.councilType) ?? null,
        councilNumber: cleanOptional(payload.councilNumber) ?? null,
        councilState: cleanOptional(payload.councilState) ?? null,
        specialty: cleanOptional(payload.specialty) ?? null,
        userId: cleanOptional(payload.userId) ?? null,
      }),
    onSuccess() {
      setFeedback('Profissional atualizado com sucesso.')
      setError(null)
      setSelectedProfessional(null)
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        return activateProfessional(id)
      }
      return deactivateProfessional(id)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Profissional ativado.' : 'Profissional desativado.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const pagination = professionalsQuery.data?.pagination
  const professionals = professionalsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Profissionais" subtitle="Dados gerais e registro profissional da operacao SST." />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar por nome, e-mail ou registro"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={professionalType}
            onChange={(event) => {
              setProfessionalType(event.target.value as ProfessionalType | '')
              setPage(1)
            }}
          >
            <option value="">Todos os tipos</option>
            {professionalTypes.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
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
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setProfessionalType('')
                setStatus('')
                setPage(1)
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {can('professionals.create') ? (
        <Card title="Novo profissional" subtitle="Dados gerais e registro profissional.">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={createForm.handleSubmit((values) =>
              createMutation.mutate({
                name: values.name,
                email: cleanOptional(values.email),
                phone: cleanOptional(values.phone),
                cpf: cleanOptional(values.cpf),
                professionalType: values.professionalType,
                councilType: cleanOptional(values.councilType),
                councilNumber: cleanOptional(values.councilNumber),
                councilState: cleanOptional(values.councilState),
                specialty: cleanOptional(values.specialty),
                userId: cleanOptional(values.userId),
                isActive: values.isActive,
              }),
            )}
            noValidate
          >
            <Input placeholder="Nome" {...createForm.register('name')} />
            <Select {...createForm.register('professionalType')}>
              {professionalTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </Select>
            <Input placeholder="E-mail (opcional)" type="email" {...createForm.register('email')} />
            <Input placeholder="Telefone (opcional)" {...createForm.register('phone')} />
            <Input placeholder="CPF (opcional)" {...createForm.register('cpf')} />
            <Input placeholder="Tipo de conselho (CRM, CREA...)" {...createForm.register('councilType')} />
            <Input placeholder="Numero de registro" {...createForm.register('councilNumber')} />
            <Input placeholder="UF do conselho" maxLength={2} {...createForm.register('councilState')} />
            <Input placeholder="Especialidade" {...createForm.register('specialty')} />
            <Input placeholder="Vincular User ID (opcional)" {...createForm.register('userId')} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...createForm.register('isActive')} />
              Profissional ativo
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Cadastrar profissional'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Profissionais cadastrados">
        {professionalsQuery.isLoading ? (
          <Loading />
        ) : professionals.length === 0 ? (
          <EmptyState title="Nenhum profissional encontrado" description="Ajuste os filtros ou cadastre um novo profissional." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Conselho</th>
                    <th className="px-3 py-2">Registro</th>
                    <th className="px-3 py-2">UF</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {professionals.map((professional) => (
                    <tr key={professional.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{professional.name}</td>
                      <td className="px-3 py-2">{professional.professionalType}</td>
                      <td className="px-3 py-2">{professional.councilType ?? '-'}</td>
                      <td className="px-3 py-2">{professional.councilNumber ?? '-'}</td>
                      <td className="px-3 py-2">{professional.councilState ?? '-'}</td>
                      <td className="px-3 py-2">{professional.isActive ? 'Ativo' : 'Inativo'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {can('professionals.update') ? (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setSelectedProfessional(professional)
                                updateForm.reset({
                                  name: professional.name,
                                  email: professional.email ?? '',
                                  phone: professional.phone ?? '',
                                  cpf: professional.cpf ?? '',
                                  professionalType: professional.professionalType,
                                  councilType: professional.councilType ?? '',
                                  councilNumber: professional.councilNumber ?? '',
                                  councilState: professional.councilState ?? '',
                                  specialty: professional.specialty ?? '',
                                  userId: professional.userId ?? '',
                                  isActive: professional.isActive,
                                })
                              }}
                            >
                              Editar
                            </Button>
                          ) : null}

                          {professional.isActive && can('professionals.deactivate') ? (
                            <Button
                              variant="danger"
                              onClick={() => {
                                if (window.confirm('Confirma desativacao deste profissional?')) {
                                  toggleMutation.mutate({ id: professional.id, active: false })
                                }
                              }}
                            >
                              Desativar
                            </Button>
                          ) : null}

                          {!professional.isActive && can('professionals.activate') ? (
                            <Button
                              variant="secondary"
                              onClick={() => toggleMutation.mutate({ id: professional.id, active: true })}
                            >
                              Ativar
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

      {selectedProfessional && can('professionals.update') ? (
        <Card title={`Editar profissional: ${selectedProfessional.name}`}>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={updateForm.handleSubmit((values) =>
              updateMutation.mutate({
                id: selectedProfessional.id,
                payload: values,
              }),
            )}
            noValidate
          >
            <Input placeholder="Nome" {...updateForm.register('name')} />
            <Select {...updateForm.register('professionalType')}>
              {professionalTypes.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </Select>
            <Input placeholder="E-mail" type="email" {...updateForm.register('email')} />
            <Input placeholder="Telefone" {...updateForm.register('phone')} />
            <Input placeholder="CPF" {...updateForm.register('cpf')} />
            <Input placeholder="Tipo de conselho" {...updateForm.register('councilType')} />
            <Input placeholder="Numero de registro" {...updateForm.register('councilNumber')} />
            <Input placeholder="UF" maxLength={2} {...updateForm.register('councilState')} />
            <Input placeholder="Especialidade" {...updateForm.register('specialty')} />
            <Input placeholder="Vincular User ID" {...updateForm.register('userId')} />
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Atualizando...' : 'Salvar alteracoes'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSelectedProfessional(null)}>
                Fechar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
