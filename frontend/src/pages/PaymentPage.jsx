/**
 * BARBER HUB - PaymentPage (VIP Warm Luxury + Smart Gateway)
 * Intelligently routes between:
 *  - LOCAL (Arab countries): Manual transfer (Syriatel/MTN/Zain Cash, Asia Hawala, Cash on Delivery, WhatsApp confirmation)
 *  - GLOBAL (EU/US/UK/etc.): Card payment (Stripe placeholder) + Cash on Delivery
 *
 * Also shows subscription packages for barbers (Basic / Barber / Store / VIP).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, API } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useGeoLocation } from '@/contexts/GeoLocationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, WhatsApp, Crown, Star, Check, Shears
} from '@/components/icons';
import {
  CreditCard, Smartphone, Banknote, Building2, Shield,
  Copy, Globe, MapPin, Sparkles, Lock
} from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gender } = useApp();
  const { language } = useLocalization();
  const { country, countryCode, city, getPaymentRegion } = useGeoLocation();
  const { formatPrice, currency, currencySymbol } = useCurrency();

  const isMen = gender !== 'female';
  const isRTL = language === 'ar';
  const paymentRegion = getPaymentRegion(); // 'local_arab' | 'global'

  // Optional booking context (passed via navigate state)
  const bookingContext = location.state?.booking || null;
  const amountUSD = bookingContext?.total_price ?? null;

  const [selectedPackage, setSelectedPackage] = useState('barber');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [adminWhatsApp, setAdminWhatsApp] = useState('963935964158');

  // Fetch admin WhatsApp from backend (configurable via env) so it is not hardcoded.
  useEffect(() => {
    let active = true;
    fetch(`${API}/config/public`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (active && data && data.admin_whatsapp) {
          setAdminWhatsApp(String(data.admin_whatsapp).replace(/\D/g, ''));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const t = isRTL ? {
    back: 'رجوع',
    title: 'بوابة الدفع الذكية',
    subtitle: 'اختر الطريقة الأنسب لك حسب منطقتك',
    detectedRegion: 'منطقتك:',
    packages: 'باقات الاشتراك السنوي',
    basic: 'عادي',
    barber: 'حلاق',
    store: 'متجر',
    vip: 'VIP',
    selectPackage: 'اختر الباقة',
    selectedPackage: 'الباقة المختارة',
    availableMethods: 'طرق الدفع المتاحة',
    localMethods: 'الدفع المحلي (الوطن العربي)',
    globalMethods: 'الدفع العالمي',
    cashOnService: 'الدفع عند الخدمة',
    cashDesc: 'ادفع مباشرة في الصالون بعد انتهاء الخدمة',
    syriatelCash: 'سيريتل كاش',
    mtnCash: 'MTN كاش',
    zainCash: 'زين كاش',
    asiaHawala: 'آسيا حوالة',
    bankTransfer: 'تحويل بنكي / مكتب صرافة',
    westernUnion: 'Western Union',
    manualDesc: 'حوّل المبلغ ثم أرسل الإيصال عبر واتساب للتأكيد خلال 24 ساعة',
    creditCard: 'بطاقة ائتمان',
    cardDesc: 'Visa / Mastercard / AmEx - دفع آمن عبر Stripe',
    applePay: 'Apple Pay / Google Pay',
    copy: 'نسخ',
    copied: 'تم النسخ',
    recipientName: 'اسم المستلم',
    recipientNumber: 'رقم المستلم',
    accountName: 'اسم الحساب',
    adminName: 'محمد الرجب',
    adminPhone: '+963 935 964 158',
    location: 'الموقع',
    locationValue: 'موقع عالمي',
    confirmWhatsApp: 'تأكيد الحوالة عبر واتساب',
    payNow: 'ادفع الآن',
    comingSoon: 'قريباً',
    securePayment: 'دفع آمن ومشفر 100%',
    trustedBy: 'موثوق من قبل آلاف الصالونات',
    support247: 'دعم فوري 24/7',
    billingAmount: 'المبلغ المطلوب',
    yearly: 'سنوياً',
    features: {
      basic: ['ملف شخصي', 'حجوزات محدودة', 'دعم أساسي'],
      barber: ['ملف احترافي', 'حجوزات لا محدودة', 'QR Code', 'معرض 4 صور', 'دعم أولوية'],
      store: ['كل مزايا الحلاق', 'متجر مصغر', 'حتى 10 منتجات', 'نظام طلبات'],
      vip: ['كل المزايا', 'ظهور مميز', 'شارة VIP', 'أولوية في البحث', 'إعلانات مدفوعة']
    },
    popular: 'الأكثر شيوعاً'
  } : {
    back: 'Back',
    title: 'Smart Payment Gateway',
    subtitle: 'Choose the best method for your region',
    detectedRegion: 'Your region:',
    packages: 'Annual Subscription Packages',
    basic: 'Basic',
    barber: 'Barber',
    store: 'Store',
    vip: 'VIP',
    selectPackage: 'Select package',
    selectedPackage: 'Selected Package',
    availableMethods: 'Available Payment Methods',
    localMethods: 'Local Payment (Arab Region)',
    globalMethods: 'Global Payment',
    cashOnService: 'Cash on Service',
    cashDesc: 'Pay directly at the salon after service',
    syriatelCash: 'Syriatel Cash',
    mtnCash: 'MTN Cash',
    zainCash: 'Zain Cash',
    asiaHawala: 'Asia Hawala',
    bankTransfer: 'Bank / Exchange Transfer',
    westernUnion: 'Western Union',
    manualDesc: 'Transfer the amount, then send receipt via WhatsApp for confirmation within 24h',
    creditCard: 'Credit Card',
    cardDesc: 'Visa / Mastercard / AmEx - Secure payment via Stripe',
    applePay: 'Apple Pay / Google Pay',
    copy: 'Copy',
    copied: 'Copied',
    recipientName: 'Recipient Name',
    recipientNumber: 'Recipient Number',
    accountName: 'Account Name',
    adminName: 'Mohamad Al-Rajab',
    adminPhone: '+963 935 964 158',
    location: 'Location',
    locationValue: 'Global',
    confirmWhatsApp: 'Confirm Transfer via WhatsApp',
    payNow: 'Pay Now',
    comingSoon: 'Coming Soon',
    securePayment: '100% secure & encrypted payment',
    trustedBy: 'Trusted by thousands of salons',
    support247: '24/7 instant support',
    billingAmount: 'Amount Due',
    yearly: 'per year',
    features: {
      basic: ['Profile', 'Limited bookings', 'Basic support'],
      barber: ['Pro profile', 'Unlimited bookings', 'QR Code', '4-image gallery', 'Priority support'],
      store: ['All Barber perks', 'Mini store', 'Up to 10 products', 'Order system'],
      vip: ['All perks', 'Featured listing', 'VIP badge', 'Search priority', 'Paid ads']
    },
    popular: 'Most Popular'
  };

  // Packages in USD (base). Currency converter will display in local currency.
  const packages = useMemo(() => [
    { id: 'basic',  name: t.basic,  priceUSD: 75,  features: t.features.basic,  tier: 'silver',   popular: false },
    { id: 'barber', name: t.barber, priceUSD: 100, features: t.features.barber, tier: 'gold',     popular: true  },
    { id: 'store',  name: t.store,  priceUSD: 150, features: t.features.store,  tier: 'platinum', popular: false },
    { id: 'vip',    name: t.vip,    priceUSD: 175, features: t.features.vip,    tier: 'vip',      popular: false },
  ], [t]);

  const currentPkg = packages.find(p => p.id === selectedPackage) || packages[1];
  const displayAmount = amountUSD ?? currentPkg.priceUSD;

  const openWhatsApp = (method = 'general') => {
    const pkgLine = isRTL
      ? `الباقة: ${currentPkg.name} - ${formatPrice(currentPkg.priceUSD)}`
      : `Package: ${currentPkg.name} - ${formatPrice(currentPkg.priceUSD)}`;
    const methodLine = isRTL
      ? `طريقة الدفع: ${method}`
      : `Payment method: ${method}`;
    const greeting = isRTL
      ? 'مرحباً، أريد تفعيل اشتراك BARBER HUB'
      : 'Hello, I would like to activate a BARBER HUB subscription';
    const msg = encodeURIComponent(`${greeting}\n${pkgLine}\n${methodLine}\n${t.location}: ${country}, ${city}`);
    window.open(`https://wa.me/${adminWhatsApp}?text=${msg}`, '_blank');
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success(t.copied);
  };

  // -------------------- PAYMENT METHOD DEFINITIONS --------------------

  const syriaMethods = [
    { id: 'syriatel', name: t.syriatelCash,  icon: <Smartphone className="w-6 h-6" />, recipient: t.adminName, number: '0935 964 158' },
    { id: 'mtn',      name: t.mtnCash,       icon: <Smartphone className="w-6 h-6" />, recipient: t.adminName, number: '0947 000 000' },
  ];

  const iraqMethods = [
    { id: 'zain',     name: t.zainCash,      icon: <Smartphone className="w-6 h-6" />, recipient: t.adminName, number: '0770 000 000' },
    { id: 'asia',     name: t.asiaHawala,    icon: <Building2 className="w-6 h-6" />,  recipient: t.adminName, number: '0783 000 000' },
  ];

  const universalLocal = [
    { id: 'cash',         name: t.cashOnService, icon: <Banknote className="w-6 h-6" />,  desc: t.cashDesc },
    { id: 'bank',         name: t.bankTransfer,  icon: <Building2 className="w-6 h-6" />, desc: t.manualDesc, recipient: t.adminName, number: t.locationValue },
    { id: 'westernunion', name: t.westernUnion,  icon: <Globe className="w-6 h-6" />,     desc: t.manualDesc, recipient: t.adminName, number: t.locationValue },
  ];

  const globalMethods = [
    { id: 'card',     name: t.creditCard, icon: <CreditCard className="w-6 h-6" />,  desc: t.cardDesc, comingSoon: true },
    { id: 'applepay', name: t.applePay,   icon: <Smartphone className="w-6 h-6" />,  desc: t.cardDesc, comingSoon: true },
    { id: 'cash',     name: t.cashOnService, icon: <Banknote className="w-6 h-6" />, desc: t.cashDesc },
  ];

  // Build the list of methods based on detected region + specific country overrides
  const methodsForRegion = useMemo(() => {
    if (paymentRegion === 'local_arab') {
      const base = [...universalLocal];
      if (country === 'Syria')   return [...syriaMethods, ...base];
      if (country === 'Iraq')    return [...iraqMethods, ...base];
      return base;
    }
    return globalMethods;
  }, [paymentRegion, country]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------- RENDER --------------------

  return (
    <div className="bh-surface min-h-screen" data-testid="payment-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-20" />
      <div className="bh-orb bh-orb-burgundy w-80 h-80 bottom-0 left-0 opacity-15" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[var(--bh-obsidian)]/85 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="bh-btn bh-btn-ghost bh-btn-sm" data-testid="back-btn">
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span className="hidden sm:inline">{t.back}</span>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl md:text-2xl font-display font-bold bh-gold-text flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 md:w-6 md:h-6" />
              {t.title}
            </h1>
          </div>
          <div className="w-14 md:w-24" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero badge: detected region */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-4 rounded-2xl bh-glass-vip bh-corner-accents"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--bh-gold)]/30 to-[var(--bh-gold-deep)]/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-[var(--bh-gold)]" />
            </div>
            <div>
              <div className="text-xs text-[var(--bh-text-muted)]">{t.detectedRegion}</div>
              <div className="font-bold text-white">
                {country}{city ? ` • ${city}` : ''} <span className="opacity-60">({countryCode})</span>
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 ${
            paymentRegion === 'local_arab'
              ? 'bg-[var(--bh-gold)]/20 text-[var(--bh-gold)] border border-[var(--bh-gold)]/40'
              : 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
          }`}>
            {paymentRegion === 'local_arab' ? <Crown className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {paymentRegion === 'local_arab' ? t.localMethods : t.globalMethods}
          </div>
        </motion.div>

        {/* Subtitle */}
        <p className="text-center text-[var(--bh-text-secondary)] mb-8 text-sm md:text-base">
          {t.subtitle}
        </p>

        {/* Package Selector (only when no booking context) */}
        {!amountUSD && (
          <section className="mb-10">
            <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2 bh-gold-text">
              <Crown className="w-5 h-5" />
              {t.packages}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {packages.map((pkg, idx) => {
                const active = selectedPackage === pkg.id;
                return (
                  <motion.button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg.id)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                    className={`relative text-start p-4 rounded-2xl transition-all ${
                      active
                        ? 'bh-glass-vip ring-2 ring-[var(--bh-gold)] shadow-xl shadow-[var(--bh-gold)]/20'
                        : 'bh-glass opacity-80 hover:opacity-100'
                    }`}
                    data-testid={`pkg-${pkg.id}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bh-vip-badge">
                        <Sparkles className="w-3 h-3" />
                        <span>{t.popular}</span>
                      </div>
                    )}
                    <div className="text-xs text-[var(--bh-text-muted)] uppercase tracking-wider">{pkg.name}</div>
                    <div className="text-2xl md:text-3xl font-display font-black my-2 bh-gold-text">
                      {formatPrice(pkg.priceUSD)}
                    </div>
                    <div className="text-[10px] text-[var(--bh-text-muted)] mb-2">/{t.yearly}</div>
                    <ul className="space-y-1">
                      {pkg.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="text-[11px] text-[var(--bh-text-secondary)] flex items-start gap-1">
                          <Check className="w-3 h-3 text-[var(--bh-gold)] flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {active && (
                      <motion.div
                        layoutId="pkg-check"
                        className="absolute top-2 end-2 w-7 h-7 rounded-full bg-[var(--bh-gold)] text-[var(--bh-obsidian)] flex items-center justify-center"
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* Amount Due Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-6 rounded-3xl bh-glass-vip bh-corner-accents text-center"
        >
          <div className="text-xs uppercase tracking-widest text-[var(--bh-text-muted)] mb-2">{t.billingAmount}</div>
          <div className="text-4xl md:text-5xl font-display font-black bh-gold-text">
            {formatPrice(displayAmount)}
          </div>
          {!amountUSD && (
            <div className="text-xs text-[var(--bh-text-muted)] mt-1">
              {t.selectedPackage}: <span className="text-white font-bold">{currentPkg.name}</span>
            </div>
          )}
        </motion.div>

        {/* Payment Methods */}
        <section className="mb-8">
          <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2 text-white">
            <CreditCard className="w-5 h-5 text-[var(--bh-gold)]" />
            {t.availableMethods}
          </h2>

          <div className="grid gap-3">
            {methodsForRegion.map((method, idx) => {
              const active = selectedMethod === method.id;
              return (
                <motion.div
                  key={`${method.id}-${idx}`}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <button
                    disabled={method.comingSoon}
                    onClick={() => setSelectedMethod(active ? null : method.id)}
                    className={`w-full text-start p-4 rounded-2xl transition-all ${
                      active
                        ? 'bh-glass-vip ring-2 ring-[var(--bh-gold)]'
                        : 'bh-glass hover:ring-1 hover:ring-[var(--bh-gold)]/40'
                    } ${method.comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    data-testid={`method-${method.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        active
                          ? 'bg-gradient-to-br from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)]'
                          : 'bg-[var(--bh-glass-bg)] text-[var(--bh-gold)]'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white">{method.name}</h3>
                          {method.comingSoon && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              {t.comingSoon}
                            </span>
                          )}
                        </div>
                        {method.desc && (
                          <p className="text-xs text-[var(--bh-text-secondary)] mt-1 line-clamp-2">{method.desc}</p>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        active
                          ? 'border-[var(--bh-gold)] bg-[var(--bh-gold)]'
                          : 'border-[var(--bh-glass-border)]'
                      }`}>
                        {active && <Check className="w-3.5 h-3.5 text-[var(--bh-obsidian)]" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {active && !method.comingSoon && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 p-4 rounded-2xl bg-[var(--bh-obsidian)]/60 border border-[var(--bh-gold)]/20">
                          {method.id === 'cash' ? (
                            <div className="flex items-center gap-3 text-sm text-[var(--bh-text-secondary)]">
                              <Banknote className="w-5 h-5 text-[var(--bh-gold)]" />
                              <span>{t.cashDesc}</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {method.recipient && (
                                <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--bh-glass-border)]">
                                  <span className="text-xs text-[var(--bh-text-muted)]">{t.recipientName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm">{method.recipient}</span>
                                    <button onClick={(e) => { e.stopPropagation(); copyText(method.recipient); }}
                                      className="p-1.5 rounded-lg hover:bg-[var(--bh-gold)]/10 text-[var(--bh-gold)]">
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              {method.number && (
                                <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--bh-glass-border)]">
                                  <span className="text-xs text-[var(--bh-text-muted)]">
                                    {method.id === 'bank' || method.id === 'westernunion' ? t.location : t.recipientNumber}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm font-mono" dir="ltr">{method.number}</span>
                                    <button onClick={(e) => { e.stopPropagation(); copyText(method.number); }}
                                      className="p-1.5 rounded-lg hover:bg-[var(--bh-gold)]/10 text-[var(--bh-gold)]">
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              <p className="text-xs text-[var(--bh-text-muted)] italic text-center pt-1">
                                {t.manualDesc}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 z-30"
        >
          <div className="p-4 rounded-3xl bh-glass-vip bh-corner-accents space-y-3">
            {paymentRegion === 'local_arab' || selectedMethod === 'cash' ? (
              <button
                onClick={() => openWhatsApp(methodsForRegion.find(m => m.id === selectedMethod)?.name || 'Manual')}
                className="w-full bh-btn bh-btn-primary bh-btn-lg flex items-center justify-center gap-3"
                data-testid="whatsapp-confirm-btn"
              >
                <WhatsApp className="w-6 h-6" />
                {t.confirmWhatsApp}
              </button>
            ) : (
              <button
                disabled
                className="w-full bh-btn bh-btn-primary bh-btn-lg flex items-center justify-center gap-3 opacity-60 cursor-not-allowed"
                data-testid="pay-now-btn"
              >
                <Lock className="w-5 h-5" />
                {t.payNow} - {t.comingSoon}
              </button>
            )}

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--bh-glass-border)]">
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-[var(--bh-text-muted)]">
                <Shield className="w-3.5 h-3.5 text-[var(--bh-gold)]" />
                <span className="truncate">{t.securePayment}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-[var(--bh-text-muted)]">
                <Star className="w-3.5 h-3.5 text-[var(--bh-gold)]" fill="currentColor" />
                <span className="truncate">{t.trustedBy}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-[var(--bh-text-muted)]">
                <WhatsApp className="w-3.5 h-3.5 text-[var(--bh-gold)]" />
                <span className="truncate">{t.support247}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Admin contact footer */}
        <div className="text-center text-[10px] text-[var(--bh-text-muted)] mt-6 mb-4">
          {t.adminPhone}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
