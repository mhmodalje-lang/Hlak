/**
 * BARBER HUB — PaymentPage (v3.9.1)
 *
 * Manual subscription flow:
 *  1. Pick a subscription plan (auto-filtered by country_code with Global fallback)
 *  2. Pick a transfer method: Syriatel Cash (single recipient) or an exchange office
 *  3. See recipient details (name + number + region) with copy-to-clipboard
 *  4. Transfer money offline, then upload the receipt image
 *  5. Submit → server stores order + creates admin notification with wa.me link
 *  6. Show reference code + "awaiting admin approval within 24h"
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp, API } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useGeoLocation } from '@/contexts/GeoLocationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Crown, Check, Copy, Building2, Smartphone,
  Upload, Loader2, Shield, Sparkles, FileText, Clock, MapPin,
} from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { gender, token, user } = useApp();
  const { language } = useLocalization();
  const { countryCode, country } = useGeoLocation();
  const isRTL = language === 'ar';

  const [plans, setPlans] = useState([]);
  const [recipients, setRecipients] = useState({ syriatel_cash: null, exchanges: [] });
  const [loading, setLoading] = useState(true);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedMethod, setSelectedMethod] = useState(null); // 'syriatel_cash' | 'exchange'
  const [selectedExchangeId, setSelectedExchangeId] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const t = isRTL ? {
    back: 'رجوع',
    title: 'بوابة الاشتراك',
    subtitle: 'اختر الخطة، حوّل المبلغ، وارفع الإيصال ليتم تفعيل الاشتراك خلال 24 ساعة',
    step1: 'اختر خطة الاشتراك',
    step2: 'اختر طريقة التحويل',
    step3: 'معلومات المستلم',
    step4: 'ارفع إيصال التحويل',
    submit: 'إرسال الإيصال وطلب التفعيل',
    submitting: 'جاري الإرسال...',
    monthly: '/شهر',
    yearly: '/سنة',
    cycle: 'دورة الدفع',
    cycleMonthly: 'شهري',
    cycleYearly: 'سنوي',
    saveAnnual: 'وفّر',
    freeTrial: 'تجربة مجانية',
    month: 'شهر',
    months: 'أشهر',
    syriatel: 'سيريتل كاش',
    exchange: 'شركة / مكتب صرافة',
    recipientName: 'اسم المستلم',
    phoneNumber: 'رقم الهاتف',
    region: 'المنطقة',
    notes: 'ملاحظات',
    copy: 'نسخ',
    copied: 'تم النسخ',
    reference: 'رقم مرجع التحويل (اختياري)',
    additionalNotes: 'ملاحظات إضافية (اختياري)',
    uploadReceipt: 'اضغط لاختيار صورة الإيصال',
    receiptHint: 'JPG/PNG · أقل من 3 ميغابايت',
    imageRequired: 'يرجى رفع صورة الإيصال',
    tooLarge: 'الصورة كبيرة جداً. الحد الأقصى 3 ميغابايت',
    selectPlanFirst: 'يرجى اختيار خطة أولاً',
    selectMethodFirst: 'يرجى اختيار طريقة التحويل',
    selectExchangeFirst: 'يرجى اختيار مكتب الصرافة',
    orderSubmitted: 'تم إرسال الطلب!',
    yourRefCode: 'رقم مرجع طلبك',
    awaitingReview: 'سيتم مراجعة الإيصال وتفعيل اشتراكك خلال 24 ساعة.',
    backToDashboard: 'العودة للوحة التحكم',
    viewMyOrders: 'طلباتي',
    amountToTransfer: 'المبلغ المطلوب',
    loginRequired: 'يجب تسجيل الدخول كصالون لإرسال الطلب',
    loading: 'جاري التحميل...',
    noPlans: 'لا توجد خطط متاحة حالياً',
    note: 'ملاحظة',
  } : {
    back: 'Back',
    title: 'Subscription Gateway',
    subtitle: 'Pick a plan, transfer the amount, upload the receipt — activated within 24h',
    step1: 'Choose a plan',
    step2: 'Choose transfer method',
    step3: 'Recipient details',
    step4: 'Upload transfer receipt',
    submit: 'Submit receipt & request activation',
    submitting: 'Submitting...',
    monthly: '/month',
    yearly: '/year',
    cycle: 'Billing cycle',
    cycleMonthly: 'Monthly',
    cycleYearly: 'Yearly',
    saveAnnual: 'Save',
    freeTrial: 'Free trial',
    month: 'month',
    months: 'months',
    syriatel: 'Syriatel Cash',
    exchange: 'Exchange office',
    recipientName: 'Recipient name',
    phoneNumber: 'Phone',
    region: 'Region',
    notes: 'Note',
    copy: 'Copy',
    copied: 'Copied',
    reference: 'Transfer reference (optional)',
    additionalNotes: 'Extra notes (optional)',
    uploadReceipt: 'Tap to pick receipt image',
    receiptHint: 'JPG/PNG · under 3 MB',
    imageRequired: 'Please upload the receipt image',
    tooLarge: 'Image too large (max 3 MB)',
    selectPlanFirst: 'Please pick a plan first',
    selectMethodFirst: 'Please choose a transfer method',
    selectExchangeFirst: 'Please choose an exchange office',
    orderSubmitted: 'Order submitted!',
    yourRefCode: 'Your reference code',
    awaitingReview: 'Your receipt will be reviewed and activated within 24 hours.',
    backToDashboard: 'Back to dashboard',
    viewMyOrders: 'My orders',
    amountToTransfer: 'Amount to transfer',
    loginRequired: 'You must be logged in as a salon to submit',
    loading: 'Loading...',
    noPlans: 'No plans available for your country yet',
    note: 'Note',
  };

  // ---- Load plans + recipients ----
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const plansQuery = countryCode && countryCode !== 'XX' ? `?country_code=${countryCode}` : '';
        const [plansRes, recipientsRes] = await Promise.all([
          axios.get(`${API}/subscription-plans${plansQuery}`),
          axios.get(`${API}/transfer-recipients`),
        ]);
        if (!active) return;
        const plansData = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data?.plans || []);
        setPlans(plansData);
        setRecipients(recipientsRes.data || { syriatel_cash: null, exchanges: [] });
      } catch (e) {
        console.error('Failed to load payment data:', e);
        if (active) toast.error(isRTL ? 'فشل تحميل بيانات الدفع' : 'Failed to load payment data');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [countryCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select the first plan once loaded
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) setSelectedPlan(plans[0]);
  }, [plans]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Derived values ----
  const selectedExchange = useMemo(() => {
    if (selectedMethod !== 'exchange' || !selectedExchangeId) return null;
    return (recipients.exchanges || []).find(e => e.id === selectedExchangeId) || null;
  }, [selectedMethod, selectedExchangeId, recipients]);

  /**
   * Normalize recipient shape across syriatel_cash and exchange offices.
   * Returns: { name, phone, region, note, title } localized for RTL/LTR.
   */
  const currentRecipient = useMemo(() => {
    if (selectedMethod === 'syriatel_cash' && recipients.syriatel_cash) {
      const sc = recipients.syriatel_cash;
      return {
        title: isRTL ? (sc.display_name_ar || 'سيريتل كاش') : (sc.display_name_en || 'Syriatel Cash'),
        name: isRTL ? 'سيريتل كاش' : 'Syriatel Cash',
        phone: sc.number || '',
        region: '',
        note: isRTL ? sc.instructions_ar : sc.instructions_en,
      };
    }
    if (selectedMethod === 'exchange' && selectedExchange) {
      const ex = selectedExchange;
      return {
        title: isRTL ? (ex.name_ar || ex.name_en) : (ex.name_en || ex.name_ar),
        name: isRTL ? (ex.recipient_ar || ex.recipient_en) : (ex.recipient_en || ex.recipient_ar),
        phone: ex.phone || '',
        region: isRTL ? (ex.province_ar || ex.province_en) : (ex.province_en || ex.province_ar),
        note: isRTL ? (recipients.general_note_ar || '') : (recipients.general_note_en || ''),
      };
    }
    return null;
  }, [selectedMethod, selectedExchange, recipients, isRTL]);

  // ---- Handlers ----
  const copyToClipboard = (text) => {
    try {
      navigator.clipboard.writeText(String(text || ''));
      toast.success(t.copied);
    } catch (_) {}
  };

  const handleFilePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error(t.tooLarge); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptImage(reader.result);
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!token) { toast.error(t.loginRequired); return; }
    if (!selectedPlan) { toast.error(t.selectPlanFirst); return; }
    if (!selectedMethod) { toast.error(t.selectMethodFirst); return; }
    if (selectedMethod === 'exchange' && !selectedExchangeId) { toast.error(t.selectExchangeFirst); return; }
    if (!receiptImage) { toast.error(t.imageRequired); return; }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/subscription-orders`, {
        plan_id: selectedPlan.id,
        payment_method: selectedMethod,
        exchange_id: selectedMethod === 'exchange' ? selectedExchangeId : null,
        reference_number: referenceNumber || null,
        receipt_image: receiptImage,
        notes: notes || null,
        billing_cycle: billingCycle,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSubmittedOrder(res.data);
      toast.success(t.orderSubmitted);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Error';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success Screen ----
  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black p-4 md:p-8 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-gradient-to-br from-[#111] via-[#0d0d0d] to-black rounded-3xl border-2 border-amber-400/40 p-8 text-center shadow-2xl"
          data-testid="order-success-screen"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{t.orderSubmitted}</h2>
          <p className="text-gray-400 text-sm mb-6">{t.awaitingReview}</p>

          <div className="bg-amber-500/10 border border-amber-400/40 rounded-2xl p-5 mb-6">
            <p className="text-xs text-gray-400 mb-1">{t.yourRefCode}</p>
            <p className="text-3xl font-mono font-black text-amber-400 tracking-wider" data-testid="ref-code">
              {submittedOrder.reference_code}
            </p>
            <button onClick={() => copyToClipboard(submittedOrder.reference_code)}
              className="mt-2 text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 mx-auto">
              <Copy size={12} /> {t.copy}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 justify-center mb-6">
            <Clock size={14} />
            <span>{isRTL ? 'وقت التفعيل المتوقع: خلال 24 ساعة' : 'Expected activation: within 24 hours'}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => navigate('/barber-dashboard')}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400 transition-all"
              data-testid="back-to-dashboard">
              {t.backToDashboard}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ---- Main Screen ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black pb-24" dir={isRTL ? 'rtl' : 'ltr'} data-testid="payment-page">
      {/* Ambient glow */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-black/80 border-b border-amber-500/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/50 flex items-center justify-center text-gray-300 hover:text-amber-400 transition-all"
            data-testid="back-btn">
            {isRTL ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              {t.title}
            </h1>
          </div>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl relative z-10">
        <p className="text-center text-gray-400 text-sm mb-8">{t.subtitle}</p>

        {/* Step 1 — Plans */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">1</span>
            {t.step1}
          </h2>
          {plans.length === 0 ? (
            <div className="p-8 rounded-2xl border border-white/10 text-center text-gray-500">{t.noPlans}</div>
          ) : (
            <div className="grid gap-3">
              {plans.map(plan => {
                const active = selectedPlan?.id === plan.id;
                return (
                  <motion.button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    whileHover={{ y: -2 }}
                    className={`text-start p-4 rounded-2xl transition-all border-2 ${
                      active
                        ? 'border-amber-400 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-500/5 shadow-lg shadow-amber-500/20'
                        : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'
                    }`}
                    data-testid={`plan-${plan.id}`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-base">
                          {isRTL ? (plan.title_ar || plan.title_en) : (plan.title_en || plan.title_ar)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {plan.country || (isRTL ? 'عالمي' : 'Global')}
                          {plan.free_trial_months > 0 && (
                            <span className="ms-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                              {t.freeTrial} {plan.free_trial_months} {plan.free_trial_months === 1 ? t.month : t.months}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="text-2xl font-black text-amber-400">
                          {plan.currency_symbol || ''}{Number(plan.monthly_price || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500">{plan.currency || ''}{t.monthly}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        active ? 'border-amber-400 bg-amber-400' : 'border-gray-600'
                      }`}>
                        {active && <Check size={14} className="text-black" strokeWidth={3} />}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>

        {/* Billing cycle toggle */}
        {selectedPlan && (Number(selectedPlan.yearly_price) > 0) && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-amber-400 mb-3">{t.cycle}</h2>
            <div className="grid grid-cols-2 gap-3">
              {['monthly', 'yearly'].map(c => {
                const active = billingCycle === c;
                const price = c === 'yearly' ? Number(selectedPlan.yearly_price || 0) : Number(selectedPlan.monthly_price || 0);
                const saving = c === 'yearly' && Number(selectedPlan.monthly_price) > 0
                  ? Math.max(0, Math.round((Number(selectedPlan.monthly_price) * 12 - price) / (Number(selectedPlan.monthly_price) * 12) * 100))
                  : 0;
                return (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={`p-4 rounded-2xl border-2 transition-all text-start ${
                      active ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'
                    }`}
                    data-testid={`billing-cycle-${c}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{c === 'monthly' ? t.cycleMonthly : t.cycleYearly}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {selectedPlan.currency_symbol || ''}{price.toLocaleString()}
                          <span className="text-[10px] text-gray-500 ms-1">{c === 'monthly' ? t.monthly : t.yearly}</span>
                        </p>
                      </div>
                      {saving > 0 && c === 'yearly' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {t.saveAnnual} {saving}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2 — Method */}
        {selectedPlan && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">2</span>
              {t.step2}
            </h2>
            <div className="grid gap-3">
              {/* Syriatel Cash */}
              {recipients.syriatel_cash && recipients.syriatel_cash.active !== false && (
                <MethodCard
                  icon={<Smartphone size={20} />}
                  name={t.syriatel}
                  active={selectedMethod === 'syriatel_cash'}
                  onClick={() => { setSelectedMethod('syriatel_cash'); setSelectedExchangeId(null); }}
                  testId="method-syriatel"
                />
              )}
              {/* Exchange offices */}
              {(recipients.exchanges || []).length > 0 && (
                <div className={`rounded-2xl border-2 transition-all ${
                  selectedMethod === 'exchange' ? 'border-amber-400 bg-amber-500/5' : 'border-white/10 bg-white/[0.03]'
                }`}>
                  <button
                    onClick={() => setSelectedMethod('exchange')}
                    className="w-full text-start p-4 flex items-center gap-3"
                    data-testid="method-exchange"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedMethod === 'exchange' ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-400'
                    }`}>
                      <Building2 size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{t.exchange}</p>
                      <p className="text-xs text-gray-400">{recipients.exchanges.length} {isRTL ? 'مكاتب متاحة' : 'offices available'}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === 'exchange' ? 'border-amber-400 bg-amber-400' : 'border-gray-600'
                    }`}>
                      {selectedMethod === 'exchange' && <Check size={14} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                  {/* Exchange sub-list */}
                  <AnimatePresence>
                    {selectedMethod === 'exchange' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {recipients.exchanges.map(ex => (
                            <button
                              key={ex.id}
                              onClick={() => setSelectedExchangeId(ex.id)}
                              className={`w-full text-start p-3 rounded-xl border transition-all ${
                                selectedExchangeId === ex.id
                                  ? 'border-amber-400 bg-amber-500/10'
                                  : 'border-white/10 bg-white/[0.02] hover:border-amber-400/30'
                              }`}
                              data-testid={`exchange-${ex.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-white text-sm">{isRTL ? (ex.name_ar || ex.name_en) : (ex.name_en || ex.name_ar)}</p>
                                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {isRTL ? (ex.recipient_ar || ex.recipient_en) : (ex.recipient_en || ex.recipient_ar)}
                                    {(ex.province_ar || ex.province_en) && <span className="text-gray-500">· {isRTL ? (ex.province_ar || ex.province_en) : (ex.province_en || ex.province_ar)}</span>}
                                  </p>
                                </div>
                                {selectedExchangeId === ex.id && (
                                  <Check size={16} className="text-amber-400" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 3 — Recipient details */}
        {currentRecipient && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">3</span>
              {t.step3}
            </h2>
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-black/40 p-5 space-y-3">
              {/* Amount badge */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-400/20">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{t.amountToTransfer}</span>
                <span className="text-2xl font-black text-amber-400">
                  {selectedPlan?.currency_symbol || ''}{Number(billingCycle === 'yearly' ? (selectedPlan?.yearly_price || selectedPlan?.monthly_price || 0) : (selectedPlan?.monthly_price || 0)).toLocaleString()}
                  <span className="text-xs text-gray-500 ms-1">{selectedPlan?.currency || ''} {billingCycle === 'yearly' ? t.yearly : t.monthly}</span>
                </span>
              </div>
              {/* Recipient name */}
              <RecipientRow
                label={t.recipientName}
                value={currentRecipient.name}
                onCopy={copyToClipboard}
                testId="recipient-name"
              />
              {/* Phone / number */}
              {currentRecipient.phone && (
                <RecipientRow
                  label={t.phoneNumber}
                  value={currentRecipient.phone}
                  onCopy={copyToClipboard}
                  mono
                  testId="recipient-phone"
                />
              )}
              {/* Region */}
              {currentRecipient.region && (
                <RecipientRow
                  label={t.region}
                  value={currentRecipient.region}
                  onCopy={copyToClipboard}
                  testId="recipient-region"
                />
              )}
              {/* Notes */}
              {currentRecipient.note && (
                <div className="pt-2 border-t border-amber-400/20">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">{t.note}</p>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {currentRecipient.note}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 4 — Receipt upload */}
        {currentRecipient && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">4</span>
              {t.step4}
            </h2>

            <label className="block cursor-pointer" data-testid="receipt-upload-label">
              <input type="file" accept="image/*" onChange={handleFilePick} className="hidden" data-testid="receipt-file-input" />
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                receiptPreview
                  ? 'border-emerald-400/60 bg-emerald-500/5'
                  : 'border-amber-400/40 hover:border-amber-400 bg-white/[0.02]'
              }`}>
                {receiptPreview ? (
                  <img src={receiptPreview} alt="receipt" className="max-h-56 mx-auto rounded-xl" />
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-amber-400 mb-3" />
                    <p className="text-sm text-white font-semibold">{t.uploadReceipt}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.receiptHint}</p>
                  </>
                )}
              </div>
            </label>

            <input
              type="text"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder={t.reference}
              className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400/60 focus:outline-none"
              data-testid="reference-input"
            />

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.additionalNotes}
              rows={2}
              className="mt-3 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 resize-none focus:border-amber-400/60 focus:outline-none"
              data-testid="notes-input"
            />
          </section>
        )}

        {/* Submit */}
        {currentRecipient && (
          <button
            onClick={handleSubmit}
            disabled={submitting || !receiptImage}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-black font-black text-base hover:shadow-2xl hover:shadow-amber-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="submit-order-btn"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {t.submitting}</>
            ) : (
              <><FileText className="w-5 h-5" /> {t.submit}</>
            )}
          </button>
        )}

        {/* Trust signals */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-gray-500">
          <div className="flex items-center gap-1"><Shield size={12} /> {isRTL ? 'دفع آمن' : 'Secure'}</div>
          <div className="flex items-center gap-1"><Sparkles size={12} /> {isRTL ? 'تفعيل خلال 24 ساعة' : '24h activation'}</div>
          <div className="flex items-center gap-1"><Crown size={12} /> {country} {countryCode && countryCode !== 'XX' ? `(${countryCode})` : ''}</div>
        </div>
      </div>
    </div>
  );
};

// -------- Helper components --------
const MethodCard = ({ icon, name, active, onClick, testId }) => (
  <button
    onClick={onClick}
    className={`text-start p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${
      active ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-amber-400/40'
    }`}
    data-testid={testId}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
      active ? 'bg-amber-500 text-black' : 'bg-white/5 text-amber-400'
    }`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="font-bold text-white">{name}</p>
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
      active ? 'border-amber-400 bg-amber-400' : 'border-gray-600'
    }`}>
      {active && <Check size={14} className="text-black" strokeWidth={3} />}
    </div>
  </button>
);

const RecipientRow = ({ label, value, onCopy, mono = false, testId }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-xs text-gray-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`font-bold text-white text-sm ${mono ? 'font-mono' : ''}`} dir="ltr" data-testid={testId}>{value}</span>
      <button onClick={() => onCopy(value)} className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors">
        <Copy size={13} />
      </button>
    </div>
  </div>
);

export default PaymentPage;
