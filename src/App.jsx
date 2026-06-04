import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { canViewModule } from './hooks/usePerms';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './queryClient';
import useAuthStore from './store/authStore';
import useLangStore from './store/langStore';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './components/Layout/HomePage';
import LoginPage from './components/Auth/LoginPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import ModulePlaceholder from './components/Layout/ModulePlaceholder';
import CustomersPage from './components/Customers/CustomersPage';
import CustomerDetailPage from './components/Customers/CustomerDetailPage';
import CustomerRelationsPage from './components/Customers/CustomerRelationsPage';
import CustomerServicesDashboard from './components/Dashboards/CustomerServicesDashboard';
import ContactsPage from './components/Contacts/ContactsPage';
import SitesPage from './components/Sites/SitesPage';
import DealsPage from './components/Deals/DealsPage';
import ProductsPage from './components/Products/ProductsPage';
import CustItemsPage from './components/CustItems/CustItemsPage';
import ServiceAgreementsPage from './components/ServiceAgreements/ServiceAgreementsPage';
import DataManagementPage from './components/DataManagement/DataManagementPage';
import QuotesPage from './components/Quotes/QuotesPage';
import QuoteEditor from './components/Quotes/QuoteEditor';
import QuoteTemplates from './components/Quotes/QuoteTemplates';
import OrdersPage from './components/Orders/OrdersPage';
import DeliveryNotesPage from './components/DeliveryNotes/DeliveryNotesPage';
import AIAssistantPage from './components/AI/AIAssistantPage';
import ReportsHub from './components/Reports/ReportsHub';
import UsersPage from './components/Users/UsersPage';
import TasksPage from './components/Tasks/TasksPage';
import TasksDashboard from './components/Tasks/TasksDashboard';
import TasksCalendar from './components/Tasks/TasksCalendar';
import FormsPage from './components/Forms/FormsPage';
import FormBuilderPage from './components/Forms/FormBuilderPage';
import FormPreviewPage from './components/Forms/FormPreviewPage';
import SubmissionsPage from './components/Forms/SubmissionsPage';
import PublicFormPage from './components/Forms/PublicFormPage';
import AttendancePage from './components/Attendance/AttendancePage';
import TaskSubmissionsReport from './components/Reports/TaskSubmissionsReport';
import BulkUpdatePage from './pages/BulkUpdatePage';
import DashboardsPage from './components/Dashboards/DashboardsPage';
import DashboardBuilder from './components/Dashboards/DashboardBuilder';
import LeadsPage from './components/Leads/LeadsPage';
import PlatformLoginPage from './components/Platform/PlatformLoginPage';
import PlatformLayout from './components/Platform/PlatformLayout';
import PlatformGuard from './components/Platform/PlatformGuard';
import TenantsListPage from './components/Platform/TenantsListPage';
import TenantUsersPage from './components/Platform/TenantUsersPage';


function ModuleGuard({ moduleId, children }) {
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  if (isLoading) return null;
  if (!canViewModule(user, moduleId)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
        <i className="ti ti-lock" style={{ fontSize: 48 }} />
        <h3 style={{ margin: 0, color: 'var(--text-2)' }}>אין הרשאת גישה</h3>
        <p style={{ fontSize: 13, margin: 0 }}>אין לך הרשאה לצפות במודול זה. פנה למנהל המערכת.</p>
      </div>
    );
  }
  return children;
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--accent-light)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontWeight: 800, fontSize: 20,
          }}>B</div>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Forces full remount of all protected routes when tenant changes,
// wiping every component's local state and React Query cache.
function TenantIsolationBoundary({ children }) {
  const tenantId = useAuthStore(s => s.user?.tenantId ?? s.impersonating?.tenantId ?? 'none');
  return <div key={tenantId} style={{ display: 'contents' }}>{children}</div>;
}

export default function App() {
  const tryRestore = useAuthStore(s => s.tryRestore);
  const initLang = useLangStore(s => s.initLang);

  useEffect(() => {
    tryRestore();
    initLang();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected */}
          <Route
            element={
              <TenantIsolationBoundary>
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              </TenantIsolationBoundary>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="customers" element={<ModuleGuard moduleId="customers"><CustomersPage /></ModuleGuard>} />
            <Route path="customers/:id" element={<ModuleGuard moduleId="customers"><CustomerDetailPage /></ModuleGuard>} />
            <Route path="customers/:id/relations" element={<ModuleGuard moduleId="customers"><CustomerRelationsPage /></ModuleGuard>} />
            <Route path="customer-services" element={<CustomerServicesDashboard />} />
            <Route path="contacts" element={<ModuleGuard moduleId="contacts"><ContactsPage /></ModuleGuard>} />
            <Route path="sites" element={<ModuleGuard moduleId="sites"><SitesPage /></ModuleGuard>} />
            <Route path="service-agreements" element={<ModuleGuard moduleId="serviceagreements"><ServiceAgreementsPage /></ModuleGuard>} />
            <Route path="cust-items" element={<ModuleGuard moduleId="custitems"><CustItemsPage /></ModuleGuard>} />
            <Route path="products" element={<ModuleGuard moduleId="products"><ProductsPage /></ModuleGuard>} />
            <Route path="quotes" element={<ModuleGuard moduleId="quotes"><QuotesPage /></ModuleGuard>} />
            <Route path="quotes/:id/edit" element={<ModuleGuard moduleId="quotes"><QuoteEditor /></ModuleGuard>} />
            <Route path="quotes/new" element={<ModuleGuard moduleId="quotes"><QuoteEditor /></ModuleGuard>} />
            <Route path="quotes/templates" element={<ModuleGuard moduleId="quotes"><QuoteTemplates /></ModuleGuard>} />
            <Route path="orders" element={<ModuleGuard moduleId="orders"><OrdersPage /></ModuleGuard>} />
            <Route path="delivery-notes" element={<ModuleGuard moduleId="deliverynotes"><DeliveryNotesPage /></ModuleGuard>} />
            <Route path="deals" element={<ModuleGuard moduleId="deals"><DealsPage /></ModuleGuard>} />
            <Route path="leads" element={<ModuleGuard moduleId="leads"><LeadsPage /></ModuleGuard>} />
            <Route path="data" element={<ModuleGuard moduleId="datamanagement"><DataManagementPage /></ModuleGuard>} />
            <Route path="ai" element={<ModuleGuard moduleId="ai"><AIAssistantPage /></ModuleGuard>} />
            <Route path="reports" element={<ModuleGuard moduleId="reports"><ReportsHub /></ModuleGuard>} />
            <Route path="users" element={<UsersPage />} />
            <Route path="tasks" element={<ModuleGuard moduleId="tasks"><TasksPage /></ModuleGuard>} />
            <Route path="tasks/dashboard" element={<ModuleGuard moduleId="tasks"><TasksDashboard /></ModuleGuard>} />
            <Route path="tasks/calendar" element={<ModuleGuard moduleId="tasks"><TasksCalendar /></ModuleGuard>} />
            <Route path="forms" element={<ModuleGuard moduleId="forms"><FormsPage /></ModuleGuard>} />
            <Route path="forms/:id/submissions" element={<ModuleGuard moduleId="forms"><SubmissionsPage /></ModuleGuard>} />
            <Route path="attendance" element={<ModuleGuard moduleId="attendance"><AttendancePage /></ModuleGuard>} />
            <Route path="tasks/submissions-report" element={<ModuleGuard moduleId="taskreport"><TaskSubmissionsReport /></ModuleGuard>} />
            <Route path="bulk-update" element={<ModuleGuard moduleId="bulkupdate"><BulkUpdatePage /></ModuleGuard>} />
            <Route path="dashboards" element={<ModuleGuard moduleId="dashboards"><DashboardsPage /></ModuleGuard>} />
            <Route path="dashboards/:id" element={<ModuleGuard moduleId="dashboards"><DashboardBuilder /></ModuleGuard>} />
          </Route>

          {/* Form Builder — full-screen, NO MainLayout sidebar */}
          <Route
            path="/forms/:id/edit"
            element={
              <ProtectedRoute>
                <FormBuilderPage />
              </ProtectedRoute>
            }
          />
          {/* Form Preview — full-screen, public-feeling */}
          <Route
            path="/forms/:id/preview"
            element={
              <ProtectedRoute>
                <FormPreviewPage />
              </ProtectedRoute>
            }
          />

          {/* Public Form — no login required */}
          <Route path="/public/forms/:id" element={<PublicFormPage />} />

          {/* Platform Admin */}
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route
            path="/platform"
            element={
              <PlatformGuard>
                <PlatformLayout />
              </PlatformGuard>
            }
          >
            <Route index element={<Navigate to="/platform/tenants" replace />} />
            <Route path="tenants" element={<TenantsListPage />} />
            <Route path="tenants/:tenantId/users" element={<TenantUsersPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
