/**
 * Admin — Transfer Recipients Panel
 * Manage Syriatel Cash number + Exchange office recipient info.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Smartphone, Building2, Plus, Trash2, Save, Loader2, X, Check,
} from 'lucide-react';

const AdminTransferRecipientsPanel = ({ API, token, language }) => {
  const isRTL = language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/transfer-recipients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data || {});
    } catch (e) {
      toast.error(isRTL ? 'تعذر التحميل' : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [API, token, isRTL]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await axios.put(`${API}/admin/transfer-recipients`, {
        syriatel_cash: data.syriatel_cash,
        exchanges: data.exchanges,
        general_note_ar: data.general_note_ar || '',
        general_note_en: data.general_note_en || '',
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم الحفظ ✅' : 'Saved ✅');
    } catch (e) {
      toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const updateSyriatel = (key, value) => {
    setData({ ...data, syriatel_cash: { ...(data?.syriatel_cash || {}), [key]: value } });
  };

  const updateExchange = (idx, key, value) => {
    const exchanges = [...(data?.exchanges || [])];
    exchanges[idx] = { ...exchanges[idx], [key]: value };
    setData({ ...data, exchanges });
  };

  const deleteExchange = (idx) => {
    if (!window.confirm(isRTL ? 'حذف هذا المكتب؟' : 'Delete this office?')) return;
    const exchanges = [...(data?.exchanges || [])];
    exchanges.splice(idx, 1);
    setData({ ...data, exchanges });
  };

  const addExchange = () => {
    const exchanges = [...(data?.exchanges || [])];
    exchanges.push({
      id: `custom-${Date.now()}`,
      name_ar: '',
      name_en: '',
      recipient_ar: '',
      recipient_en: '',
      province_ar: '',
      province_en: '',
      phone: '',
      active: true,
    });
    setData({ ...data, exchanges });
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-amber-400" size={32} /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
            <Smartphone size={18} /> {isRTL ? 'سيريتل كاش' : 'Syriatel Cash'}
          </h3>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.syriatel_cash?.active}
              onChange={(e) => updateSyriatel('active', e.target.checked)}
              className="w-4 h-4 accent-amber-500"
              data-testid="syriatel-active"
            />
            {isRTL ? 'مفعّل' : 'Active'}
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={isRTL ? 'رقم الاستلام' : 'Recipient Number'} value={data.syriatel_cash?.number} onChange={(v) => updateSyriatel('number', v)} placeholder="+963 9xx xxx xxx" testid="syriatel-number" />
          <Field label={isRTL ? 'الاسم المعروض (AR)' : 'Display Name (AR)'} value={data.syriatel_cash?.display_name_ar} onChange={(v) => updateSyriatel('display_name_ar', v)} testid="syriatel-name-ar" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <TextArea label={isRTL ? 'تعليمات (AR)' : 'Instructions (AR)'} value={data.syriatel_cash?.instructions_ar} onChange={(v) => updateSyriatel('instructions_ar', v)} testid="syriatel-instructions-ar" />
          <TextArea label={isRTL ? 'تعليمات (EN)' : 'Instructions (EN)'} value={data.syriatel_cash?.instructions_en} onChange={(v) => updateSyriatel('instructions_en', v)} testid="syriatel-instructions-en" />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
            <Building2 size={18} /> {isRTL ? 'مكاتب الحوالات' : 'Exchange Offices'}
            <span className="text-xs text-gray-500 font-normal">({data.exchanges?.length || 0})</span>
          </h3>
          <button
            onClick={addExchange}
            className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1"
            data-testid="add-exchange-btn"
          >
            <Plus size={14} /> {isRTL ? 'إضافة مكتب' : 'Add Office'}
          </button>
        </div>

        <div className="space-y-3">
          {(data.exchanges || []).map((ex, idx) => (
            <div key={idx} className="border border-gray-800 rounded-xl p-4 bg-gray-800/30">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="text-xs font-mono text-gray-500">ID: {ex.id}</div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!ex.active}
                      onChange={(e) => updateExchange(idx, 'active', e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                      data-testid={`exchange-active-${idx}`}
                    />
                    {isRTL ? 'مفعّل' : 'Active'}
                  </label>
                  <button onClick={() => deleteExchange(idx)} className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg" data-testid={`delete-exchange-${idx}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label={isRTL ? 'الاسم (AR)' : 'Name (AR)'} value={ex.name_ar} onChange={(v) => updateExchange(idx, 'name_ar', v)} testid={`exchange-name-ar-${idx}`} />
                <Field label={isRTL ? 'الاسم (EN)' : 'Name (EN)'} value={ex.name_en} onChange={(v) => updateExchange(idx, 'name_en', v)} testid={`exchange-name-en-${idx}`} />
                <Field label={isRTL ? 'المستلم (AR)' : 'Recipient (AR)'} value={ex.recipient_ar} onChange={(v) => updateExchange(idx, 'recipient_ar', v)} testid={`exchange-recipient-ar-${idx}`} />
                <Field label={isRTL ? 'المستلم (EN)' : 'Recipient (EN)'} value={ex.recipient_en} onChange={(v) => updateExchange(idx, 'recipient_en', v)} testid={`exchange-recipient-en-${idx}`} />
                <Field label={isRTL ? 'المحافظة (AR)' : 'Province (AR)'} value={ex.province_ar} onChange={(v) => updateExchange(idx, 'province_ar', v)} testid={`exchange-province-ar-${idx}`} />
                <Field label={isRTL ? 'المحافظة (EN)' : 'Province (EN)'} value={ex.province_en} onChange={(v) => updateExchange(idx, 'province_en', v)} testid={`exchange-province-en-${idx}`} />
                <Field label={isRTL ? 'هاتف (اختياري)' : 'Phone (optional)'} value={ex.phone} onChange={(v) => updateExchange(idx, 'phone', v)} testid={`exchange-phone-${idx}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-bold text-amber-400 mb-3">{isRTL ? 'ملاحظة عامة للصالون' : 'General Note to Salon'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextArea label={isRTL ? 'ملاحظة (AR)' : 'Note (AR)'} value={data.general_note_ar} onChange={(v) => setData({ ...data, general_note_ar: v })} testid="general-note-ar" />
          <TextArea label={isRTL ? 'ملاحظة (EN)' : 'Note (EN)'} value={data.general_note_en} onChange={(v) => setData({ ...data, general_note_en: v })} testid="general-note-en" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
          data-testid="save-recipients-btn"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isRTL ? 'حفظ جميع التغييرات' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', placeholder, testid }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-gray-300 mb-1 block">{label}</span>
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

const TextArea = ({ label, value, onChange, testid }) => (
  <label className="block">
    <span className="text-[11px] font-bold text-gray-300 mb-1 block">{label}</span>
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
      data-testid={testid}
    />
  </label>
);

export default AdminTransferRecipientsPanel;
