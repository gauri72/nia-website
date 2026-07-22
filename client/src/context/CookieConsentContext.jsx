import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'nia_cookie_consent';
const CONSENT_VERSION = 1; // bump if the category list itself ever changes, to re-prompt everyone

// "necessary" is always true and isn't user-togglable — session/auth state,
// the consent choice itself, and security. Everything else defaults to OFF
// until the visitor actively opts in, per GDPR's opt-in (not opt-out) rule.
const DEFAULT_CATEGORIES = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

const CookieConsentContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CONSENT_VERSION) return null; // stale schema — re-prompt
    return parsed;
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }) {
  const [stored, setStored] = useState(readStored);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const categories = stored?.categories || DEFAULT_CATEGORIES;
  const hasResponded = !!stored;

  function persist(categories) {
    const record = { version: CONSENT_VERSION, categories, respondedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setStored(record);
  }

  function acceptAll() {
    persist({ necessary: true, functional: true, analytics: true, marketing: true });
    setPreferencesOpen(false);
  }

  function rejectNonEssential() {
    persist({ ...DEFAULT_CATEGORIES });
    setPreferencesOpen(false);
  }

  function savePreferences(partial) {
    persist({ ...DEFAULT_CATEGORIES, ...partial, necessary: true });
    setPreferencesOpen(false);
  }

  // Keep the <html lang> / language-detector free to run as soon as the app
  // loads regardless of consent — see CookiePreferencesModal's "functional"
  // description for the reasoning (bilingual UI is core site function, not
  // a tracking concern), consistent with how most real-world sites treat it.

  return (
    <CookieConsentContext.Provider value={{
      categories,
      hasResponded,
      preferencesOpen,
      openPreferences: () => setPreferencesOpen(true),
      closePreferences: () => setPreferencesOpen(false),
      acceptAll,
      rejectNonEssential,
      savePreferences,
    }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  return ctx;
}

// Standalone helper for non-component code (e.g. a future analytics loader)
// that just needs a yes/no answer without subscribing to React state.
export function hasConsent(category) {
  const stored = readStored();
  if (!stored) return false;
  return !!stored.categories[category];
}
