import { brStates, formatCnpj, formatCpf, formatPhone, formatPostalCode } from '@gestao-sst/shared'
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
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import {
  activateClientContact,
  activateClientMembership,
  activateEstablishment,
  createClientPortalAccess,
  createClientContact,
  createEstablishment,
  deactivateClientMembership,
  deactivateClientContact,
  deactivateEstablishment,
  getClientById,
  linkExistingClientPortalUser,
  listClientContacts,
  listClientEstablishments,
  listClientPortalUsers,
  removeClientMembership,
  setHeadquarters,
  setPrimaryContact,
} from '@/services/clients.service'
import { listContractsByClient } from '@/services/contracts.service'
import type { ClientMembership } from '@/types/clients'

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha ao processar requisicao.'
}

function formatTaxId(type: string | null, value: string | null): string {
  if (!type || !value) {
    return '-'
  }

  if (type === 'CNPJ') {
    return formatCnpj(value)
  }

  if (type === 'CPF') {
    return formatCpf(value)
  }

  return value
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [establishmentForm, setEstablishmentForm] = useState({
    nickname: '',
    isHeadquarters: false,
    postalCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    contactPhone: '',
  })

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    isPrimary: false,
  })

  const [portalAccessForm, setPortalAccessForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [existingClientUserId, setExistingClientUserId] = useState('')

  const clientQuery = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClientById(id as string),
    enabled: Boolean(id),
  })

  const establishmentsQuery = useQuery({
    queryKey: ['client-establishments', id],
    queryFn: () =>
      listClientEstablishments(id as string, {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(id),
  })

  const contactsQuery = useQuery({
    queryKey: ['client-contacts', id],
    queryFn: () =>
      listClientContacts(id as string, {
        page: 1,
        pageSize: 50,
      }),
    enabled: Boolean(id),
  })

  const contractsQuery = useQuery({
    queryKey: ['client-contracts', id],
    queryFn: () => listContractsByClient(id as string),
    enabled: Boolean(id),
  })

  const portalUsersQuery = useQuery({
    queryKey: ['client-portal-users', id],
    queryFn: () => listClientPortalUsers(id as string),
    enabled: Boolean(id) && can('clientPortalUsers.read'),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['client', id] })
    queryClient.invalidateQueries({ queryKey: ['client-establishments', id] })
    queryClient.invalidateQueries({ queryKey: ['client-contacts', id] })
    queryClient.invalidateQueries({ queryKey: ['client-portal-users', id] })
  }

  const createPortalAccessMutation = useMutation({
    mutationFn: () =>
      createClientPortalAccess(id as string, {
        name: portalAccessForm.name,
        email: portalAccessForm.email,
        password: portalAccessForm.password,
        confirmPassword: portalAccessForm.confirmPassword,
      }),
    onSuccess() {
      setFeedback('Acesso ao portal criado e vinculado com sucesso.')
      setError(null)
      setPortalAccessForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const linkExistingPortalUserMutation = useMutation({
    mutationFn: () => linkExistingClientPortalUser(id as string, existingClientUserId),
    onSuccess() {
      setFeedback('Usuario CLIENT vinculado ao portal com sucesso.')
      setError(null)
      setExistingClientUserId('')
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const membershipStatusMutation = useMutation({
    mutationFn: async ({ membershipId, active }: { membershipId: string; active: boolean }) => {
      if (active) {
        return activateClientMembership(membershipId)
      }
      return deactivateClientMembership(membershipId)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Vinculo ativado.' : 'Vinculo desativado.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const removeMembershipMutation = useMutation({
    mutationFn: (membershipId: string) => removeClientMembership(membershipId),
    onSuccess() {
      setFeedback('Vinculo removido.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const createEstablishmentMutation = useMutation({
    mutationFn: () =>
      createEstablishment(id as string, {
        nickname: establishmentForm.nickname || undefined,
        isHeadquarters: establishmentForm.isHeadquarters,
        postalCode: establishmentForm.postalCode,
        street: establishmentForm.street,
        number: establishmentForm.number,
        neighborhood: establishmentForm.neighborhood,
        city: establishmentForm.city,
        state: establishmentForm.state,
        contactPhone: establishmentForm.contactPhone || undefined,
      }),
    onSuccess() {
      setFeedback('Estabelecimento criado com sucesso.')
      setError(null)
      setEstablishmentForm({
        nickname: '',
        isHeadquarters: false,
        postalCode: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: 'SP',
        contactPhone: '',
      })
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const createContactMutation = useMutation({
    mutationFn: () =>
      createClientContact(id as string, {
        name: contactForm.name,
        email: contactForm.email || undefined,
        phone: contactForm.phone,
        department: contactForm.department || undefined,
        isPrimary: contactForm.isPrimary,
      }),
    onSuccess() {
      setFeedback('Contato criado com sucesso.')
      setError(null)
      setContactForm({
        name: '',
        email: '',
        phone: '',
        department: '',
        isPrimary: false,
      })
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const establishmentStatusMutation = useMutation({
    mutationFn: async ({ establishmentId, active }: { establishmentId: string; active: boolean }) => {
      if (active) {
        return activateEstablishment(establishmentId)
      }
      return deactivateEstablishment(establishmentId)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Estabelecimento ativado.' : 'Estabelecimento desativado.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const setHeadquartersMutation = useMutation({
    mutationFn: (establishmentId: string) => setHeadquarters(establishmentId),
    onSuccess() {
      setFeedback('Matriz redefinida com sucesso.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const contactStatusMutation = useMutation({
    mutationFn: async ({ contactId, active }: { contactId: string; active: boolean }) => {
      if (active) {
        return activateClientContact(contactId)
      }
      return deactivateClientContact(contactId)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Contato ativado.' : 'Contato desativado.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (contactId: string) => setPrimaryContact(contactId),
    onSuccess() {
      setFeedback('Contato principal atualizado com sucesso.')
      setError(null)
      refresh()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const client = clientQuery.data?.client
  const establishments = establishmentsQuery.data?.data ?? []
  const contacts = contactsQuery.data?.data ?? []
  const contracts = contractsQuery.data?.data ?? []
  const portalMemberships: ClientMembership[] = portalUsersQuery.data?.data ?? []

  const loading =
    clientQuery.isLoading ||
    establishmentsQuery.isLoading ||
    contactsQuery.isLoading ||
    contractsQuery.isLoading ||
    (can('clientPortalUsers.read') && portalUsersQuery.isLoading)

  const canManagePortalUsers = can('clientPortalUsers.manage')

  const canManageEstablishments = useMemo(
    () =>
      can('establishments.create') ||
      can('establishments.update') ||
      can('establishments.activate') ||
      can('establishments.deactivate') ||
      can('establishments.setHeadquarters'),
    [can],
  )

  const canManageContacts = useMemo(
    () =>
      can('clientContacts.create') ||
      can('clientContacts.update') ||
      can('clientContacts.activate') ||
      can('clientContacts.deactivate') ||
      can('clientContacts.setPrimary'),
    [can],
  )

  if (!id) {
    return <EmptyState title="Cliente invalido" description="Identificador do cliente nao foi informado." />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client ? `Cliente: ${client.legalName}` : 'Detalhe do cliente'}
        subtitle="Gestao de estabelecimentos, contato principal e contatos operacionais."
      />

      <Link to="/clientes">
        <Button variant="ghost">Voltar para clientes</Button>
      </Link>

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {loading ? <Loading /> : null}

      {!loading && !client ? (
        <EmptyState title="Cliente nao encontrado" description="Verifique o link e tente novamente." />
      ) : null}

      {client ? (
        <Card title="Dados do cliente">
          <div className="grid gap-3 md:grid-cols-2">
            <p>
              <strong>Razao social:</strong> {client.legalName}
            </p>
            <p>
              <strong>Nome fantasia:</strong> {client.tradeName ?? '-'}
            </p>
            <p>
              <strong>Documento:</strong> {formatTaxId(client.taxIdType, client.taxIdNumberNormalized)}
            </p>
            <p>
              <strong>Status:</strong> <Badge>{client.status}</Badge>
            </p>
          </div>
        </Card>
      ) : null}

      <Card title="Estabelecimentos" subtitle="Apenas um estabelecimento pode ser matriz por cliente.">
        {establishments.length === 0 ? (
          <EmptyState title="Sem estabelecimentos" description="Cadastre o primeiro estabelecimento deste cliente." />
        ) : (
          <div className="space-y-3">
            {establishments.map((establishment) => (
              <div key={establishment.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{establishment.nickname || 'Sem apelido'}</p>
                    <p className="text-sm text-slate-600">
                      {establishment.street}, {establishment.number} - {establishment.city}/{establishment.state} - CEP{' '}
                      {formatPostalCode(establishment.postalCode)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{establishment.status}</Badge>
                    {establishment.isHeadquarters ? <Badge>MATRIZ</Badge> : null}
                  </div>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                  <p>Documento: {formatTaxId(establishment.taxIdType, establishment.taxIdNumberNormalized)}</p>
                  <p>Telefone: {establishment.contactPhone ? formatPhone(establishment.contactPhone) : '-'}</p>
                </div>
                {canManageEstablishments ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!establishment.isHeadquarters && can('establishments.setHeadquarters') ? (
                      <Button
                        variant="secondary"
                        onClick={() => setHeadquartersMutation.mutate(establishment.id)}
                      >
                        Definir como matriz
                      </Button>
                    ) : null}

                    {establishment.status !== 'ACTIVE' && can('establishments.activate') ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          establishmentStatusMutation.mutate({
                            establishmentId: establishment.id,
                            active: true,
                          })
                        }
                      >
                        Ativar
                      </Button>
                    ) : null}

                    {establishment.status === 'ACTIVE' && can('establishments.deactivate') ? (
                      <Button
                        variant="danger"
                        onClick={() =>
                          establishmentStatusMutation.mutate({
                            establishmentId: establishment.id,
                            active: false,
                          })
                        }
                      >
                        Desativar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {can('establishments.create') ? (
          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault()
              createEstablishmentMutation.mutate()
            }}
          >
            <Input
              placeholder="Apelido"
              value={establishmentForm.nickname}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, nickname: event.target.value }))}
            />
            <Input
              placeholder="CEP"
              value={establishmentForm.postalCode}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, postalCode: event.target.value }))}
              required
            />
            <Input
              placeholder="Rua"
              value={establishmentForm.street}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, street: event.target.value }))}
              required
            />
            <Input
              placeholder="Numero"
              value={establishmentForm.number}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, number: event.target.value }))}
              required
            />
            <Input
              placeholder="Bairro"
              value={establishmentForm.neighborhood}
              onChange={(event) =>
                setEstablishmentForm((state) => ({ ...state, neighborhood: event.target.value }))
              }
              required
            />
            <Input
              placeholder="Cidade"
              value={establishmentForm.city}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, city: event.target.value }))}
              required
            />
            <Select
              value={establishmentForm.state}
              onChange={(event) => setEstablishmentForm((state) => ({ ...state, state: event.target.value }))}
            >
              {brStates.map((stateOption) => (
                <option key={stateOption} value={stateOption}>
                  {stateOption}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Telefone"
              value={establishmentForm.contactPhone}
              onChange={(event) =>
                setEstablishmentForm((state) => ({ ...state, contactPhone: event.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={establishmentForm.isHeadquarters}
                onChange={(event) =>
                  setEstablishmentForm((state) => ({ ...state, isHeadquarters: event.target.checked }))
                }
              />
              Definir como matriz
            </label>
            <div className="md:col-span-3">
              <Button
                type="submit"
                disabled={
                  createEstablishmentMutation.isPending ||
                  !establishmentForm.postalCode.trim() ||
                  !establishmentForm.street.trim() ||
                  !establishmentForm.number.trim() ||
                  !establishmentForm.neighborhood.trim() ||
                  !establishmentForm.city.trim()
                }
              >
                {createEstablishmentMutation.isPending ? 'Salvando...' : 'Adicionar estabelecimento'}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card title="Contatos" subtitle="Apenas um contato principal por cliente.">
        {contacts.length === 0 ? (
          <EmptyState title="Sem contatos" description="Cadastre o primeiro contato operacional." />
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{contact.name}</p>
                    <p className="text-sm text-slate-600">
                      {contact.email ?? '-'} | {formatPhone(contact.phone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.isPrimary ? <Badge>PRINCIPAL</Badge> : null}
                    <Badge>{contact.isActive ? 'ATIVO' : 'INATIVO'}</Badge>
                  </div>
                </div>

                {canManageContacts ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!contact.isPrimary && can('clientContacts.setPrimary') ? (
                      <Button variant="secondary" onClick={() => setPrimaryMutation.mutate(contact.id)}>
                        Definir como principal
                      </Button>
                    ) : null}

                    {!contact.isActive && can('clientContacts.activate') ? (
                      <Button
                        variant="secondary"
                        onClick={() => contactStatusMutation.mutate({ contactId: contact.id, active: true })}
                      >
                        Ativar
                      </Button>
                    ) : null}

                    {contact.isActive && can('clientContacts.deactivate') ? (
                      <Button
                        variant="danger"
                        onClick={() => contactStatusMutation.mutate({ contactId: contact.id, active: false })}
                      >
                        Desativar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {can('clientContacts.create') ? (
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              createContactMutation.mutate()
            }}
          >
            <Input
              placeholder="Nome"
              value={contactForm.name}
              onChange={(event) => setContactForm((state) => ({ ...state, name: event.target.value }))}
              required
            />
            <Input
              placeholder="E-mail"
              type="email"
              value={contactForm.email}
              onChange={(event) => setContactForm((state) => ({ ...state, email: event.target.value }))}
            />
            <Input
              placeholder="Telefone"
              value={contactForm.phone}
              onChange={(event) => setContactForm((state) => ({ ...state, phone: event.target.value }))}
              required
            />
            <Input
              placeholder="Departamento"
              value={contactForm.department}
              onChange={(event) => setContactForm((state) => ({ ...state, department: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={contactForm.isPrimary}
                onChange={(event) => setContactForm((state) => ({ ...state, isPrimary: event.target.checked }))}
              />
              Definir como contato principal
            </label>
            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={
                  createContactMutation.isPending ||
                  !contactForm.name.trim() ||
                  !contactForm.phone.trim()
                }
              >
                {createContactMutation.isPending ? 'Salvando...' : 'Adicionar contato'}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card title="Contratos" subtitle="Contratos vinculados ao cliente e situacao atual.">
        {contracts.length === 0 ? (
          <EmptyState title="Sem contratos" description="Crie o primeiro contrato para este cliente." />
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <div key={contract.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{contract.contractNumber}</p>
                    <p className="text-sm text-slate-600">
                      {contract.title} | {contract.startDate} ate {contract.endDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{contract.status}</Badge>
                    <Link to={`/contratos/${contract.id}`}>
                      <Button variant="ghost">Abrir</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Link to={`/contratos?clientId=${id}`}>
            <Button variant="secondary">Novo contrato para este cliente</Button>
          </Link>
        </div>
      </Card>

      {can('clientPortalUsers.read') ? (
        <Card title="Acesso ao portal" subtitle="Vinculos de usuarios CLIENT autorizados para este cliente.">
          {portalMemberships.length === 0 ? (
            <EmptyState title="Sem acessos vinculados" description="Crie ou vincule usuarios CLIENT para acesso ao portal." />
          ) : (
            <div className="space-y-3">
              {portalMemberships.map((membership) => (
                <div key={membership.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{membership.user.name || 'Sem nome'}</p>
                      <p className="text-sm text-slate-600">{membership.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge>{membership.user.isActive ? 'USUARIO ATIVO' : 'USUARIO INATIVO'}</Badge>
                      <Badge>{membership.isActive ? 'VINCULO ATIVO' : 'VINCULO INATIVO'}</Badge>
                    </div>
                  </div>

                  {canManagePortalUsers ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!membership.isActive ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            membershipStatusMutation.mutate({
                              membershipId: membership.id,
                              active: true,
                            })
                          }
                        >
                          Ativar vinculo
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          onClick={() =>
                            membershipStatusMutation.mutate({
                              membershipId: membership.id,
                              active: false,
                            })
                          }
                        >
                          Desativar vinculo
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm('Confirma a remocao logica deste vinculo?')) {
                            removeMembershipMutation.mutate(membership.id)
                          }
                        }}
                      >
                        Remover vinculo
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {canManagePortalUsers ? (
            <>
              <form
                className="mt-4 grid gap-3 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  createPortalAccessMutation.mutate()
                }}
              >
                <Input
                  placeholder="Nome"
                  value={portalAccessForm.name}
                  onChange={(event) => setPortalAccessForm((state) => ({ ...state, name: event.target.value }))}
                  required
                />
                <Input
                  placeholder="E-mail"
                  type="email"
                  value={portalAccessForm.email}
                  onChange={(event) => setPortalAccessForm((state) => ({ ...state, email: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Senha inicial"
                  type="password"
                  value={portalAccessForm.password}
                  onChange={(event) => setPortalAccessForm((state) => ({ ...state, password: event.target.value }))}
                  required
                />
                <Input
                  placeholder="Confirmar senha"
                  type="password"
                  value={portalAccessForm.confirmPassword}
                  onChange={(event) =>
                    setPortalAccessForm((state) => ({ ...state, confirmPassword: event.target.value }))
                  }
                  required
                />
                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={
                      createPortalAccessMutation.isPending ||
                      !portalAccessForm.name.trim() ||
                      !portalAccessForm.email.trim() ||
                      !portalAccessForm.password.trim() ||
                      !portalAccessForm.confirmPassword.trim()
                    }
                  >
                    {createPortalAccessMutation.isPending ? 'Criando acesso...' : 'Criar acesso CLIENT'}
                  </Button>
                </div>
              </form>

              <form
                className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  linkExistingPortalUserMutation.mutate()
                }}
              >
                <Input
                  placeholder="ID de usuario CLIENT existente"
                  value={existingClientUserId}
                  onChange={(event) => setExistingClientUserId(event.target.value)}
                  required
                />
                <Button type="submit" disabled={linkExistingPortalUserMutation.isPending || !existingClientUserId.trim()}>
                  {linkExistingPortalUserMutation.isPending ? 'Vinculando...' : 'Vincular usuario existente'}
                </Button>
              </form>
            </>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
