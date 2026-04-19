/**
 * BARBER HUB - LanguageToggle Component
 * Minimal luxury language switcher for footer/menu
 */
import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Globe } from 'lucide-react';

const LanguageToggle = ({ className = '', compact = false }) => {
  const { language, setLanguage } = useLocalization();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  if (compact) {
    return (
      <button
        onClick={toggleLanguage}
        className={`bh-btn bh-btn-ghost bh-btn-sm flex items-center gap-2 ${className}`}
        title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{language === 'ar' ? 'EN' : 'عربي'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className={`bh-btn bh-btn-outline flex items-center gap-2 ${className}`}
      title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Globe className="w-5 h-5" />
      <span className="font-medium">
        {language === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  );
};

export default LanguageToggle;
