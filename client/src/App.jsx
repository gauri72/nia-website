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

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/about"            element={<AboutPage />} />
        <Route path="/events"           element={<EventsPage />} />
        <Route path="/membership"       element={<MembershipPage />} />
        <Route path="/sponsorship"      element={<SponsorshipPage />} />
        <Route path="/donation"         element={<DonationPage />} />
        <Route path="/payment/success"  element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel"   element={<PaymentCancelPage />} />
      </Routes>
    </BrowserRouter>
  );
}
