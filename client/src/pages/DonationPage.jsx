import Navbar        from '../components/home/Navbar';
import Footer        from '../components/home/Footer';
import DonationHero  from '../components/donation/DonationHero';
import DonationImpact from '../components/donation/DonationImpact';
import DonationForm  from '../components/donation/DonationForm';
import DonationCTA   from '../components/donation/DonationCTA';

export default function DonationPage() {
  return (
    <div className="donation-page">
      <Navbar />
      <DonationHero />
      <DonationForm />
      <DonationImpact />
      <DonationCTA />
      <Footer />
    </div>
  );
}
