/**
 * SocialFollowGate — a mandatory follow-us modal shown to NEW visitors once.
 * On first visit:
 *   - Blocks the main site with a beautiful full-screen gate
 *   - User must click each social link (we open in new tab)
 *   - Once user clicks "تابعتُ جميع الصفحات - ادخل الموقع" → sets localStorage flag → never shown again
 *
 * The flag is stored in localStorage key: `bh_social_gate_v1_completed`.
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Facebook, Instagram, Check, Scissors, Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'bh_social_gate_v1_completed';

// Custom TikTok icon (lucide doesn't have one)
const TikTokIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

const DEFAULT_LINKS = {
  facebook: 'https://www.facebook.com/share/1Rs76LaVkS/',
  instagram: 'https://instagram.com/barber.hub2',
  tiktok: 'https://tiktok.com/@barber.hub2',
};

/**
 * Build a URL that prefers opening the native app on mobile, and the normal
 * web URL on desktop. Uses fb://, instagram://, snssdk1233:// schemes where
 * possible.
 */
const buildAppIntent = (platform, webUrl) => {
  if (typeof navigator === 'undefined' || !webUrl) return webUrl;
  const ua = navigator.userAgent || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  if (!isMobile) return webUrl;

  try {
    if (platform === 'facebook') {
      // Use fb://facewebmodal to open inside Facebook app
      return `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`;
    }
    if (platform === 'instagram') {
      // Extract handle from URL (https://instagram.com/handle or /@handle)
      const match = webUrl.match(/instagram\.com\/(?:@)?([^/?#]+)/i);
      const handle = match ? match[1] : '';
      return handle ? `instagram://user?username=${handle}` : webUrl;
    }
    if (platform === 'tiktok') {
      const match = webUrl.match(/tiktok\.com\/@?([^/?#]+)/i);
      const handle = match ? match[1].replace(/^@/, '') : '';
      return handle ? `https://www.tiktok.com/@${handle}` : webUrl;
    }
  } catch (_) { /* noop */ }
  return webUrl;
};

const SocialFollowGate = ({ language = 'ar', API }) => {
  const isRTL = language === 'ar';
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState({ facebook: false, instagram: false, tiktok: false });
  const [links, setLinks] = useState(DEFAULT_LINKS);

  // Initialize visibility and load dynamic links from settings
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setVisible(true);
      }
    } catch (e) { /* ignore */ }

    // Load dynamic social links from backend
    if (API) {
      axios.get(`${API}/site-settings`).then(r => {
        const s = r.data || {};
        setLinks({
          facebook:  s.facebook  || DEFAULT_LINKS.facebook,
          instagram: s.instagram || DEFAULT_LINKS.instagram,
          tiktok:    s.tiktok    || DEFAULT_LINKS.tiktok,
        });
      }).catch(() => { /* keep defaults */ });
    }
  }, [API]);

  // Lock body scroll while gate is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [visible]);

  if (!visible) return null;

  const markClicked = (key, href) => {
    setClicked(prev => ({ ...prev, [key]: true }));
    // Open link in new tab. For mobile, try native app intent first.
    if (typeof window !== 'undefined') {
      const intent = buildAppIntent(key, href);
      window.open(intent, '_blank', 'noopener,noreferrer');
      // Fallback: if intent didn't open (e.g. desktop without fb://), the
      // browser will gracefully fall back to the original webUrl for fb://
      // via opener. Nothing extra needed here.
    }
  };

  const allClicked = clicked.facebook && clicked.instagram && clicked.tiktok;

  const proceed = () => {
    if (!allClicked) return;
    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (_) {}
    setVisible(false);
  };

  const platforms = [
    {
      key: 'facebook',
      icon: Facebook,
      name_ar: 'فيسبوك',    name_en: 'Facebook',
      sub_ar: 'تابعنا على فيسبوك', sub_en: 'Follow us on Facebook',
      href: links.facebook,
      bg: 'from-[#1877F2] to-[#0b5fcc]',
      ring: 'ring-[#1877F2]/40',
    },
    {
      key: 'instagram',
      icon: Instagram,
      name_ar: 'انستغرام',  name_en: 'Instagram',
      sub_ar: 'barber.hub2', sub_en: '@barber.hub2',
      href: links.instagram,
      bg: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
      ring: 'ring-[#DD2A7B]/40',
    },
    {
      key: 'tiktok',
      icon: TikTokIcon,
      name_ar: 'تيك توك',   name_en: 'TikTok',
      sub_ar: '@barber.hub2', sub_en: '@barber.hub2',
      href: links.tiktok,
      bg: 'from-black to-gray-900',
      ring: 'ring-white/30',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4"
        style={{ direction: isRTL ? 'rtl' : 'ltr' }}
        data-testid="social-follow-gate"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

        {/* Decorative gold glow blobs */}
        <div className="absolute top-10 -left-20 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-20 w-96 h-96 bg-yellow-600/15 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="relative w-full max-w-lg bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-black border-2 border-amber-400/40 rounded-3xl shadow-[0_20px_80px_-10px_rgba(212,175,55,0.5)] overflow-hidden max-h-[95vh] overflow-y-auto"
        >
          {/* Top accent gradient */}
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500" />

          <div className="px-5 sm:px-8 pt-6 pb-6 sm:pt-7 sm:pb-7">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.6)]">
                  <Scissors className="w-8 h-8 sm:w-10 sm:h-10 text-black" strokeWidth={2.5} />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-300 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-2xl sm:text-3xl font-display font-black mb-2">
              <span className="text-white">{isRTL ? 'مرحباً بك في ' : 'Welcome to '}</span>
              <span className="bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">BARBER HUB</span>
            </h2>
            <p className="text-center text-amber-400/90 text-sm sm:text-base font-semibold mb-1">
              {isRTL ? '✨ قبل الدخول، تابعنا على صفحاتنا ✨' : '✨ Before entering, follow our pages ✨'}
            </p>
            <p className="text-center text-gray-400 text-xs sm:text-sm mb-5">
              {isRTL ? 'ابق على اطلاع بآخر العروض والتحديثات' : 'Stay updated with our latest offers'}
            </p>

            {/* Social buttons */}
            <div className="space-y-2.5 mb-5">
              {platforms.map((p) => {
                const Icon = p.icon;
                const done = clicked[p.key];
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => markClicked(p.key, p.href)}
                    className={`group w-full relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${done ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-amber-400/20 hover:border-amber-400/60 bg-gradient-to-br from-white/5 to-transparent'}`}
                    data-testid={`social-follow-btn-${p.key}`}
                    data-platform={p.key}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-3.5">
                      {/* Icon tile */}
                      <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${p.bg} flex items-center justify-center shadow-lg ring-2 ${p.ring}`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      {/* Label */}
                      <div className="flex-1 min-w-0 text-start">
                        <div className="font-bold text-white text-base sm:text-lg">
                          {isRTL ? p.name_ar : p.name_en}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-400 truncate" dir="ltr">
                          {isRTL ? p.sub_ar : p.sub_en}
                        </div>
                      </div>
                      {/* Status */}
                      {done ? (
                        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="shrink-0 text-amber-400 text-xl font-bold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                          {isRTL ? '‹' : '›'}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Progress indicator */}
            <div className="mb-4" data-testid="social-gate-progress">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400">
                  {isRTL ? 'تقدمك' : 'Progress'}
                </span>
                <span className="text-amber-400 font-bold" data-testid="social-gate-progress-count">
                  {Object.values(clicked).filter(Boolean).length}/3
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(Object.values(clicked).filter(Boolean).length / 3) * 100}%` }}
                  transition={{ type: 'spring', damping: 15 }}
                />
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={proceed}
              disabled={!allClicked}
              className={`w-full py-3.5 rounded-2xl font-bold text-base sm:text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                allClicked
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black hover:shadow-amber-500/30 hover:shadow-xl cursor-pointer'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              data-testid="social-gate-enter-btn"
            >
              {allClicked ? (
                <>
                  <Check className="w-5 h-5" strokeWidth={3} />
                  {isRTL ? 'تابعتُ جميع الصفحات - ادخل الموقع' : 'Followed all pages - Enter Site'}
                </>
              ) : (
                <span>
                  {isRTL
                    ? `يجب النقر على جميع الصفحات (${Object.values(clicked).filter(Boolean).length}/3)`
                    : `Click on all pages (${Object.values(clicked).filter(Boolean).length}/3)`}
                </span>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-500 mt-3">
              {isRTL
                ? 'شكراً لدعمك! هذه الخطوة لمرة واحدة فقط.'
                : 'Thanks for your support! This step is shown only once.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SocialFollowGate;
