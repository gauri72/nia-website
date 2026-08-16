import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import CookieConsentBanner from './components/home/CookieConsentBanner';
import HomePage           from './pages/HomePage';
import AboutPage          from './pages/AboutPage';
import EventsPage         from './pages/EventsPage';
import GalaEventPage      from './pages/GalaEventPage';
import MembershipPage     from './pages/MembershipPage';
import SponsorshipPage    from './pages/SponsorshipPage';
import DonationPage       from './pages/DonationPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage  from './pages/PaymentCancelPage';
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage';

import { AdminAuthProvider } from './context/AdminAuthContext';
import { MemberAuthProvider } from './context/MemberAuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import ProtectedAdminRoute from './routes/ProtectedAdminRoute';
import ProtectedMemberRoute from './routes/ProtectedMemberRoute';
import ProtectedCheckinRoute from './routes/ProtectedCheckinRoute';
import AdminLayout from './layouts/AdminLayout';
import DashboardLayout from './layouts/DashboardLayout';

import CheckinLoginPage from './pages/checkin/CheckinLoginPage';
import CheckinScanPage  from './pages/checkin/CheckinScanPage';

import AdminLoginPage          from './pages/admin/LoginPage';
import AdminForgotPasswordPage from './pages/admin/ForgotPasswordPage';
import AdminResetPasswordPage  from './pages/admin/ResetPasswordPage';
import AdminDashboardPage      from './pages/admin/DashboardPage';
import AdminUsersPage             from './pages/admin/UsersPage';
import AdminMembersPage           from './pages/admin/MembersPage';
import AdminMemberDetailPage      from './pages/admin/MemberDetailPage';
import AdminMembershipTiersPage   from './pages/admin/MembershipTiersPage';
import AdminDiscountCodesPage     from './pages/admin/DiscountCodesPage';
import AdminEventsPage            from './pages/admin/EventsPage';
import AdminEventFormPage         from './pages/admin/EventFormPage';
import AdminBookingsPage          from './pages/admin/BookingsPage';
import AdminTicketSalesPage       from './pages/admin/TicketSalesPage';
import AdminScanPage              from './pages/admin/ScanPage';
import AdminGuestListPage         from './pages/admin/GuestListPage';
import AdminSponsorshipsPage      from './pages/admin/SponsorshipsPage';
import AdminDonationsPage         from './pages/admin/DonationsPage';
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
import EventBookingPage            from './pages/dashboard/EventBookingPage';
import { EVENTS } from './config/events';
import DashboardEventDetailPage    from './pages/dashboard/EventDetailPage';
import MyTicketsPage               from './pages/dashboard/MyTicketsPage';
import DashboardProfilePage        from './pages/dashboard/ProfilePage';
import DashboardNotificationsPage  from './pages/dashboard/NotificationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CookieConsentProvider>
        <CookieConsentBanner />
        <AdminAuthProvider>
          <MemberAuthProvider>
            <Routes>
            <Route path="/"                 element={<HomePage />} />
            <Route path="/about"            element={<AboutPage />} />
            <Route path="/events"           element={<EventsPage />} />
            <Route path="/events/christmas-gala-2026" element={<GalaEventPage />} />
            <Route path="/membership"       element={<MembershipPage />} />
            <Route path="/sponsorship"      element={<SponsorshipPage />} />
            <Route path="/donation"         element={<DonationPage />} />
            <Route path="/payment/success"  element={<PaymentSuccessPage />} />
            <Route path="/payment/cancel"   element={<PaymentCancelPage />} />
            <Route path="/privacy-policy"   element={<PrivacyPolicyPage />} />

            {/* ── Door-staff check-in PWA ─────────────────────── */}
            <Route path="/checkin/login" element={<CheckinLoginPage />} />
            <Route path="/checkin" element={<ProtectedCheckinRoute><CheckinScanPage /></ProtectedCheckinRoute>} />

            {/* ── Admin Panel ─────────────────────────────────── */}
            <Route path="/admin/login"           element={<AdminLoginPage />} />
            <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
            <Route path="/admin/reset-password"  element={<AdminResetPasswordPage />} />
            <Route
              path="/admin"
              element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="members" element={<AdminMembersPage />} />
              <Route path="members/:id" element={<AdminMemberDetailPage />} />
              <Route path="membership-tiers" element={<AdminMembershipTiersPage />} />
              <Route path="discount-codes" element={<AdminDiscountCodesPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/new" element={<AdminEventFormPage />} />
              <Route path="events/:id" element={<AdminEventFormPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="ticket-sales" element={<AdminTicketSalesPage />} />
              <Route path="scan" element={<AdminScanPage />} />
              <Route path="guest-list" element={<AdminGuestListPage />} />
              <Route path="sponsorships" element={<AdminSponsorshipsPage />} />
              <Route path="donations" element={<AdminDonationsPage />} />
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
              <Route path="events/independence-day" element={<EventBookingPage
                event={EVENTS['independence-day-2026']}
                content={{
                  category: 'Festival',
                  title: "80th India Independence Day Celebration & NIA 75th Anniversary",
                  description: "Join us for a historic celebration as we mark India's 80th Independence Day and the 75th Anniversary of NIA — an evening of cultural performances, great food and togetherness. Theme: India, Netherlands and Water.",
                  date: '15 August 2026', day: 'Saturday',
                  time: '18:00', timeSub: 'Onwards',
                  venueName: 'De Duinpan', venueAddress: 'Sportlaan 34, 2191 XH De Zilk',
                  mapUrl: 'https://maps.app.goo.gl/qSfRXG5iMBcR6exs8',
                }}
              />} />
              <Route path="events/christmas-gala" element={<EventBookingPage
                event={EVENTS['christmas-gala-2026']}
                content={{
                  category: 'Gala',
                  title: 'NIA Christmas Gala Dinner 2026',
                  description: 'A December to Remember. Dine, Dance, Celebrate, The NIA Way! Join us for an elegant evening with a festive three-course dinner, live music and dancing.',
                  date: '12 December 2026', day: 'Saturday',
                  time: '18:00', timeSub: 'Onwards',
                  venueName: 'De Duinpan', venueAddress: 'Sportlaan 34, 2191 XH De Zilk',
                  mapUrl: 'https://maps.app.goo.gl/qSfRXG5iMBcR6exs8',
                }}
              />} />
              <Route path="events/:slug" element={<DashboardEventDetailPage />} />
              <Route path="tickets" element={<MyTicketsPage />} />
              <Route path="profile" element={<DashboardProfilePage />} />
              <Route path="notifications" element={<DashboardNotificationsPage />} />
              </Route>
            </Routes>
          </MemberAuthProvider>
        </AdminAuthProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  );
}
