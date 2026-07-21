import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes, FaUserPlus, FaTicketAlt, FaSignInAlt } from 'react-icons/fa';
import navbarLogo from '../../assets/home/NavbarLogo.png';
import './Navbar.css';

const NAV_LINK_HREFS = [
  { key: 'home',        href: '/' },
  { key: 'events',      href: '/events' },
  { key: 'membership',  href: '/membership' },
  { key: 'sponsorship', href: '/sponsorship' },
  { key: 'donation',    href: '/donation' },
  { key: 'about',       href: '/about' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  function toggleLanguage() {
    i18n.changeLanguage(i18n.resolvedLanguage === 'nl' ? 'en' : 'nl');
  }

  return (
    <header className="navbar">
      <div className="navbar__top">
        <div className="navbar__logo">
          <img src={navbarLogo} alt="Netherlands India Association" className="navbar__logo-img" />
        </div>
        <div className="navbar__tagline navbar__tagline--desktop">
          <span className="navbar__tagline-main">{t('navbar.tagline.main')}</span>
          <span className="navbar__tagline-sub">{t('navbar.tagline.sub')}</span>
        </div>
        <div className="navbar__event-pill">
          <span className="navbar__event-pill__label">{t('navbar.eventPill.label')}</span>
          <span className="navbar__event-pill__date">{t('navbar.eventPill.date')}</span>
          <span className="navbar__event-pill__name">{t('navbar.eventPill.name')}</span>
        </div>
      </div>

      <div className="navbar__bottom">
        <button
          className="navbar__burger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={t('navbar.toggleMenu')}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <nav className={`navbar__links${menuOpen ? ' open' : ''}`}>
          {NAV_LINK_HREFS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className={`nav-link${pathname === link.href ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t(`navbar.links.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="navbar__actions">
          <a href="/events#tickets" className="navbar__cta" aria-label={t('navbar.cta.buyTickets')}>
            <FaTicketAlt />
            <span>{t('navbar.cta.buyTickets')}</span>
          </a>
          <a href="/membership" className="navbar__cta" aria-label={t('navbar.cta.getMembership')}>
            <FaUserPlus />
            <span>{t('navbar.cta.getMembership')}</span>
          </a>
          <a href="/dashboard" className="navbar__cta" aria-label={t('navbar.cta.logIn')}>
            <FaSignInAlt />
            <span>{t('navbar.cta.logIn')}</span>
          </a>
          <button
            type="button"
            className="navbar__lang-toggle"
            onClick={toggleLanguage}
            aria-label={t('navbar.languageToggle')}
            title={t('navbar.languageToggle')}
          >
            <span className="navbar__lang-flag" aria-hidden="true">{i18n.resolvedLanguage === 'nl' ? '🇳🇱' : '🇬🇧'}</span>
            <span className="navbar__lang-code">{i18n.resolvedLanguage === 'nl' ? 'NL' : 'EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
