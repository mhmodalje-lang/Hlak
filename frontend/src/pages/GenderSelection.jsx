import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Scissors, Sparkles } from 'lucide-react';

const GenderSelection = () => {
  const navigate = useNavigate();
  const { setGender, language, setLanguage } = useApp();

  const handleSelect = (selectedGender) => {
    setGender(selectedGender);
    navigate('/home');
  };

  const texts = {
    ar: {
      welcome: 'مرحباً بك في',
      brand: 'BARBER HUB',
      tagline: 'منصة الحجز الذكية للحلاقين والصالونات',
      men: 'رجال',
      menDesc: 'حلاقين محترفين',
      women: 'نساء',
      womenDesc: 'صالونات تجميل',
      selectGender: 'اختر القسم'
    },
    en: {
      welcome: 'Welcome to',
      brand: 'BARBER HUB',
      tagline: 'Smart Booking Platform for Barbers & Salons',
      men: 'Men',
      menDesc: 'Professional Barbers',
      women: 'Women',
      womenDesc: 'Beauty Salons',
      selectGender: 'Select Section'
    }
  };

  const t = texts[language] || texts.ar;

  return (
    <div className="gender-split" data-testid="gender-selection-page">
      {/* Language Toggle */}
      <button
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full text-sm font-medium border border-white/20 hover:bg-white/20 transition-all"
        data-testid="language-toggle"
      >
        {language === 'ar' ? 'English' : 'العربية'}
      </button>

      {/* Men's Side */}
      <div
        className="gender-side group"
        onClick={() => handleSelect('male')}
        data-testid="select-male"
      >
        <div
          className="gender-side-bg"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1773904215697-e6c21fc27ac2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85)`
          }}
        />
        <div className="gender-overlay gender-overlay-men">
          <div className="animate-fade-in">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center group-hover:animate-pulse-gold">
              <Scissors className="w-12 h-12 text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white font-display mb-4">
              {t.men}
            </h2>
            <p className="text-xl text-[#94A3B8] font-arabic">
              {t.menDesc}
            </p>
            <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="btn-primary-men px-8 py-3 rounded-lg inline-block">
                {language === 'ar' ? 'ادخل' : 'Enter'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Women's Side */}
      <div
        className="gender-side group"
        onClick={() => handleSelect('female')}
        data-testid="select-female"
      >
        <div
          className="gender-side-bg"
          style={{
            backgroundImage: `url(https://images.pexels.com/photos/7195812/pexels-photo-7195812.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)`
          }}
        />
        <div className="gender-overlay gender-overlay-women">
          <div className="animate-fade-in">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#B76E79]/20 flex items-center justify-center group-hover:animate-pulse-rose">
              <Sparkles className="w-12 h-12 text-[#B76E79]" strokeWidth={1.5} />
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#1C1917] font-display mb-4">
              {t.women}
            </h2>
            <p className="text-xl text-[#57534E] font-arabic">
              {t.womenDesc}
            </p>
            <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <span className="btn-primary-women px-8 py-3 rounded-lg inline-block">
                {language === 'ar' ? 'ادخل' : 'Enter'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Logo */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <div className="text-center animate-scale-in">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">{t.welcome}</p>
          <h1 className="text-4xl sm:text-5xl font-bold font-display bg-gradient-to-r from-[#D4AF37] via-white to-[#B76E79] bg-clip-text text-transparent">
            {t.brand}
          </h1>
          <p className="text-xs mt-2 text-white/40 font-arabic">{t.tagline}</p>
        </div>
      </div>
    </div>
  );
};

export default GenderSelection;
