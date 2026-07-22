import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { useCookieConsent } from '../../context/CookieConsentContext';
import './CookiePreferencesModal.css';

const TOGGLABLE_CATEGORIES = ['functional', 'analytics', 'marketing'];

function Toggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`cookie-toggle${checked ? ' cookie-toggle--on' : ''}${disabled ? ' cookie-toggle--disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="cookie-toggle__knob">{disabled && checked && <Check size={12} />}</span>
    </button>
  );
}

export default function CookiePreferencesModal() {
  const { t } = useTranslation();
  const { categories, closePreferences, acceptAll, rejectNonEssential, savePreferences } = useCookieConsent();
  const [draft, setDraft] = useState({
    functional: categories.functional,
    analytics: categories.analytics,
    marketing: categories.marketing,
  });

  function toggle(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="cookie-modal-overlay" onClick={closePreferences}>
      <div className="cookie-modal" role="dialog" aria-modal="true" aria-label={t('cookieConsent.managePreferences')} onClick={(e) => e.stopPropagation()}>
        <div className="cookie-modal__header">
          <h2>{t('cookieConsent.modal.title')}</h2>
          <button className="cookie-modal__close" onClick={closePreferences} aria-label={t('cookieConsent.modal.close')}>
            <X />
          </button>
        </div>

        <p className="cookie-modal__intro">{t('cookieConsent.modal.intro')}</p>

        <div className="cookie-modal__categories">
          <div className="cookie-category">
            <div className="cookie-category__head">
              <span className="cookie-category__name">{t('cookieConsent.categories.necessary.name')}</span>
              <Toggle checked disabled onChange={() => {}} label={t('cookieConsent.categories.necessary.name')} />
            </div>
            <p className="cookie-category__desc">{t('cookieConsent.categories.necessary.desc')}</p>
          </div>

          {TOGGLABLE_CATEGORIES.map((key) => (
            <div className="cookie-category" key={key}>
              <div className="cookie-category__head">
                <span className="cookie-category__name">{t(`cookieConsent.categories.${key}.name`)}</span>
                <Toggle checked={draft[key]} onChange={(v) => toggle(key, v)} label={t(`cookieConsent.categories.${key}.name`)} />
              </div>
              <p className="cookie-category__desc">{t(`cookieConsent.categories.${key}.desc`)}</p>
            </div>
          ))}
        </div>

        <div className="cookie-modal__actions">
          <button className="cookie-banner__btn cookie-banner__btn--decline" onClick={rejectNonEssential}>
            {t('cookieConsent.rejectNonEssential')}
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--ghost cookie-banner__btn--bordered" onClick={() => savePreferences(draft)}>
            {t('cookieConsent.modal.savePreferences')}
          </button>
          <button className="cookie-banner__btn cookie-banner__btn--accept" onClick={acceptAll}>
            {t('cookieConsent.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
