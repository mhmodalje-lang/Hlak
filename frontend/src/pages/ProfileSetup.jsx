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
  ArrowRight, ArrowLeft, Plus, X, Loader2, Save,
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

  const [newService, setNewService] = useState({ name: '', name_ar: '', price: '', duration_minutes: 30 });
  const [newImage, setNewImage] = useState({ before: '', after: '' });

  const isMen = gender === 'male';

  const defaultServicessMen = [
    { name: 'Haircut', name_ar: 'قص شعر', price: 10, duration_minutes: 30 },
    { name: 'Beard Trim', name_ar: 'تشذيب الذقن', price: 5, duration_minutes: 15 },
    { name: 'Face Cleaning', name_ar: 'تنظيف البشرة', price: 8, duration_minutes: 20 },
    { name: 'Hair Color', name_ar: 'صبغة شعر', price: 20, duration_minutes: 45 }
  ];

  const defaultServicesWomen = [
    { name: 'Haircut', name_ar: 'قص شعر', price: 15, duration_minutes: 45 },
    { name: 'Hair Styling', name_ar: 'تصفيف شعر', price: 20, duration_minutes: 60 },
    { name: 'Makeup', name_ar: 'مكياج', price: 30, duration_minutes: 60 },
    { name: 'Hair Color', name_ar: 'صبغة شعر', price: 40, duration_minutes: 90 },
    { name: 'Manicure', name_ar: 'مناكير', price: 15, duration_minutes: 30 },
    { name: 'Facial', name_ar: 'عناية بالبشرة', price: 25, duration_minutes: 45 }
  ];

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
      custom_services: [...formData.custom_services, { ...newService, price: parseFloat(newService.price) }]
    });
    setNewService({ name: '', name_ar: '', price: '', duration_minutes: 30 });
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

          {/* Services */}
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <DollarSign className="w-5 h-5 inline me-2" />
              {t.services}
            </h2>
            
            {/* Default Services */}
            <p className={`text-sm mb-2 ${labelClass}`}>{t.defaultServices}:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.services.map((s, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-sm ${isMen ? 'bg-[#3A2E1F] text-white' : 'bg-[#E7E5E4] text-[#1C1917]'}`}>
                  {language === 'ar' ? s.name_ar : s.name} - {s.price}€
                </span>
              ))}
            </div>

            {/* Custom Services */}
            <p className={`text-sm mb-2 ${labelClass}`}>{t.customServices}:</p>
            <div className="space-y-2 mb-4">
              {formData.custom_services.map((s, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>
                    {language === 'ar' ? s.name_ar : s.name} - {s.price}€ ({s.duration_minutes}min)
                  </span>
                  <button onClick={() => removeCustomService(i)} className="text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Custom Service */}
            <div className="grid grid-cols-4 gap-2">
              <Input
                placeholder={t.serviceName}
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                className={inputClass}
              />
              <Input
                placeholder={t.serviceNameAr}
                value={newService.name_ar}
                onChange={(e) => setNewService({ ...newService, name_ar: e.target.value })}
                className={inputClass}
                dir="rtl"
              />
              <Input
                type="number"
                placeholder={t.price}
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                className={inputClass}
              />
              <Button onClick={addCustomService} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
                <Plus className="w-4 h-4" />
              </Button>
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
