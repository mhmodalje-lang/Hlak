/**
 * GentoSY-style Home Sections for BARBER HUB
 * Adds to the HomePage:
 *  - "Why Choose BARBER HUB?"  (3 feature cards, dark + gold)
 *  - Subscription Plan (dynamic, based on visitor country)
 *  - "Your Journey with BARBER HUB" (3 steps)
 *  - Testimonials
 *  - Premium Footer (contact info + social from site_settings)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  Clock, ShieldCheck, Award, Rocket, Sparkles, Check, Gift,
  Search, Scissors, CheckCircle2, Quote, Star,
  Phone, Mail, Facebook, Instagram, MessageCircle, Youtube, MapPin, Link as LinkIcon,
  Twitter
} from 'lucide-react';

// ============================================================================
//  WHY CHOOSE US — 3 feature cards
// ============================================================================
export const WhyChooseSection = ({ language }) => {
  const isRTL = language === 'ar';
  const t = isRTL ? {
    title: 'لماذا تختار BARBER HUB؟',
    features: [
      { icon: Clock,       title: 'حجز فوري',          desc: 'احجز موعدك خلال ثوانٍ بدون اتصالات أو انتظار.' },
      { icon: ShieldCheck, title: 'تقييمات موثوقة',    desc: 'جميع التقييمات من عملاء حقيقيين بعد الزيارة.' },
      { icon: Award,       title: 'صالونات معتمدة',    desc: 'نختار الصالونات بعناية لضمان أفضل جودة خدمة.' },
    ],
  } : {
    title: 'Why Choose BARBER HUB?',
    features: [
      { icon: Clock,       title: 'Instant Booking',  desc: 'Book your appointment in seconds — no calls, no waiting.' },
      { icon: ShieldCheck, title: 'Trusted Reviews',  desc: 'All reviews come from real customers after their visit.' },
      { icon: Award,       title: 'Certified Salons', desc: 'Handpicked salons to guarantee top-tier service.' },
    ],
  };

  return (
    <section className="relative py-20 overflow-hidden" data-testid="why-choose-section">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
           style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #D4AF37 2px, transparent 2px), radial-gradient(circle at 80% 70%, #D4AF37 3px, transparent 3px)', backgroundSize: '120px 120px, 180px 180px' }} />
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-3">
            <span className="text-white">{isRTL ? 'لماذا تختار ' : 'Why Choose '}</span>
            <span className="bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">BARBER HUB{isRTL ? '؟' : '?'}</span>
          </h2>
          <div className="flex justify-center">
            <div className="h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative group"
              >
                <div className="relative bg-gradient-to-br from-black/70 to-gray-900/60 backdrop-blur-md border border-amber-500/20 rounded-2xl p-8 text-center hover:border-amber-400/60 transition-all duration-500 hover:-translate-y-1 shadow-xl shadow-amber-500/5">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.25)] group-hover:shadow-[0_0_45px_rgba(212,175,55,0.45)] transition-shadow">
                    <Icon className="w-9 h-9 text-amber-400" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
//  SUBSCRIPTION PLAN — dynamic per country
// ============================================================================
export const SubscriptionPlanSection = ({ API, language, country, countryCode }) => {
  const isRTL = language === 'ar';
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (countryCode) params.country_code = countryCode;
      else if (country) params.country = country;
      const res = await axios.get(`${API}/subscription-plans`, { params });
      const plans = res.data?.plans || [];
      setPlan(plans[0] || null);
    } catch (e) {
      // silent fail — show nothing
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [API, country, countryCode]);

  useEffect(() => { load(); }, [load]);

  if (loading || !plan) return null;

  const badgeText = isRTL ? (plan.badge_text_ar || '') : (plan.badge_text_en || '');
  const title = isRTL ? (plan.title_ar || 'اشتراك احترافي') : (plan.title_en || 'Professional Subscription');
  const desc = isRTL ? (plan.description_ar || '') : (plan.description_en || '');
  const features = isRTL ? (plan.features_ar || []) : (plan.features_en || []);
  const currencySymbol = plan.currency_symbol || plan.currency || '$';
  const priceStr = Number(plan.monthly_price).toLocaleString(isRTL ? 'ar-EG' : 'en-US');

  return (
    <section className="relative py-20" data-testid="plan-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
            <span className="text-white">{isRTL ? 'خطط الاشتراك لـ ' : 'Subscription for '}</span>
            <span className="bg-gradient-to-br from-amber-300 to-yellow-500 bg-clip-text text-transparent">
              {isRTL ? 'صالونات الحلاقة' : 'Barber Salons'}
            </span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base">
            {isRTL
              ? 'ابدأ رحلتك مع BARBER HUB وتمتع بأقوى الأدوات لإدارة وحجز المواعيد'
              : 'Start your BARBER HUB journey with the most powerful booking & management tools'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="max-w-xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden border-2 border-amber-400/40 bg-gradient-to-br from-[#FEF9E6] via-[#FDF3D0] to-[#F5E7B4] shadow-[0_20px_60px_-10px_rgba(212,175,55,0.35)]">
            {/* Badge */}
            {badgeText && (
              <div className="relative pt-6 px-6">
                <div className="relative rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 px-5 py-3 shadow-lg flex items-center justify-between gap-3">
                  <Star className="w-5 h-5 text-black/80 shrink-0" fill="currentColor" />
                  <span className="text-sm md:text-base font-bold text-black text-center flex-1">{badgeText}</span>
                  <span className="w-5 shrink-0" />
                </div>
              </div>
            )}

            <div className="px-6 md:px-8 pt-8 pb-8">
              <h3 className="text-2xl md:text-3xl font-display font-bold text-gray-900 text-center mb-2">{title}</h3>
              {desc && <p className="text-sm text-gray-700 text-center mb-6">{desc}</p>}

              {/* Price block */}
              <div className="rounded-2xl border border-amber-300/60 bg-white/60 backdrop-blur-sm px-5 py-6 mb-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    {plan.free_trial_months > 0 ? (
                      <>
                        <span className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-amber-600 to-yellow-700 bg-clip-text text-transparent">0</span>
                        <span className="text-3xl md:text-4xl font-bold text-amber-700">{currencySymbol}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-5xl md:text-6xl font-bold bg-gradient-to-br from-amber-600 to-yellow-700 bg-clip-text text-transparent">{priceStr}</span>
                        <span className="text-3xl md:text-4xl font-bold text-amber-700">{currencySymbol}</span>
                      </>
                    )}
                  </div>
                  {plan.free_trial_months > 0 && (
                    <div className="mt-2 text-amber-700 font-semibold text-sm">
                      {isRTL ? `أول ${plan.free_trial_months} ${plan.free_trial_months === 1 ? 'شهر' : 'شهرين'} مجاناً` : `First ${plan.free_trial_months} month${plan.free_trial_months > 1 ? 's' : ''} free`}
                    </div>
                  )}
                </div>
                {plan.free_trial_months > 0 && (
                  <div className="mt-4 pt-4 border-t border-amber-300/60 text-center">
                    <span className="text-2xl md:text-3xl font-bold text-gray-900">{priceStr}{currencySymbol}</span>
                    <span className="text-sm text-gray-600 ms-1">
                      {isRTL ? '/شهر بعد ذلك' : `/month after that`}
                    </span>
                  </div>
                )}
              </div>

              {/* CTA button */}
              {plan.subscribe_url ? (
                <a
                  href={plan.subscribe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
                  data-testid="subscribe-btn"
                >
                  <Rocket className="w-5 h-5 inline me-2" />
                  {isRTL ? (plan.free_trial_months > 0 ? 'ابدأ الآن - مجاناً' : 'اشترك الآن') : (plan.free_trial_months > 0 ? 'Start Now - Free' : 'Subscribe Now')}
                </a>
              ) : (
                <Link
                  to="/auth"
                  className="block w-full text-center py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-black font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
                  data-testid="subscribe-btn"
                >
                  <Rocket className="w-5 h-5 inline me-2" />
                  {isRTL ? (plan.free_trial_months > 0 ? 'ابدأ الآن - مجاناً' : 'اشترك الآن') : (plan.free_trial_months > 0 ? 'Start Now - Free' : 'Subscribe Now')}
                </Link>
              )}

              <p className="text-center text-xs text-gray-600 mt-3">
                {isRTL ? 'يمكنك الإلغاء في أي وقت - بدون التزامات' : 'Cancel anytime - no commitment'}
              </p>

              {/* Features */}
              {features.length > 0 && (
                <div className="mt-8 pt-6 border-t border-amber-300/60">
                  <h4 className="text-center text-lg font-display font-bold text-gray-900 mb-5 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    {isRTL ? 'ماذا ستحصل عليه؟' : 'What do you get?'}
                  </h4>
                  <ul className="space-y-3">
                    {features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                        <span className="text-sm text-gray-800 leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
//  YOUR JOURNEY — 3 steps
// ============================================================================
export const JourneySection = ({ language }) => {
  const isRTL = language === 'ar';
  const steps = isRTL ? [
    { num: '01', icon: Search,        title: 'ابحث بسهولة',    desc: 'استكشف أفضل الصالونات في منطقتك وشاهد تقييمات العملاء الحقيقية.' },
    { num: '02', icon: Scissors,      title: 'اختر خدمتك',     desc: 'حدد الخدمات التي تحتاجها، من قص الشعر إلى العناية بالبشرة، بأسعار واضحة.' },
    { num: '03', icon: CheckCircle2,  title: 'تأكيد فوري',     desc: 'احجز موعدك بضغطة زر واستلم تأكيداً فورياً دون الحاجة للانتظار.' },
  ] : [
    { num: '01', icon: Search,        title: 'Search Easily',    desc: 'Browse top salons in your area and read authentic customer reviews.' },
    { num: '02', icon: Scissors,      title: 'Pick Your Service', desc: 'Choose the services you need — from cuts to skincare — at clear prices.' },
    { num: '03', icon: CheckCircle2,  title: 'Instant Confirmation', desc: 'Book with one tap and get instant confirmation. No waiting.' },
  ];

  return (
    <section className="relative py-20" data-testid="journey-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-3">
            <span className="text-white">{isRTL ? 'رحلتك مع ' : 'Your Journey with '}</span>
            <span className="bg-gradient-to-br from-amber-300 to-yellow-500 bg-clip-text text-transparent">BARBER HUB</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            {isRTL ? 'بخطوات بسيطة، احصل على تجربة حلاقة لا مثيل لها' : 'In simple steps, get an unmatched grooming experience'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isDark = idx % 2 === 1;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {/* Floating icon above card */}
                <div className="flex justify-center -mb-8 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${isDark ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-gray-900 to-black border-2 border-amber-500/40'}`}>
                    <Icon className={`w-7 h-7 ${isDark ? 'text-black' : 'text-amber-400'}`} strokeWidth={2} />
                  </div>
                </div>
                <div className={`rounded-3xl p-8 pt-14 relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-gray-900 to-black border border-amber-500/30 text-white' : 'bg-gradient-to-br from-white via-amber-50 to-white border border-amber-200 text-gray-900'}`}>
                  {/* Giant number watermark */}
                  <span className={`absolute -bottom-6 ${isRTL ? '-right-2' : '-left-2'} text-[9rem] font-display font-black leading-none ${isDark ? 'text-white/5' : 'text-amber-200/60'} select-none pointer-events-none`}>
                    {s.num}
                  </span>
                  <div className="relative">
                    <h3 className={`text-2xl font-display font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
//  TESTIMONIALS
// ============================================================================
export const TestimonialsSection = ({ language }) => {
  const isRTL = language === 'ar';
  const items = isRTL ? [
    { name: 'أحمد المحمد',  city: 'دمشق',     text: 'تجربة ممتازة جداً! التطبيق سهل الاستخدام ووفر علي الكثير من الوقت في البحث عن صالون قريب. الحجز كان فورياً والخدمة رائعة.' },
    { name: 'سامر العلي',   city: 'حلب',      text: 'أفضل منصة لحجز الصالونات. التصميم جميل والتعامل مع الصالونات أصبح أسهل بكثير. أنصح الجميع باستخدامه.' },
    { name: 'كريم حسن',    city: 'اللاذقية', text: 'خدمة العملاء ممتازة وسرعة في الاستجابة. وجدت صالوني المفضل من خلال الموقع وأصبحت أحجز مواعيدي بانتظام.' },
  ] : [
    { name: 'Ahmed Mohammed', city: 'Damascus', text: 'Amazing experience! The app is easy to use and saved me tons of time finding a nearby salon. Booking was instant and the service was excellent.' },
    { name: 'Samer Al-Ali',   city: 'Aleppo',   text: 'The best platform for salon bookings. Beautiful design and dealing with salons has become much easier. I recommend it to everyone.' },
    { name: 'Kareem Hasan',   city: 'Latakia',  text: 'Outstanding customer service and fast response. I found my favorite salon through the site and now I book my appointments regularly.' },
  ];

  return (
    <section className="relative py-20" data-testid="testimonials-section">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-3">
            <span className="text-white">{isRTL ? 'ماذا يقول ' : 'What Our '}</span>
            <span className="bg-gradient-to-br from-amber-300 to-yellow-500 bg-clip-text text-transparent">
              {isRTL ? 'عملاؤنا' : 'Customers'}
            </span>
            <span className="text-white">{isRTL ? ' عن تجربتهم؟' : ' Say'}</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            {isRTL ? 'نفخر بثقة عملائنا ونسعى دائماً لتقديم أفضل تجربة حجز وخدمة' : 'We take pride in our customers\' trust and always strive to deliver the best'}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative bg-gradient-to-br from-gray-900 to-black border border-amber-500/20 rounded-2xl p-8 hover:border-amber-400/50 transition-all"
            >
              <Quote className={`absolute top-5 ${isRTL ? 'left-5' : 'right-5'} w-8 h-8 text-amber-500/30`} />
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black text-xl font-bold shadow-lg">
                  {it.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-white">{it.name}</div>
                  <div className="text-xs text-amber-400 flex items-center gap-1">
                    <MapPin size={11} /> {it.city}
                  </div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed italic">"{it.text}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
//  FOOTER — contact info + social links from site_settings
// ============================================================================
export const PremiumFooter = ({ API, language }) => {
  const isRTL = language === 'ar';
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axios.get(`${API}/site-settings`).then(r => setSettings(r.data || {})).catch(() => setSettings({}));
  }, [API]);

  const s = settings || {};
  const tagline = isRTL ? (s.tagline_ar || 'منصة BARBER HUB الرائدة في حجز مواعيد الحلاقة. نوفر لك أفضل تجربة مع أمهر الحلاقين.')
                        : (s.tagline_en || 'BARBER HUB — the leading platform to book your barber. We bring you the best grooming experience.');

  const socials = [
    { key: 'facebook',  icon: Facebook,      href: s.facebook  || '' },
    { key: 'instagram', icon: Instagram,     href: s.instagram || '' },
    { key: 'twitter',   icon: Twitter,       href: s.twitter   || '' },
    { key: 'youtube',   icon: Youtube,       href: s.youtube   || '' },
  ].filter(x => x.href);

  const waLink = s.whatsapp ? `https://wa.me/${String(s.whatsapp).replace(/\D/g, '')}` : '';
  const telLink = s.phone ? `tel:${String(s.phone).replace(/\s/g, '')}` : '';

  return (
    <footer className="relative bg-gradient-to-b from-black via-[#0a0a0a] to-black border-t border-amber-500/20 pt-16 pb-8 mt-16" data-testid="premium-footer">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Column 1 — brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Scissors className="w-5 h-5 text-black" strokeWidth={2.5} />
              </div>
              <span className="font-display font-black text-2xl bg-gradient-to-br from-amber-300 to-yellow-500 bg-clip-text text-transparent">
                BARBER HUB
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">{tagline}</p>

            {/* Social + quick contact icons */}
            <div className="flex items-center gap-2 flex-wrap">
              {socials.map(({ key, icon: Icon, href }) => (
                <a key={key} href={href} target="_blank" rel="noopener noreferrer"
                   className="w-10 h-10 rounded-full bg-gray-800/60 hover:bg-amber-500/20 border border-gray-700 hover:border-amber-500/50 flex items-center justify-center text-gray-300 hover:text-amber-400 transition-all"
                   data-testid={`footer-social-${key}`}>
                  <Icon size={16} />
                </a>
              ))}
              {telLink && (
                <a href={telLink} className="w-10 h-10 rounded-full bg-gray-800/60 hover:bg-amber-500/20 border border-gray-700 hover:border-amber-500/50 flex items-center justify-center text-gray-300 hover:text-amber-400 transition-all" data-testid="footer-phone">
                  <Phone size={16} />
                </a>
              )}
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-800/60 hover:bg-green-500/20 border border-gray-700 hover:border-green-500/50 flex items-center justify-center text-gray-300 hover:text-green-400 transition-all" data-testid="footer-whatsapp">
                  <MessageCircle size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Column 2 — quick links */}
          <div>
            <h4 className="font-display font-bold text-amber-400 mb-4 flex items-center gap-2">
              <LinkIcon size={16} /> {isRTL ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-2.5">
              {[
                { to: '/',        ar: 'الرئيسية',  en: 'Home' },
                { to: '/map',     ar: 'الصالونات', en: 'Salons' },
                { to: '/about',   ar: 'من نحن',    en: 'About' },
                { to: '/contact', ar: 'اتصل بنا',  en: 'Contact' },
              ].map((l, i) => (
                <li key={i}>
                  <Link to={l.to} className="text-sm text-gray-300 hover:text-amber-400 transition-colors flex items-center gap-2 group">
                    <span className="text-amber-500/60 group-hover:text-amber-400">{isRTL ? '‹' : '›'}</span>
                    {isRTL ? l.ar : l.en}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — services */}
          <div>
            <h4 className="font-display font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Scissors size={16} /> {isRTL ? 'خدماتنا' : 'Services'}
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              {[
                isRTL ? 'حجز مواعيد فوري' : 'Instant booking',
                isRTL ? 'تقييمات موثوقة'   : 'Trusted reviews',
                isRTL ? 'أفضل الحلاقين'    : 'Best barbers',
                isRTL ? 'أسعار منافسة'     : 'Competitive prices',
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — contact */}
          <div>
            <h4 className="font-display font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Phone size={16} /> {isRTL ? 'تواصل معنا' : 'Contact Us'}
            </h4>
            <ul className="space-y-3 text-sm text-gray-300">
              {s.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{s.address}</span>
                </li>
              )}
              {s.email && (
                <li className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <a href={`mailto:${s.email}`} className="hover:text-amber-400 transition-colors break-all">{s.email}</a>
                </li>
              )}
              {s.phone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <a href={telLink} dir="ltr" className="hover:text-amber-400 transition-colors">{s.phone}</a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-amber-500/15 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} BARBER HUB — {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
          <p className="text-xs text-gray-600">
            {isRTL ? 'مصنوع بعناية ' : 'Crafted with '}<span className="text-amber-400">♥</span>{isRTL ? ' في سوريا' : ' in Syria'}
          </p>
        </div>
      </div>
    </footer>
  );
};
