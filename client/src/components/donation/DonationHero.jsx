import './DonationHero.css';

export default function DonationHero() {
  return (
    <section className="don-hero">
      <div className="don-hero__overlay" />
      <div className="don-hero__content">
        <p className="don-hero__eyebrow">NETHERLANDS INDIA ASSOCIATION</p>
        <h1 className="don-hero__heading">Support Our Community</h1>
        <p className="don-hero__sub">
          Your generosity keeps our culture alive — fund events, programmes, and a thriving
          Dutch‑Indian community for generations to come.
        </p>
      </div>
    </section>
  );
}
