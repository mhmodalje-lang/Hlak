/**
 * Admin — Site Settings Panel
 * Manage global site contact info + social links.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Phone, Mail, Facebook, Instagram, Twitter, MessageCircle,
  Youtube, MapPin, Save, Loader2, Globe
} from 'lucide-react';

const FIELDS = [
  { key: 'phone',     icon: Phone,         label_ar: 'رقم الهاتف',        label_en: 'Phone Number',     type: 'tel',  placeholder: '+963 9xx xxx xxx' },
  { key: 'email',     icon: Mail,          label_ar: 'البريد الإلكتروني', label_en: 'Email',            type: 'email', placeholder: 'contact@example.com' },
  { key: 'whatsapp',  icon: MessageCircle, label_ar: 'واتساب',            label_en: 'WhatsApp',         type: 'tel',  placeholder: '+963 9xx xxx xxx' },
  { key: 'facebook',  icon: Facebook,      label_ar: 'فيسبوك (رابط)',     label_en: 'Facebook (URL)',   type: 'url',  placeholder: 'https://facebook.com/your-page' },
  { key: 'instagram', icon: Instagram,     label_ar: 'انستغرام (رابط)',  label_en: 'Instagram (URL)',  type: 'url',  placeholder: 'https://instagram.com/your-page' },
  { key: 'twitter',   icon: Twitter,       label_ar: 'تويتر (رابط)',      label_en: 'Twitter (URL)',    type: 'url',  placeholder: 'https://twitter.com/your-page' },
  { key: 'tiktok',    icon: Globe,         label_ar: 'تيك توك (رابط)',   label_en: 'TikTok (URL)',     type: 'url',  placeholder: 'https://tiktok.com/@your-page' },
  { key: 'youtube',   icon: Youtube,       label_ar: 'يوتيوب (رابط)',    label_en: 'YouTube (URL)',    type: 'url',  placeholder: 'https://youtube.com/@your-page' },
  { key: 'snapchat',  icon: Globe,         label_ar: 'سناب شات',          label_en: 'Snapchat',         type: 'text', placeholder: 'username' },
  { key: 'address',   icon: MapPin,        label_ar: 'العنوان',           label_en: 'Address',          type: 'text', placeholder: 'City, Country' },
];

const AdminSiteSettingsPanel = ({ API, token, language }) => {
  const isRTL = language === 'ar';
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/site-settings`);
      setSettings(res.data || {});
    } catch (e) {
      toast.error(isRTL ? 'تعذر تحميل الإعدادات' : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [API, isRTL]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      for (const f of FIELDS) {
        payload[f.key] = settings[f.key] ?? '';
      }
      payload.tagline_ar = settings.tagline_ar ?? '';
      payload.tagline_en = settings.tagline_en ?? '';
      await axios.put(`${API}/admin/site-settings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم الحفظ بنجاح ✅' : 'Saved successfully ✅');
    } catch (e) {
      toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg flex items-center gap-2 text-amber-400">
          <Phone size={18} /> {isRTL ? 'معلومات التواصل والسوشيال' : 'Contact & Social Info'}
        </h3>
        <button
          onClick={save}
          disabled={saving}
          className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold px-5 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
          data-testid="save-site-settings"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          {isRTL ? 'حفظ' : 'Save'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-5">
        {isRTL
          ? 'تظهر هذه المعلومات في ذيل الصفحة الرئيسية وصفحة "اتصل بنا".'
          : 'These values appear in the site footer and "Contact Us" page.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => {
          const Icon = f.icon;
          return (
            <label key={f.key} className="block">
              <span className="text-xs font-bold text-gray-300 mb-1.5 flex items-center gap-2">
                <Icon size={14} className="text-amber-400" />
                {isRTL ? f.label_ar : f.label_en}
              </span>
              <input
                type={f.type}
                value={settings[f.key] || ''}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                data-testid={`site-setting-${f.key}`}
              />
            </label>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-gray-300 mb-1.5 block">
            {isRTL ? 'الوصف المختصر (عربي)' : 'Tagline (Arabic)'}
          </span>
          <textarea
            value={settings.tagline_ar || ''}
            onChange={(e) => setSettings({ ...settings, tagline_ar: e.target.value })}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            data-testid="site-setting-tagline_ar"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-300 mb-1.5 block">
            {isRTL ? 'الوصف المختصر (English)' : 'Tagline (English)'}
          </span>
          <textarea
            value={settings.tagline_en || ''}
            onChange={(e) => setSettings({ ...settings, tagline_en: e.target.value })}
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            data-testid="site-setting-tagline_en"
          />
        </label>
      </div>
    </div>
  );
};

export default AdminSiteSettingsPanel;
