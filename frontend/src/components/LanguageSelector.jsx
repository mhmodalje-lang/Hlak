import React, { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES, saveLanguage, isRTL } from '@/lib/i18n';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Elegant Language Selector Dropdown with flags
 * Usage: <LanguageSelector value={language} onChange={setLanguage} variant="dark|light|minimal" />
 */
const LanguageSelector = ({ value = 'en', onChange, variant = 'dark' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SUPPORTED_LANGUAGES.find(l => l.code === value) || SUPPORTED_LANGUAGES[1];

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleChange = (code) => {
    onChange?.(code);
    saveLanguage(code);
    // update document direction
    document.documentElement.dir = isRTL(code) ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  };

  const styles = {
    dark: {
      trigger: 'bg-white/8 backdrop-blur-xl border border-white/15 text-white hover:bg-white/15',
      menu: 'bg-[#1A120A]/95 backdrop-blur-2xl border border-[#D4AF37]/20 text-white',
      item: 'hover:bg-[#D4AF37]/10',
      active: 'bg-[#D4AF37]/15 text-[#F3E5AB]',
    },
    light: {
      trigger: 'bg-white/80 backdrop-blur-xl border border-[#B76E79]/20 text-[#1C1917] hover:bg-white',
      menu: 'bg-white/95 backdrop-blur-2xl border border-[#B76E79]/20 text-[#1C1917]',
      item: 'hover:bg-[#B76E79]/10',
      active: 'bg-[#B76E79]/15 text-[#9E5B66]',
    },
    minimal: {
      trigger: 'bg-transparent border border-current hover:bg-current/10',
      menu: 'bg-[#1A120A]/95 backdrop-blur-2xl border border-white/15 text-white',
      item: 'hover:bg-white/10',
      active: 'bg-white/10',
    },
  }[variant] || {};

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${styles.trigger}`}
        data-testid="language-selector-trigger"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${isRTL(value) ? 'right-0' : 'left-0'} sm:${isRTL(value) ? 'left-0' : 'right-0'} mt-2 min-w-[200px] rounded-2xl shadow-2xl overflow-hidden z-[9999] ${styles.menu}`}
          >
            <div className="py-1 max-h-[400px] overflow-y-auto">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${styles.item} ${value === lang.code ? styles.active : ''}`}
                  dir={lang.dir}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1 text-start">{lang.name}</span>
                  {value === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
