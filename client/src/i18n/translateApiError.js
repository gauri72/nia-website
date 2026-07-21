// Maps the exact English error/message strings the Express backend returns
// (via `{ error: '...' }` or `{ message: '...' }`) to Dutch, for display in an
// otherwise-Dutch UI. Falls back to the raw English string when unmapped —
// e.g. for the handful of heavily-templated proration/discount messages that
// aren't worth the fragility of regex-matching. Backend copy stays in English
// (no i18n there); this is a thin client-side presentation layer only.
const NL_ERROR_MAP = {
  // Ticket flow
  'name and email are required': 'Naam en e-mailadres zijn verplicht',
  'Please enter a valid email address': 'Voer een geldig e-mailadres in',
  'At least one ticket is required': 'Ten minste één ticket is verplicht',
  'attendeeNames is required when booking more than one ticket': 'Namen van deelnemers zijn verplicht bij het boeken van meer dan één ticket',
  'email and at least one ticket are required': 'E-mailadres en ten minste één ticket zijn verplicht',
  'Ticket not found': 'Ticket niet gevonden',
  'Your tickets are fully covered by the discount — no payment required.': 'Uw tickets worden volledig gedekt door de korting — geen betaling vereist.',

  // Membership flow (guest) + member dashboard renew/upgrade
  'Invalid plan. Must be "friend" or "patron"': 'Ongeldig plan. Moet "friend" of "patron" zijn',
  'partnerName is required': 'Naam van partner is verplicht',
  'Your membership is fully covered by the discount — no payment required.': 'Uw lidmaatschap wordt volledig gedekt door de korting — geen betaling vereist.',
  'Membership not found': 'Lidmaatschap niet gevonden',
  'No current membership tier to renew. Choose a tier to join first.': 'Geen huidig lidmaatschapsniveau om te verlengen. Kies eerst een niveau om lid te worden.',
  'This membership tier is no longer available': 'Dit lidmaatschapsniveau is niet meer beschikbaar',
  'Your renewal is fully covered by the discount — no payment required.': 'Uw verlenging wordt volledig gedekt door de korting — geen betaling vereist.',
  'Invalid or inactive membership tier': 'Ongeldig of inactief lidmaatschapsniveau',
  'This tier has reached its member limit': 'Dit niveau heeft het maximale aantal leden bereikt',
  'This membership is fully covered by the discount — no payment required.': 'Dit lidmaatschap wordt volledig gedekt door de korting — geen betaling vereist.',
  'An active membership is required to download a card': 'Een actief lidmaatschap is vereist om een kaart te downloaden',
  'Patron Pass is only available for Patron-tier members': 'Patron Pass is alleen beschikbaar voor Patron-leden',
  'An active membership is required to download a pass': 'Een actief lidmaatschap is vereist om een pas te downloaden',

  // Sponsorship flow
  'sponsorName, contactPerson, and email are required': 'Sponsornaam, contactpersoon en e-mailadres zijn verplicht',
  'Invalid or inactive sponsorship package': 'Ongeldig of inactief sponsorpakket',
  'This sponsorship is fully covered by the discount — no payment required.': 'Deze sponsoring wordt volledig gedekt door de korting — geen betaling vereist.',
  'Sponsorship not found': 'Sponsoring niet gevonden',

  // Donation flow
  'Donation not found': 'Donatie niet gevonden',

  // Discount codes
  'code, productType, email, and originalAmount are required': 'Code, producttype, e-mailadres en oorspronkelijk bedrag zijn verplicht',
  'Invalid discount code': 'Ongeldige kortingscode',
  'This discount code is no longer active': 'Deze kortingscode is niet meer actief',
  'This discount code is not yet valid': 'Deze kortingscode is nog niet geldig',
  'This discount code has expired': 'Deze kortingscode is verlopen',
  'This discount code cannot be used for ticket purchases': 'Deze kortingscode kan niet worden gebruikt voor tickets',
  'This discount code cannot be used for membership purchases': 'Deze kortingscode kan niet worden gebruikt voor lidmaatschappen',
  'This discount code cannot be used for sponsorship purchases': 'Deze kortingscode kan niet worden gebruikt voor sponsoring',
  'This discount code has reached its usage limit': 'Deze kortingscode heeft de gebruikslimiet bereikt',
  'You have already used this discount code': 'U heeft deze kortingscode al gebruikt',

  // Member auth flow
  'firstName, lastName, email and password are required': 'Voornaam, achternaam, e-mailadres en wachtwoord zijn verplicht',
  'Password must be at least 8 characters': 'Wachtwoord moet minimaal 8 tekens bevatten',
  'An account with this email already exists': 'Er bestaat al een account met dit e-mailadres',
  'Account created. Please check your email to verify your account.': 'Account aangemaakt. Controleer uw e-mail om uw account te verifiëren.',
  'Invalid or expired verification link': 'Ongeldige of verlopen verificatielink',
  'Email verified successfully. You can now log in.': 'E-mail succesvol geverifieerd. U kunt nu inloggen.',
  'email and password are required': 'E-mailadres en wachtwoord zijn verplicht',
  'Invalid email or password': 'Ongeldig e-mailadres of wachtwoord',
  'This account is not active. Please contact NIA support.': 'Dit account is niet actief. Neem contact op met de NIA-support.',
  'Please verify your email before logging in.': 'Verifieer uw e-mailadres voordat u inlogt.',
  'email is required': 'E-mailadres is verplicht',
  'If an account exists for that email, a reset link has been sent.': 'Als er een account bestaat voor dit e-mailadres, is er een resetlink verzonden.',
  'Invalid or expired reset link': 'Ongeldige of verlopen resetlink',
  'Password reset successfully. You can now log in.': 'Wachtwoord succesvol gereset. U kunt nu inloggen.',
  'Member not found': 'Lid niet gevonden',
};

// A few dynamic (templated) backend strings, matched by regex since they carry
// runtime values the static map above can't cover.
const NL_ERROR_PATTERNS = [
  {
    re: /^Amount must be between €(\d+) and €(\d+)$/,
    nl: (m) => `Bedrag moet tussen €${m[1]} en €${m[2]} liggen`,
  },
  {
    re: /^Invalid ticket type: (.+)$/,
    nl: (m) => `Ongeldig tickettype: ${m[1]}`,
  },
  {
    re: /^Invalid quantity for (.+)$/,
    nl: (m) => `Ongeldig aantal voor ${m[1]}`,
  },
];

export function translateApiError(rawMessage, language) {
  if (!rawMessage || language !== 'nl') return rawMessage;
  if (NL_ERROR_MAP[rawMessage]) return NL_ERROR_MAP[rawMessage];
  for (const { re, nl } of NL_ERROR_PATTERNS) {
    const match = rawMessage.match(re);
    if (match) return nl(match);
  }
  return rawMessage;
}
