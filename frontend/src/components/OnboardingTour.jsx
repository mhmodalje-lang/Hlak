/**
 * BARBER HUB - Onboarding Tour (first-visit overlay)
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Brain, Calendar, X, ArrowRight, Gift } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

const ONBOARDING_KEY = 'barber_hub_onboarded_v1';

const OnboardingTour = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        // Slight delay so first render settles
        const t = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const steps = isAr ? [
    { icon: Sparkles, title: 'أهلاً في BARBER HUB!', body: 'المنصة العالمية لحجز أفضل الحلاقين والصالونات.' },
    { icon: MapPin, title: 'اعثر على الأفضل بقربك', body: 'خرائط تفاعلية + ترتيب ذكي حسب موقعك وتقييمات المستخدمين.' },
    { icon: Brain, title: 'استشارة ذكية بالذكاء الاصطناعي', body: 'جرّب قصات الشعر افتراضياً قبل الحجز، واطلب توصيات مخصصة لك.' },
    { icon: Calendar, title: 'احجز بنقرة واحدة', body: 'اختر موعدك ودفعك بسهولة. لن تضيّع وقتك في الانتظار.' },
    { icon: Gift, title: 'ابدأ رحلتك', body: 'تصفح كضيف أو سجّل لتحصل على تجربة كاملة.' },
  ] : [
    { icon: Sparkles, title: 'Welcome to BARBER HUB!', body: 'The world-class platform to book elite barbers and salons.' },
    { icon: MapPin, title: 'Find the best nearby', body: 'Interactive maps + smart ranking by location and reviews.' },
    { icon: Brain, title: 'AI-powered advice', body: 'Virtually try hairstyles before you book and get custom recommendations.' },
    { icon: Calendar, title: 'Book in one tap', body: 'Pick a slot, pay instantly. No more waiting in line.' },
    { icon: Gift, title: 'Start your journey', body: 'Browse as guest or sign up for the full experience.' },
  ];

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    setOpen(false);
  };

  if (!open) return null;
  const s = steps[step];
  const Icon = s.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
          className="relative w-full max-w-md bg-gradient-to-br from-white to-amber-50 dark:from-neutral-900 dark:to-neutral-800 rounded-3xl shadow-2xl p-8 border-2 border-amber-300 dark:border-amber-700"
        >
          <button onClick={finish} aria-label="close" className="absolute top-3 right-3 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X size={18} className="text-neutral-500" />
          </button>
          <div className="text-center">
            <motion.div
              key={step}
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-800 mb-4 shadow-lg"
            >
              <Icon className="text-white" size={32} />
            </motion.div>
            <motion.h2 key={`t-${step}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              {s.title}
            </motion.h2>
            <motion.p key={`b-${step}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-neutral-600 dark:text-neutral-300 mb-6">
              {s.body}
            </motion.p>
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-amber-600' : i < step ? 'w-1.5 bg-amber-400' : 'w-1.5 bg-neutral-300 dark:bg-neutral-700'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border-2 border-amber-300 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/30">
                  {isAr ? 'السابق' : 'Back'}
                </button>
              )}
              {step < steps.length - 1 ? (
                <button onClick={() => setStep(step + 1)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-semibold flex items-center justify-center gap-2">
                  {isAr ? 'التالي' : 'Next'}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button onClick={finish} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-semibold">
                  {isAr ? 'هيا نبدأ' : "Let's start"}
                </button>
              )}
            </div>
            <button onClick={finish} className="mt-4 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300">
              {isAr ? 'تخطي' : 'Skip tour'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
