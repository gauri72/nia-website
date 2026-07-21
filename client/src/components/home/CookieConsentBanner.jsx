import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import './CookieConsentBanner.css';

const STORAGE_KEY = 'nia_cookie_consent';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function respond(choice) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label={t('cookieConsent.title')}>
      <div className="cookie-banner__inner">
        <Cookie className="cookie-banner__icon" />
        <p className="cookie-banner__text">
          {t('cookieConsent.body')}{' '}
          <Link to="/privacy-policy" className="cookie-banner__link">{t('cookieConsent.learnMore')}</Link>
        </p>
        <div className="cookie-banner__actions">
          <button className="cookie-banner__btn cookie-banner__btn--decline" onClick={() => respond('declined')}>
            {t('cookieConsent.decline')}
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={() => respond('accepted')}>
            {t('cookieConsent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
