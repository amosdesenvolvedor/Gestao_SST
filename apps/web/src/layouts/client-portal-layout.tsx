import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/button'
import { IconBell, IconBuilding, IconLogout, IconMenu, IconShield } from '@/components/icons'
import { Loading } from '@/components/loading'
import { Select } from '@/components/select'
import { useAuth } from '@/features/auth/auth-context'
import { getClientPortalContext } from '@/services/client-portal.service'

const navItems = [
  { to: '/portal', label: 'Central de Servicos' },
  { to: '/portal/servicos', label: 'Servicos' },
  { to: '/portal/financeiro', label: 'Financeiro' },
  { to: '/portal/documentos', label: 'Documentos' },
  { to: '/portal/empresa', label: 'Empresa' },
]

export function ClientPortalLayout({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [clientChanging, setClientChanging] = useState(false)
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const selectedClientId = searchParams.get('clientId') ?? undefined
  const selectedEstablishmentId = searchParams.get('establishmentId') ?? undefined
  const querySuffix = searchParams.toString() ? `?${searchParams.toString()}` : ''

  const contextQuery = useQuery({
    queryKey: ['client-portal-context', selectedClientId],
    queryFn: () => getClientPortalContext(selectedClientId),
  })

  const context = contextQuery.data

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleClientChange = (clientId: string) => {
    setClientChanging(true)
    const next = new URLSearchParams(searchParams)
    next.set('clientId', clientId)
    next.delete('establishmentId')
    setSearchParams(next, { replace: true })
    setTimeout(() => setClientChanging(false), 80)
  }

  const handleEstablishmentChange = (establishmentId: string) => {
    const next = new URLSearchParams(searchParams)

    if (!establishmentId) {
      next.delete('establishmentId')
    } else {
      next.set('establishmentId', establishmentId)
    }

    setSearchParams(next, { replace: true })
  }

  if (contextQuery.isLoading || !context) {
    return (
      <div className="min-h-screen bg-[#F4F5F6] px-4 py-8">
        <Loading />
      </div>
    )
  }

  const memberships = context.memberships
  const establishments = context.establishments
  const currentClient = context.currentClient

  return (
    <div className="min-h-screen bg-[#F4F5F6] lg:grid lg:grid-cols-[280px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[280px] border-r border-[#D7DADF] bg-[#2D3035] p-4 text-slate-100 shadow-panel transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 rounded-2xl border border-[#41454B] bg-[#26292E] p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">GESTAO SST</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-white">
              <IconShield className="h-5 w-5" />
            Portal do Cliente
          </p>
          <p className="mt-1 text-sm text-slate-300">Experiencia visual de servicos contratados</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`${item.to}${querySuffix}`}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-[#41454B] text-white' : 'text-slate-300 hover:bg-[#383B41]'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open ? <button className="fixed inset-0 z-20 bg-slate-900/25 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-[#D7DADF] bg-[#ECEDEF]/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="lg:hidden" onClick={() => setOpen((state) => !state)}>
                <IconMenu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Portal do Cliente</p>
                <p className="text-sm font-semibold text-[#202327]">{currentClient.tradeName || currentClient.legalName}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {memberships.length > 1 ? (
                <Select
                  value={currentClient.id}
                  onChange={(event) => handleClientChange(event.target.value)}
                  disabled={clientChanging}
                  aria-label="Selecionar empresa"
                  className="min-w-[220px] bg-white"
                >
                  {memberships.map((membership) => (
                    <option key={membership.clientId} value={membership.clientId}>
                      {membership.client.tradeName || membership.client.legalName}
                    </option>
                  ))}
                </Select>
              ) : null}

              {establishments.length > 1 ? (
                <Select
                  value={selectedEstablishmentId ?? ''}
                  onChange={(event) => handleEstablishmentChange(event.target.value)}
                  aria-label="Selecionar estabelecimento"
                  className="min-w-[200px] bg-white"
                >
                  <option value="">Todas as unidades</option>
                  {establishments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.isHeadquarters ? 'Matriz' : item.nickname || `${item.city}/${item.state}`}
                    </option>
                  ))}
                </Select>
              ) : null}

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#D7DADF] bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Notificacoes (em breve)"
                title="Notificacoes (em breve)"
              >
                <IconBell className="h-4 w-4" />
              </button>

              <div className="hidden rounded-lg border border-[#D7DADF] bg-white px-3 py-2 text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name || user?.email}</p>
                <p className="text-xs uppercase text-slate-500">Cliente</p>
              </div>

              <Button variant="secondary" onClick={handleLogout}>
                <IconLogout className="mr-1 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>

        <footer className="mx-auto flex w-full max-w-7xl items-center justify-between border-t border-[#D7DADF] px-4 py-4 text-xs text-slate-500 lg:px-8">
          <p className="inline-flex items-center gap-2">
            <IconBuilding className="h-4 w-4" />
            Gestao SST | Portal visual de servicos contratados
          </p>
          <Link to="/portal/empresa" className="font-semibold text-slate-600 hover:text-slate-900">
            Dados da empresa
          </Link>
        </footer>
      </div>
    </div>
  )
}
