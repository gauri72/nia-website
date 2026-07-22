import { useTranslation } from 'react-i18next';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import CookiePreferencesModal from './CookiePreferencesModal';
import './CookieConsentBanner.css';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const { hasResponded, preferencesOpen, openPreferences, acceptAll, rejectNonEssential } = useCookieConsent();

  return (
    <>
      {!hasResponded && (
        <div className="cookie-banner" role="dialog" aria-live="polite" aria-label={t('cookieConsent.title')}>
          <div className="cookie-banner__inner">
            <Cookie className="cookie-banner__icon" />
            <p className="cookie-banner__text">{t('cookieConsent.body')}</p>
            <div className="cookie-banner__actions">
              <button className="cookie-banner__btn cookie-banner__btn--ghost" onClick={openPreferences}>
                {t('cookieConsent.managePreferences')}
              </button>
              <button className="cookie-banner__btn cookie-banner__btn--decline" onClick={rejectNonEssential}>
                {t('cookieConsent.rejectNonEssential')}
              </button>
              <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={acceptAll}>
                {t('cookieConsent.acceptAll')}
              </button>
            </div>
          </div>
        </div>
      )}
      {preferencesOpen && <CookiePreferencesModal />}
    </>
  );
}
