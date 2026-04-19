/**
 * BARBER HUB - Gender Selection (Dark Neo-Luxury)
 * First Impression VIP Experience
 * Features: Glassmorphism, Custom Icons, Mobile-First, RTL Support
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { motion } from 'framer-motion';
import LanguageToggle from '@/components/LanguageToggle';

// Import custom icons
import { Shears, Crown, Star, ArrowRight, ArrowLeft } from '@/components/icons';

const GenderSelection = () => {
  const navigate = useNavigate();
  const { setGender } = useApp();
  const { language } = useLocalization();
  const [hoveredSide, setHoveredSide] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSelect = (selectedGender) => {
    setGender(selectedGender);
    navigate('/home');
  };

  const isRTL = language === 'ar';
  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  const t = language === 'ar' ? {
    men: 'رجال', menDesc: 'حلاقون محترفون على مستوى عالمي',
    women: 'نساء', womenDesc: 'صالونات تجميل راقية',
    enter: 'ادخل الآن', or: 'أو', luxury: 'فاخر', elegance: 'أناقة'
  } : {
    men: 'Men', menDesc: 'World-class professional barbers',
    women: 'Women', womenDesc: 'Premium beauty salons',
    enter: 'Enter Now', or: 'OR', luxury: 'LUXURY', elegance: 'ELEGANCE'
  };

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bh-surface"
      style={{ minHeight: '100dvh' }}
      data-testid="gender-selection-page"
    >
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 left-0 opacity-20" />
      <div className="bh-orb bh-orb-burgundy w-80 h-80 bottom-0 right-0 opacity-15" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bh-safe-top">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bh-gold)] to-[var(--bh-gold-dark)] flex items-center justify-center shadow-lg shadow-black/50">
              <Shears className="w-5 h-5 text-[var(--bh-obsidian)]" strokeWidth={2} />
            </div>
            <span className="text-white/90 font-display font-bold tracking-widest text-sm hidden sm:inline">
              BARBER HUB
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LanguageToggle compact />
          </motion.div>
        </div>
      </div>

      {/* Mobile Logo Badge */}
      <div className="md:hidden absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={mounted ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.4, type: 'spring' }}
          className="bh-glass px-5 py-2 rounded-full border border-[var(--bh-gold)]/30"
        >
          <h1 className="text-sm font-display font-black bh-gold-text whitespace-nowrap tracking-wider">
            BARBER · HUB
          </h1>
        </motion.div>
      </div>

      {/* Split Container */}
      <div className="relative flex flex-col md:flex-row w-full h-screen" style={{ minHeight: '100dvh' }}>
        
        {/* MEN Side */}
        <motion.div
          initial={{ x: isRTL ? '100%' : '-100%', opacity: 0 }}
          animate={mounted ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHoveredSide('men')}
          onMouseLeave={() => setHoveredSide(null)}
          onClick={() => handleSelect('male')}
          className="relative flex-1 cursor-pointer overflow-hidden group"
          data-testid="select-male"
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms]"
            style={{
              backgroundImage: `url(/images/ai/hero_home.png)`,
              transform: hoveredSide === 'men' ? 'scale(1.08)' : 'scale(1)',
              filter: hoveredSide === 'women' ? 'brightness(0.3) blur(4px)' : 'brightness(0.6)',
            }}
          />

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--bh-obsidian)]/70 via-transparent to-[var(--bh-charcoal)]/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bh-obsidian)] via-transparent to-transparent" />

          {/* Gold Ambient Glow */}
          <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[var(--bh-gold)]/10 blur-[120px] pointer-events-none" />

          {/* Content */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 pt-32 pb-12 md:p-8 z-10">
            
            {/* Icon Circle */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={mounted ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-6 relative bh-glass-hi"
              style={{
                boxShadow: hoveredSide === 'men' 
                  ? '0 0 60px rgba(212,175,55,0.6), inset 0 2px 10px rgba(255,255,255,0.1)' 
                  : '0 0 30px rgba(212,175,55,0.3)',
                border: '2px solid var(--bh-gold)',
              }}
            >
              <Shears className="w-12 h-12 md:w-16 md:h-16 text-[var(--bh-gold)]" strokeWidth={1.5} />
              
              {/* Pulse Ring on Hover */}
              {hoveredSide === 'men' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-[var(--bh-gold)]"
                />
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-display font-bold bh-gold-text mb-4 tracking-tight text-center"
            >
              {t.men}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.85 }}
              className="text-base sm:text-lg lg:text-xl text-[var(--bh-text-secondary)] text-center max-w-sm font-body px-4"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
            >
              {t.menDesc}
            </motion.p>

            {/* Desktop Hover CTA */}
            <motion.div
              animate={{
                opacity: hoveredSide === 'men' ? 1 : 0,
                y: hoveredSide === 'men' ? 0 : 20,
              }}
              transition={{ duration: 0.3 }}
              className="mt-8 hidden md:block"
            >
              <div className="bh-btn bh-btn-primary text-lg inline-flex items-center gap-2">
                {t.enter} <ChevronIcon className="w-5 h-5" />
              </div>
            </motion.div>

            {/* Mobile CTA Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect('male'); }}
              className="md:hidden mt-6 bh-btn bh-btn-primary inline-flex items-center gap-2"
              data-testid="mobile-men-cta"
            >
              {t.enter} <ChevronIcon className="w-5 h-5" />
            </button>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 1.1 }}
              className="mt-8 hidden sm:flex gap-3"
            >
              {[
                { icon: '✂️', label: 'Cut' },
                { icon: '👑', label: 'VIP' },
                { icon: '💈', label: 'Style' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-glass-border)] flex items-center justify-center text-xl backdrop-blur-md"
                  title={item.label}
                >
                  {item.icon}
                </div>
              ))}
            </motion.div>
          </div>

          {/* LUXURY Badge */}
          <div className={`absolute ${isRTL ? 'right-4 md:right-6' : 'left-4 md:left-6'} top-32 md:top-24 bh-vip-badge z-20`}>
            <Crown className="w-3.5 h-3.5" />
            <span>{t.luxury}</span>
          </div>
        </motion.div>

        {/* Mobile Divider */}
        <div className="md:hidden relative h-12 bg-gradient-to-b from-[var(--bh-obsidian)] via-[var(--bh-charcoal)] to-[var(--bh-obsidian)] flex items-center justify-center">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--bh-gold)]/40 to-transparent" />
          <div className="relative z-10 bg-[var(--bh-obsidian)] px-4 text-xs tracking-[0.3em] text-[var(--bh-gold)]/70 uppercase font-bold">
            {t.or}
          </div>
        </div>

        {/* WOMEN Side */}
        <motion.div
          initial={{ x: isRTL ? '-100%' : '100%', opacity: 0 }}
          animate={mounted ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHoveredSide('women')}
          onMouseLeave={() => setHoveredSide(null)}
          onClick={() => handleSelect('female')}
          className="relative flex-1 cursor-pointer overflow-hidden group"
          data-testid="select-female"
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-[1200ms]"
            style={{
              backgroundImage: `url(/images/ai/women_cover.png)`,
              transform: hoveredSide === 'women' ? 'scale(1.08)' : 'scale(1)',
              filter: hoveredSide === 'men' ? 'brightness(0.3) blur(4px)' : 'brightness(0.65) saturate(1.1)',
            }}
          />

          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-bl from-[#6E1E2B]/60 via-transparent to-[var(--bh-charcoal)]/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bh-obsidian)] via-transparent to-transparent" />

          {/* Burgundy Ambient Glow */}
          <div className="absolute top-1/4 left-0 w-[300px] h-[300px] rounded-full bg-[#B76E79]/10 blur-[120px] pointer-events-none" />

          {/* Content */}
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 pt-32 pb-12 md:p-8 z-10">
            
            {/* Icon Circle */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={mounted ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.8, type: 'spring' }}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center mb-6 relative bh-glass-hi"
              style={{
                boxShadow: hoveredSide === 'women' 
                  ? '0 0 60px rgba(183,110,121,0.6), inset 0 2px 10px rgba(255,255,255,0.1)' 
                  : '0 0 30px rgba(183,110,121,0.3)',
                border: '2px solid #B76E79',
              }}
            >
              <Star className="w-12 h-12 md:w-16 md:h-16 text-[#F5A6B8]" strokeWidth={1.5} />
              
              {/* Pulse Ring on Hover */}
              {hoveredSide === 'women' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-[#F5A6B8]"
                />
              )}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-display font-bold mb-4 tracking-tight text-center"
              style={{
                background: 'linear-gradient(135deg, #F5A6B8 0%, #ffffff 50%, #E7C6CE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t.women}
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.95 }}
              className="text-base sm:text-lg lg:text-xl text-[#F5A6B8]/90 text-center max-w-sm font-body px-4"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
            >
              {t.womenDesc}
            </motion.p>

            {/* Desktop Hover CTA */}
            <motion.div
              animate={{
                opacity: hoveredSide === 'women' ? 1 : 0,
                y: hoveredSide === 'women' ? 0 : 20,
              }}
              transition={{ duration: 0.3 }}
              className="mt-8 hidden md:block"
            >
              <div
                className="bh-btn text-lg inline-flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #B76E79, #6E1E2B)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(183,110,121,0.4)',
                }}
              >
                {t.enter} <ChevronIcon className="w-5 h-5" />
              </div>
            </motion.div>

            {/* Mobile CTA Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect('female'); }}
              className="md:hidden mt-6 bh-btn inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #B76E79, #6E1E2B)',
                color: 'white',
                boxShadow: '0 4px 20px rgba(183,110,121,0.4)',
              }}
              data-testid="mobile-women-cta"
            >
              {t.enter} <ChevronIcon className="w-5 h-5" />
            </button>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 1.2 }}
              className="mt-8 hidden sm:flex gap-3"
            >
              {[
                { icon: '💅', label: 'Nails' },
                { icon: '💄', label: 'Makeup' },
                { icon: '✨', label: 'Beauty' }
              ].map((item, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border border-[#F5A6B8]/30 flex items-center justify-center text-xl backdrop-blur-md"
                  style={{ background: 'rgba(183,110,121,0.1)' }}
                  title={item.label}
                >
                  {item.icon}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ELEGANCE Badge */}
          <div className={`absolute ${isRTL ? 'left-4 md:left-6' : 'right-4 md:right-6'} top-32 md:top-24 z-20`}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold"
              style={{
                background: 'rgba(183,110,121,0.2)',
                borderColor: 'rgba(245,166,184,0.4)',
                color: '#F5A6B8',
              }}
            >
              <Star className="w-3.5 h-3.5" />
              <span>{t.elegance}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Desktop Center Divider */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={mounted ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: 1.2, type: 'spring' }}
          className="bh-glass px-6 py-3 rounded-full border border-[var(--bh-gold)]/30"
        >
          <span className="text-xs tracking-[0.3em] text-[var(--bh-gold)] uppercase font-bold">
            {t.or}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default GenderSelection;
