/**
 * BARBER HUB - LocalizationContext
 * Zero-Click Language Detection + Manual Override
 * Detects browser/system language automatically
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectLanguage, saveLanguage, isRTL } from '@/lib/i18n';

const LocalizationContext = createContext();

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
};

export const LocalizationProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('barberhub_lang');
    if (saved) return saved;
    
    // Auto-detect from browser
    const browserLang = navigator.language || navigator.userLanguage || 'en';
    const detected = browserLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    return detected;
  });

  const [dir, setDir] = useState(isRTL(language) ? 'rtl' : 'ltr');

  useEffect(() => {
    // Update dir when language changes
    const newDir = isRTL(language) ? 'rtl' : 'ltr';
    setDir(newDir);
    document.documentElement.setAttribute('dir', newDir);
    document.documentElement.setAttribute('lang', language);
    
    // Save to localStorage
    saveLanguage(language);
  }, [language]);

  const changeLanguage = (newLang) => {
    setLanguage(newLang);
    saveLanguage(newLang);
  };

  const value = {
    language,
    setLanguage: changeLanguage,
    dir,
    isRTL: isRTL(language),
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export default LocalizationContext;
