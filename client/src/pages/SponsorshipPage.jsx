import Navbar              from '../components/home/Navbar';
import Footer              from '../components/home/Footer';
import SponsorshipHero     from '../components/sponsorship/SponsorshipHero';
import SponsorshipPackages from '../components/sponsorship/SponsorshipPackages';
import SponsorshipEvents   from '../components/sponsorship/SponsorshipEvents';

export default function SponsorshipPage() {
  return (
    <div className="sponsorship-page">
      <Navbar />
      <SponsorshipHero />
      <SponsorshipPackages />
      <SponsorshipEvents />
      <Footer />
    </div>
  );
}
