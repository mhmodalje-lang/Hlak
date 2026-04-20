import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Plus, Trash2, Edit, Save, X, Check, DollarSign, Clock, Scissors,
  Instagram, Facebook, Youtube, Twitter, Globe, MessageCircle, Share2,
  Tag, ChevronDown, ChevronUp, Copy, ExternalLink
} from 'lucide-react';

// Small helper: render TikTok icon (lucide doesn't have one)
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const SnapchatIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.166 2.002c-1.85-.004-3.65.56-5.107 1.607-1.474 1.058-2.4 2.687-2.518 4.485-.152 1.13-.04 2.284.173 3.409.051.267-.06.538-.291.7-.312.217-.695.281-1.038.442-.227.105-.458.233-.615.432-.264.33-.127.874.283 1.023.525.194 1.119.18 1.626.387.392.158.72.46.884.85.103.243.02.521-.157.716-.726.858-1.545 1.645-2.486 2.268-.367.244-.765.457-1.028.828-.16.225-.18.54-.05.783.23.432.726.614 1.18.73.7.18 1.416.295 2.134.386.094.01.195.017.267.085.09.086.108.223.131.346.073.39.149.784.326 1.145.08.165.2.313.372.38.232.088.49.04.727-.018.668-.165 1.348-.29 2.037-.29.58.002 1.163.087 1.72.256.38.118.75.29 1.094.5.324.197.658.393 1.033.47.39.083.805.033 1.176-.115.366-.146.693-.394.943-.706.247-.309.422-.677.606-1.032.144-.276.293-.558.523-.77.266-.247.62-.348.956-.432.56-.14 1.132-.241 1.66-.471.362-.158.735-.427.768-.85.034-.37-.22-.71-.553-.868-.91-.428-1.842-.837-2.62-1.484-.436-.363-.824-.786-1.115-1.27-.168-.28-.252-.628-.13-.94.12-.31.425-.515.73-.636.49-.195 1.03-.27 1.523-.464.265-.105.547-.238.72-.475.207-.289.163-.71-.097-.948-.223-.204-.516-.286-.787-.39-.29-.112-.592-.21-.84-.405-.193-.152-.272-.41-.236-.651.088-.63.266-1.25.326-1.886.087-1.04.022-2.101-.275-3.105-.357-1.229-1.077-2.342-2.028-3.192C15.83 2.66 14.022 2.044 12.166 2z"/>
  </svg>
);

const SOCIAL_PLATFORMS = [
  { key: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F', placeholder: 'https://instagram.com/yourpage or @username' },
  { key: 'tiktok', icon: TikTokIcon, label: 'TikTok', color: '#000000', placeholder: 'https://tiktok.com/@yourpage or @username' },
  { key: 'facebook', icon: Facebook, label: 'Facebook', color: '#1877F2', placeholder: 'https://facebook.com/yourpage' },
  { key: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'twitter', icon: Twitter, label: 'X / Twitter', color: '#1DA1F2', placeholder: 'https://x.com/yourhandle or @handle' },
  { key: 'snapchat', icon: SnapchatIcon, label: 'Snapchat', color: '#FFFC00', placeholder: 'https://snapchat.com/add/yourname' },
  { key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', color: '#25D366', placeholder: '+1234567890' },
  { key: 'website', icon: Globe, label: 'Website', color: '#64748B', placeholder: 'https://yoursite.com' },
];

const emptyServiceForm = {
  name: '', name_ar: '', description: '', price: '', duration_minutes: 30, category: 'general',
};

// ============== SERVICES MANAGEMENT ==============
export const ServicesManagement = ({ API, token, isMen, language }) => {
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyServiceForm);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const { formatPrice, currency } = useCurrency();

  const T = language === 'ar' ? {
    title: 'الخدمات والأسعار', add: 'إضافة خدمة', edit: 'تعديل',
    name: 'اسم الخدمة (EN)', nameAr: 'اسم الخدمة (AR)', desc: 'الوصف',
    price: 'السعر (USD)', duration: 'المدة (دقائق)', category: 'الفئة',
    priceHint: 'السعر يُدخل بالدولار USD ويُعرض للعملاء بعملتهم المحلية تلقائياً',
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف',
    empty: 'لم تتم إضافة خدمات بعد. أضف أول خدمة لعرضها للعملاء.',
    min: 'د', confirmDelete: 'هل تريد حذف هذه الخدمة؟',
    savedOK: 'تم الحفظ بنجاح', deletedOK: 'تم الحذف',
    categories: { general: 'عام', haircut: 'قصة شعر', beard: 'لحية', coloring: 'صبغ', styling: 'تصفيف', treatment: 'علاج' }
  } : {
    title: 'Services & Prices', add: 'Add Service', edit: 'Edit',
    name: 'Service Name (EN)', nameAr: 'Service Name (AR)', desc: 'Description',
    price: 'Price (USD)', duration: 'Duration (min)', category: 'Category',
    priceHint: 'Price is entered in USD and automatically displayed in the customer\'s local currency',
    save: 'Save', cancel: 'Cancel', delete: 'Delete',
    empty: 'No services yet. Add your first service to appear for customers.',
    min: 'min', confirmDelete: 'Delete this service?',
    savedOK: 'Saved successfully', deletedOK: 'Deleted',
    categories: { general: 'General', haircut: 'Haircut', beard: 'Beard', coloring: 'Coloring', styling: 'Styling', treatment: 'Treatment' }
  };

  const headers = { headers: { Authorization: `Bearer ${token}` } };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/barbershops/me/services`, headers);
      setServices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const save = async () => {
    if (!form.name || !form.price) {
      toast.error(language === 'ar' ? 'الاسم والسعر مطلوبان' : 'Name and price required');
      return;
    }
    try {
      const payload = {
        name: form.name,
        name_ar: form.name_ar || form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        duration_minutes: parseInt(form.duration_minutes) || 30,
        category: form.category,
      };
      if (editing) {
        await axios.put(`${API}/barbershops/me/services/${editing.id}`, payload, headers);
      } else {
        await axios.post(`${API}/barbershops/me/services`, payload, headers);
      }
      toast.success(T.savedOK);
      setShowForm(false); setEditing(null); setForm(emptyServiceForm);
      fetchServices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error');
    }
  };

  const del = async (id) => {
    if (!window.confirm(T.confirmDelete)) return;
    try {
      await axios.delete(`${API}/barbershops/me/services/${id}`, headers);
      toast.success(T.deletedOK);
      fetchServices();
    } catch (e) { toast.error('Error'); }
  };

  const startEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '', name_ar: s.name_ar || '',
      description: s.description || '', price: String(s.price || ''),
      duration_minutes: s.duration_minutes || 30, category: s.category || 'general',
    });
    setShowForm(true);
  };

  return (
    <div className={`p-5 rounded-2xl mb-6 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <h3 className={`text-lg font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Scissors className={`w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          {T.title}
          <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${isMen ? 'bg-[#2A1F14] text-[#F3E5AB]' : 'bg-[#FDF2F4] text-[#9E5B66]'}`}>{services.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <Button onClick={(e) => { e.stopPropagation(); setEditing(null); setForm(emptyServiceForm); setShowForm(true); setExpanded(true); }}
            size="sm" className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
            <Plus className="w-4 h-4" /> {T.add}
          </Button>
          {expanded ? <ChevronUp className={isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} /> : <ChevronDown className={isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {/* Form */}
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`p-4 rounded-xl mb-4 space-y-3 ${isMen ? 'bg-[#1A120A] border border-[#D4AF37]/20' : 'bg-white border border-[#B76E79]/20'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{T.name} *</label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{T.nameAr}</label>
                      <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} dir="rtl"
                        className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{T.desc}</label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                        <DollarSign className="w-3 h-3 inline" /> {T.price} *
                      </label>
                      <Input type="number" step="0.5" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                        className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'} />
                      {form.price && !isNaN(parseFloat(form.price)) && currency !== 'USD' && (
                        <div className={`text-[11px] mt-1 ${isMen ? 'text-[#F3E5AB]/70' : 'text-[#9E5B66]/80'}`}>
                          ≈ {formatPrice(parseFloat(form.price))} <span className="opacity-60">({currency})</span>
                        </div>
                      )}
                      <div className={`text-[10px] mt-1 opacity-60 ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                        {T.priceHint}
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                        <Clock className="w-3 h-3 inline" /> {T.duration}
                      </label>
                      <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                        className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'} />
                    </div>
                    <div>
                      <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                        <Tag className="w-3 h-3 inline" /> {T.category}
                      </label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        className={`w-full h-10 px-3 rounded-md border text-sm ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-white border-[#E7E5E4]'}`}>
                        {Object.entries(T.categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); setForm(emptyServiceForm); }}>
                      <X className="w-4 h-4" /> {T.cancel}
                    </Button>
                    <Button onClick={save} size="sm" className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
                      <Save className="w-4 h-4" /> {T.save}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List */}
            {loading ? (
              <div className="text-center py-6 opacity-60">...</div>
            ) : services.length === 0 ? (
              <div className={`text-center p-8 rounded-xl ${isMen ? 'bg-[#1A120A]/50' : 'bg-[#FAFAFA]'}`}>
                <Scissors className={`w-10 h-10 mx-auto mb-2 opacity-40 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{T.empty}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {services.map(s => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${isMen ? 'bg-[#2A1F14]/60 hover:bg-[#2A1F14]' : 'bg-white hover:bg-[#FDF2F4]/50'} border ${isMen ? 'border-[#3A2E1F]' : 'border-[#E7E5E4]'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isMen ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#B76E79]/20 text-[#B76E79]'}`}>
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {language === 'ar' ? (s.name_ar || s.name) : s.name}
                        </span>
                        {s.category && s.category !== 'general' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isMen ? 'bg-[#3A2E1F] text-[#F3E5AB]' : 'bg-[#FDF2F4] text-[#9E5B66]'}`}>
                            {T.categories[s.category] || s.category}
                          </span>
                        )}
                      </div>
                      {s.description && <div className={`text-xs truncate mt-0.5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{s.description}</div>}
                      <div className={`text-xs mt-1 flex gap-3 items-center flex-wrap ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                        <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                          {formatPrice(s.price)}
                        </span>
                        {currency !== 'USD' && (
                          <span className="text-[10px] opacity-60">(USD {s.price})</span>
                        )}
                        <span><Clock className="w-3 h-3 inline" /> {s.duration_minutes} {T.min}</span>
                      </div>
                    </div>
                    <button onClick={() => startEdit(s)} className={`p-2 rounded-lg ${isMen ? 'hover:bg-[#3A2E1F] text-[#D4AF37]' : 'hover:bg-[#FDF2F4] text-[#B76E79]'}`}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(s.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============== SOCIAL MEDIA MANAGEMENT ==============
export const SocialMediaManagement = ({ API, token, isMen, language, profile, onUpdate }) => {
  const [form, setForm] = useState({
    instagram: '', tiktok: '', facebook: '', youtube: '', twitter: '', snapchat: '', whatsapp: '', website: '',
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const T = language === 'ar' ? {
    title: 'حسابات التواصل الاجتماعي',
    subtitle: 'أضف روابط حساباتك ليتابعك عملاؤك على كل المنصات',
    save: 'حفظ الحسابات',
    savedOK: 'تم حفظ الحسابات بنجاح',
    copy: 'نسخ', preview: 'معاينة', placeholder: 'رابط الحساب أو اسم المستخدم'
  } : {
    title: 'Social Media Accounts',
    subtitle: 'Add links to your accounts so clients can follow you on all platforms',
    save: 'Save Accounts',
    savedOK: 'Saved successfully',
    copy: 'Copy', preview: 'Preview', placeholder: 'URL or username'
  };

  useEffect(() => {
    if (profile) {
      setForm({
        instagram: profile.instagram || profile.instagram_url || '',
        tiktok: profile.tiktok || profile.tiktok_url || '',
        facebook: profile.facebook || '',
        youtube: profile.youtube || '',
        twitter: profile.twitter || '',
        snapchat: profile.snapchat || '',
        whatsapp: profile.whatsapp || profile.whatsapp_number || '',
        website: profile.website || '',
      });
    }
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/barbershops/me/social`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(T.savedOK);
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className={`p-5 rounded-2xl mb-6 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
      <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <Share2 className={`w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            {T.title}
          </h3>
          <p className={`text-xs mt-0.5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{T.subtitle}</p>
        </div>
        {expanded ? <ChevronUp className={isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} /> : <ChevronDown className={isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {SOCIAL_PLATFORMS.map(p => (
                <div key={p.key} className={`flex items-center gap-2 p-2.5 rounded-xl border ${isMen ? 'bg-[#1A120A] border-[#3A2E1F] focus-within:border-[#D4AF37]/60' : 'bg-white border-[#E7E5E4] focus-within:border-[#B76E79]/60'}`}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}20`, color: p.color }}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={`text-[10px] font-bold uppercase tracking-wider ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{p.label}</label>
                    <input
                      type="text"
                      placeholder={p.placeholder}
                      value={form[p.key] || ''}
                      onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                      className={`w-full bg-transparent outline-none text-sm ${isMen ? 'text-white placeholder:text-[#64748b]' : 'text-[#1C1917] placeholder:text-[#a8a29e]'}`}
                      dir="ltr"
                    />
                  </div>
                  {form[p.key] && (
                    <a href={form[p.key].startsWith('http') ? form[p.key] : `https://${form[p.key]}`} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1.5 rounded-lg ${isMen ? 'hover:bg-[#3A2E1F] text-[#D4AF37]' : 'hover:bg-[#FDF2F4] text-[#B76E79]'}`}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={save} disabled={saving} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
                {saving ? <span className="animate-pulse">...</span> : <><Save className="w-4 h-4" /> {T.save}</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
