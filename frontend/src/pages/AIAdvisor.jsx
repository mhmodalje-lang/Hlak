import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Lock, Unlock, Camera, Upload, Loader2, ArrowRight, ArrowLeft,
  Scissors, Crown, Star, MapPin, MessageCircle, Share2, CheckCircle2, Download,
  Brain, Zap, Award, Shield, X
} from 'lucide-react';
import { toast } from 'sonner';

const AIAdvisor = () => {
  const navigate = useNavigate();
  const { API, gender, language, themeClass, token, user, isAuthenticated } = useApp();
  const isMen = gender === 'male';
  const fileInputRef = useRef(null);

  const [eligibility, setEligibility] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [savedAdvices, setSavedAdvices] = useState([]);
  const [viewMode, setViewMode] = useState('analyze'); // analyze | saved

  const t = language === 'ar' ? {
    title: 'المستشار الذكي للجمال',
    subtitle: 'تحليل متقدم بالذكاء الاصطناعي لوجهك + اقتراحات شخصية',
    back: 'رجوع',
    locked: 'الميزة مقفلة',
    lockedDesc: 'قم بإتمام حجز أولاً لفتح هذه الميزة الحصرية',
    eligible: 'مفتوح لجلسة واحدة',
    eligibleDesc: 'لديك حجز مؤكد — استخدم المستشار الذكي الآن (استخدام لمرة واحدة)',
    uploadPhoto: 'ارفع صورة وجهك',
    uploadDesc: 'صورة أمامية واضحة بدون نظارات شمسية',
    analyze: 'ابدأ التحليل الذكي',
    analyzing: 'جاري التحليل المتقدم...',
    analyzingDesc: 'الذكاء الاصطناعي يحلل ملامح وجهك...',
    loginRequired: 'يجب تسجيل الدخول أولاً',
    goLogin: 'تسجيل الدخول',
    bookNow: 'احجز موعداً الآن',
    faceShape: 'شكل الوجه',
    skinTone: 'درجة البشرة',
    analysis: 'التحليل',
    styles: 'القصات المقترحة',
    beard: 'اللحية المقترحة',
    color: 'اللون المقترح',
    tips: 'نصائح للعناية',
    expertise: 'مهارات الحلاق المطلوبة',
    matchedBarbers: 'الحلاقون الأفضل لك',
    viewSalon: 'عرض الصالون',
    noMatched: 'لا يوجد تطابق حالياً',
    savedAdvice: 'استشاراتي المحفوظة',
    startNew: 'بدء تحليل جديد',
    downloadCard: 'حمّل بطاقة الستايل',
    shareWhatsapp: 'أرسل إلى الواتساب',
    difficulty: 'الصعوبة',
    maintenance: 'العناية',
    difficulties: { easy: 'سهل', medium: 'متوسط', expert: 'خبير' },
    maintenances: { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' },
    alreadyAnalyzed: 'تم استخدام التحليل لهذا الحجز من قبل. شاهد النتيجة بالأسفل.',
    noSaved: 'لا توجد استشارات محفوظة بعد',
    match: 'تطابق',
    stylesCount: 'قصّات',
    aiPower: 'GPT-5 Vision'
  } : {
    title: 'AI Style Advisor',
    subtitle: 'Advanced AI analysis of your face + personalized recommendations',
    back: 'Back',
    locked: 'Feature Locked',
    lockedDesc: 'Complete a booking first to unlock this exclusive feature',
    eligible: 'Unlocked — 1 session',
    eligibleDesc: 'You have a confirmed booking — use the AI advisor now (one-time use)',
    uploadPhoto: 'Upload your face photo',
    uploadDesc: 'Clear front-facing photo without sunglasses',
    analyze: 'Start AI Analysis',
    analyzing: 'Advanced analysis in progress...',
    analyzingDesc: 'AI is analyzing your facial features...',
    loginRequired: 'Please login first',
    goLogin: 'Login',
    bookNow: 'Book an appointment',
    faceShape: 'Face Shape',
    skinTone: 'Skin Tone',
    analysis: 'Analysis',
    styles: 'Recommended Styles',
    beard: 'Beard Recommendation',
    color: 'Color Recommendation',
    tips: 'Hair Care Tips',
    expertise: 'Ideal Barber Skills',
    matchedBarbers: 'Best Matched Barbers',
    viewSalon: 'View Salon',
    noMatched: 'No matches yet',
    savedAdvice: 'My Saved Advice',
    startNew: 'Start New Analysis',
    downloadCard: 'Download Style Card',
    shareWhatsapp: 'Send to WhatsApp',
    difficulty: 'Difficulty',
    maintenance: 'Maintenance',
    difficulties: { easy: 'Easy', medium: 'Medium', expert: 'Expert' },
    maintenances: { low: 'Low', medium: 'Medium', high: 'High' },
    alreadyAnalyzed: 'This booking has already been analyzed. See result below.',
    noSaved: 'No saved advice yet',
    match: 'match',
    stylesCount: 'styles',
    aiPower: 'GPT-5 Vision'
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchEligibility();
    fetchSavedAdvices();
  }, [isAuthenticated]);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchEligibility = async () => {
    try {
      const res = await axios.get(`${API}/ai-advisor/eligibility`, authHeaders);
      setEligibility(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSavedAdvices = async () => {
    try {
      const res = await axios.get(`${API}/ai-advisor/my-advice`, authHeaders);
      setSavedAdvices(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(language === 'ar' ? 'استخدم صورة JPEG أو PNG أو WEBP' : 'Use JPEG, PNG or WEBP');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setImageBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!eligibility?.eligible || !eligibility.available_booking_id || !imageBase64) return;
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/ai-advisor/analyze`, {
        booking_id: eligibility.available_booking_id,
        image_base64: imageBase64,
        language
      }, authHeaders);
      setResult(res.data);
      fetchEligibility();
      fetchSavedAdvices();
      toast.success(language === 'ar' ? 'تم التحليل بنجاح ✨' : 'Analysis complete ✨');
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || (language === 'ar' ? 'حدث خطأ في التحليل' : 'Analysis failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const shareWhatsApp = async (adviceId) => {
    try {
      const res = await axios.post(`${API}/ai-advisor/share-whatsapp`, { advice_id: adviceId }, authHeaders);
      window.open(res.data.whatsapp_link, '_blank');
    } catch (e) { toast.error('Failed'); }
  };

  const downloadCard = (base64, name = 'style-card.png') => {
    if (!base64) return;
    const a = document.createElement('a');
    a.href = base64;
    a.download = name;
    a.click();
  };

  // ---------------- Not Authenticated ----------------
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'} flex items-center justify-center p-6`}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full p-8 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'} text-center`}>
          <Sparkles className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <h2 className={`text-2xl font-bold mb-3 ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>{t.title}</h2>
          <p className={`mb-6 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.loginRequired}</p>
          <button onClick={() => navigate('/auth')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>{t.goLogin}</button>
        </motion.div>
      </div>
    );
  }

  // ---------------- Main UI ----------------
  return (
    <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'} relative overflow-hidden`} data-testid="ai-advisor-page">
      {/* Decorative orbs */}
      <div className={`orb ${isMen ? 'orb-gold' : 'orb-rose'}`} style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className={`orb ${isMen ? 'orb-gold' : 'orb-rose'}`} style={{ width: 300, height: 300, bottom: -50, right: -50 }} />

      {/* Header */}
      <div className={`sticky top-0 z-50 ${isMen ? 'glass-nav-men' : 'glass-nav-women'} px-4 py-4`}>
        <div className="container mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`} data-testid="back-btn">
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>
              <Sparkles className="inline w-5 h-5 me-1" /> {t.title}
            </h1>
            <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.subtitle}</p>
          </div>
          <span className={`ai-badge ${eligibility?.eligible ? 'ai-badge-unlocked' : 'ai-badge-locked'}`}>
            {eligibility?.eligible ? <><Unlock className="w-3 h-3" />{t.eligible}</> : <><Lock className="w-3 h-3" />{t.locked}</>}
          </span>
        </div>

        {/* View switcher */}
        <div className="container mx-auto mt-3 flex gap-2">
          <button onClick={() => setViewMode('analyze')} className={`filter-chip ${isMen ? 'filter-chip-men' : 'filter-chip-women'} ${viewMode === 'analyze' ? 'active' : ''}`}>
            <Brain className="w-4 h-4" /> {t.startNew}
          </button>
          <button onClick={() => setViewMode('saved')} className={`filter-chip ${isMen ? 'filter-chip-men' : 'filter-chip-women'} ${viewMode === 'saved' ? 'active' : ''}`}>
            <Award className="w-4 h-4" /> {t.savedAdvice} ({savedAdvices.length})
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-5xl relative z-10">
        <AnimatePresence mode="wait">
          {viewMode === 'analyze' ? (
            <motion.div key="analyze" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Locked state */}
              {eligibility && !eligibility.eligible && !eligibility.has_saved_advice && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                  className={`p-8 rounded-3xl text-center ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
                  <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                    <Lock className={`w-12 h-12 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                  </div>
                  <h3 className={`text-2xl font-bold mb-3 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.locked}</h3>
                  <p className={`mb-6 max-w-md mx-auto ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    {language === 'ar' ? eligibility.locked_reason_ar : eligibility.locked_reason_en}
                  </p>
                  <button onClick={() => navigate('/home')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
                    {t.bookNow}
                  </button>
                  <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                    {[
                      { icon: Brain, label: language === 'ar' ? 'تحليل ذكي' : 'Smart Analysis' },
                      { icon: Zap, label: language === 'ar' ? 'نتائج فورية' : 'Instant Results' },
                      { icon: Shield, label: language === 'ar' ? 'توصيات حصرية' : 'Exclusive Tips' },
                    ].map((f, i) => (
                      <div key={i} className={`p-4 rounded-2xl opacity-60 ${isMen ? 'bg-[#2A1F14]' : 'bg-white'}`}>
                        <f.icon className={`w-6 h-6 mx-auto mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                        <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{f.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Eligible - No result yet */}
              {eligibility?.eligible && !result && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
                  className={`p-8 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
                  <div className="text-center mb-6">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                      className="inline-block">
                      <Sparkles className={`w-16 h-16 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                    </motion.div>
                    <h3 className={`text-2xl font-bold mt-3 ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>{t.eligible}</h3>
                    <p className={`mt-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.eligibleDesc}</p>
                    {eligibility.available_booking_shop && (
                      <p className={`mt-2 text-sm font-medium ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                        📍 {eligibility.available_booking_shop}
                      </p>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                    onDragOver={(e) => e.preventDefault()}
                    className={`${imagePreview ? '' : 'ai-scanner ' + (isMen ? '' : 'ai-scanner-women')} relative cursor-pointer rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 min-h-[260px] ${isMen ? 'border-[#D4AF37]/40 bg-[#2A1F14]/50' : 'border-[#B76E79]/40 bg-white/50'}`}>
                    {imagePreview ? (
                      <>
                        {!analyzing && <div className="ai-scanner-line hidden"></div>}
                        <img src={imagePreview} alt="preview" className="max-h-60 rounded-xl object-contain" />
                        {analyzing && <div className="ai-scanner-line"></div>}
                        <button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageBase64(null); }}
                          className={`absolute top-3 right-3 p-2 rounded-full ${isMen ? 'bg-black/60 text-white' : 'bg-white/80 text-[#1C1917]'}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera className={`w-14 h-14 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                        <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.uploadPhoto}</p>
                        <p className={`text-xs text-center ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.uploadDesc}</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={(e) => handleFile(e.target.files[0])} />
                  </div>

                  <button onClick={analyze} disabled={!imageBase64 || analyzing}
                    className={`mt-6 w-full flex items-center justify-center gap-2 ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    {analyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> {t.analyzing}</> : <><Brain className="w-5 h-5" /> {t.analyze}</>}
                  </button>
                  {analyzing && (
                    <p className={`text-center text-xs mt-3 ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'} animate-pulse`}>{t.analyzingDesc}</p>
                  )}
                  <p className={`text-center text-[10px] mt-2 ${isMen ? 'text-[#64748b]' : 'text-[#a8a29e]'}`}>Powered by {t.aiPower}</p>
                </motion.div>
              )}

              {/* Result */}
              {result && <ResultView result={result} t={t} isMen={isMen} language={language} navigate={navigate} shareWhatsApp={shareWhatsApp} downloadCard={downloadCard} onRestart={() => { setResult(null); setImagePreview(null); setImageBase64(null); fetchEligibility(); }} />}

              {/* Not eligible but has saved advice - show shortcut */}
              {eligibility && !eligibility.eligible && eligibility.has_saved_advice && !result && (
                <motion.div className={`p-6 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'} text-center`}>
                  <CheckCircle2 className={`w-12 h-12 mx-auto mb-3 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                  <p className={`mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.alreadyAnalyzed}</p>
                  <button onClick={() => setViewMode('saved')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>
                    {t.savedAdvice}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            // ---- Saved advices list ----
            <motion.div key="saved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {savedAdvices.length === 0 ? (
                <div className={`p-12 rounded-3xl text-center ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
                  <Award className={`w-20 h-20 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                  <p className={`${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.noSaved}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {savedAdvices.map((adv, idx) => (
                    <ResultView key={adv.id} result={adv} t={t} isMen={isMen} language={language} navigate={navigate} shareWhatsApp={shareWhatsApp} downloadCard={downloadCard} compact />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ----------- ResultView Component -----------
const ResultView = ({ result, t, isMen, language, navigate, shareWhatsApp, downloadCard, onRestart, compact }) => {
  const a = result.analysis || {};
  const styles = a.recommended_styles || [];
  const beard = a.beard_recommendation;
  const color = a.color_recommendation;
  const tips = language === 'ar' ? (a.hair_care_tips_ar || a.hair_care_tips || []) : (a.hair_care_tips || []);
  const matched = result.matched_shops || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Style Card Preview */}
      {result.style_card_base64 && (
        <div className={`rounded-3xl overflow-hidden ${isMen ? 'glass-card-men' : 'glass-card-women'} p-4`}>
          <img src={result.style_card_base64} className="max-w-md mx-auto rounded-2xl" alt="Style Card" />
          <div className="flex gap-3 justify-center mt-4 flex-wrap">
            <button onClick={() => downloadCard(result.style_card_base64, `style-card-${result.id}.png`)} className={`flex items-center gap-2 ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'}`}>
              <Download className="w-4 h-4" /> {t.downloadCard}
            </button>
            <button onClick={() => shareWhatsApp(result.id)} className="whatsapp-btn flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> {t.shareWhatsapp}
            </button>
            {onRestart && (
              <button onClick={onRestart} className={`filter-chip ${isMen ? 'filter-chip-men' : 'filter-chip-women'}`}>
                {t.startNew}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Face Analysis */}
      <div className={`p-6 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-white'}`}>
            <div className={`text-xs mb-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.faceShape}</div>
            <div className={`text-xl font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>
              {language === 'ar' ? (a.face_shape_ar || a.face_shape) : a.face_shape}
            </div>
          </div>
          <div className={`p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-white'}`}>
            <div className={`text-xs mb-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.skinTone}</div>
            <div className={`text-xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{a.skin_tone}</div>
          </div>
        </div>
        <p className={`${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'} leading-relaxed`}>
          {language === 'ar' ? (a.facial_features_analysis_ar || a.facial_features_analysis) : a.facial_features_analysis}
        </p>
      </div>

      {/* Recommended Styles */}
      <div>
        <h3 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Scissors className={`inline w-5 h-5 me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} /> {t.styles}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {styles.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`p-5 rounded-2xl relative ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
              <div className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>#{i + 1}</div>
              <div className="text-4xl mb-3">{s.icon || '✂️'}</div>
              <h4 className={`text-lg font-bold mb-2 ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>
                {language === 'ar' ? (s.name_ar || s.name) : s.name}
              </h4>
              <p className={`text-sm mb-3 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                {language === 'ar' ? (s.description_ar || s.description) : s.description}
              </p>
              <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isMen ? 'bg-[#3A2E1F] text-[#F3E5AB]' : 'bg-[#FAFAFA] text-[#9E5B66]'}`}>{t.difficulty}: {t.difficulties[s.difficulty] || s.difficulty}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isMen ? 'bg-[#3A2E1F] text-[#F3E5AB]' : 'bg-[#FAFAFA] text-[#9E5B66]'}`}>{t.maintenance}: {t.maintenances[s.maintenance] || s.maintenance}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Beard / Color */}
      {beard && (
        <div className={`p-5 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <h3 className={`font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>🧔 {t.beard}</h3>
          <p className={`text-lg font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>{language === 'ar' ? (beard.style_ar || beard.style) : beard.style}</p>
          <p className={`text-sm mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{language === 'ar' ? (beard.reason_ar || beard.reason) : beard.reason}</p>
        </div>
      )}
      {color && (
        <div className={`p-5 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <h3 className={`font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>🎨 {t.color}</h3>
          <p className={`text-lg font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>
            {language === 'ar' ? (color.primary_color_ar || color.primary_color) : color.primary_color}
            {color.highlights && <span className="text-sm ms-2">+ {language === 'ar' ? (color.highlights_ar || color.highlights) : color.highlights}</span>}
          </p>
          <p className={`text-sm mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{language === 'ar' ? (color.reason_ar || color.reason) : color.reason}</p>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className={`p-5 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <h3 className={`font-bold mb-3 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>💡 {t.tips}</h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className={`flex gap-2 items-start ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                <Star className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matched Barbers */}
      {matched.length > 0 && (
        <div>
          <h3 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <Crown className={`inline w-5 h-5 me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} /> {t.matchedBarbers}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matched.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/barber/${m.id}`)}
                className={`p-4 rounded-2xl cursor-pointer flex items-center gap-3 ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
                <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  {m.shop_logo ? <img src={m.shop_logo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{isMen ? '💈' : '✨'}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{m.shop_name}</div>
                  <div className={`text-xs mt-1 flex items-center gap-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    <Star className={`w-3 h-3 ${isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]'}`} />
                    <span>{m.rating?.toFixed(1)}</span>
                    <span>• {m.city}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isMen ? 'bg-[#D4AF37]/20 text-[#F3E5AB]' : 'bg-[#B76E79]/20 text-[#9E5B66]'}`}>
                      {m.match_score} {t.match}
                    </span>
                  </div>
                </div>
                <ArrowRight className={`w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} ${language === 'ar' ? 'rotate-180' : ''}`} />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AIAdvisor;
