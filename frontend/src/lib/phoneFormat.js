/**
 * BARBER HUB - Phone Format Utility
 * Maps ISO country codes → localized phone placeholder examples.
 * Used across AuthPage, BookingPage, and any form that collects phone numbers.
 *
 * Usage:
 *   import { getPhonePlaceholder } from '@/lib/phoneFormat';
 *   const ph = getPhonePlaceholder(countryCode, language);
 */

// Country dial codes + example placeholder formats (ISO-3166 alpha-2 keyed)
const PHONE_FORMATS = {
  // Arab world
  SY: { dial: '+963', example: '9XX XXX XXX' },
  IQ: { dial: '+964', example: '7XX XXX XXXX' },
  JO: { dial: '+962', example: '7X XXX XXXX' },
  LB: { dial: '+961', example: '7X XXX XXX' },
  SA: { dial: '+966', example: '5XX XXX XXXX' },
  AE: { dial: '+971', example: '5X XXX XXXX' },
  KW: { dial: '+965', example: '5XXX XXXX' },
  QA: { dial: '+974', example: '3XXX XXXX' },
  BH: { dial: '+973', example: '3XXX XXXX' },
  OM: { dial: '+968', example: '9XXX XXXX' },
  EG: { dial: '+20',  example: '10X XXX XXXX' },
  PS: { dial: '+970', example: '59X XXX XXX' },
  YE: { dial: '+967', example: '7XX XXX XXX' },
  MA: { dial: '+212', example: '6XX XXX XXX' },
  DZ: { dial: '+213', example: '5XX XX XX XX' },
  TN: { dial: '+216', example: '2X XXX XXX' },
  LY: { dial: '+218', example: '91 XXX XXXX' },
  SD: { dial: '+249', example: '9XX XXX XXX' },

  // Europe
  GB: { dial: '+44',  example: '7XXX XXXXXX' },
  DE: { dial: '+49',  example: '15X XXXXXXX' },
  FR: { dial: '+33',  example: '6 XX XX XX XX' },
  IT: { dial: '+39',  example: '3XX XXX XXXX' },
  ES: { dial: '+34',  example: '6XX XXX XXX' },
  NL: { dial: '+31',  example: '6 XXXX XXXX' },
  BE: { dial: '+32',  example: '4XX XX XX XX' },
  SE: { dial: '+46',  example: '70 XXX XX XX' },
  NO: { dial: '+47',  example: '4XX XX XXX' },
  CH: { dial: '+41',  example: '7X XXX XX XX' },
  AT: { dial: '+43',  example: '66X XXXXXXX' },
  PL: { dial: '+48',  example: '5XX XXX XXX' },
  PT: { dial: '+351', example: '9XX XXX XXX' },
  GR: { dial: '+30',  example: '69X XXX XXXX' },
  IE: { dial: '+353', example: '8X XXX XXXX' },
  DK: { dial: '+45',  example: '2X XX XX XX' },
  FI: { dial: '+358', example: '4X XXX XXXX' },

  // Americas
  US: { dial: '+1',   example: '(XXX) XXX-XXXX' },
  CA: { dial: '+1',   example: '(XXX) XXX-XXXX' },
  MX: { dial: '+52',  example: '1 XX XXXX XXXX' },
  BR: { dial: '+55',  example: '11 9XXXX-XXXX' },
  AR: { dial: '+54',  example: '9 11 XXXX-XXXX' },

  // Asia
  TR: { dial: '+90',  example: '5XX XXX XX XX' },
  IR: { dial: '+98',  example: '9XX XXX XXXX' },
  IN: { dial: '+91',  example: '9XXXX XXXXX' },
  PK: { dial: '+92',  example: '3XX XXXXXXX' },
  CN: { dial: '+86',  example: '1XX XXXX XXXX' },
  JP: { dial: '+81',  example: '90 XXXX XXXX' },
  KR: { dial: '+82',  example: '10 XXXX XXXX' },
  ID: { dial: '+62',  example: '8XX XXXX XXXX' },
  MY: { dial: '+60',  example: '1X XXX XXXX' },
  TH: { dial: '+66',  example: '8X XXX XXXX' },

  // Oceania
  AU: { dial: '+61',  example: '4XX XXX XXX' },
  NZ: { dial: '+64',  example: '2X XXX XXXX' },
};

/**
 * Get a placeholder text for a phone input based on country code.
 * @param {string} countryCode - ISO alpha-2 country code (e.g., "SY", "US", "GB")
 * @param {string} language - "ar" or "en" (currently unused, reserved for future locale-specific formatting)
 * @returns {string} Formatted placeholder like "+963 9XX XXX XXX"
 */
export const getPhonePlaceholder = (countryCode, language = 'en') => {
  const code = (countryCode || '').toUpperCase();
  const format = PHONE_FORMATS[code];
  if (!format) {
    // Generic international fallback
    return '+1 XXX XXX XXXX';
  }
  return `${format.dial} ${format.example}`;
};

/**
 * Get just the dial code for a country (e.g., "+963" for Syria).
 * @param {string} countryCode - ISO alpha-2 country code
 * @returns {string} Dial code with "+" prefix, or "+1" as fallback
 */
export const getDialCode = (countryCode) => {
  const code = (countryCode || '').toUpperCase();
  return PHONE_FORMATS[code]?.dial || '+1';
};

/**
 * Pre-fill a phone input with the dial code when field is empty/focused.
 * @param {string} countryCode - ISO alpha-2 country code
 * @param {string} currentValue - Current input value
 * @returns {string} Dial code with space if empty, else currentValue
 */
export const prefillDialCode = (countryCode, currentValue) => {
  if (currentValue && currentValue.trim().length > 0) return currentValue;
  return `${getDialCode(countryCode)} `;
};

export default getPhonePlaceholder;
