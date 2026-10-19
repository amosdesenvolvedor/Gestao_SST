import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Establishment } from '@/types/clients'
import { Alert } from '@/components/alert'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { EmptyState } from '@/components/empty-state'
import { Input } from '@/components/input'
import { Loading } from '@/components/loading'
import { Select } from '@/components/select'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api-client'
import {
  activateSstActivity,
  activateSstRole,
  activateSstSector,
  activateSstWorkEnvironment,
  activateSstWorkSchedule,
  createSstActivity,
  createSstRole,
  createSstSector,
  createSstWorkEnvironment,
  createSstWorkSchedule,
  deactivateSstActivity,
  deactivateSstRole,
  deactivateSstSector,
  deactivateSstWorkEnvironment,
  deactivateSstWorkSchedule,
  getSstActivityById,
  getSstRoleById,
  getSstSectorById,
  getSstWorkEnvironmentById,
  getSstWorkScheduleById,
  listSstActivities,
  listSstRoles,
  listSstSectors,
  listSstWorkEnvironments,
  listSstWorkSchedules,
  updateSstActivity,
  updateSstRole,
  updateSstSector,
  updateSstWorkEnvironment,
  updateSstWorkSchedule,
} from '@/services/sst-organization.service'
import type {
  SstActivity,
  SstRole,
  SstSector,
  SstWorkEnvironment,
  SstWorkSchedule,
} from '@/types/sst-organization'

type Props = {
  clientId: string
  establishments: Establishment[]
}

type Category = 'sectors' | 'work-environments' | 'roles' | 'activities' | 'work-schedules'

type DetailState =
  | { category: 'sectors'; item: SstSector }
  | { category: 'work-environments'; item: SstWorkEnvironment }
  | { category: 'roles'; item: SstRole }
  | { category: 'activities'; item: SstActivity }
  | { category: 'work-schedules'; item: SstWorkSchedule }
  | null

const emptySectors: SstSector[] = []
const emptyWorkEnvironments: SstWorkEnvironment[] = []
const emptyRoles: SstRole[] = []
const emptyActivities: SstActivity[] = []
const emptyWorkSchedules: SstWorkSchedule[] = []

function toApiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Falha ao processar requisicao de estrutura SST.'
}

function statusBadge(isActive: boolean) {
  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-800">ATIVO</Badge>
  ) : (
    <Badge className="bg-slate-200 text-slate-700">INATIVO</Badge>
  )
}

function categoryButtonClass(isActive: boolean) {
  return isActive
    ? 'bg-slate-200 text-slate-900'
    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
}

export function SstOrganizationAdminSection({ clientId, establishments }: Props) {
  const { can } = useAuth()
  const queryClient = useQueryClient()

  const canRead = can('sst.structure.read')
  const canManage = can('sst.structure.manage')

  const [activeCategory, setActiveCategory] = useState<Category>('sectors')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailState>(null)

  const activeEstablishments = useMemo(
    () => establishments.filter((item) => item.status === 'ACTIVE'),
    [establishments],
  )

  const sectorsQuery = useQuery({
    queryKey: ['sst', 'sectors', clientId],
    queryFn: () => listSstSectors(clientId, { page: 1, pageSize: 200 }),
    enabled: canRead,
  })

  const workEnvironmentsQuery = useQuery({
    queryKey: ['sst', 'work-environments', clientId],
    queryFn: () => listSstWorkEnvironments(clientId, { page: 1, pageSize: 200 }),
    enabled: canRead,
  })

  const rolesQuery = useQuery({
    queryKey: ['sst', 'roles', clientId],
    queryFn: () => listSstRoles(clientId, { page: 1, pageSize: 200 }),
    enabled: canRead,
  })

  const activitiesQuery = useQuery({
    queryKey: ['sst', 'activities', clientId],
    queryFn: () => listSstActivities(clientId, { page: 1, pageSize: 200 }),
    enabled: canRead,
  })

  const workSchedulesQuery = useQuery({
    queryKey: ['sst', 'work-schedules', clientId],
    queryFn: () => listSstWorkSchedules(clientId, { page: 1, pageSize: 200 }),
    enabled: canRead,
  })

  const sectors = sectorsQuery.data?.data ?? emptySectors
  const workEnvironments = workEnvironmentsQuery.data?.data ?? emptyWorkEnvironments
  const roles = rolesQuery.data?.data ?? emptyRoles
  const activities = activitiesQuery.data?.data ?? emptyActivities
  const workSchedules = workSchedulesQuery.data?.data ?? emptyWorkSchedules

  const sectorById = useMemo(() => {
    return new Map(sectors.map((item) => [item.id, item]))
  }, [sectors])

  const roleById = useMemo(() => {
    return new Map(roles.map((item) => [item.id, item]))
  }, [roles])

  const establishmentById = useMemo(() => {
    return new Map(establishments.map((item) => [item.id, item]))
  }, [establishments])

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sst', 'sectors', clientId] })
    queryClient.invalidateQueries({ queryKey: ['sst', 'work-environments', clientId] })
    queryClient.invalidateQueries({ queryKey: ['sst', 'roles', clientId] })
    queryClient.invalidateQueries({ queryKey: ['sst', 'activities', clientId] })
    queryClient.invalidateQueries({ queryKey: ['sst', 'work-schedules', clientId] })
  }

  const [sectorForm, setSectorForm] = useState({
    id: '',
    establishmentId: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
  })

  const [workEnvironmentForm, setWorkEnvironmentForm] = useState({
    id: '',
    establishmentId: '',
    sectorId: '',
    code: '',
    name: '',
    description: '',
    indoorOutdoorType: 'INDOOR' as 'INDOOR' | 'OUTDOOR' | 'MIXED',
    isActive: true,
  })

  const [roleForm, setRoleForm] = useState({
    id: '',
    title: '',
    cboCode: '',
    cboDescription: '',
    description: '',
    isActive: true,
  })

  const [activityForm, setActivityForm] = useState({
    id: '',
    roleId: '',
    title: '',
    frequency: 'ROUTINE' as 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL',
    description: '',
    isCritical: false,
    isActive: true,
  })

  const [workScheduleForm, setWorkScheduleForm] = useState({
    id: '',
    establishmentId: '',
    name: '',
    scheduleType: 'FIXED' as 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER',
    weeklyHours: '',
    shiftPattern: '',
    description: '',
    isActive: true,
  })

  const sectorMutation = useMutation({
    mutationFn: async () => {
      if (sectorForm.id) {
        return updateSstSector(sectorForm.id, {
          code: sectorForm.code,
          name: sectorForm.name,
          description: sectorForm.description.trim() ? sectorForm.description : null,
        })
      }

      return createSstSector({
        clientId,
        establishmentId: sectorForm.establishmentId,
        code: sectorForm.code,
        name: sectorForm.name,
        description: sectorForm.description.trim() ? sectorForm.description : undefined,
        isActive: sectorForm.isActive,
      })
    },
    onSuccess() {
      setFeedback(sectorForm.id ? 'Setor atualizado com sucesso.' : 'Setor cadastrado com sucesso.')
      setError(null)
      setSectorForm({
        id: '',
        establishmentId: '',
        code: '',
        name: '',
        description: '',
        isActive: true,
      })
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const workEnvironmentMutation = useMutation({
    mutationFn: async () => {
      if (workEnvironmentForm.id) {
        return updateSstWorkEnvironment(workEnvironmentForm.id, {
          sectorId: workEnvironmentForm.sectorId,
          code: workEnvironmentForm.code,
          name: workEnvironmentForm.name,
          description: workEnvironmentForm.description.trim() ? workEnvironmentForm.description : null,
          indoorOutdoorType: workEnvironmentForm.indoorOutdoorType,
        })
      }

      return createSstWorkEnvironment({
        clientId,
        establishmentId: workEnvironmentForm.establishmentId,
        sectorId: workEnvironmentForm.sectorId,
        code: workEnvironmentForm.code,
        name: workEnvironmentForm.name,
        description: workEnvironmentForm.description.trim() ? workEnvironmentForm.description : undefined,
        indoorOutdoorType: workEnvironmentForm.indoorOutdoorType,
        isActive: workEnvironmentForm.isActive,
      })
    },
    onSuccess() {
      setFeedback(
        workEnvironmentForm.id
          ? 'Ambiente de trabalho atualizado com sucesso.'
          : 'Ambiente de trabalho cadastrado com sucesso.',
      )
      setError(null)
      setWorkEnvironmentForm({
        id: '',
        establishmentId: '',
        sectorId: '',
        code: '',
        name: '',
        description: '',
        indoorOutdoorType: 'INDOOR',
        isActive: true,
      })
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const roleMutation = useMutation({
    mutationFn: async () => {
      if (roleForm.id) {
        return updateSstRole(roleForm.id, {
          title: roleForm.title,
          cboCode: roleForm.cboCode.trim() ? roleForm.cboCode : null,
          cboDescription: roleForm.cboDescription.trim() ? roleForm.cboDescription : null,
          description: roleForm.description.trim() ? roleForm.description : null,
        })
      }

      return createSstRole({
        clientId,
        title: roleForm.title,
        cboCode: roleForm.cboCode.trim() ? roleForm.cboCode : undefined,
        cboDescription: roleForm.cboDescription.trim() ? roleForm.cboDescription : undefined,
        description: roleForm.description.trim() ? roleForm.description : undefined,
        isActive: roleForm.isActive,
      })
    },
    onSuccess() {
      setFeedback(roleForm.id ? 'Cargo atualizado com sucesso.' : 'Cargo cadastrado com sucesso.')
      setError(null)
      setRoleForm({
        id: '',
        title: '',
        cboCode: '',
        cboDescription: '',
        description: '',
        isActive: true,
      })
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const activityMutation = useMutation({
    mutationFn: async () => {
      if (activityForm.id) {
        return updateSstActivity(activityForm.id, {
          roleId: activityForm.roleId,
          title: activityForm.title,
          frequency: activityForm.frequency,
          description: activityForm.description.trim() ? activityForm.description : null,
          isCritical: activityForm.isCritical,
        })
      }

      return createSstActivity({
        clientId,
        roleId: activityForm.roleId,
        title: activityForm.title,
        frequency: activityForm.frequency,
        description: activityForm.description.trim() ? activityForm.description : undefined,
        isCritical: activityForm.isCritical,
        isActive: activityForm.isActive,
      })
    },
    onSuccess() {
      setFeedback(activityForm.id ? 'Atividade atualizada com sucesso.' : 'Atividade cadastrada com sucesso.')
      setError(null)
      setActivityForm({
        id: '',
        roleId: '',
        title: '',
        frequency: 'ROUTINE',
        description: '',
        isCritical: false,
        isActive: true,
      })
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const workScheduleMutation = useMutation({
    mutationFn: async () => {
      const weeklyHours = workScheduleForm.weeklyHours.trim() ? Number(workScheduleForm.weeklyHours) : null

      if (workScheduleForm.id) {
        return updateSstWorkSchedule(workScheduleForm.id, {
          name: workScheduleForm.name,
          scheduleType: workScheduleForm.scheduleType,
          weeklyHours,
          shiftPattern: workScheduleForm.shiftPattern.trim() ? workScheduleForm.shiftPattern : null,
          description: workScheduleForm.description.trim() ? workScheduleForm.description : null,
        })
      }

      return createSstWorkSchedule({
        clientId,
        establishmentId: workScheduleForm.establishmentId,
        name: workScheduleForm.name,
        scheduleType: workScheduleForm.scheduleType,
        weeklyHours: weeklyHours ?? undefined,
        shiftPattern: workScheduleForm.shiftPattern.trim() ? workScheduleForm.shiftPattern : undefined,
        description: workScheduleForm.description.trim() ? workScheduleForm.description : undefined,
        isActive: workScheduleForm.isActive,
      })
    },
    onSuccess() {
      setFeedback(workScheduleForm.id ? 'Jornada atualizada com sucesso.' : 'Jornada cadastrada com sucesso.')
      setError(null)
      setWorkScheduleForm({
        id: '',
        establishmentId: '',
        name: '',
        scheduleType: 'FIXED',
        weeklyHours: '',
        shiftPattern: '',
        description: '',
        isActive: true,
      })
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const statusMutation = useMutation({
    mutationFn: async (input: { category: Category; id: string; nextActive: boolean }) => {
      if (input.category === 'sectors') {
        return input.nextActive ? activateSstSector(input.id) : deactivateSstSector(input.id)
      }
      if (input.category === 'work-environments') {
        return input.nextActive ? activateSstWorkEnvironment(input.id) : deactivateSstWorkEnvironment(input.id)
      }
      if (input.category === 'roles') {
        return input.nextActive ? activateSstRole(input.id) : deactivateSstRole(input.id)
      }
      if (input.category === 'activities') {
        return input.nextActive ? activateSstActivity(input.id) : deactivateSstActivity(input.id)
      }
      return input.nextActive ? activateSstWorkSchedule(input.id) : deactivateSstWorkSchedule(input.id)
    },
    onSuccess(_, variables) {
      setFeedback(variables.nextActive ? 'Registro ativado com sucesso.' : 'Registro desativado com sucesso.')
      setError(null)
      refreshAll()
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const detailMutation = useMutation({
    mutationFn: async (input: { category: Category; id: string }) => {
      if (input.category === 'sectors') {
        const response = await getSstSectorById(input.id)
        return { category: input.category, item: response.sector } as DetailState
      }
      if (input.category === 'work-environments') {
        const response = await getSstWorkEnvironmentById(input.id)
        return { category: input.category, item: response.workEnvironment } as DetailState
      }
      if (input.category === 'roles') {
        const response = await getSstRoleById(input.id)
        return { category: input.category, item: response.role } as DetailState
      }
      if (input.category === 'activities') {
        const response = await getSstActivityById(input.id)
        return { category: input.category, item: response.activity } as DetailState
      }
      const response = await getSstWorkScheduleById(input.id)
      return { category: input.category, item: response.workSchedule } as DetailState
    },
    onSuccess(data) {
      setDetail(data)
      setError(null)
    },
    onError(err) {
      setError(toApiMessage(err))
    },
  })

  const loading =
    sectorsQuery.isLoading ||
    workEnvironmentsQuery.isLoading ||
    rolesQuery.isLoading ||
    activitiesQuery.isLoading ||
    workSchedulesQuery.isLoading

  const compatibleSectors = useMemo(() => {
    if (!workEnvironmentForm.establishmentId) {
      return sectors
    }
    return sectors.filter((item) => item.establishmentId === workEnvironmentForm.establishmentId)
  }, [sectors, workEnvironmentForm.establishmentId])

  if (!canRead) {
    return (
      <Card title="Estrutura SST" subtitle="Setores, ambientes, cargos, atividades e jornadas.">
        <Alert type="error">Seu perfil nao possui permissao para visualizar Estrutura SST.</Alert>
      </Card>
    )
  }

  return (
    <Card title="Estrutura SST" subtitle="Gerencie setores, ambientes de trabalho, cargos, atividades e jornadas do cliente.">
      {feedback ? <Alert>{feedback}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${categoryButtonClass(activeCategory === 'sectors')}`} onClick={() => setActiveCategory('sectors')}>
          Setores
        </button>
        <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${categoryButtonClass(activeCategory === 'work-environments')}`} onClick={() => setActiveCategory('work-environments')}>
          Ambientes de trabalho
        </button>
        <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${categoryButtonClass(activeCategory === 'roles')}`} onClick={() => setActiveCategory('roles')}>
          Cargos
        </button>
        <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${categoryButtonClass(activeCategory === 'activities')}`} onClick={() => setActiveCategory('activities')}>
          Atividades
        </button>
        <button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${categoryButtonClass(activeCategory === 'work-schedules')}`} onClick={() => setActiveCategory('work-schedules')}>
          Jornadas
        </button>
      </div>

      {loading ? <Loading /> : null}

      {!loading && activeCategory === 'sectors' ? (
        <div className="space-y-4">
          {sectors.length === 0 ? (
            <EmptyState title="Sem setores" description="Cadastre o primeiro setor deste cliente." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Codigo</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Estabelecimento</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.code}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{establishmentById.get(item.establishmentId)?.nickname ?? item.establishmentId}</td>
                      <td className="px-3 py-2">{statusBadge(item.isActive)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => detailMutation.mutate({ category: 'sectors', id: item.id })}>
                            Detalhes
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setSectorForm({
                                    id: item.id,
                                    establishmentId: item.establishmentId,
                                    code: item.code,
                                    name: item.name,
                                    description: item.description ?? '',
                                    isActive: item.isActive,
                                  })
                                }
                              >
                                Editar
                              </Button>
                              {item.isActive ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    if (window.confirm('Confirma desativar este setor?')) {
                                      statusMutation.mutate({ category: 'sectors', id: item.id, nextActive: false })
                                    }
                                  }}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  onClick={() => statusMutation.mutate({ category: 'sectors', id: item.id, nextActive: true })}
                                >
                                  Ativar
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage ? (
            <form
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                sectorMutation.mutate()
              }}
            >
              <Select
                value={sectorForm.establishmentId}
                onChange={(event) => setSectorForm((state) => ({ ...state, establishmentId: event.target.value }))}
                required
                disabled={Boolean(sectorForm.id)}
              >
                <option value="">Selecione o estabelecimento</option>
                {activeEstablishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname || `${item.city}/${item.state}`}
                  </option>
                ))}
              </Select>
              <Input placeholder="Codigo" value={sectorForm.code} onChange={(event) => setSectorForm((state) => ({ ...state, code: event.target.value }))} required />
              <Input placeholder="Nome" value={sectorForm.name} onChange={(event) => setSectorForm((state) => ({ ...state, name: event.target.value }))} required />
              <Input placeholder="Descricao" value={sectorForm.description} onChange={(event) => setSectorForm((state) => ({ ...state, description: event.target.value }))} />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={sectorMutation.isPending || !sectorForm.establishmentId || !sectorForm.code.trim() || !sectorForm.name.trim()}>
                  {sectorMutation.isPending ? 'Salvando...' : sectorForm.id ? 'Atualizar setor' : 'Cadastrar setor'}
                </Button>
                {sectorForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setSectorForm({
                        id: '',
                        establishmentId: '',
                        code: '',
                        name: '',
                        description: '',
                        isActive: true,
                      })
                    }
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!loading && activeCategory === 'work-environments' ? (
        <div className="space-y-4">
          {workEnvironments.length === 0 ? (
            <EmptyState title="Sem ambientes de trabalho" description="Cadastre o primeiro ambiente de trabalho deste cliente." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Codigo</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Estabelecimento</th>
                    <th className="px-3 py-2">Setor</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {workEnvironments.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.code}</td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{establishmentById.get(item.establishmentId)?.nickname ?? item.establishmentId}</td>
                      <td className="px-3 py-2">{sectorById.get(item.sectorId)?.name ?? item.sectorId}</td>
                      <td className="px-3 py-2">{item.indoorOutdoorType}</td>
                      <td className="px-3 py-2">{statusBadge(item.isActive)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => detailMutation.mutate({ category: 'work-environments', id: item.id })}>
                            Detalhes
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setWorkEnvironmentForm({
                                    id: item.id,
                                    establishmentId: item.establishmentId,
                                    sectorId: item.sectorId,
                                    code: item.code,
                                    name: item.name,
                                    description: item.description ?? '',
                                    indoorOutdoorType: item.indoorOutdoorType,
                                    isActive: item.isActive,
                                  })
                                }
                              >
                                Editar
                              </Button>
                              {item.isActive ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    if (window.confirm('Confirma desativar este ambiente de trabalho?')) {
                                      statusMutation.mutate({ category: 'work-environments', id: item.id, nextActive: false })
                                    }
                                  }}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    statusMutation.mutate({ category: 'work-environments', id: item.id, nextActive: true })
                                  }
                                >
                                  Ativar
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage ? (
            <form
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                workEnvironmentMutation.mutate()
              }}
            >
              <Select
                value={workEnvironmentForm.establishmentId}
                onChange={(event) =>
                  setWorkEnvironmentForm((state) => ({
                    ...state,
                    establishmentId: event.target.value,
                    sectorId: state.establishmentId === event.target.value ? state.sectorId : '',
                  }))
                }
                required
                disabled={Boolean(workEnvironmentForm.id)}
              >
                <option value="">Selecione o estabelecimento</option>
                {activeEstablishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname || `${item.city}/${item.state}`}
                  </option>
                ))}
              </Select>

              <Select
                value={workEnvironmentForm.sectorId}
                onChange={(event) => setWorkEnvironmentForm((state) => ({ ...state, sectorId: event.target.value }))}
                required
              >
                <option value="">Selecione o setor</option>
                {compatibleSectors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
              </Select>

              <Input placeholder="Codigo" value={workEnvironmentForm.code} onChange={(event) => setWorkEnvironmentForm((state) => ({ ...state, code: event.target.value }))} required />
              <Input placeholder="Nome" value={workEnvironmentForm.name} onChange={(event) => setWorkEnvironmentForm((state) => ({ ...state, name: event.target.value }))} required />

              <Select
                value={workEnvironmentForm.indoorOutdoorType}
                onChange={(event) =>
                  setWorkEnvironmentForm((state) => ({
                    ...state,
                    indoorOutdoorType: event.target.value as 'INDOOR' | 'OUTDOOR' | 'MIXED',
                  }))
                }
              >
                <option value="INDOOR">INDOOR</option>
                <option value="OUTDOOR">OUTDOOR</option>
                <option value="MIXED">MIXED</option>
              </Select>
              <Input placeholder="Descricao" value={workEnvironmentForm.description} onChange={(event) => setWorkEnvironmentForm((state) => ({ ...state, description: event.target.value }))} />

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    workEnvironmentMutation.isPending ||
                    !workEnvironmentForm.establishmentId ||
                    !workEnvironmentForm.sectorId ||
                    !workEnvironmentForm.code.trim() ||
                    !workEnvironmentForm.name.trim()
                  }
                >
                  {workEnvironmentMutation.isPending
                    ? 'Salvando...'
                    : workEnvironmentForm.id
                      ? 'Atualizar ambiente'
                      : 'Cadastrar ambiente'}
                </Button>
                {workEnvironmentForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setWorkEnvironmentForm({
                        id: '',
                        establishmentId: '',
                        sectorId: '',
                        code: '',
                        name: '',
                        description: '',
                        indoorOutdoorType: 'INDOOR',
                        isActive: true,
                      })
                    }
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!loading && activeCategory === 'roles' ? (
        <div className="space-y-4">
          {roles.length === 0 ? (
            <EmptyState title="Sem cargos" description="Cadastre o primeiro cargo deste cliente." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Titulo</th>
                    <th className="px-3 py-2">CBO</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.title}</td>
                      <td className="px-3 py-2">{item.cboCode ?? '-'}</td>
                      <td className="px-3 py-2">{statusBadge(item.isActive)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => detailMutation.mutate({ category: 'roles', id: item.id })}>
                            Detalhes
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setRoleForm({
                                    id: item.id,
                                    title: item.title,
                                    cboCode: item.cboCode ?? '',
                                    cboDescription: item.cboDescription ?? '',
                                    description: item.description ?? '',
                                    isActive: item.isActive,
                                  })
                                }
                              >
                                Editar
                              </Button>
                              {item.isActive ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    if (window.confirm('Confirma desativar este cargo?')) {
                                      statusMutation.mutate({ category: 'roles', id: item.id, nextActive: false })
                                    }
                                  }}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  onClick={() => statusMutation.mutate({ category: 'roles', id: item.id, nextActive: true })}
                                >
                                  Ativar
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage ? (
            <form
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                roleMutation.mutate()
              }}
            >
              <Input placeholder="Titulo" value={roleForm.title} onChange={(event) => setRoleForm((state) => ({ ...state, title: event.target.value }))} required />
              <Input placeholder="Codigo CBO" value={roleForm.cboCode} onChange={(event) => setRoleForm((state) => ({ ...state, cboCode: event.target.value }))} />
              <Input placeholder="Descricao CBO" value={roleForm.cboDescription} onChange={(event) => setRoleForm((state) => ({ ...state, cboDescription: event.target.value }))} />
              <Input placeholder="Descricao" value={roleForm.description} onChange={(event) => setRoleForm((state) => ({ ...state, description: event.target.value }))} />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={roleMutation.isPending || !roleForm.title.trim()}>
                  {roleMutation.isPending ? 'Salvando...' : roleForm.id ? 'Atualizar cargo' : 'Cadastrar cargo'}
                </Button>
                {roleForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setRoleForm({
                        id: '',
                        title: '',
                        cboCode: '',
                        cboDescription: '',
                        description: '',
                        isActive: true,
                      })
                    }
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!loading && activeCategory === 'activities' ? (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <EmptyState title="Sem atividades" description="Cadastre a primeira atividade deste cliente." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Titulo</th>
                    <th className="px-3 py-2">Cargo</th>
                    <th className="px-3 py-2">Frequencia</th>
                    <th className="px-3 py-2">Critica</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.title}</td>
                      <td className="px-3 py-2">{roleById.get(item.roleId)?.title ?? item.roleId}</td>
                      <td className="px-3 py-2">{item.frequency}</td>
                      <td className="px-3 py-2">{item.isCritical ? 'Sim' : 'Nao'}</td>
                      <td className="px-3 py-2">{statusBadge(item.isActive)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => detailMutation.mutate({ category: 'activities', id: item.id })}>
                            Detalhes
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setActivityForm({
                                    id: item.id,
                                    roleId: item.roleId,
                                    title: item.title,
                                    frequency: item.frequency,
                                    description: item.description ?? '',
                                    isCritical: item.isCritical,
                                    isActive: item.isActive,
                                  })
                                }
                              >
                                Editar
                              </Button>
                              {item.isActive ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    if (window.confirm('Confirma desativar esta atividade?')) {
                                      statusMutation.mutate({ category: 'activities', id: item.id, nextActive: false })
                                    }
                                  }}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    statusMutation.mutate({ category: 'activities', id: item.id, nextActive: true })
                                  }
                                >
                                  Ativar
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage ? (
            <form
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                activityMutation.mutate()
              }}
            >
              <Select
                value={activityForm.roleId}
                onChange={(event) => setActivityForm((state) => ({ ...state, roleId: event.target.value }))}
                required
              >
                <option value="">Selecione o cargo</option>
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
              <Input placeholder="Titulo" value={activityForm.title} onChange={(event) => setActivityForm((state) => ({ ...state, title: event.target.value }))} required />
              <Select
                value={activityForm.frequency}
                onChange={(event) =>
                  setActivityForm((state) => ({
                    ...state,
                    frequency: event.target.value as 'ROUTINE' | 'NON_ROUTINE' | 'EVENTUAL',
                  }))
                }
              >
                <option value="ROUTINE">ROUTINE</option>
                <option value="NON_ROUTINE">NON_ROUTINE</option>
                <option value="EVENTUAL">EVENTUAL</option>
              </Select>
              <Input placeholder="Descricao" value={activityForm.description} onChange={(event) => setActivityForm((state) => ({ ...state, description: event.target.value }))} />

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={activityForm.isCritical}
                  onChange={(event) => setActivityForm((state) => ({ ...state, isCritical: event.target.checked }))}
                />
                Atividade critica
              </label>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={activityMutation.isPending || !activityForm.roleId || !activityForm.title.trim()}
                >
                  {activityMutation.isPending ? 'Salvando...' : activityForm.id ? 'Atualizar atividade' : 'Cadastrar atividade'}
                </Button>
                {activityForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setActivityForm({
                        id: '',
                        roleId: '',
                        title: '',
                        frequency: 'ROUTINE',
                        description: '',
                        isCritical: false,
                        isActive: true,
                      })
                    }
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {!loading && activeCategory === 'work-schedules' ? (
        <div className="space-y-4">
          {workSchedules.length === 0 ? (
            <EmptyState title="Sem jornadas" description="Cadastre a primeira jornada deste cliente." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Estabelecimento</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Horas semanais</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {workSchedules.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{establishmentById.get(item.establishmentId)?.nickname ?? item.establishmentId}</td>
                      <td className="px-3 py-2">{item.scheduleType}</td>
                      <td className="px-3 py-2">{item.weeklyHours ?? '-'}</td>
                      <td className="px-3 py-2">{statusBadge(item.isActive)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => detailMutation.mutate({ category: 'work-schedules', id: item.id })}>
                            Detalhes
                          </Button>
                          {canManage ? (
                            <>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setWorkScheduleForm({
                                    id: item.id,
                                    establishmentId: item.establishmentId,
                                    name: item.name,
                                    scheduleType: item.scheduleType,
                                    weeklyHours: item.weeklyHours === null ? '' : String(item.weeklyHours),
                                    shiftPattern: item.shiftPattern ?? '',
                                    description: item.description ?? '',
                                    isActive: item.isActive,
                                  })
                                }
                              >
                                Editar
                              </Button>
                              {item.isActive ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    if (window.confirm('Confirma desativar esta jornada?')) {
                                      statusMutation.mutate({ category: 'work-schedules', id: item.id, nextActive: false })
                                    }
                                  }}
                                >
                                  Desativar
                                </Button>
                              ) : (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    statusMutation.mutate({ category: 'work-schedules', id: item.id, nextActive: true })
                                  }
                                >
                                  Ativar
                                </Button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage ? (
            <form
              className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                workScheduleMutation.mutate()
              }}
            >
              <Select
                value={workScheduleForm.establishmentId}
                onChange={(event) => setWorkScheduleForm((state) => ({ ...state, establishmentId: event.target.value }))}
                required
                disabled={Boolean(workScheduleForm.id)}
              >
                <option value="">Selecione o estabelecimento</option>
                {activeEstablishments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nickname || `${item.city}/${item.state}`}
                  </option>
                ))}
              </Select>

              <Input placeholder="Nome" value={workScheduleForm.name} onChange={(event) => setWorkScheduleForm((state) => ({ ...state, name: event.target.value }))} required />

              <Select
                value={workScheduleForm.scheduleType}
                onChange={(event) =>
                  setWorkScheduleForm((state) => ({
                    ...state,
                    scheduleType: event.target.value as 'FIXED' | 'SHIFT' | 'FLEX' | 'OTHER',
                  }))
                }
              >
                <option value="FIXED">FIXED</option>
                <option value="SHIFT">SHIFT</option>
                <option value="FLEX">FLEX</option>
                <option value="OTHER">OTHER</option>
              </Select>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="168"
                placeholder="Horas semanais"
                value={workScheduleForm.weeklyHours}
                onChange={(event) => setWorkScheduleForm((state) => ({ ...state, weeklyHours: event.target.value }))}
              />

              <Input placeholder="Padrao de turno" value={workScheduleForm.shiftPattern} onChange={(event) => setWorkScheduleForm((state) => ({ ...state, shiftPattern: event.target.value }))} />
              <Input placeholder="Descricao" value={workScheduleForm.description} onChange={(event) => setWorkScheduleForm((state) => ({ ...state, description: event.target.value }))} />

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={
                    workScheduleMutation.isPending ||
                    !workScheduleForm.establishmentId ||
                    !workScheduleForm.name.trim()
                  }
                >
                  {workScheduleMutation.isPending
                    ? 'Salvando...'
                    : workScheduleForm.id
                      ? 'Atualizar jornada'
                      : 'Cadastrar jornada'}
                </Button>
                {workScheduleForm.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setWorkScheduleForm({
                        id: '',
                        establishmentId: '',
                        name: '',
                        scheduleType: 'FIXED',
                        weeklyHours: '',
                        shiftPattern: '',
                        description: '',
                        isActive: true,
                      })
                    }
                  >
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {detail ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Detalhes do registro selecionado</p>
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Fechar detalhes
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
            {JSON.stringify(detail.item, null, 2)}
          </pre>
        </div>
      ) : null}
    </Card>
  )
}
