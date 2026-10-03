import { zodResolver } from '@hookform/resolvers/zod'
import { roles, type Role } from '@gestao-sst/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
  activateUser,
  createUser,
  deactivateUser,
  listUsers,
  resetUserPassword,
  type UserListItem,
  updateUser,
} from '@/services/users.service'

const createUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Nome obrigatorio.'),
    email: z.string().trim().email('E-mail invalido.'),
    role: z.enum(roles),
    password: z
      .string()
      .min(8)
      .max(64)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas nao conferem.',
      })
    }
  })

const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio.'),
  email: z.string().trim().email('E-mail invalido.'),
  role: z.enum(roles),
})

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .max(64)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'As senhas nao conferem.',
      })
    }
  })

type CreateUserForm = z.infer<typeof createUserSchema>
type UpdateUserForm = z.infer<typeof updateUserSchema>
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha na operacao.'
}

export function UsersPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('')
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['users', page, search, role, status],
    queryFn: () =>
      listUsers({
        page,
        pageSize: 10,
        search: search || undefined,
        role: role || undefined,
        status: status || undefined,
      }),
  })

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'VIEWER',
      password: '',
      confirmPassword: '',
      isActive: true,
    },
  })

  const updateForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  })

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess() {
      setFeedback('Usuario criado com sucesso.')
      setError(null)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserForm }) => updateUser(id, payload),
    onSuccess() {
      setFeedback('Usuario atualizado com sucesso.')
      setError(null)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const resetMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResetPasswordForm }) =>
      resetUserPassword(id, payload),
    onSuccess() {
      setFeedback('Senha redefinida com sucesso.')
      setError(null)
      resetForm.reset()
      setSelectedUser(null)
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (active) {
        return activateUser(id)
      }
      return deactivateUser(id)
    },
    onSuccess(_, variables) {
      setFeedback(variables.active ? 'Usuario ativado.' : 'Usuario desativado.')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const pagination = usersQuery.data?.pagination
  const users = usersQuery.data?.data ?? []

  const canManageUsers = useMemo(
    () => can('users.create') || can('users.update') || can('users.deactivate') || can('users.activate'),
    [can],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes > Usuarios"
        subtitle="Gestao de contas de acesso, papeis e status de autenticacao."
      />

      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <Card title="Filtros">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Buscar por nome ou email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | '')
              setPage(1)
            }}
          >
            <option value="">Todos os papeis</option>
            {roles.map((roleOption) => (
              <option key={roleOption} value={roleOption}>
                {roleOption}
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
                setRole('')
                setStatus('')
                setPage(1)
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {can('users.create') ? (
        <Card title="Novo usuario" subtitle="A senha inicial deve seguir a politica de seguranca.">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
            noValidate
          >
            <Input placeholder="Nome" {...createForm.register('name')} />
            <Input placeholder="E-mail" type="email" {...createForm.register('email')} />
            <Select {...createForm.register('role')}>
              {roles.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...createForm.register('isActive')} />
              Usuario ativo
            </label>
            <Input placeholder="Senha inicial" type="password" {...createForm.register('password')} />
            <Input
              placeholder="Confirmar senha"
              type="password"
              {...createForm.register('confirmPassword')}
            />
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Salvando...' : 'Criar usuario'}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card title="Usuarios cadastrados">
        {usersQuery.isLoading ? (
          <Loading />
        ) : users.length === 0 ? (
          <EmptyState title="Nenhum usuario encontrado" description="Ajuste os filtros ou crie um novo usuario." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">E-mail</th>
                    <th className="px-3 py-2">Papel</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Ultimo acesso</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{user.name ?? '-'}</td>
                      <td className="px-3 py-2">{user.email}</td>
                      <td className="px-3 py-2">{user.role}</td>
                      <td className="px-3 py-2">{user.isActive ? 'Ativo' : 'Inativo'}</td>
                      <td className="px-3 py-2">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {can('users.update') ? (
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(user)
                                updateForm.reset({
                                  name: user.name ?? '',
                                  email: user.email,
                                  role: user.role,
                                })
                                resetForm.reset({
                                  newPassword: '',
                                  confirmPassword: '',
                                })
                              }}
                            >
                              Editar
                            </Button>
                          ) : null}

                          {can('users.resetPassword') ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSelectedUser(user)
                                resetForm.reset({
                                  newPassword: '',
                                  confirmPassword: '',
                                })
                              }}
                            >
                              Redefinir senha
                            </Button>
                          ) : null}

                          {user.isActive && can('users.deactivate') ? (
                            <Button
                              variant="danger"
                              onClick={() => {
                                if (window.confirm('Confirma desativacao deste usuario?')) {
                                  toggleMutation.mutate({ id: user.id, active: false })
                                }
                              }}
                            >
                              Desativar
                            </Button>
                          ) : null}

                          {!user.isActive && can('users.activate') ? (
                            <Button
                              variant="secondary"
                              onClick={() => toggleMutation.mutate({ id: user.id, active: true })}
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

      {selectedUser && canManageUsers ? (
        <Card title={`Gerenciar usuario: ${selectedUser.email}`}>
          {can('users.update') ? (
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={updateForm.handleSubmit((values) =>
                updateMutation.mutate({
                  id: selectedUser.id,
                  payload: values,
                }),
              )}
              noValidate
            >
              <Input placeholder="Nome" {...updateForm.register('name')} />
              <Input placeholder="E-mail" type="email" {...updateForm.register('email')} />
              <Select {...updateForm.register('role')}>
                {roles.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </Select>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Atualizando...' : 'Salvar alteracoes'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setSelectedUser(null)}>
                  Fechar
                </Button>
              </div>
            </form>
          ) : null}

          {can('users.resetPassword') ? (
            <form
              className="mt-6 grid gap-3 md:grid-cols-2"
              onSubmit={resetForm.handleSubmit((values) =>
                resetMutation.mutate({ id: selectedUser.id, payload: values }),
              )}
              noValidate
            >
              <Input placeholder="Nova senha" type="password" {...resetForm.register('newPassword')} />
              <Input
                placeholder="Confirmar nova senha"
                type="password"
                {...resetForm.register('confirmPassword')}
              />
              <div className="md:col-span-2">
                <Button type="submit" variant="secondary" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? 'Processando...' : 'Redefinir senha'}
                </Button>
              </div>
            </form>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
