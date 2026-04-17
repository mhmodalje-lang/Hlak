import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/App';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Lock, Camera, Upload, Loader2, Download, MessageCircle,
  Scissors, Star, Zap, RefreshCw, Image as ImageIcon, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const AITryOn = ({ eligibilityData, onRefreshEligibility }) => {
  const { API, gender, language, token } = useApp();
  const isMen = gender === 'male';
  const fileInputRef = useRef(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [tryonSessions, setTryonSessions] = useState([]);
  const [presetStyles, setPresetStyles] = useState([]);
  const [showPresets, setShowPresets] = useState(false);

  const t = language === 'ar' ? {
    title: 'جرّب القصة افتراضياً',
    subtitle: 'شاهد كيف ستبدو القصة عليك قبل الحجز',
    locked: 'الميزة مقفلة',
    lockedDesc: 'قم بإتمام حجز أولاً لفتح التجربة الافتراضية',
    bookNow: 'احجز موعداً',
    uploadPhoto: 'ارفع صورتك',
    changePhoto: 'تغيير الصورة',
    useSavedPhoto: 'استخدام الصورة المحفوظة',
    selectStyle: 'اختر القصة',
    recommendedStyles: 'القصات المقترحة لك',
    trendingStyles: 'قصات رائجة',
    tryThisStyle: 'جرّب هذه القصة',
    generating: 'جاري التوليد...',
    generatingDesc: 'الذكاء الاصطناعي يُنشئ صورتك مع القصة الجديدة...',
    remainingTries: 'المحاولات المتبقية',
    of: 'من',
    result: 'النتيجة',
    tryAnother: 'جرّب قصة أخرى',
    download: 'حمّل الصورة',
    shareWhatsApp: 'شارك على الواتساب',
    mySessions: 'تجاربي السابقة',
    noSessions: 'لم تجرب أي قصة بعد',
    poweredBy: 'مدعوم بـ Gemini Nano Banana',
    selectStyleFirst: 'اختر قصة أولاً'
  } : {
    title: 'Try Hairstyles Virtually',
    subtitle: 'See how you\'ll look before booking',
    locked: 'Feature Locked',
    lockedDesc: 'Complete a booking first to unlock AI Try-On',
    bookNow: 'Book Now',
    uploadPhoto: 'Upload Photo',
    changePhoto: 'Change Photo',
    useSavedPhoto: 'Use Saved Photo',
    selectStyle: 'Select Hairstyle',
    recommendedStyles: 'Recommended for You',
    trendingStyles: 'Trending Styles',
    tryThisStyle: 'Try This Style',
    generating: 'Generating...',
    generatingDesc: 'AI is creating your new look...',
    remainingTries: 'Remaining Tries',
    of: 'of',
    result: 'Result',
    tryAnother: 'Try Another Style',
    download: 'Download Image',
    shareWhatsApp: 'Share on WhatsApp',
    mySessions: 'My Previous Try-Ons',
    noSessions: 'No try-ons yet',
    poweredBy: 'Powered by Gemini Nano Banana',
    selectStyleFirst: 'Select a style first'
  };

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    if (eligibilityData?.has_saved_image && eligibilityData.saved_image_base64) {
      setImagePreview(eligibilityData.saved_image_base64);
      setImageBase64(eligibilityData.saved_image_base64);
    }
    fetchPresets();
    fetchSessions();
  }, [eligibilityData]);

  const fetchPresets = async () => {
    try {
      const res = await axios.get(`${API}/ai-tryon/presets`, {
        params: { gender, language }
      });
      setPresetStyles(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/ai-tryon/my-sessions`, authHeaders);
      setTryonSessions(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(language === 'ar' ? 'استخدم JPEG أو PNG أو WEBP' : 'Use JPEG, PNG or WEBP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setImageBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTryStyle = async () => {
    if (!selectedStyle) {
      toast.error(t.selectStyleFirst);
      return;
    }
    if (!imageBase64 && !eligibilityData?.has_saved_image) {
      toast.error(language === 'ar' ? 'ارفع صورتك أولاً' : 'Upload your photo first');
      return;
    }

    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai-tryon/generate`, {
        booking_id: eligibilityData.available_booking_id,
        hairstyle_name: selectedStyle.name,
        hairstyle_description: selectedStyle.description,
        user_image_base64: imageBase64 || null
      }, authHeaders);
      
      setResult(res.data);
      toast.success(language === 'ar' ? '✨ تم التوليد بنجاح!' : '✨ Generated successfully!');
      onRefreshEligibility();
      fetchSessions();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.detail || (language === 'ar' ? 'فشل التوليد' : 'Generation failed');
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = (base64) => {
    const a = document.createElement('a');
    a.href = base64;
    a.download = `tryon-${Date.now()}.png`;
    a.click();
  };

  const shareWhatsApp = (hairstyleName) => {
    const text = language === 'ar' 
      ? `شاهد كيف سأبدو مع قصة ${hairstyleName}! 💈✨\n\nجرّب أنت أيضاً: barber-hub.com`
      : `Check out how I'll look with ${hairstyleName}! 💈✨\n\nTry it yourself: barber-hub.com`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // ========== LOCKED STATE ==========
  if (!eligibilityData?.eligible) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`text-center max-w-md p-8 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <Lock className={`w-20 h-20 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <h2 className={`text-2xl font-bold mb-3 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.locked}</h2>
          <p className={`mb-6 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {eligibilityData?.locked_reason_ar || eligibilityData?.locked_reason_en || t.lockedDesc}
          </p>
          <Button onClick={() => window.location.href = '/home'} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
            {t.bookNow}
          </Button>
        </motion.div>
      </div>
    );
  }

  // ========== GENERATING STATE ==========
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
          className={`text-center p-8 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <Loader2 className={`w-16 h-16 mx-auto mb-4 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <h3 className={`text-xl font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.generating}</h3>
          <p className={`${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.generatingDesc}</p>
        </motion.div>
      </div>
    );
  }

  // ========== RESULT VIEW ==========
  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl overflow-hidden ${isMen ? 'glass-card-men' : 'glass-card-women'} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.result}</h3>
            <span className={`text-sm px-3 py-1 rounded-full ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>
              {t.remainingTries}: {result.remaining_tries}/{eligibilityData.max_tries_per_booking}
            </span>
          </div>

          <div className="mb-4">
            <img src={result.result_image_base64} className="w-full rounded-2xl" alt="Try-On Result" />
          </div>

          <div className={`mb-4 p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
            <p className={`font-bold mb-1 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{result.hairstyle_name}</p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{result.hairstyle_description}</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => downloadImage(result.result_image_base64)} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
              <Download className="w-4 h-4 me-2" /> {t.download}
            </Button>
            <button onClick={() => shareWhatsApp(result.hairstyle_name)} className="whatsapp-btn flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {t.shareWhatsApp}
            </button>
            {result.remaining_tries > 0 && (
              <Button onClick={() => { setResult(null); setSelectedStyle(null); }} variant="outline"
                className={isMen ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-[#B76E79] text-[#B76E79]'}>
                <RefreshCw className="w-4 h-4 me-2" /> {t.tryAnother}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ========== MAIN TRY-ON UI ==========
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header with remaining tries */}
      <div className={`rounded-2xl p-4 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.title}</h3>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.subtitle}</p>
          </div>
          <div className={`text-center px-4 py-2 rounded-xl ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>
            <div className="text-2xl font-bold">{eligibilityData.remaining_tries}</div>
            <div className="text-xs">{t.remainingTries}</div>
          </div>
        </div>
      </div>

      {/* Image Upload */}
      <div className={`rounded-2xl p-6 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <h4 className={`font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Camera className="w-5 h-5 inline me-2" />
          {imagePreview ? t.changePhoto : t.uploadPhoto}
        </h4>
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} className="w-full max-w-sm mx-auto rounded-2xl" alt="Your photo" />
            <button onClick={() => fileInputRef.current?.click()}
              className={`absolute bottom-4 right-4 p-3 rounded-full ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>
              <Upload className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center ${isMen ? 'border-[#D4AF37] hover:bg-[#D4AF37]/5' : 'border-[#B76E79] hover:bg-[#B76E79]/5'}`}>
            <Upload className={`w-12 h-12 mx-auto mb-3 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.uploadPhoto}</p>
            <p className={`text-sm mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>Click to upload</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {/* Style Selection */}
      <div className={`rounded-2xl p-6 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <h4 className={`font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Scissors className="w-5 h-5 inline me-2" />
          {t.selectStyle}
        </h4>

        {/* Recommended Styles (from AI Advisor) */}
        {eligibilityData.recommended_styles?.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              <span className={`text-sm font-bold ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{t.recommendedStyles}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {eligibilityData.recommended_styles.map((style, i) => (
                <div key={i} onClick={() => setSelectedStyle(style)}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                    selectedStyle?.name === style.name
                      ? (isMen ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#B76E79] bg-[#B76E79]/10')
                      : (isMen ? 'border-[#3A2E1F] hover:border-[#D4AF37]/50' : 'border-[#E7E5E4] hover:border-[#B76E79]/50')
                  }`}>
                  {selectedStyle?.name === style.name && (
                    <Check className={`w-5 h-5 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                  )}
                  <p className={`font-bold text-sm mb-1 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                    {language === 'ar' ? style.name_ar : style.name}
                  </p>
                  <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{style.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preset/Trending Styles */}
        <div>
          <button onClick={() => setShowPresets(!showPresets)}
            className={`flex items-center gap-2 text-sm font-bold mb-3 ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
            <Zap className="w-4 h-4" />
            {t.trendingStyles}
            <span className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>({presetStyles.length})</span>
          </button>
          <AnimatePresence>
            {showPresets && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presetStyles.map((style, i) => (
                  <div key={i} onClick={() => { setSelectedStyle(style); setShowPresets(false); }}
                    className={`cursor-pointer p-3 rounded-xl border transition-all ${
                      selectedStyle?.name === style.name
                        ? (isMen ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#B76E79] bg-[#B76E79]/10')
                        : (isMen ? 'border-[#3A2E1F] hover:border-[#D4AF37]/30' : 'border-[#E7E5E4] hover:border-[#B76E79]/30')
                    }`}>
                    <p className={`font-bold text-sm ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{style.name}</p>
                    <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{style.description}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Try Button */}
      {selectedStyle && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button onClick={handleTryStyle} disabled={generating}
            className={`w-full h-14 text-lg ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'}`}>
            <Sparkles className="w-5 h-5 me-2" />
            {t.tryThisStyle}
          </Button>
        </motion.div>
      )}

      {/* Powered By */}
      <p className={`text-center text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.poweredBy}</p>
    </div>
  );
};

export default AITryOn;
