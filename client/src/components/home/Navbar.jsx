import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes, FaUserPlus, FaTicketAlt, FaSignInAlt } from 'react-icons/fa';
import navbarLogo from '../../assets/home/NavbarLogo.png';
import { isGalaLive } from '../../config/events';
import './Navbar.css';

const NAV_LINK_HREFS = [
  { key: 'home',        href: '/' },
  { key: 'membership',  href: '/membership' },
  { key: 'sponsorship', href: '/sponsorship' },
  { key: 'donation',    href: '/donation' },
  { key: 'about',       href: '/about' },
];

const INDEPENDENCE_DAY_LINK = { key: 'independenceDay', href: '/events', label: 'Independence Day' };
const CHRISTMAS_GALA_LINK = { key: 'christmasGala', href: '/events/christmas-gala-2026', label: 'Christmas Gala' };

// Before cutover: Gala isn't discoverable yet (direct URL still works, for
// testing) — only Independence Day shows. At/after cutover: both show,
// Gala first.
function getEventLinks() {
  return isGalaLive() ? [CHRISTMAS_GALA_LINK, INDEPENDENCE_DAY_LINK] : [INDEPENDENCE_DAY_LINK];
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  const galaLive = isGalaLive();
  const eventLinks = getEventLinks();

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
          <span className="navbar__event-pill__label">{t(galaLive ? 'navbar.eventPill.gala.label' : 'navbar.eventPill.label')}</span>
          <span className="navbar__event-pill__date">{t(galaLive ? 'navbar.eventPill.gala.date' : 'navbar.eventPill.date')}</span>
          <span className="navbar__event-pill__name">{t(galaLive ? 'navbar.eventPill.gala.name' : 'navbar.eventPill.name')}</span>
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
          <a
            href="/"
            className={`nav-link${pathname === '/' ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {t('navbar.links.home')}
          </a>

          <div className="nav-dropdown">
            <a
              href="/events"
              className={`nav-link${eventLinks.some((l) => pathname === l.href) ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {t('navbar.links.events')}
            </a>
            <div className="nav-dropdown__menu">
              {eventLinks.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  className={`nav-dropdown__item${pathname === link.href ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {NAV_LINK_HREFS.filter((l) => l.key !== 'home').map((link) => (
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
          <a href={galaLive ? '/events/christmas-gala-2026#tickets' : '/events#tickets'} className="navbar__cta" aria-label={t('navbar.cta.buyTickets')}>
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
