import Navbar             from '../components/home/Navbar';
import Footer             from '../components/home/Footer';
import MembershipHero     from '../components/membership/MembershipHero';
import MembershipPlans    from '../components/membership/MembershipPlans';
import MembershipCompare  from '../components/membership/MembershipCompare';
import MembershipCTA      from '../components/membership/MembershipCTA';

export default function MembershipPage() {
  return (
    <div className="membership-page">
      <Navbar />
      <MembershipHero />
      <MembershipPlans />
      <MembershipCompare />
      <MembershipCTA />
      <Footer />
    </div>
  );
}
