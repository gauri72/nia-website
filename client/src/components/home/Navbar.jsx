import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaUserPlus, FaTicketAlt, FaSignInAlt } from 'react-icons/fa';
import navbarLogo from '../../assets/home/NavbarLogo.png';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home',        href: '/' },
  { label: 'Events',      href: '/events' },
  { label: 'Membership',  href: '/membership' },
  { label: 'Sponsorship', href: '/sponsorship' },
  { label: 'Donation',    href: '/donation' },
  { label: 'About Us',    href: '/about' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="navbar">
      <div className="navbar__top">
        <div className="navbar__logo">
          <img src={navbarLogo} alt="Netherlands India Association" className="navbar__logo-img" />
        </div>
        <div className="navbar__tagline navbar__tagline--desktop">
          <span className="navbar__tagline-main">Bridging Two Great Cultures</span>
          <span className="navbar__tagline-sub">Netherlands &amp; India — Together Since 1950</span>
        </div>
        <div className="navbar__event-pill">
          <span className="navbar__event-pill__label">🎉 NEXT EVENT</span>
          <span className="navbar__event-pill__date">15 Aug 2026</span>
          <span className="navbar__event-pill__name">India Independence Day</span>
        </div>
      </div>

      <div className="navbar__bottom">
        <button
          className="navbar__burger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <nav className={`navbar__links${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`nav-link${pathname === link.href ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <a href="/events#tickets" className="navbar__cta" aria-label="Buy Tickets">
            <FaTicketAlt />
            <span>Buy Tickets</span>
          </a>
          <a href="/membership" className="navbar__cta" aria-label="Get Membership">
            <FaUserPlus />
            <span>Get Membership</span>
          </a>
          <a href="/dashboard" className="navbar__cta" aria-label="Log In">
            <FaSignInAlt />
            <span>Log In</span>
          </a>
        </div>
      </div>
    </header>
  );
}
