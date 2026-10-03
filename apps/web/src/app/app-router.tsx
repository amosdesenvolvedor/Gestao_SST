import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { AdminLayout } from '@/layouts/admin-layout'
import { AccessDeniedPage } from '@/routes/access-denied-page'
import { DashboardPage } from '@/routes/dashboard-page'
import { NotFoundPage } from '@/routes/not-found-page'
import { PlaceholderPage } from '@/routes/placeholder-page'
import { ProtectedRoute } from '@/routes/protected-route'
import { RoleRoute } from '@/routes/role-route'

function PrivateLayout() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<PlaceholderPage title="Clientes" />} />
          <Route path="/contratos" element={<PlaceholderPage title="Contratos" />} />
          <Route path="/financeiro" element={<PlaceholderPage title="Financeiro" />} />
          <Route path="/gestao-sst" element={<PlaceholderPage title="Gestao SST" />} />
          <Route path="/documentos" element={<PlaceholderPage title="Documentos" />} />
          <Route path="/profissionais" element={<PlaceholderPage title="Profissionais" />} />
          <Route path="/relatorios" element={<PlaceholderPage title="Relatorios" />} />
          <Route
            path="/configuracoes"
            element={
              <RoleRoute roles={['SUPER_ADMIN', 'ADMIN']}>
                <PlaceholderPage title="Configuracoes" />
              </RoleRoute>
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