import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaWhatsapp, FaMapMarkerAlt, FaPhone, FaUserPlus, FaArrowRight } from 'react-icons/fa';
import footerLogo from '../../assets/home/FooterLogo.png';
import voiceLogo from '../../assets/footer/voice-logo.png';
import './Footer.css';

const USEFUL_LINKS = ['Home', 'About NIA', 'What we do', 'Upcoming Events', 'News & Activities', 'Policy'];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">

        {/* ── Brand col ── */}
        <div className="footer__col footer__col--brand">
          <div className="footer__logo">
            <img src={footerLogo} alt="Netherlands India Association" className="footer__logo-img" />
          </div>
          <p className="footer__socials-heading">Follow us</p>
          <div className="footer__socials">
            <a href="#" aria-label="Facebook"  className="footer-social"><span className="footer-social__icon footer-social__icon--fb"><FaFacebookF /></span></a>
            <a href="#" aria-label="Instagram" className="footer-social"><span className="footer-social__icon footer-social__icon--ig"><FaInstagram /></span></a>
            <a href="#" aria-label="LinkedIn"  className="footer-social"><span className="footer-social__icon footer-social__icon--li"><FaLinkedinIn /></span></a>
            <a href="#" aria-label="Twitter"   className="footer-social"><span className="footer-social__icon footer-social__icon--tw"><FaTwitter /></span></a>
            <a href="#" aria-label="WhatsApp"  className="footer-social"><span className="footer-social__icon footer-social__icon--wa"><FaWhatsapp /></span></a>
          </div>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Useful Links col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">Useful Links</h4>
          <ul className="footer__links">
            {USEFUL_LINKS.map((link) => (
              <li key={link}><a href="#">{link}</a></li>
            ))}
          </ul>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Address col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">
            <FaMapMarkerAlt className="footer-col-icon" /> Address
          </h4>
          <address className="footer__address">
            Burg. Patijnlaan 1062<br />
            2585 CB Den Haag<br />
            The Netherlands
          </address>
        </div>

        {/* divider */}
        <div className="footer__divider" />

        {/* ── Contact col ── */}
        <div className="footer__col">
          <h4 className="footer__col-heading">
            <FaPhone className="footer-col-icon" /> Contact
          </h4>
          <div className="footer__contact-btns">
            <a href="#" className="footer-btn">
              Contact Us <FaArrowRight />
            </a>
            <a href="#" className="footer-btn">
              Register as a Member <FaUserPlus />
            </a>
          </div>
        </div>

      </div>

      <div className="footer__bottom">
        <p>© 2026 – The Netherlands India Association – All rights reserved</p>
        <div className="footer__credit">
          <span>Designed &amp; Developed by</span>
          <img src={voiceLogo} alt="Voice Venture Studio" className="footer__credit-logo" />
          <span>Voice Venture Studio</span>
        </div>
      </div>
    </footer>
  );
}
