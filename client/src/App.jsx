import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import HomePage           from './pages/HomePage';
import AboutPage          from './pages/AboutPage';
import EventsPage         from './pages/EventsPage';
import MembershipPage     from './pages/MembershipPage';
import SponsorshipPage    from './pages/SponsorshipPage';
import DonationPage       from './pages/DonationPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage  from './pages/PaymentCancelPage';

import { AdminAuthProvider } from './context/AdminAuthContext';
import { MemberAuthProvider } from './context/MemberAuthContext';
import ProtectedAdminRoute from './routes/ProtectedAdminRoute';
import ProtectedMemberRoute from './routes/ProtectedMemberRoute';
import AdminLayout from './layouts/AdminLayout';
import DashboardLayout from './layouts/DashboardLayout';

import AdminLoginPage          from './pages/admin/LoginPage';
import AdminForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import AdminResetPasswordPage  from './pages/admin/ResetPasswordPage';
import AdminDashboardPage      from './pages/admin/DashboardPage';
import AdminMembersPage           from './pages/admin/MembersPage';
import AdminMemberDetailPage      from './pages/admin/MemberDetailPage';
import AdminMembershipTiersPage   from './pages/admin/MembershipTiersPage';
import AdminEventsPage            from './pages/admin/EventsPage';
import AdminEventFormPage         from './pages/admin/EventFormPage';
import AdminBookingsPage          from './pages/admin/BookingsPage';
import AdminTicketSalesPage       from './pages/admin/TicketSalesPage';
import AdminContentManagementPage from './pages/admin/ContentManagementPage';
import AdminMediaManagerPage      from './pages/admin/MediaManagerPage';
import EmailTemplatesPage         from './pages/admin/EmailTemplatesPage';
import AITemplateGeneratorPage    from './pages/admin/AITemplateGeneratorPage';
import BroadcastComposerPage      from './pages/admin/BroadcastComposerPage';
import BroadcastHistoryPage       from './pages/admin/BroadcastHistoryPage';
import SuppressionListPage        from './pages/admin/SuppressionListPage';
import AdminReportsPage           from './pages/admin/ReportsPage';
import AdminMollieImportPage      from './pages/admin/MollieImportPage';
import AdminMessagesPage          from './pages/admin/MessagesPage';
import AdminNotificationsPage     from './pages/admin/NotificationsPage';
import AdminSettingsPage          from './pages/admin/SettingsPage';
import AdminProfilePage           from './pages/admin/ProfilePage';

import DashboardLoginPage          from './pages/dashboard/LoginPage';
import DashboardRegisterPage       from './pages/dashboard/RegisterPage';
import DashboardVerifyEmailPage    from './pages/dashboard/VerifyEmailPage';
import DashboardForgotPasswordPage from './pages/dashboard/ForgotPasswordPage';
import DashboardResetPasswordPage  from './pages/dashboard/ResetPasswordPage';
import DashboardHomePage           from './pages/dashboard/HomePage';
import MyMembershipPage            from './pages/dashboard/MyMembershipPage';
import DashboardEventsPage         from './pages/dashboard/EventsPage';
import DashboardEventDetailPage    from './pages/dashboard/EventDetailPage';
import MyTicketsPage               from './pages/dashboard/MyTicketsPage';
import DashboardProfilePage        from './pages/dashboard/ProfilePage';
import DashboardNotificationsPage  from './pages/dashboard/NotificationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AdminAuthProvider>
        <MemberAuthProvider>
          <Routes>
            <Route path="/"                 element={<HomePage />} />
            <Route path="/about"            element={<AboutPage />} />
            <Route path="/events"           element={<EventsPage />} />
            <Route path="/membership"       element={<MembershipPage />} />
            <Route path="/sponsorship"      element={<SponsorshipPage />} />
            <Route path="/donation"         element={<DonationPage />} />
            <Route path="/payment/success"  element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel"   element={<PaymentCancelPage />} />

            {/* ── Admin Panel ─────────────────────────────────── */}
            <Route path="/admin/login"           element={<AdminLoginPage />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
            <Route path="/admin/reset-password"  element={<AdminResetPasswordPage />} />
            <Route
              path="/admin"
              element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="members" element={<AdminMembersPage />} />
              <Route path="members/:id" element={<AdminMemberDetailPage />} />
              <Route path="membership-tiers" element={<AdminMembershipTiersPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/new" element={<AdminEventFormPage />} />
              <Route path="events/:id" element={<AdminEventFormPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="ticket-sales" element={<AdminTicketSalesPage />} />
              <Route path="content" element={<AdminContentManagementPage />} />
              <Route path="media" element={<AdminMediaManagerPage />} />
              <Route path="broadcasting" element={<EmailTemplatesPage />} />
              <Route path="broadcasting/generate" element={<AITemplateGeneratorPage />} />
              <Route path="broadcasting/compose" element={<BroadcastComposerPage />} />
              <Route path="broadcasting/history" element={<BroadcastHistoryPage />} />
              <Route path="broadcasting/suppression-list" element={<SuppressionListPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="mollie-import" element={<AdminMollieImportPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
              <Route path="notifications" element={<AdminNotificationsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>

            {/* ── Member Dashboard ────────────────────────────── */}
            <Route path="/dashboard/login"           element={<DashboardLoginPage />} />
            <Route path="/dashboard/register"        element={<DashboardRegisterPage />} />
            <Route path="/dashboard/verify-email"    element={<DashboardVerifyEmailPage />} />
            <Route path="/dashboard/forgot-password" element={<DashboardForgotPasswordPage />} />
            <Route path="/dashboard/reset-password"  element={<DashboardResetPasswordPage />} />
            <Route
              path="/dashboard"
              element={<ProtectedMemberRoute><DashboardLayout /></ProtectedMemberRoute>}
            >
              <Route index element={<DashboardHomePage />} />
              <Route path="membership" element={<MyMembershipPage />} />
              <Route path="events" element={<DashboardEventsPage />} />
              <Route path="events/:slug" element={<DashboardEventDetailPage />} />
              <Route path="tickets" element={<MyTicketsPage />} />
              <Route path="profile" element={<DashboardProfilePage />} />
              <Route path="notifications" element={<DashboardNotificationsPage />} />
            </Route>
          </Routes>
        </MemberAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
