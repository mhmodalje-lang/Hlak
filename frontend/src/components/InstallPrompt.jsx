import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles, ShieldCheck, Zap, Bell, Scissors, Apple, Share, PlusSquare, HelpCircle } from 'lucide-react';
import usePWA from '@/hooks/usePWA';
import { useApp } from '@/App';
import InstallHelpModal from '@/components/InstallHelpModal';

const STORAGE_KEY = 'bh_install_prompt_state_v1';
const DISMISS_HOURS = 48; // re-show after 48h if dismissed

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

const T = {
  ar: {
    title: 'ثبِّت تطبيق BARBER HUB',
    subtitle: 'تجربة أسرع — حجز بلمسة — إشعارات ذكية',
    featFast: 'تشغيل فوري',
    featSecure: 'آمن وموثق من Google',
    featOffline: 'يعمل دون إنترنت',
    featNotif: 'تذكير بالحجوزات',
    installBtn: 'تحميل التطبيق الآن',
    installing: 'جارٍ التثبيت…',
    later: 'لاحقاً',
    iosTitle: 'ثبيت على iPhone / iPad',
    iosStep1: 'اضغط على زر المشاركة',
    iosStep2: 'اختر "إضافة إلى الشاشة الرئيسية"',
    iosStep3: 'اضغط "إضافة" للتأكيد',
    trust: 'تثبيت مجاني • بدون متجر • موافق لمعايير Chrome و Google',
    installed: '✓ تم تثبيت التطبيق',
    notifTitle: 'فعّل الإشعارات',
    notifSub: 'لاستلام تذكيرات الحجوزات وعروض حصرية',
    enableNotif: 'تفعيل الإشعارات',
    notifOn: '✓ الإشعارات مفعلة',
    updateTitle: 'تحديث جديد متاح',
    updateSub: 'اضغط لتحديث التطبيق إلى آخر إصدار',
    updateBtn: 'تحديث الآن',
    gotWarning: 'ظهر تحذير عند التثبيت؟',
    orApk: 'أو حمّل APK الأندرويد مباشرة (موقّع Android 15)',
    apkDirect: 'تحميل APK للأندرويد',
  },
  en: {
    title: 'Install BARBER HUB App',
    subtitle: 'Faster experience — one-tap booking — smart notifications',
    featFast: 'Instant launch',
    featSecure: 'Google-trusted & secure',
    featOffline: 'Works offline',
    featNotif: 'Booking reminders',
    installBtn: 'Install App Now',
    installing: 'Installing…',
    later: 'Later',
    iosTitle: 'Install on iPhone / iPad',
    iosStep1: 'Tap the Share button',
    iosStep2: 'Choose "Add to Home Screen"',
    iosStep3: 'Tap "Add" to confirm',
    trust: 'Free install • No store needed • Meets Chrome & Google PWA criteria',
    installed: '✓ App installed',
    notifTitle: 'Enable Notifications',
    notifSub: 'Get booking reminders and exclusive offers',
    enableNotif: 'Enable Notifications',
    notifOn: '✓ Notifications enabled',
    updateTitle: 'New update available',
    updateSub: 'Tap to refresh to the latest version',
    updateBtn: 'Update Now',
    gotWarning: 'Got a warning on install?',
    orApk: 'Or download signed Android APK (targets Android 15)',
    apkDirect: 'Download Android APK',
  }
};

export default function InstallPrompt() {
  const { language } = useApp() || { language: 'ar' };
  const isAr = language === 'ar';
  const tr = T[isAr ? 'ar' : 'en'];
  const {
    canInstall, isInstalled, isIOS, isStandalone, promptInstall,
    notifPermission, requestNotificationPermission,
    updateAvailable, applyUpdate,
  } = usePWA();

  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const state = useMemo(() => readState(), []);

  // Decide whether to show the prompt
  useEffect(() => {
    // CRITICAL: Never show if standalone or installed
    if (isStandalone || isInstalled) {
      setVisible(false);
      return;
    }
    
    const s = readState();
    const now = Date.now();
    
    // Don't show if dismissed recently
    if (s.dismissedAt && (now - s.dismissedAt) < DISMISS_HOURS * 3600 * 1000) {
      setVisible(false);
      return;
    }
    
    // Don't show if already installed
    if (s.installed) {
      setVisible(false);
      return;
    }
    
    // Check if we already showed it in this session
    if (sessionStorage.getItem('bh_prompt_shown_session') === 'true') {
      setVisible(false);
      return;
    }

    // Use longer delay on gender selection page (let user pick first)
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isGenderPage = path === '/' || path === '/gender-selection';
    const delay = isGenderPage ? 8000 : 3000;

    const timer = setTimeout(() => {
      if (canInstall || isIOS) {
        setVisible(true);
        sessionStorage.setItem('bh_prompt_shown_session', 'true');
      } else {
        // Still show generic banner (manual install instructions) for other browsers
        setVisible(true);
        sessionStorage.setItem('bh_prompt_shown_session', 'true');
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [canInstall, isIOS, isInstalled, isStandalone]);

  // After install, suggest enabling notifications
  useEffect(() => {
    if (isStandalone && notifPermission === 'default') {
      const t = setTimeout(() => setShowNotifBanner(true), 4500);
      return () => clearTimeout(t);
    }
  }, [isStandalone, notifPermission]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS: show instructions modal (no prompt available)
      return;
    }
    setInstalling(true);
    const choice = await promptInstall();
    setInstalling(false);
    if (choice && choice.outcome === 'accepted') {
      setJustInstalled(true);
      writeState({ ...state, installed: true, installedAt: Date.now() });
      setTimeout(() => setVisible(false), 1500);
    } else if (choice && choice.outcome === 'dismissed') {
      writeState({ ...state, dismissedAt: Date.now() });
      setVisible(false);
    }
  };

  const handleLater = () => {
    writeState({ ...state, dismissedAt: Date.now() });
    setVisible(false);
  };

  const handleEnableNotif = async () => {
    const p = await requestNotificationPermission();
    if (p === 'granted') {
      setShowNotifBanner(false);
    } else {
      setShowNotifBanner(false);
    }
  };

  // UPDATE banner (top) — always visible if updateAvailable
  const UpdateBanner = () => (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-[#D4AF37] via-[#F5D773] to-[#D4AF37] text-[#0A0605] px-4 py-2.5 flex items-center justify-between shadow-xl"
          data-testid="pwa-update-banner"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-bold">{tr.updateTitle}</span>
            <span className="text-xs opacity-80 hidden sm:inline">— {tr.updateSub}</span>
          </div>
          <button
            onClick={applyUpdate}
            className="bg-[#0A0605] text-[#F5D773] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-[#1A120A]"
            data-testid="pwa-update-btn"
          >
            {tr.updateBtn}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const NotifBanner = () => (
    <AnimatePresence>
      {showNotifBanner && notifPermission !== 'granted' && notifPermission !== 'denied' && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[9997] bg-gradient-to-br from-[#1A120A] to-[#0A0605] border border-[#D4AF37]/40 rounded-2xl p-4 shadow-2xl"
          data-testid="pwa-notif-banner"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-[#0A0605]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#F5D773] font-bold text-sm">{tr.notifTitle}</div>
              <div className="text-[#F5D773]/60 text-xs mt-1">{tr.notifSub}</div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEnableNotif}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#0A0605] px-3 py-1.5 rounded-full text-xs font-bold"
                  data-testid="enable-notif-btn"
                >
                  {tr.enableNotif}
                </button>
                <button
                  onClick={() => setShowNotifBanner(false)}
                  className="text-[#F5D773]/60 px-3 py-1.5 text-xs"
                >
                  {tr.later}
                </button>
              </div>
            </div>
            <button onClick={() => setShowNotifBanner(false)} className="text-[#F5D773]/40 hover:text-[#F5D773]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <UpdateBanner />
      <NotifBanner />

      <AnimatePresence>
        {visible && !isStandalone && !isInstalled && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] bh-safe-bottom"
              onClick={handleLater}
              data-testid="pwa-backdrop"
            />
            {/* Bottom Sheet - Mobile Safe Area */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[9999] max-w-xl mx-auto pb-safe"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              data-testid="pwa-install-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-title"
            >
              <div className="relative bg-gradient-to-br from-[#1A120A] via-[#120A05] to-[#0A0605] border-t-2 border-[#D4AF37]/60 rounded-t-3xl shadow-[0_-20px_60px_rgba(212,175,55,0.25)] overflow-hidden">
                {/* Gold accent glow */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 bg-[#D4AF37]/20 blur-3xl pointer-events-none" />

                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1 rounded-full bg-[#D4AF37]/30" />
                </div>

                {/* Close */}
                <button
                  onClick={handleLater}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-[#F5D773]/70 hover:text-[#F5D773] transition"
                  aria-label="Close"
                  data-testid="pwa-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-6 pb-6 pt-2">
                  {/* Logo + Title */}
                  <div className="flex items-center gap-4 mb-5">
                    <motion.div
                      initial={{ scale: 0.6, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.15, type: 'spring' }}
                      className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#B8941F] to-[#8B6914] flex items-center justify-center shadow-[0_8px_32px_rgba(212,175,55,0.5)] shrink-0"
                    >
                      <Scissors className="w-10 h-10 text-[#0A0605]" strokeWidth={2.5} />
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0A0605] flex items-center justify-center border-2 border-[#D4AF37]">
                        <ShieldCheck className="w-2.5 h-2.5 text-[#D4AF37]" />
                      </div>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 id="pwa-title" className="text-xl md:text-2xl font-black text-[#F5D773] leading-tight">
                        {justInstalled ? tr.installed : tr.title}
                      </h3>
                      <p className="text-[#F5D773]/70 text-sm mt-1">{tr.subtitle}</p>
                    </div>
                  </div>

                  {/* Features grid */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <Feature icon={<Zap className="w-4 h-4" />} label={tr.featFast} />
                    <Feature icon={<ShieldCheck className="w-4 h-4" />} label={tr.featSecure} />
                    <Feature icon={<Download className="w-4 h-4" />} label={tr.featOffline} />
                    <Feature icon={<Bell className="w-4 h-4" />} label={tr.featNotif} />
                  </div>

                  {/* iOS Instructions (for Safari/iOS) */}
                  {isIOS ? (
                    <div className="bg-black/30 border border-[#D4AF37]/20 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Apple className="w-5 h-5 text-[#F5D773]" />
                        <span className="text-[#F5D773] font-bold text-sm">{tr.iosTitle}</span>
                      </div>
                      <ol className="space-y-2 text-[#F5D773]/80 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A0605] font-bold text-xs flex items-center justify-center shrink-0">1</span>
                          <span>{tr.iosStep1}</span>
                          <Share className="w-4 h-4 text-[#F5D773]/60 ml-auto" />
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A0605] font-bold text-xs flex items-center justify-center shrink-0">2</span>
                          <span>{tr.iosStep2}</span>
                          <PlusSquare className="w-4 h-4 text-[#F5D773]/60 ml-auto" />
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-[#0A0605] font-bold text-xs flex items-center justify-center shrink-0">3</span>
                          <span>{tr.iosStep3}</span>
                        </li>
                      </ol>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleInstall}
                      disabled={installing || justInstalled}
                      className="relative w-full bg-gradient-to-r from-[#D4AF37] via-[#F5D773] to-[#D4AF37] text-[#0A0605] font-black text-base md:text-lg py-4 rounded-2xl shadow-[0_8px_32px_rgba(212,175,55,0.5)] flex items-center justify-center gap-2 disabled:opacity-60 overflow-hidden group"
                      data-testid="pwa-install-btn"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      {justInstalled ? (
                        <><ShieldCheck className="w-5 h-5" /> {tr.installed}</>
                      ) : installing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-[#0A0605]/30 border-t-[#0A0605] rounded-full animate-spin" />
                          {tr.installing}
                        </>
                      ) : (
                        <><Download className="w-5 h-5" /> {tr.installBtn}</>
                      )}
                    </motion.button>
                  )}

                  <button
                    onClick={handleLater}
                    className="w-full text-center py-3 text-[#F5D773]/50 hover:text-[#F5D773]/80 text-sm transition"
                    data-testid="pwa-later-btn"
                  >
                    {tr.later}
                  </button>

                  {/* Direct APK Download - Android only, hidden on iOS */}
                  {!isIOS && (
                    <>
                      <div className="relative flex items-center justify-center my-2">
                        <span className="absolute inset-x-0 h-px bg-[#D4AF37]/15" />
                        <span className="relative bg-gradient-to-br from-[#1A120A] via-[#120A05] to-[#0A0605] px-3 text-[10px] tracking-widest text-[#D4AF37]/50 uppercase">
                          {tr.orApk}
                        </span>
                      </div>
                      <a
                        href="/downloads/BarberHub.apk"
                        download="BarberHub.apk"
                        className="w-full bg-[#1A120A] border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] text-[#F5D773] font-bold text-sm py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
                        data-testid="pwa-apk-direct-btn"
                      >
                        <Download className="w-4 h-4" />
                        {tr.apkDirect}
                        <span className="text-[10px] bg-[#D4AF37]/20 text-[#F5D773] px-2 py-0.5 rounded-full font-normal">
                          1.5MB · v1.0
                        </span>
                      </a>
                    </>
                  )}

                  {/* Warning help link */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHelp(true); }}
                    className="w-full flex items-center justify-center gap-1.5 text-[#D4AF37]/70 hover:text-[#D4AF37] text-xs underline underline-offset-2 pb-1 pt-3 transition"
                    data-testid="pwa-help-btn"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    {tr.gotWarning}
                  </button>

                  {/* Trust line */}
                  <div className="flex items-center justify-center gap-2 mt-2 pt-3 border-t border-[#D4AF37]/10">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]/70" />
                    <span className="text-[10px] md:text-xs text-[#F5D773]/50 text-center">{tr.trust}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <InstallHelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </>
  );
}

function Feature({ icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-black/30 border border-[#D4AF37]/15 rounded-xl px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37]/30 to-[#8B6914]/30 flex items-center justify-center text-[#D4AF37] shrink-0">
        {icon}
      </div>
      <span className="text-[#F5D773]/90 text-xs font-semibold leading-tight">{label}</span>
    </div>
  );
}
