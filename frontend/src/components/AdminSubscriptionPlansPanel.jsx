/**
 * Admin — Subscription Plans per Country Panel
 * CRUD subscription plans, each with its own currency & price.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DollarSign, Globe, Plus, Trash2, Edit3, Save, X, Loader2, Check,
  Tag, Link as LinkIcon, Gift
} from 'lucide-react';

const EMPTY_PLAN = {
  country: '',
  country_code: '',
  country_ar: '',
  currency: 'USD',
  currency_symbol: '$',
  monthly_price: 20,
  yearly_price: null,
  free_trial_months: 2,
  subscribe_url: '',
  badge_text_ar: '🎉 عرض خاص - أول شهرين مجاناً 🎉',
  badge_text_en: '🎉 Special Offer - First 2 Months Free 🎉',
  title_ar: 'اشتراك احترافي',
  title_en: 'Professional Subscription',
  description_ar: 'باقة متكاملة لإدارة صالونك باحترافية عالية',
  description_en: 'Full package to run your salon professionally',
  features_ar: [],
  features_en: [],
  active: true,
};

const AdminSubscriptionPlansPanel = ({ API, token, language }) => {
  const isRTL = language === 'ar';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // plan object being edited (null = none)
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/subscription-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(res.data?.plans || []);
    } catch (e) {
      toast.error(isRTL ? 'تعذر تحميل خطط الاشتراك' : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [API, token, isRTL]);

  useEffect(() => { load(); }, [load]);

  const deletePlan = async (id) => {
    if (!window.confirm(isRTL ? 'حذف هذه الخطة؟' : 'Delete this plan?')) return;
    try {
      await axios.delete(`${API}/admin/subscription-plans/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      load();
    } catch (e) {
      toast.error(isRTL ? 'فشل الحذف' : 'Delete failed');
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-bold text-lg flex items-center gap-2 text-amber-400">
          <DollarSign size={18} /> {isRTL ? 'خطط الاشتراك حسب الدولة' : 'Subscription Plans by Country'}
          <span className="text-xs text-gray-500 font-normal">({plans.length})</span>
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2"
          data-testid="add-plan-btn"
        >
          <Plus size={16} /> {isRTL ? 'خطة جديدة' : 'New Plan'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-5">
        {isRTL
          ? 'أضف خطة لكل دولة بعملتها الخاصة (مثلاً: سوريا - ل.س، السعودية - ر.س). يتم عرض الخطة تلقائياً للمستخدم حسب دولته.'
          : 'Add a plan per country with its own currency (e.g. Syria - SYP). Shown to users based on their country.'}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="animate-spin text-amber-400" size={28} />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm">
          {isRTL ? 'لا توجد خطط بعد' : 'No plans yet'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              language={language}
              onEdit={() => setEditing(p)}
              onDelete={() => deletePlan(p.id)}
            />
          ))}
        </div>
      )}

      {(showCreate || editing) && (
        <PlanEditor
          API={API}
          token={token}
          language={language}
          initial={editing || EMPTY_PLAN}
          isEdit={!!editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { setShowCreate(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

const PlanCard = ({ plan, language, onEdit, onDelete }) => {
  const isRTL = language === 'ar';
  return (
    <div className={`rounded-xl p-4 border ${plan.active ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border-amber-500/30' : 'bg-gray-800/30 border-gray-700 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Globe size={16} className="text-amber-400" />
          <span className="font-bold text-white">{isRTL ? (plan.country_ar || plan.country) : plan.country}</span>
          {plan.country_code && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">{plan.country_code}</span>
          )}
          {!plan.active && (
            <span className="text-[10px] bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">{isRTL ? 'معطّل' : 'Disabled'}</span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-lg" data-testid={`edit-plan-${plan.id}`}>
            <Edit3 size={14} />
          </button>
          <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg" data-testid={`delete-plan-${plan.id}`}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold bg-gradient-to-br from-amber-400 to-yellow-500 bg-clip-text text-transparent">
          {plan.monthly_price?.toLocaleString()}
        </span>
        <span className="text-sm font-semibold text-amber-300">{plan.currency_symbol || plan.currency}</span>
        <span className="text-xs text-gray-400 ms-1">/{isRTL ? 'شهر' : 'month'}</span>
      </div>

      {plan.free_trial_months > 0 && (
        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mb-1">
          <Gift size={12} /> {isRTL ? `أول ${plan.free_trial_months} أشهر مجاناً` : `First ${plan.free_trial_months} months free`}
        </div>
      )}
      {plan.subscribe_url && (
        <div className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
          <LinkIcon size={12} /> <span className="truncate">{plan.subscribe_url}</span>
        </div>
      )}
    </div>
  );
};

const PlanEditor = ({ API, token, language, initial, isEdit, onClose, onSaved }) => {
  const isRTL = language === 'ar';
  const [form, setForm] = useState({ ...initial });
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm({ ...form, [k]: v });

  const save = async () => {
    if (!form.country?.trim()) {
      toast.error(isRTL ? 'اسم الدولة مطلوب' : 'Country name required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      // Convert features textarea to arrays if they were entered as newline-separated strings
      if (typeof payload.features_ar === 'string') payload.features_ar = payload.features_ar.split('\n').map(s => s.trim()).filter(Boolean);
      if (typeof payload.features_en === 'string') payload.features_en = payload.features_en.split('\n').map(s => s.trim()).filter(Boolean);
      payload.monthly_price = parseFloat(payload.monthly_price) || 0;
      if (payload.yearly_price === '' || payload.yearly_price === null || payload.yearly_price === undefined) {
        payload.yearly_price = null;
      } else {
        payload.yearly_price = parseFloat(payload.yearly_price);
      }
      payload.free_trial_months = parseInt(payload.free_trial_months) || 0;

      if (isEdit) {
        await axios.put(`${API}/admin/subscription-plans/${initial.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/admin/subscription-plans`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      toast.success(isRTL ? 'تم الحفظ ✅' : 'Saved ✅');
      onSaved();
    } catch (e) {
      toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const featuresArText = Array.isArray(form.features_ar) ? form.features_ar.join('\n') : (form.features_ar || '');
  const featuresEnText = Array.isArray(form.features_en) ? form.features_en.join('\n') : (form.features_en || '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
          <h3 className="font-bold text-amber-400">
            {isEdit ? (isRTL ? 'تعديل الخطة' : 'Edit Plan') : (isRTL ? 'خطة جديدة' : 'New Plan')}
          </h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label={isRTL ? 'الدولة (EN)' : 'Country (EN)'} value={form.country} onChange={(v) => update('country', v)} placeholder="Syria" testid="plan-country" required />
            <Field label={isRTL ? 'الدولة (AR)' : 'Country (AR)'} value={form.country_ar} onChange={(v) => update('country_ar', v)} placeholder="سوريا" testid="plan-country_ar" />
            <Field label={isRTL ? 'كود الدولة' : 'Country Code'} value={form.country_code} onChange={(v) => update('country_code', v.toUpperCase())} placeholder="SY" testid="plan-country_code" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Field label={isRTL ? 'العملة' : 'Currency'} value={form.currency} onChange={(v) => update('currency', v.toUpperCase())} placeholder="SYP" testid="plan-currency" />
            <Field label={isRTL ? 'رمز العملة' : 'Symbol'} value={form.currency_symbol} onChange={(v) => update('currency_symbol', v)} placeholder="ل.س" testid="plan-currency_symbol" />
            <Field label={isRTL ? 'السعر الشهري' : 'Monthly Price'} type="number" value={form.monthly_price} onChange={(v) => update('monthly_price', v)} testid="plan-monthly_price" />
            <Field label={isRTL ? 'السعر السنوي' : 'Yearly Price'} type="number" value={form.yearly_price ?? ''} onChange={(v) => update('yearly_price', v)} placeholder={isRTL ? '(اختياري)' : '(optional)'} testid="plan-yearly_price" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={isRTL ? 'أشهر مجانية' : 'Free Trial Months'} type="number" value={form.free_trial_months} onChange={(v) => update('free_trial_months', v)} testid="plan-free_trial_months" />
            <Field label={isRTL ? 'رابط الاشتراك' : 'Subscribe URL'} value={form.subscribe_url} onChange={(v) => update('subscribe_url', v)} placeholder="https://..." testid="plan-subscribe_url" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={isRTL ? 'العنوان (AR)' : 'Title (AR)'} value={form.title_ar} onChange={(v) => update('title_ar', v)} testid="plan-title_ar" />
            <Field label={isRTL ? 'العنوان (EN)' : 'Title (EN)'} value={form.title_en} onChange={(v) => update('title_en', v)} testid="plan-title_en" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={isRTL ? 'شارة العرض (AR)' : 'Badge Text (AR)'} value={form.badge_text_ar} onChange={(v) => update('badge_text_ar', v)} testid="plan-badge_ar" />
            <Field label={isRTL ? 'شارة العرض (EN)' : 'Badge Text (EN)'} value={form.badge_text_en} onChange={(v) => update('badge_text_en', v)} testid="plan-badge_en" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextArea label={isRTL ? 'الوصف (AR)' : 'Description (AR)'} value={form.description_ar} onChange={(v) => update('description_ar', v)} rows={2} testid="plan-description_ar" />
            <TextArea label={isRTL ? 'الوصف (EN)' : 'Description (EN)'} value={form.description_en} onChange={(v) => update('description_en', v)} rows={2} testid="plan-description_en" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextArea
              label={isRTL ? 'الميزات (AR) — كل سطر ميزة' : 'Features (AR) — one per line'}
              value={featuresArText}
              onChange={(v) => update('features_ar', v)}
              rows={5}
              testid="plan-features_ar"
            />
            <TextArea
              label={isRTL ? 'الميزات (EN) — كل سطر ميزة' : 'Features (EN) — one per line'}
              value={featuresEnText}
              onChange={(v) => update('features_en', v)}
              rows={5}
              testid="plan-features_en"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="w-5 h-5 accent-amber-500"
              data-testid="plan-active"
            />
            <span className="text-sm text-gray-200">{isRTL ? 'الخطة مفعّلة (تظهر للزوار)' : 'Plan active (visible to visitors)'}</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-800 sticky bottom-0 bg-gray-900 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 font-semibold text-sm">
            {isRTL ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="save-plan-btn"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {isRTL ? 'حفظ' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', placeholder, testid, required = false }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-gray-300 mb-1 block">
      {label} {required && <span className="text-red-400">*</span>}
    </span>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
      data-testid={testid}
    />
  </label>
);

const TextArea = ({ label, value, onChange, rows = 3, testid }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-gray-300 mb-1 block">{label}</span>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
      data-testid={testid}
    />
  </label>
);

export default AdminSubscriptionPlansPanel;
