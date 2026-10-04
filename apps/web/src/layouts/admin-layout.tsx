import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Permission } from '@gestao-sst/shared'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/button'
import { useAuth } from '@/features/auth/auth-context'

const items = [
  { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.read' as Permission },
  { to: '/clientes', label: 'Clientes', permission: 'clients.read' as Permission },
  { to: '/contratos', label: 'Contratos', permission: 'contracts.read' as Permission },
  { to: '/financeiro', label: 'Financeiro', permission: 'finance.read' as Permission },
  { to: '/gestao-sst', label: 'Gestao SST' },
  { to: '/documentos', label: 'Documentos' },
  { to: '/profissionais', label: 'Profissionais', permission: 'professionals.read' as Permission },
  { to: '/relatorios', label: 'Relatorios' },
  { to: '/configuracoes/usuarios', label: 'Usuarios', permission: 'users.read' as Permission },
  { to: '/configuracoes/servicos', label: 'Servicos', permission: 'serviceCatalog.read' as Permission },
]

export function AdminLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { user, logout, can } = useAuth()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-300 bg-slate-200 p-4 shadow-panel transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 rounded-xl border border-slate-600 bg-slate-800 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-slate-300">GESTAO SST</p>
          <p className="mt-1 text-lg font-semibold">Plataforma Integrada</p>
          <p className="text-sm text-slate-300">Saude e Seguranca do Trabalho</p>
        </div>

        <nav className="space-y-1">
          {items
            .filter((item) => !item.permission || can(item.permission))
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-700 hover:bg-slate-300'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
            ))}
        </nav>
      </aside>

      {open ? <button className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-300 bg-slate-100/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="lg:hidden" onClick={() => setOpen((value) => !value)}>
                Menu
              </Button>
              <Link to="/dashboard" className="text-sm font-semibold text-slate-800">
                Painel Administrativo
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{user?.name || user?.email}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{user?.role}</p>
              </div>
              <Button variant="secondary" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}