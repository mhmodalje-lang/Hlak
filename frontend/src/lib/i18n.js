/**
 * BARBER HUB - Internationalization (i18n)
 * Supports 10 languages with auto-detection
 */

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', name: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
];

export const isRTL = (lang) => ['ar', 'fa', 'ur'].includes(lang);

// Rich translations for core UI chrome
export const TRANSLATIONS = {
  ar: {
    // Gender Selection
    welcome: 'مرحباً بك في',
    brand: 'BARBER HUB',
    tagline: 'منصة الحجز الذكية للحلاقين والصالونات',
    taglineGlobal: 'المنصة العالمية للأناقة الرجالية والأنوثة',
    men: 'رجال', menDesc: 'أرقى الحلاقين المحترفين',
    women: 'نساء', womenDesc: 'أرقى صالونات التجميل',
    enter: 'ادخل الآن',
    selectGender: 'اختر تجربتك',
    // Navigation
    home: 'الرئيسية', topBarbers: 'الأفضل', map: 'الخريطة',
    aiAdvisor: 'المستشار الذكي', favorites: 'المفضلة',
    myBookings: 'حجوزاتي', dashboard: 'لوحة التحكم',
    login: 'تسجيل الدخول', logout: 'خروج', signup: 'اشتراك',
    // Dashboard
    overview: 'نظرة عامة', services: 'الخدمات والأسعار',
    socialMedia: 'حسابات التواصل', gallery: 'معرض الصور',
    workingHours: 'ساعات العمل', subscription: 'الاشتراك',
    addService: 'إضافة خدمة', editService: 'تعديل الخدمة',
    serviceName: 'اسم الخدمة', priceUSD: 'السعر', duration: 'المدة (دقائق)',
    saveChanges: 'حفظ التغييرات', cancel: 'إلغاء',
    // Common
    save: 'حفظ', delete: 'حذف', edit: 'تعديل',
    loading: 'جارٍ التحميل...', search: 'بحث',
    // Messages
    savedSuccess: 'تم الحفظ بنجاح ✓',
    errorOccurred: 'حدث خطأ، حاول مرة أخرى',
    languageChanged: 'تم تغيير اللغة',
  },
  en: {
    welcome: 'Welcome to',
    brand: 'BARBER HUB',
    tagline: 'Smart Booking for Barbers & Salons',
    taglineGlobal: 'The global platform for elegance',
    men: 'Men', menDesc: 'World-class professional barbers',
    women: 'Women', womenDesc: 'Premium beauty salons',
    enter: 'Enter Now',
    selectGender: 'Choose your experience',
    home: 'Home', topBarbers: 'Top', map: 'Map',
    aiAdvisor: 'AI Advisor', favorites: 'Favorites',
    myBookings: 'My Bookings', dashboard: 'Dashboard',
    login: 'Login', logout: 'Logout', signup: 'Sign Up',
    overview: 'Overview', services: 'Services & Prices',
    socialMedia: 'Social Media', gallery: 'Gallery',
    workingHours: 'Working Hours', subscription: 'Subscription',
    addService: 'Add Service', editService: 'Edit Service',
    serviceName: 'Service Name', priceUSD: 'Price', duration: 'Duration (minutes)',
    saveChanges: 'Save Changes', cancel: 'Cancel',
    save: 'Save', delete: 'Delete', edit: 'Edit',
    loading: 'Loading...', search: 'Search',
    savedSuccess: 'Saved successfully ✓',
    errorOccurred: 'An error occurred',
    languageChanged: 'Language changed',
  },
  tr: {
    welcome: "Hoş Geldiniz",
    brand: 'BARBER HUB',
    tagline: 'Berber ve salonlar için akıllı randevu',
    taglineGlobal: 'Zarafet için küresel platform',
    men: 'Erkek', menDesc: 'Profesyonel dünya çapında berberler',
    women: 'Kadın', womenDesc: 'Premium güzellik salonları',
    enter: 'Şimdi Gir',
    selectGender: 'Deneyiminizi seçin',
    home: 'Ana Sayfa', topBarbers: 'En İyi', map: 'Harita',
    aiAdvisor: 'Yapay Zeka Danışmanı', favorites: 'Favoriler',
    myBookings: 'Randevularım', dashboard: 'Kontrol Paneli',
    login: 'Giriş', logout: 'Çıkış', signup: 'Kayıt Ol',
    overview: 'Genel Bakış', services: 'Hizmetler ve Fiyatlar',
    socialMedia: 'Sosyal Medya', gallery: 'Galeri',
    workingHours: 'Çalışma Saatleri', subscription: 'Abonelik',
    addService: 'Hizmet Ekle', editService: 'Hizmeti Düzenle',
    serviceName: 'Hizmet Adı', priceUSD: 'Fiyat', duration: 'Süre (dakika)',
    saveChanges: 'Değişiklikleri Kaydet', cancel: 'İptal',
    save: 'Kaydet', delete: 'Sil', edit: 'Düzenle',
    loading: 'Yükleniyor...', search: 'Ara',
    savedSuccess: 'Başarıyla kaydedildi ✓',
    errorOccurred: 'Bir hata oluştu',
    languageChanged: 'Dil değiştirildi',
  },
  fr: {
    welcome: 'Bienvenue à',
    brand: 'BARBER HUB',
    tagline: 'Réservation intelligente pour barbiers et salons',
    taglineGlobal: "La plateforme mondiale de l'élégance",
    men: 'Hommes', menDesc: 'Barbiers professionnels de classe mondiale',
    women: 'Femmes', womenDesc: 'Salons de beauté premium',
    enter: 'Entrer',
    selectGender: 'Choisissez votre expérience',
    home: 'Accueil', topBarbers: 'Top', map: 'Carte',
    aiAdvisor: 'Conseiller IA', favorites: 'Favoris',
    myBookings: 'Mes réservations', dashboard: 'Tableau de bord',
    login: 'Connexion', logout: 'Déconnexion', signup: "S'inscrire",
    overview: 'Aperçu', services: 'Services et prix',
    socialMedia: 'Réseaux sociaux', gallery: 'Galerie',
    workingHours: 'Horaires', subscription: 'Abonnement',
    addService: 'Ajouter un service', editService: 'Modifier',
    serviceName: 'Nom du service', priceUSD: 'Prix', duration: 'Durée (min)',
    saveChanges: 'Enregistrer', cancel: 'Annuler',
    save: 'Enregistrer', delete: 'Supprimer', edit: 'Modifier',
    loading: 'Chargement...', search: 'Rechercher',
    savedSuccess: 'Enregistré ✓',
    errorOccurred: 'Une erreur est survenue',
    languageChanged: 'Langue modifiée',
  },
  es: {
    welcome: 'Bienvenido a',
    brand: 'BARBER HUB',
    tagline: 'Reservas inteligentes para barberos y salones',
    taglineGlobal: 'La plataforma global de la elegancia',
    men: 'Hombres', menDesc: 'Barberos profesionales de clase mundial',
    women: 'Mujeres', womenDesc: 'Salones de belleza premium',
    enter: 'Entrar',
    selectGender: 'Elige tu experiencia',
    home: 'Inicio', topBarbers: 'Top', map: 'Mapa',
    aiAdvisor: 'Asesor IA', favorites: 'Favoritos',
    myBookings: 'Mis Reservas', dashboard: 'Panel',
    login: 'Iniciar sesión', logout: 'Salir', signup: 'Registrarse',
    overview: 'Resumen', services: 'Servicios y precios',
    socialMedia: 'Redes Sociales', gallery: 'Galería',
    workingHours: 'Horarios', subscription: 'Suscripción',
    addService: 'Añadir servicio', editService: 'Editar',
    serviceName: 'Nombre del servicio', priceUSD: 'Precio', duration: 'Duración (min)',
    saveChanges: 'Guardar cambios', cancel: 'Cancelar',
    save: 'Guardar', delete: 'Eliminar', edit: 'Editar',
    loading: 'Cargando...', search: 'Buscar',
    savedSuccess: 'Guardado ✓',
    errorOccurred: 'Ocurrió un error',
    languageChanged: 'Idioma cambiado',
  },
  de: {
    welcome: 'Willkommen bei',
    brand: 'BARBER HUB',
    tagline: 'Intelligente Buchung für Friseure und Salons',
    taglineGlobal: 'Die globale Plattform für Eleganz',
    men: 'Herren', menDesc: 'Weltklasse professionelle Friseure',
    women: 'Damen', womenDesc: 'Premium-Schönheitssalons',
    enter: 'Eintreten',
    selectGender: 'Wählen Sie Ihr Erlebnis',
    home: 'Startseite', topBarbers: 'Top', map: 'Karte',
    aiAdvisor: 'KI-Berater', favorites: 'Favoriten',
    myBookings: 'Meine Buchungen', dashboard: 'Dashboard',
    login: 'Anmelden', logout: 'Abmelden', signup: 'Registrieren',
    overview: 'Übersicht', services: 'Dienste & Preise',
    socialMedia: 'Soziale Medien', gallery: 'Galerie',
    workingHours: 'Öffnungszeiten', subscription: 'Abonnement',
    addService: 'Dienst hinzufügen', editService: 'Bearbeiten',
    serviceName: 'Dienstname', priceUSD: 'Preis', duration: 'Dauer (Min.)',
    saveChanges: 'Änderungen speichern', cancel: 'Abbrechen',
    save: 'Speichern', delete: 'Löschen', edit: 'Bearbeiten',
    loading: 'Lädt...', search: 'Suchen',
    savedSuccess: 'Gespeichert ✓',
    errorOccurred: 'Ein Fehler ist aufgetreten',
    languageChanged: 'Sprache geändert',
  },
  ru: {
    welcome: 'Добро пожаловать в',
    brand: 'BARBER HUB',
    tagline: 'Умное бронирование для барбершопов и салонов',
    taglineGlobal: 'Глобальная платформа элегантности',
    men: 'Мужчины', menDesc: 'Профессиональные барберы мирового класса',
    women: 'Женщины', womenDesc: 'Премиальные салоны красоты',
    enter: 'Войти',
    selectGender: 'Выберите свой опыт',
    home: 'Главная', topBarbers: 'Топ', map: 'Карта',
    aiAdvisor: 'ИИ-советник', favorites: 'Избранное',
    myBookings: 'Мои записи', dashboard: 'Панель',
    login: 'Войти', logout: 'Выйти', signup: 'Регистрация',
    overview: 'Обзор', services: 'Услуги и цены',
    socialMedia: 'Соцсети', gallery: 'Галерея',
    workingHours: 'Часы работы', subscription: 'Подписка',
    addService: 'Добавить услугу', editService: 'Редактировать',
    serviceName: 'Название услуги', priceUSD: 'Цена', duration: 'Длительность (мин)',
    saveChanges: 'Сохранить', cancel: 'Отмена',
    save: 'Сохранить', delete: 'Удалить', edit: 'Редактировать',
    loading: 'Загрузка...', search: 'Поиск',
    savedSuccess: 'Сохранено ✓',
    errorOccurred: 'Произошла ошибка',
    languageChanged: 'Язык изменен',
  },
  fa: {
    welcome: 'به خوش آمدید',
    brand: 'BARBER HUB',
    tagline: 'رزرو هوشمند برای آرایشگاه‌ها و سالن‌ها',
    taglineGlobal: 'پلتفرم جهانی ظرافت',
    men: 'آقایان', menDesc: 'آرایشگران حرفه‌ای جهانی',
    women: 'بانوان', womenDesc: 'سالن‌های زیبایی پریمیوم',
    enter: 'ورود',
    selectGender: 'تجربه خود را انتخاب کنید',
    home: 'خانه', topBarbers: 'برترین', map: 'نقشه',
    aiAdvisor: 'مشاور هوش مصنوعی', favorites: 'علاقه‌مندی‌ها',
    myBookings: 'رزروهای من', dashboard: 'داشبورد',
    login: 'ورود', logout: 'خروج', signup: 'ثبت‌نام',
    overview: 'نمای کلی', services: 'خدمات و قیمت‌ها',
    socialMedia: 'رسانه‌های اجتماعی', gallery: 'گالری',
    workingHours: 'ساعت کاری', subscription: 'اشتراک',
    addService: 'افزودن خدمت', editService: 'ویرایش',
    serviceName: 'نام خدمت', priceUSD: 'قیمت', duration: 'مدت (دقیقه)',
    saveChanges: 'ذخیره تغییرات', cancel: 'لغو',
    save: 'ذخیره', delete: 'حذف', edit: 'ویرایش',
    loading: 'در حال بارگذاری...', search: 'جستجو',
    savedSuccess: 'با موفقیت ذخیره شد ✓',
    errorOccurred: 'خطایی رخ داد',
    languageChanged: 'زبان تغییر کرد',
  },
  ur: {
    welcome: 'خوش آمدید',
    brand: 'BARBER HUB',
    tagline: 'حجامت اور سیلون کے لیے سمارٹ بکنگ',
    taglineGlobal: 'انداز کا عالمی پلیٹ فارم',
    men: 'مرد', menDesc: 'عالمی معیار کے پیشہ ور حجام',
    women: 'خواتین', womenDesc: 'پریمیم بیوٹی سیلون',
    enter: 'داخل ہوں',
    selectGender: 'اپنا تجربہ منتخب کریں',
    home: 'ہوم', topBarbers: 'ٹاپ', map: 'نقشہ',
    aiAdvisor: 'اے آئی مشیر', favorites: 'پسندیدہ',
    myBookings: 'میری بکنگز', dashboard: 'ڈیش بورڈ',
    login: 'لاگ ان', logout: 'لاگ آؤٹ', signup: 'سائن اپ',
    overview: 'جائزہ', services: 'خدمات اور قیمتیں',
    socialMedia: 'سوشل میڈیا', gallery: 'گیلری',
    workingHours: 'کام کے اوقات', subscription: 'سبسکرپشن',
    addService: 'خدمت شامل کریں', editService: 'ترمیم',
    serviceName: 'خدمت کا نام', priceUSD: 'قیمت', duration: 'دورانیہ (منٹ)',
    saveChanges: 'محفوظ کریں', cancel: 'منسوخ',
    save: 'محفوظ', delete: 'حذف', edit: 'ترمیم',
    loading: 'لوڈ ہو رہا ہے...', search: 'تلاش',
    savedSuccess: 'کامیابی سے محفوظ ہوا ✓',
    errorOccurred: 'ایک خرابی پیش آئی',
    languageChanged: 'زبان تبدیل ہوئی',
  },
  hi: {
    welcome: 'स्वागत है',
    brand: 'BARBER HUB',
    tagline: 'नाइयों और सैलून के लिए स्मार्ट बुकिंग',
    taglineGlobal: 'लालित्य का वैश्विक मंच',
    men: 'पुरुष', menDesc: 'विश्व-स्तरीय पेशेवर नाई',
    women: 'महिलाएं', womenDesc: 'प्रीमियम सौंदर्य सैलून',
    enter: 'प्रवेश',
    selectGender: 'अपना अनुभव चुनें',
    home: 'होम', topBarbers: 'टॉप', map: 'नक्शा',
    aiAdvisor: 'एआई सलाहकार', favorites: 'पसंदीदा',
    myBookings: 'मेरी बुकिंग', dashboard: 'डैशबोर्ड',
    login: 'लॉगिन', logout: 'लॉगआउट', signup: 'साइन अप',
    overview: 'अवलोकन', services: 'सेवाएं और कीमतें',
    socialMedia: 'सोशल मीडिया', gallery: 'गैलरी',
    workingHours: 'कार्य समय', subscription: 'सदस्यता',
    addService: 'सेवा जोड़ें', editService: 'संपादित करें',
    serviceName: 'सेवा का नाम', priceUSD: 'मूल्य', duration: 'अवधि (मिनट)',
    saveChanges: 'सहेजें', cancel: 'रद्द',
    save: 'सहेजें', delete: 'हटाएं', edit: 'संपादित',
    loading: 'लोड हो रहा है...', search: 'खोजें',
    savedSuccess: 'सफलतापूर्वक सहेजा गया ✓',
    errorOccurred: 'एक त्रुटि हुई',
    languageChanged: 'भाषा बदल दी',
  },
};

/**
 * Auto-detect user language from browser
 * Falls back to 'en' if unsupported
 */
export const detectLanguage = () => {
  // Check localStorage first (user preference saved)
  try {
    const saved = localStorage.getItem('barberhub_lang');
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch (e) {}

  // Detect browser language
  const navLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  const primary = navLang.split('-')[0];

  if (TRANSLATIONS[primary]) return primary;

  // Special fallbacks
  if (navLang.startsWith('ar')) return 'ar';
  if (navLang.startsWith('fa') || navLang.startsWith('per')) return 'fa';
  if (navLang.startsWith('ur')) return 'ur';
  if (navLang.startsWith('tr')) return 'tr';

  return 'en';
};

export const saveLanguage = (lang) => {
  try { localStorage.setItem('barberhub_lang', lang); } catch (e) {}
};

/**
 * Get translation for given language and key
 * Falls back to English, then to key itself
 */
export const t = (lang, key) => {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
};

/**
 * Returns a translator function for a language
 */
export const createTranslator = (lang) => (key) => t(lang, key);
