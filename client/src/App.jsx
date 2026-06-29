import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage        from './pages/HomePage';
import EventsPage      from './pages/EventsPage';
import MembershipPage  from './pages/MembershipPage';
import SponsorshipPage from './pages/SponsorshipPage';
import DonationPage    from './pages/DonationPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<HomePage />} />
        <Route path="/events"      element={<EventsPage />} />
        <Route path="/membership"  element={<MembershipPage />} />
        <Route path="/sponsorship" element={<SponsorshipPage />} />
        <Route path="/donation"    element={<DonationPage />} />
      </Routes>
    </BrowserRouter>
  );
}
