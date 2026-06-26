import Navbar from '../components/home/Navbar';
import HeroBanner from '../components/home/HeroBanner';
import AboutNIA from '../components/home/AboutNIA';
import MembershipStructure from '../components/home/MembershipStructure';
import Activities from '../components/home/Activities';
import Sponsors from '../components/home/Sponsors';
import Footer from '../components/home/Footer';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <Navbar />
      <HeroBanner />
      <AboutNIA />
      <MembershipStructure />
      <Activities />
      <Sponsors />
      <Footer />
    </div>
  );
}
