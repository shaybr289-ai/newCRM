import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/authStore';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './components/Layout/HomePage';
import LoginPage from './components/Auth/LoginPage';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

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

export default function App() {
  const tryRestore = useAuthStore(s => s.tryRestore);

  useEffect(() => {
    tryRestore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/relations" element={<CustomerRelationsPage />} />
            <Route path="customer-services" element={<CustomerServicesDashboard />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="service-agreements" element={<ServiceAgreementsPage />} />
            <Route path="cust-items" element={<CustItemsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="quotes/:id/edit" element={<QuoteEditor />} />
            <Route path="quotes/new" element={<QuoteEditor />} />
            <Route path="quotes/templates" element={<QuoteTemplates />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="delivery-notes" element={<DeliveryNotesPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="data" element={<DataManagementPage />} />
            <Route path="ai" element={<AIAssistantPage />} />
            <Route path="reports" element={<ReportsHub />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/dashboard" element={<TasksDashboard />} />
            <Route path="tasks/calendar" element={<TasksCalendar />} />
            <Route path="forms" element={<FormsPage />} />
            <Route path="forms/:id/submissions" element={<SubmissionsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="tasks/submissions-report" element={<TaskSubmissionsReport />} />
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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
