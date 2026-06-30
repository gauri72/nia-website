import Navbar          from '../components/home/Navbar';
import Footer          from '../components/home/Footer';
import AboutHero       from '../components/about/AboutHero';
import AboutIntro      from '../components/about/AboutIntro';
import AboutMission    from '../components/about/AboutMission';
import AboutStructure  from '../components/about/AboutStructure';
import AboutCTA        from '../components/about/AboutCTA';

export default function AboutPage() {
  return (
    <div className="about-page">
      <Navbar />
      <AboutHero />
      <AboutIntro />
      <AboutMission />
      <AboutStructure />
      <AboutCTA />
      <Footer />
    </div>
  );
}
