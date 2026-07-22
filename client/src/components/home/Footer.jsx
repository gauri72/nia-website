import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaWhatsapp, FaMapMarkerAlt, FaPhone, FaUserPlus, FaArrowRight } from 'react-icons/fa';
import footerLogo from '../../assets/home/FooterLogo.png';
import voiceLogo from '../../assets/footer/voice-logo.png';
import { useCookieConsent } from '../../context/CookieConsentContext';
import './Footer.css';

const USEFUL_LINK_KEYS = ['home', 'about', 'whatWeDo', 'upcomingEvents', 'news', 'policy'];

export default function Footer() {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();

  return (
    <footer className="footer">
      <div className="footer__main">

        {/* ── Brand col ── */}
        <div className="footer__col footer__col--brand">
          <div className="footer__logo">
            <img src={footerLogo} alt="Netherlands India Association" className="footer__logo-img" />
          </div>
          <p className="footer__socials-heading">{t('footer.followUs')}</p>
          <div className="footer__socials">
            <a href="https://www.facebook.com/thenetherlandindia/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"  className="footer-social"><span className="footer-social__icon footer-social__icon--fb"><FaFacebookF /></span></a>
            <a href="https://www.instagram.com/thenetherlandindia/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="footer-social"><span className="footer-social__icon footer-social__icon--ig"><FaInstagram /></span></a>
            <a href="#" aria-label="LinkedIn"  className="footer-social"><span className="footer-social__icon footer-social__icon--li"><FaLinkedinIn /></span></a>
            <a href="#" aria-label="Twitter"   className="footer-social"><span className="footer-social__icon footer-social__icon--tw"><FaTwitter /></span></a>
            <a href="#" aria-label="WhatsApp"  className="footer-social"><span className="footer-social__icon footer-social__icon--wa"><FaWhatsapp /></span></a>
          </div>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Useful Links col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">{t('footer.usefulLinks.heading')}</h4>
          <ul className="footer__links">
            {USEFUL_LINK_KEYS.map((key) => (
              <li key={key}>
                {key === 'policy'
                  ? <Link to="/privacy-policy">{t(`footer.usefulLinks.${key}`)}</Link>
                  : <a href="#">{t(`footer.usefulLinks.${key}`)}</a>}
              </li>
            ))}
          </ul>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Address col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">
            <FaMapMarkerAlt className="footer-col-icon" /> {t('footer.address.heading')}
          </h4>
          <address className="footer__address">
            {t('footer.address.line1')}<br />
            {t('footer.address.line2')}<br />
            {t('footer.address.line3')}
          </address>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Contact col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">
            <FaPhone className="footer-col-icon" /> {t('footer.contact.heading')}
          </h4>
          <div className="footer__contact-btns">
            <a href="#" className="footer-btn">
              {t('footer.contact.contactUs')} <FaArrowRight />
            </a>
            <a href="#" className="footer-btn">
              {t('footer.contact.registerAsMember')} <FaUserPlus />
            </a>
          </div>
        </div>

      </div>

      <div className="footer__bottom">
        <p>
          {t('footer.copyright')}
          {' · '}
          <Link to="/privacy-policy">{t('footer.usefulLinks.policy')}</Link>
          {' · '}
          <button type="button" className="footer__cookie-settings-btn" onClick={openPreferences}>
            {t('cookieConsent.cookieSettings')}
          </button>
        </p>
        <div className="footer__credit">
          <span className="footer__credit-text">{t('footer.credit.designedBy')}</span>
          <a href="https://stichtingthevoice.nl/voice-venture-studio" target="_blank" rel="noopener noreferrer" aria-label="V.O.I.C.E. Venture Studio">
            <img src={voiceLogo} alt="Voice Venture Studio" className="footer__credit-logo" />
          </a>
          <span className="footer__credit-text">{t('footer.credit.studio')}</span>
        </div>
      </div>
    </footer>
  );
}
