/**
 * CountryPickerPill — Allows a user to explicitly pick their country when the
 * IP-based geo-detection is wrong (e.g. the container is hosted in Germany but
 * the user is in Syria). Selected country persists in localStorage.
 */
import React, { useState } from 'react';
import { Globe, Check, ChevronDown, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRIES = [
  { code: 'SY', name: 'Syria',         ar: 'سوريا' },
  { code: 'IQ', name: 'Iraq',          ar: 'العراق' },
  { code: 'SA', name: 'Saudi Arabia',  ar: 'السعودية' },
  { code: 'AE', name: 'UAE',           ar: 'الإمارات' },
  { code: 'EG', name: 'Egypt',         ar: 'مصر' },
  { code: 'JO', name: 'Jordan',        ar: 'الأردن' },
  { code: 'LB', name: 'Lebanon',       ar: 'لبنان' },
  { code: 'KW', name: 'Kuwait',        ar: 'الكويت' },
  { code: 'QA', name: 'Qatar',         ar: 'قطر' },
  { code: 'BH', name: 'Bahrain',       ar: 'البحرين' },
  { code: 'OM', name: 'Oman',          ar: 'عُمان' },
  { code: 'PS', name: 'Palestine',     ar: 'فلسطين' },
  { code: 'MA', name: 'Morocco',       ar: 'المغرب' },
  { code: 'DZ', name: 'Algeria',       ar: 'الجزائر' },
  { code: 'TN', name: 'Tunisia',       ar: 'تونس' },
  { code: 'LY', name: 'Libya',         ar: 'ليبيا' },
  { code: 'YE', name: 'Yemen',         ar: 'اليمن' },
];

const CountryPickerPill = ({ currentCountry, onChange, onReset, manualCountry, language = 'ar' }) => {
  const [open, setOpen] = useState(false);
  const isAr = language === 'ar';

  const pick = (countryName) => {
    onChange(countryName);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-center mb-6" data-testid="country-picker-pill">
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-gold)]/30 hover:border-[var(--bh-gold)]/70 text-sm text-[var(--bh-text-primary)] transition-all"
          data-testid="country-picker-btn"
        >
          <Globe className="w-4 h-4 text-[var(--bh-gold)]" />
          <span>{isAr ? 'البلد:' : 'Country:'}</span>
          <span className="font-bold text-[var(--bh-gold-light)]">{currentCountry}</span>
          {manualCountry && (
            <MapPin className="w-3 h-3 text-emerald-400" title={isAr ? 'تم الاختيار يدوياً' : 'Manually selected'} />
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 max-h-80 overflow-y-auto bg-[#0a0a0a] border border-[var(--bh-gold)]/30 rounded-2xl shadow-2xl"
              data-testid="country-picker-dropdown"
            >
              <div className="p-2">
                {manualCountry && (
                  <button
                    onClick={() => { onReset(); setOpen(false); }}
                    className="w-full text-center text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg py-2 mb-1"
                    data-testid="reset-country-btn"
                  >
                    {isAr ? '↺ استخدم موقعي التلقائي' : '↺ Use auto-detect'}
                  </button>
                )}
                {COUNTRIES.map(c => {
                  const picked = currentCountry === c.name || currentCountry === c.ar;
                  return (
                    <button
                      key={c.code}
                      onClick={() => pick(isAr ? c.ar : c.name)}
                      className={`w-full text-start flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        picked
                          ? 'bg-[var(--bh-gold)]/20 text-[var(--bh-gold-light)]'
                          : 'text-[var(--bh-text-secondary)] hover:bg-white/5'
                      }`}
                      data-testid={`country-option-${c.code}`}
                    >
                      <span>{isAr ? c.ar : c.name}</span>
                      {picked && <Check className="w-4 h-4 text-[var(--bh-gold)]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CountryPickerPill;
