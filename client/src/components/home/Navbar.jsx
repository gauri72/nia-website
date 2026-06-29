import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaBars, FaTimes, FaUserPlus } from 'react-icons/fa';
import navbarLogo from '../../assets/home/NavbarLogo.png';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Home',       href: '/' },
  { label: 'About Us',   href: '#' },
  { label: 'Events',     href: '/events' },
  { label: 'Membership', href: '/membership' },
  { label: 'Sponsorship', href: '/sponsorship' },
  { label: 'Donation',    href: '/donation' },
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
        <div className="navbar__socials">
          <a href="#" aria-label="Facebook"  className="social-icon social-icon--fb"><FaFacebookF /></a>
          <a href="#" aria-label="Instagram" className="social-icon social-icon--ig"><FaInstagram /></a>
          <a href="#" aria-label="LinkedIn"  className="social-icon social-icon--li"><FaLinkedinIn /></a>
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

        <a href="#" className="navbar__cta">
          <FaUserPlus />
          <span>Register as a Member</span>
        </a>
      </div>
    </header>
  );
}
