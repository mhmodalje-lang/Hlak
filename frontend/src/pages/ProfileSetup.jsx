import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import LocationPicker from '@/components/LocationPicker';
import ImageUploader from '@/components/ImageUploader';
import { 
  ArrowRight, ArrowLeft, Plus, X, Loader2, Save, Check,
  Clock, DollarSign, Image, Link as LinkIcon
} from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { API, gender, user, token, language, themeClass, isAuthenticated, isBarber } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);

  const [formData, setFormData] = useState({
    salon_name: '',
    salon_name_ar: '',
    description: '',
    description_ar: '',
    logo_url: '',
    whatsapp: '',
    instagram: '',
    tiktok: '',
    facebook: '',
    twitter: '',
    snapchat: '',
    youtube: '',
    address: '',
    neighborhood: '',
    village: '',
    district: '',
    latitude: null,
    longitude: null,
    average_service_time: 30,
    services: [],
    custom_services: [],
    before_after_images: [],
    working_hours: {
      sunday: { start: '09:00', end: '21:00' },
      monday: { start: '09:00', end: '21:00' },
      tuesday: { start: '09:00', end: '21:00' },
      wednesday: { start: '09:00', end: '21:00' },
      thursday: { start: '09:00', end: '21:00' },
      friday: { start: '09:00', end: '21:00' },
      saturday: { start: '09:00', end: '21:00' }
    }
  });

  const [newService, setNewService] = useState({ name: '', name_ar: '', price: '', duration_minutes: 30, currency: 'USD' });
  const [newImage, setNewImage] = useState({ before: '', after: '' });
  // v3.9.7 — helper: currency auto-detected from the salon's country
  // (user requested "يختار عملة بلده" — pick currency from country automatically).
  const COUNTRY_CURRENCY = {
    'Syria': { code: 'SYP', symbol: 'ل.س' },
    'سوريا': { code: 'SYP', symbol: 'ل.س' },
    'Saudi Arabia': { code: 'SAR', symbol: 'ر.س' },
    'السعودية': { code: 'SAR', symbol: 'ر.س' },
    'UAE': { code: 'AED', symbol: 'د.إ' },
    'الإمارات': { code: 'AED', symbol: 'د.إ' },
    'Egypt': { code: 'EGP', symbol: 'ج.م' },
    'مصر': { code: 'EGP', symbol: 'ج.م' },
    'Jordan': { code: 'JOD', symbol: 'د.أ' },
    'الأردن': { code: 'JOD', symbol: 'د.أ' },
    'Iraq': { code: 'IQD', symbol: 'د.ع' },
    'العراق': { code: 'IQD', symbol: 'د.ع' },
    'Lebanon': { code: 'LBP', symbol: 'ل.ل' },
    'لبنان': { code: 'LBP', symbol: 'ل.ل' },
  };
  const detectedCurrency = COUNTRY_CURRENCY[formData.country] || COUNTRY_CURRENCY[user?.country] || { code: 'USD', symbol: '$' };

  const isMen = gender === 'male';

  // list ourselves — barber just picks + sets price"). These are the ready-to-add
  // presets, grouped by gender. Barber taps + icon → stays on screen with his price.
  const defaultServicessMen = [
    { key: 'haircut', name: 'Haircut', name_ar: 'قص شعر', duration_minutes: 30, icon: '✂️' },
    { key: 'beard',   name: 'Beard Trim', name_ar: 'تشذيب اللحية', duration_minutes: 15, icon: '🧔' },
    { key: 'shave',   name: 'Classic Shave', name_ar: 'حلاقة تقليدية', duration_minutes: 20, icon: '🪒' },
    { key: 'face',    name: 'Face Cleaning', name_ar: 'تنظيف البشرة', duration_minutes: 20, icon: '🧖' },
    { key: 'color',   name: 'Hair Color', name_ar: 'صبغة شعر', duration_minutes: 45, icon: '🎨' },
    { key: 'kid',     name: 'Kids Haircut', name_ar: 'قص للأطفال', duration_minutes: 20, icon: '👶' },
    { key: 'wash',    name: 'Hair Wash + Style', name_ar: 'غسيل وتصفيف', duration_minutes: 20, icon: '💧' },
    { key: 'mask',    name: 'Hair Mask Treatment', name_ar: 'حمام زيت', duration_minutes: 30, icon: '🫙' },
    { key: 'combo',   name: 'Full Grooming Combo', name_ar: 'باقة العناية الكاملة', duration_minutes: 60, icon: '👑' },
    { key: 'eyebrow', name: 'Eyebrow Shaping', name_ar: 'تشذيب الحاجب', duration_minutes: 10, icon: '✨' },
  ];
  const defaultServicesWomen = [
    { key: 'haircut',    name: 'Haircut', name_ar: 'قص شعر', duration_minutes: 45, icon: '✂️' },
    { key: 'styling',    name: 'Hair Styling', name_ar: 'تصفيف شعر', duration_minutes: 60, icon: '💇‍♀️' },
    { key: 'keratin',    name: 'Keratin Treatment', name_ar: 'بروتين / كيراتين', duration_minutes: 180, icon: '💎' },
    { key: 'color',      name: 'Hair Color', name_ar: 'صبغة شعر', duration_minutes: 90, icon: '🎨' },
    { key: 'highlights', name: 'Highlights', name_ar: 'هايلايت', duration_minutes: 120, icon: '🌟' },
    { key: 'makeup',     name: 'Makeup', name_ar: 'مكياج', duration_minutes: 60, icon: '💄' },
    { key: 'bridal',     name: 'Bridal Makeup', name_ar: 'مكياج عروس', duration_minutes: 180, icon: '👰' },
    { key: 'manicure',   name: 'Manicure', name_ar: 'مناكير', duration_minutes: 30, icon: '💅' },
    { key: 'pedicure',   name: 'Pedicure', name_ar: 'باديكير', duration_minutes: 45, icon: '🦶' },
    { key: 'facial',     name: 'Facial Treatment', name_ar: 'تنظيف بشرة', duration_minutes: 60, icon: '🧖‍♀️' },
    { key: 'threading',  name: 'Threading', name_ar: 'خيط حواجب', duration_minutes: 15, icon: '✨' },
    { key: 'waxing',     name: 'Full Body Waxing', name_ar: 'إزالة الشعر بالشمع', duration_minutes: 60, icon: '🕯️' },
    { key: 'henna',      name: 'Henna', name_ar: 'حناء', duration_minutes: 30, icon: '🤎' },
  ];
  const defaultServices = isMen ? defaultServicessMen : defaultServicesWomen;

  const texts = {
    ar: {
      title: 'إعداد الملف الشخصي',
      basicInfo: 'المعلومات الأساسية',
      salonName: 'اسم الصالون (إنجليزي)',
      salonNameAr: 'اسم الصالون (عربي)',
      description: 'الوصف (إنجليزي)',
      descriptionAr: 'الوصف (عربي)',
      logo: 'رابط الشعار',
      address: 'العنوان',
      neighborhood: 'الحي',
      avgTime: 'متوسط وقت الخدمة (دقيقة)',
      socialLinks: 'روابط التواصل',
      whatsapp: 'رقم واتساب',
      services: 'الخدمات',
      defaultServices: 'خدمات افتراضية',
      customServices: 'خدمات إضافية',
      addService: 'إضافة خدمة',
      serviceName: 'اسم الخدمة',
      serviceNameAr: 'اسم الخدمة (عربي)',
      price: 'السعر (€)',
      duration: 'المدة (دقيقة)',
      gallery: 'معرض الصور (قبل/بعد)',
      addImage: 'إضافة صورة',
      beforeUrl: 'رابط صورة قبل',
      afterUrl: 'رابط صورة بعد',
      workingHours: 'ساعات العمل',
      save: 'حفظ الملف',
      loginRequired: 'يرجى تسجيل الدخول كحلاق'
    },
    en: {
      title: 'Profile Setup',
      basicInfo: 'Basic Information',
      salonName: 'Salon Name (English)',
      salonNameAr: 'Salon Name (Arabic)',
      description: 'Description (English)',
      descriptionAr: 'Description (Arabic)',
      logo: 'Logo URL',
      address: 'Address',
      neighborhood: 'Neighborhood',
      avgTime: 'Average Service Time (minutes)',
      socialLinks: 'Social Links',
      whatsapp: 'WhatsApp Number',
      services: 'Services',
      defaultServices: 'Default Services',
      customServices: 'Custom Services',
      addService: 'Add Service',
      serviceName: 'Service Name',
      serviceNameAr: 'Service Name (Arabic)',
      price: 'Price (€)',
      duration: 'Duration (min)',
      gallery: 'Gallery (Before/After)',
      addImage: 'Add Image',
      beforeUrl: 'Before Image URL',
      afterUrl: 'After Image URL',
      workingHours: 'Working Hours',
      save: 'Save Profile',
      loginRequired: 'Please login as barber'
    }
  };

  const t = texts[language] || texts.ar;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  useEffect(() => {
    if (isAuthenticated && isBarber) {
      fetchExistingProfile();
    }
  }, [isAuthenticated, isBarber]);

  const fetchExistingProfile = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExistingProfile(res.data);
      setFormData({
        ...formData,
        ...res.data,
        services: res.data.services || [],
        custom_services: res.data.custom_services || [],
        before_after_images: res.data.before_after_images || [],
        working_hours: res.data.working_hours || formData.working_hours
      });
    } catch (err) {
      // No existing profile
      setFormData({
        ...formData,
        services: isMen ? defaultServicessMen : defaultServicesWomen
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.salon_name || !formData.salon_name_ar) {
      toast.error(language === 'ar' ? 'يرجى إدخال اسم الصالون' : 'Please enter salon name');
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = existingProfile ? `${API}/barbers/profile` : `${API}/barbers/profile`;
      const method = existingProfile ? 'put' : 'post';
      
      await axios[method](endpoint, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(language === 'ar' ? 'تم حفظ الملف الشخصي' : 'Profile saved successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomService = () => {
    if (!newService.name || !newService.price) return;
    setFormData({
      ...formData,
      custom_services: [...formData.custom_services, {
        ...newService,
        price: parseFloat(newService.price),
        currency: newService.currency || detectedCurrency.code,
      }]
    });
    setNewService({ name: '', name_ar: '', price: '', duration_minutes: 30, currency: detectedCurrency.code });
  };

  // v3.9.7 — one-tap "Add preset service" + edit price/currency inline
  const addPresetService = (preset) => {
    // Don't add a duplicate
    if (formData.services.some(s => s.key === preset.key || s.name_ar === preset.name_ar)) return;
    setFormData({
      ...formData,
      services: [...formData.services, { ...preset, price: 0, currency: detectedCurrency.code }],
    });
  };
  const removePresetService = (key) => {
    setFormData({ ...formData, services: formData.services.filter(s => s.key !== key) });
  };
  const updatePresetServicePrice = (key, price) => {
    setFormData({
      ...formData,
      services: formData.services.map(s => s.key === key ? { ...s, price: parseFloat(price) || 0 } : s),
    });
  };

  const removeCustomService = (index) => {
    setFormData({
      ...formData,
      custom_services: formData.custom_services.filter((_, i) => i !== index)
    });
  };

  const addImage = () => {
    if (!newImage.before || !newImage.after) return;
    if (formData.before_after_images.length >= 3) {
      toast.error(language === 'ar' ? 'الحد الأقصى 3 صور' : 'Maximum 3 images');
      return;
    }
    setFormData({
      ...formData,
      before_after_images: [...formData.before_after_images, newImage]
    });
    setNewImage({ before: '', after: '' });
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      before_after_images: formData.before_after_images.filter((_, i) => i !== index)
    });
  };

  const inputClass = isMen 
    ? 'bg-[#2A1F14] border-[#3A2E1F] text-white placeholder:text-[#94A3B8]' 
    : 'bg-white border-[#E7E5E4] text-[#1C1917] placeholder:text-[#57534E]';

  const labelClass = isMen ? 'text-[#94A3B8]' : 'text-[#57534E]';

  if (!isAuthenticated || !isBarber) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`mb-4 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="profile-setup-page">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {t.title}
          </h1>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {t.basicInfo}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>{t.salonName}</Label>
                  <Input
                    value={formData.salon_name}
                    onChange={(e) => setFormData({ ...formData, salon_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <Label className={labelClass}>{t.salonNameAr}</Label>
                  <Input
                    value={formData.salon_name_ar}
                    onChange={(e) => setFormData({ ...formData, salon_name_ar: e.target.value })}
                    className={inputClass}
                    dir="rtl"
                  />
                </div>
              </div>
              <div>
                <Label className={labelClass}>{t.description}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClass}
                  rows={2}
                />
              </div>
              <div>
                <Label className={labelClass}>{t.descriptionAr}</Label>
                <Textarea
                  value={formData.description_ar}
                  onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                  className={inputClass}
                  rows={2}
                  dir="rtl"
                />
              </div>
              <div>
                <Label className={labelClass}>{t.avgTime}</Label>
                <Input
                  type="number"
                  value={formData.average_service_time}
                  onChange={(e) => setFormData({ ...formData, average_service_time: parseInt(e.target.value) || 30 })}
                  className={inputClass}
                />
              </div>
              {/* v3.7 Logo upload — replaces the old URL text input */}
              <div>
                <Label className={labelClass}>
                  {language === 'ar' ? 'شعار الصالون / صورة الملف' : 'Salon logo / profile image'}
                </Label>
                <ImageUploader
                  value={formData.logo_url}
                  onChange={(v) => setFormData({ ...formData, logo_url: v })}
                  helpText={language === 'ar'
                    ? 'اختر صورة واضحة لواجهة الصالون أو الشعار (سيظهر للزبائن)'
                    : 'Pick a clear storefront or logo photo (visible to customers)'}
                  aspect="square"
                  language={language}
                  testId="shop-logo-uploader"
                />
              </div>
            </div>
          </div>

          {/* Hyper-Local Location */}
          <LocationPicker
            value={{
              latitude: formData.latitude,
              longitude: formData.longitude,
              district: formData.district,
              neighborhood: formData.neighborhood,
              village: formData.village,
              address: formData.address
            }}
            onChange={(loc) => setFormData({ ...formData, ...loc })}
            language={language}
            isMen={isMen}
          />

          {/* Social Links */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <LinkIcon className="w-5 h-5 inline me-2" />
              {t.socialLinks}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className={labelClass}>{t.whatsapp}</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className={inputClass}
                  placeholder="+963935964158"
                />
              </div>
              <div>
                <Label className={labelClass}>Instagram</Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  className={inputClass}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div>
                <Label className={labelClass}>TikTok</Label>
                <Input
                  value={formData.tiktok}
                  onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                  className={inputClass}
                  placeholder="https://tiktok.com/@..."
                />
              </div>
              <div>
                <Label className={labelClass}>Facebook</Label>
                <Input
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                  className={inputClass}
                  placeholder="https://facebook.com/..."
                  data-testid="facebook-input"
                />
              </div>
              <div>
                <Label className={labelClass}>X / Twitter</Label>
                <Input
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  className={inputClass}
                  placeholder="https://x.com/..."
                  data-testid="twitter-input"
                />
              </div>
              <div>
                <Label className={labelClass}>Snapchat</Label>
                <Input
                  value={formData.snapchat}
                  onChange={(e) => setFormData({ ...formData, snapchat: e.target.value })}
                  className={inputClass}
                  placeholder="username"
                  data-testid="snapchat-input"
                />
              </div>
              <div>
                <Label className={labelClass}>YouTube</Label>
                <Input
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  className={inputClass}
                  placeholder="https://youtube.com/@..."
                  data-testid="youtube-input"
                />
              </div>
            </div>
          </div>

          {/* Services — v3.9.7 redesign: preset library + one-tap add + inline price */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`} data-testid="services-section">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className={`text-lg font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <DollarSign className="w-5 h-5 inline me-2" />
                {t.services}
              </h2>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${isMen ? 'border-amber-400/40 text-amber-300 bg-amber-500/10' : 'border-rose-400/40 text-rose-500 bg-rose-50'}`}>
                {language === 'ar' ? `العملة: ${detectedCurrency.symbol}` : `Currency: ${detectedCurrency.code}`}
              </span>
            </div>
            <p className={`text-xs mb-4 ${labelClass}`}>
              {language === 'ar'
                ? 'اختر الخدمات التي تقدمها وحدد سعرك لكل خدمة. يمكنك أيضاً إضافة خدمات مخصصة في الأسفل.'
                : 'Pick the services you offer and set your price. You can add custom ones at the bottom.'}
            </p>

            {/* Preset library — tap to add */}
            <p className={`text-sm font-semibold mb-2 ${labelClass}`}>
              {language === 'ar' ? 'مكتبة الخدمات (انقر للإضافة)' : 'Service Library (tap to add)'}
            </p>
            <div className="flex flex-wrap gap-2 mb-5" data-testid="preset-services-grid">
              {defaultServices.map(preset => {
                const added = formData.services.some(s => s.key === preset.key);
                return (
                  <button
                    key={preset.key}
                    onClick={() => added ? removePresetService(preset.key) : addPresetService(preset)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                      added
                        ? (isMen ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-rose-400 bg-rose-100 text-rose-700')
                        : (isMen ? 'border-[#3A2E1F] bg-[#2A1F14] text-gray-300 hover:border-amber-400/60' : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:border-rose-400/60')
                    }`}
                    data-testid={`preset-${preset.key}`}
                  >
                    <span className="me-1.5">{preset.icon}</span>
                    {language === 'ar' ? preset.name_ar : preset.name}
                    {added && <Check className="w-3 h-3 inline ms-1.5" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            {/* Chosen services with price input */}
            {formData.services.length > 0 && (
              <>
                <p className={`text-sm font-semibold mb-2 ${labelClass}`}>
                  {language === 'ar' ? 'حدّد السعر لكل خدمة اخترتها:' : 'Set price for each chosen service:'}
                </p>
                <div className="space-y-2 mb-5" data-testid="chosen-services-list">
                  {formData.services.map(svc => (
                    <div key={svc.key} className={`flex items-center gap-3 p-3 rounded-xl ${isMen ? 'bg-[#2A1F14] border border-[#3A2E1F]' : 'bg-[#FAFAFA] border border-[#E7E5E4]'}`}>
                      <div className="text-2xl">{svc.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {language === 'ar' ? svc.name_ar : svc.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{svc.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          placeholder="0"
                          value={svc.price || ''}
                          onChange={(e) => updatePresetServicePrice(svc.key, e.target.value)}
                          className={`${inputClass} w-24 text-center`}
                          data-testid={`price-${svc.key}`}
                        />
                        <span className={`text-xs font-semibold ${isMen ? 'text-amber-300' : 'text-rose-500'}`}>{detectedCurrency.symbol}</span>
                      </div>
                      <button onClick={() => removePresetService(svc.key)} className="text-red-500 hover:text-red-400 p-1" data-testid={`remove-${svc.key}`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Custom Services already added */}
            {formData.custom_services.length > 0 && (
              <>
                <p className={`text-sm font-semibold mb-2 ${labelClass}`}>{t.customServices}:</p>
                <div className="space-y-2 mb-4">
                  {formData.custom_services.map((s, i) => (
                    <div key={i} className={`flex items-center justify-between gap-3 p-3 rounded-xl ${isMen ? 'bg-[#2A1F14] border border-[#3A2E1F]' : 'bg-[#FAFAFA] border border-[#E7E5E4]'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {language === 'ar' ? (s.name_ar || s.name) : (s.name || s.name_ar)}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {s.price} {s.currency || detectedCurrency.code} · {s.duration_minutes || 30} {language === 'ar' ? 'دقيقة' : 'min'}
                        </p>
                      </div>
                      <button onClick={() => removeCustomService(i)} className="text-red-500 hover:text-red-400 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add Custom Service — stacked form, no more cramped grid */}
            <div className={`p-4 rounded-xl ${isMen ? 'bg-[#1a1209] border-2 border-dashed border-amber-400/30' : 'bg-[#FFF7F5] border-2 border-dashed border-rose-400/30'}`}>
              <p className={`text-xs font-bold mb-3 ${isMen ? 'text-amber-300' : 'text-rose-500'}`}>
                {language === 'ar' ? '➕ خدمة مخصصة (غير مدرجة في القائمة)' : '➕ Custom service (not in library)'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <Input
                  placeholder={language === 'ar' ? 'اسم الخدمة بالإنجليزي' : 'Service name (English)'}
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  className={inputClass}
                  data-testid="custom-service-name"
                />
                <Input
                  placeholder={language === 'ar' ? 'اسم الخدمة بالعربي' : 'Service name (Arabic)'}
                  value={newService.name_ar}
                  onChange={(e) => setNewService({ ...newService, name_ar: e.target.value })}
                  className={inputClass}
                  dir="rtl"
                  data-testid="custom-service-name-ar"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={language === 'ar' ? 'السعر' : 'Price'}
                    value={newService.price}
                    onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                    className={`${inputClass} pe-10`}
                    data-testid="custom-service-price"
                  />
                  <span className={`absolute top-1/2 -translate-y-1/2 end-3 text-xs font-semibold ${isMen ? 'text-amber-300' : 'text-rose-500'}`}>{detectedCurrency.symbol}</span>
                </div>
                <Input
                  type="number"
                  placeholder={language === 'ar' ? 'المدة (دقيقة)' : 'Duration (min)'}
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value || '30', 10) })}
                  className={inputClass}
                  data-testid="custom-service-duration"
                />
                <Button
                  onClick={addCustomService}
                  className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
                  data-testid="add-custom-service-btn"
                >
                  <Plus className="w-4 h-4 me-1" />
                  {language === 'ar' ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <Image className="w-5 h-5 inline me-2" />
              {t.gallery} (3 max)
            </h2>
            
            <div className="space-y-4 mb-4">
              {formData.before_after_images.map((img, i) => (
                <div key={i} className={`flex items-center gap-4 p-3 rounded ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  <div className="flex gap-2 flex-1">
                    <img src={img.before} alt="Before" className="w-16 h-16 object-cover rounded" />
                    <img src={img.after} alt="After" className="w-16 h-16 object-cover rounded" />
                  </div>
                  <button onClick={() => removeImage(i)} className="text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ImageUploader
                value={newImage.before}
                onChange={(v) => setNewImage({ ...newImage, before: v })}
                label={language === 'ar' ? 'قبل' : 'Before'}
                helpText={language === 'ar' ? 'صورة قبل القصة / التسريحة' : 'Photo before the haircut / style'}
                aspect="square"
                language={language}
                testId="gallery-before"
              />
              <ImageUploader
                value={newImage.after}
                onChange={(v) => setNewImage({ ...newImage, after: v })}
                label={language === 'ar' ? 'بعد' : 'After'}
                helpText={language === 'ar' ? 'صورة بعد القصة / التسريحة' : 'Photo after the haircut / style'}
                aspect="square"
                language={language}
                testId="gallery-after"
              />
            </div>
            <Button
              onClick={addImage}
              className={`mt-3 w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              disabled={!newImage.before || !newImage.after}
              data-testid="add-gallery-pair"
            >
              <Plus className="w-4 h-4 me-2" />
              {t.addImage}
            </Button>
          </div>

          {/* Working Hours */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <Clock className="w-5 h-5 inline me-2" />
              {t.workingHours}
            </h2>
            <div className="space-y-2">
              {days.map((day, i) => (
                <div key={day} className="flex items-center gap-4">
                  <span className={`w-24 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    {language === 'ar' ? daysAr[i] : day}
                  </span>
                  <Input
                    type="time"
                    value={formData.working_hours[day]?.start || '09:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      working_hours: {
                        ...formData.working_hours,
                        [day]: { ...formData.working_hours[day], start: e.target.value }
                      }
                    })}
                    className={`w-28 ${inputClass}`}
                  />
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>-</span>
                  <Input
                    type="time"
                    value={formData.working_hours[day]?.end || '21:00'}
                    onChange={(e) => setFormData({
                      ...formData,
                      working_hours: {
                        ...formData.working_hours,
                        [day]: { ...formData.working_hours[day], end: e.target.value }
                      }
                    })}
                    className={`w-28 ${inputClass}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className={`w-full py-6 text-lg ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 me-2" />
                {t.save}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
