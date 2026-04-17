import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { motion, useAnimation } from 'framer-motion';
import { Scissors, Sparkles, ChevronRight, ChevronLeft, Crown, Star } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import { t as tr, isRTL } from '@/lib/i18n';

const GenderSelection = () => {
  const navigate = useNavigate();
  const { setGender, language, setLanguage } = useApp();
  const [hoveredSide, setHoveredSide] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSelect = (selectedGender) => {
    setGender(selectedGender);
    navigate('/home');
  };

  const T = (k) => tr(language, k);
  const chevronRight = isRTL(language) ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0A0605]" data-testid="gender-selection-page">
      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center">
            <Scissors className="w-5 h-5 text-[#1A120A]" />
          </div>
          <span className="text-white/80 font-bold tracking-widest text-sm hidden sm:inline">BARBER HUB</span>
        </div>
        <div className="pointer-events-auto">
          <LanguageSelector value={language} onChange={setLanguage} variant="dark" />
        </div>
      </div>

      {/* Split container */}
      <div className="flex flex-col md:flex-row w-full h-full">
        {/* MEN Side */}
        <motion.div
          initial={{ x: isRTL(language) ? '100%' : '-100%', opacity: 0 }}
          animate={mounted ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHoveredSide('men')}
          onMouseLeave={() => setHoveredSide(null)}
          onClick={() => handleSelect('male')}
          className="relative flex-1 cursor-pointer overflow-hidden group"
          data-testid="select-male"
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-[1.2s]"
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=85)`,
              transform: hoveredSide === 'men' ? 'scale(1.08)' : 'scale(1)',
              filter: hoveredSide === 'women' ? 'brightness(0.3) blur(4px)' : 'brightness(0.55)',
            }}
          />

          {/* Gradient overlay (espresso/gold) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F0805]/70 via-transparent to-[#1A120A]/90" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0605] via-transparent to-transparent" />

          {/* Decorative particles */}
          <div className="orb orb-gold absolute w-[400px] h-[400px] top-[15%] -right-20" />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center p-8 z-10">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={mounted ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
              className="w-28 h-28 rounded-full flex items-center justify-center mb-6 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(139,105,20,0.1))',
                boxShadow: hoveredSide === 'men' ? '0 0 60px rgba(212,175,55,0.5), inset 0 2px 10px rgba(255,255,255,0.1)' : '0 0 30px rgba(212,175,55,0.2)',
                border: '2px solid rgba(212,175,55,0.4)',
              }}
            >
              <Scissors className="w-14 h-14 text-[#D4AF37]" strokeWidth={1.5} />
              {hoveredSide === 'men' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-[#D4AF37]"
                />
              )}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-bold gradient-text-men mb-4 font-display tracking-tight"
            >
              {T('men')}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.85 }}
              className="text-lg sm:text-xl text-[#E7D9A9] text-center max-w-sm font-medium"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}
            >
              {T('menDesc')}
            </motion.p>

            {/* Hidden CTA that appears on hover */}
            <motion.div
              animate={{
                opacity: hoveredSide === 'men' ? 1 : 0,
                y: hoveredSide === 'men' ? 0 : 20,
              }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <div className="btn-luxury-men inline-flex items-center gap-2 text-lg">
                {T('enter')} {chevronRight}
              </div>
            </motion.div>

            {/* Features pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 1.1 }}
              className="mt-12 flex gap-2 flex-wrap justify-center"
            >
              {['✂️', '👑', '💈'].map((emoji, i) => (
                <span key={i} className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-xl backdrop-blur-sm">
                  {emoji}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Side ribbon */}
          <div className="absolute top-6 right-6 flex items-center gap-1 px-3 py-1 rounded-full bg-[#D4AF37]/20 backdrop-blur-sm border border-[#D4AF37]/40">
            <Crown className="w-3 h-3 text-[#D4AF37]" />
            <span className="text-xs text-[#F3E5AB] font-medium">LUXURY</span>
          </div>
        </motion.div>

        {/* WOMEN Side */}
        <motion.div
          initial={{ x: isRTL(language) ? '-100%' : '100%', opacity: 0 }}
          animate={mounted ? { x: 0, opacity: 1 } : {}}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHoveredSide('women')}
          onMouseLeave={() => setHoveredSide(null)}
          onClick={() => handleSelect('female')}
          className="relative flex-1 cursor-pointer overflow-hidden group"
          data-testid="select-female"
        >
          {/* Background */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-[1.2s]"
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1400&q=85)`,
              transform: hoveredSide === 'women' ? 'scale(1.08)' : 'scale(1)',
              filter: hoveredSide === 'men' ? 'brightness(0.3) blur(4px)' : 'brightness(0.7) saturate(1.1)',
            }}
          />

          {/* Gradient overlay (rose) */}
          <div className="absolute inset-0 bg-gradient-to-bl from-[#FAE5DC]/30 via-transparent to-[#B76E79]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A1520]/60 via-transparent to-transparent" />

          <div className="orb orb-rose absolute w-[400px] h-[400px] top-[15%] -left-20" />

          <div className="relative h-full flex flex-col items-center justify-center p-8 z-10">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={mounted ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
              className="w-28 h-28 rounded-full flex items-center justify-center mb-6 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2))',
                boxShadow: hoveredSide === 'women' ? '0 0 60px rgba(183,110,121,0.5), inset 0 2px 10px rgba(255,255,255,0.3)' : '0 0 30px rgba(183,110,121,0.2)',
                border: '2px solid rgba(255,255,255,0.6)',
              }}
            >
              <Sparkles className="w-14 h-14 text-[#B76E79]" strokeWidth={1.5} />
              {hoveredSide === 'women' && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full border-2 border-[#B76E79]"
                />
              )}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.7 }}
              className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-4 font-display tracking-tight"
              style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
              {T('women')}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={mounted ? { y: 0, opacity: 1 } : {}}
              transition={{ delay: 0.85 }}
              className="text-lg sm:text-xl text-white text-center max-w-sm font-medium"
              style={{ textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
            >
              {T('womenDesc')}
            </motion.p>

            <motion.div
              animate={{
                opacity: hoveredSide === 'women' ? 1 : 0,
                y: hoveredSide === 'women' ? 0 : 20,
              }}
              transition={{ duration: 0.3 }}
              className="mt-8"
            >
              <div className="btn-luxury-women inline-flex items-center gap-2 text-lg">
                {T('enter')} {chevronRight}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 1.1 }}
              className="mt-12 flex gap-2 flex-wrap justify-center"
            >
              {['💄', '✨', '🌸'].map((emoji, i) => (
                <span key={i} className="w-12 h-12 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-xl backdrop-blur-sm">
                  {emoji}
                </span>
              ))}
            </motion.div>
          </div>

          <div className="absolute top-6 left-6 flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/40">
            <Star className="w-3 h-3 text-white fill-white" />
            <span className="text-xs text-white font-medium">ELEGANCE</span>
          </div>
        </motion.div>
      </div>

      {/* Center Logo Badge (overlay) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={mounted ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.8, type: 'spring' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none hidden md:block"
      >
        <div className="relative">
          {/* Vertical divider line */}
          <div className="absolute top-[-200px] bottom-[-200px] left-1/2 w-px bg-gradient-to-b from-transparent via-white/40 to-transparent -translate-x-1/2" />

          <div className="relative bg-[#1A120A]/60 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-3xl px-10 py-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 mb-2">
              {T('welcome')}
            </p>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight">
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B76E79] bg-clip-text text-transparent">
                BARBER
              </span>
              <span className="text-white mx-1">·</span>
              <span className="bg-gradient-to-r from-[#B76E79] via-white to-[#D4AF37] bg-clip-text text-transparent">
                HUB
              </span>
            </h1>
            <p className="text-xs mt-3 text-white/60 max-w-xs">
              {T('taglineGlobal')}
            </p>
            <p className="text-[10px] mt-3 text-[#D4AF37]/80 uppercase tracking-widest">
              ↓ {T('selectGender')} ↓
            </p>
          </div>

          {/* Decorative corner accents */}
          <div className="absolute -top-3 -left-3 w-6 h-6 border-l-2 border-t-2 border-[#D4AF37]" />
          <div className="absolute -top-3 -right-3 w-6 h-6 border-r-2 border-t-2 border-[#B76E79]" />
          <div className="absolute -bottom-3 -left-3 w-6 h-6 border-l-2 border-b-2 border-[#D4AF37]" />
          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-r-2 border-b-2 border-[#B76E79]" />
        </div>
      </motion.div>

      {/* Mobile center logo (smaller) */}
      <div className="md:hidden absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={mounted ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="bg-[#1A120A]/70 backdrop-blur-xl border border-[#D4AF37]/30 rounded-2xl px-5 py-2 text-center"
        >
          <h1 className="text-2xl font-black bg-gradient-to-r from-[#D4AF37] via-white to-[#B76E79] bg-clip-text text-transparent">
            BARBER HUB
          </h1>
        </motion.div>
      </div>

      {/* Bottom tagline */}
      <div className="absolute bottom-4 left-0 right-0 z-30 text-center pointer-events-none">
        <motion.p
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 1.5 }}
          className="text-white/50 text-xs tracking-wider"
        >
          © 2026 BARBER HUB · Global Platform
        </motion.p>
      </div>
    </div>
  );
};

export default GenderSelection;
