import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { useAuth } from '@/features/auth/auth-context'
import { AdminLayout } from '@/layouts/admin-layout'
import { ClientPortalLayout } from '@/layouts/client-portal-layout'
import { AccessDeniedPage } from '@/routes/access-denied-page'
import { ClientPortalCompanyPage } from '@/routes/client-portal-company-page'
import { ClientPortalDocumentsPage } from '@/routes/client-portal-documents-page'
import { ClientPortalHomePage } from '@/routes/client-portal-home-page'
import { ClientPortalServicePage } from '@/routes/client-portal-service-page'
import { ClientPortalServicesPage } from '@/routes/client-portal-services-page'
import { DashboardPage } from '@/routes/dashboard-page'
import { NotFoundPage } from '@/routes/not-found-page'
import { PermissionRoute } from '@/routes/permission-route'
import { ClientDetailPage } from '@/routes/client-detail-page'
import { ClientsPage } from '@/routes/clients-page'
import { ContractDetailPage } from '@/routes/contract-detail-page'
import { ContractsPage } from '@/routes/contracts-page'
import { PlaceholderPage } from '@/routes/placeholder-page'
import { ProfessionalsPage } from '@/routes/professionals-page'
import { ProtectedRoute } from '@/routes/protected-route'
import { ServiceCatalogPage } from '@/routes/service-catalog-page'
import { UsersPage } from '@/routes/users-page'

function AdminPrivateLayout() {
  const { user } = useAuth()

  if (user?.role === 'CLIENT') {
    return <Navigate to="/portal" replace />
  }

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
          <Route
            path="/contratos"
            element={
              <PermissionRoute permissions={['contracts.read']}>
                <ContractsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/contratos/:id"
            element={
              <PermissionRoute permissions={['contracts.read']}>
                <ContractDetailPage />
              </PermissionRoute>
            }
          />
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
          <Route
            path="/configuracoes/servicos"
            element={
              <PermissionRoute permissions={['serviceCatalog.read']}>
                <ServiceCatalogPage />
              </PermissionRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  )
}

function ClientPrivateLayout() {
  const { user } = useAuth()

  if (user && user.role !== 'CLIENT') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <ProtectedRoute>
      <PermissionRoute permissions={['clientPortal.access']}>
        <ClientPortalLayout>
          <Routes>
            <Route path="/portal" element={<ClientPortalHomePage />} />
            <Route path="/portal/servicos" element={<ClientPortalServicesPage />} />
            <Route path="/portal/servicos/:serviceCode" element={<ClientPortalServicePage />} />
            <Route path="/portal/documentos" element={<ClientPortalDocumentsPage />} />
            <Route path="/portal/empresa" element={<ClientPortalCompanyPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ClientPortalLayout>
      </PermissionRoute>
    </ProtectedRoute>
  )
}

function RoleAwareRoot() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={user.role === 'CLIENT' ? '/portal' : '/dashboard'} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        <Route path="/" element={<RoleAwareRoot />} />
        <Route path="/portal/*" element={<ClientPrivateLayout />} />
        <Route path="/*" element={<AdminPrivateLayout />} />
      </Routes>
    </BrowserRouter>
  )
}