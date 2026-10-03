import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { AdminLayout } from '@/layouts/admin-layout'
import { AccessDeniedPage } from '@/routes/access-denied-page'
import { DashboardPage } from '@/routes/dashboard-page'
import { NotFoundPage } from '@/routes/not-found-page'
import { PermissionRoute } from '@/routes/permission-route'
import { ClientDetailPage } from '@/routes/client-detail-page'
import { ClientsPage } from '@/routes/clients-page'
import { PlaceholderPage } from '@/routes/placeholder-page'
import { ProfessionalsPage } from '@/routes/professionals-page'
import { ProtectedRoute } from '@/routes/protected-route'
import { UsersPage } from '@/routes/users-page'

function PrivateLayout() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/clientes"
            element={
              <PermissionRoute permissions={['clients.read']}>
                <ClientsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/clientes/:id"
            element={
              <PermissionRoute permissions={['clients.read']}>
                <ClientDetailPage />
              </PermissionRoute>
            }
          />
          <Route path="/contratos" element={<PlaceholderPage title="Contratos" />} />
          <Route path="/financeiro" element={<PlaceholderPage title="Financeiro" />} />
          <Route path="/gestao-sst" element={<PlaceholderPage title="Gestao SST" />} />
          <Route path="/documentos" element={<PlaceholderPage title="Documentos" />} />
          <Route
            path="/profissionais"
            element={
              <PermissionRoute permissions={['professionals.read']}>
                <ProfessionalsPage />
              </PermissionRoute>
            }
          />
          <Route path="/relatorios" element={<PlaceholderPage title="Relatorios" />} />
          <Route path="/configuracoes" element={<Navigate to="/configuracoes/usuarios" replace />} />
          <Route
            path="/configuracoes/usuarios"
            element={
              <PermissionRoute permissions={['users.read']}>
                <UsersPage />
              </PermissionRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/*" element={<PrivateLayout />} />
      </Routes>
    </BrowserRouter>
  )
}