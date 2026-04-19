import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import { 
  Star, MapPin, Clock, Phone, Calendar, ArrowRight, ArrowLeft,
  Instagram, MessageCircle, Share2, QrCode, Crown, Check,
  ShoppingBag, Facebook, Twitter, Youtube, Sparkles, ExternalLink, Package
} from 'lucide-react';

const BarberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API, gender, language, themeClass } = useApp();
  const [barber, setBarber] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      services: 'الخدمات',
      reviews: 'التقييمات',
      noReviews: 'لا توجد تقييمات بعد',
      bookNow: 'احجز الآن',
      about: 'عن الصالون',
      workingHours: 'ساعات العمل',
      contact: 'تواصل معنا',
      avgTime: 'متوسط وقت الخدمة',
      minutes: 'دقيقة',
      qrCode: 'رمز QR',
      share: 'مشاركة',
      before: 'قبل',
      after: 'بعد',
      currency: '€',
      closed: 'مغلق',
      gallery: 'معرض الأعمال',
      products: 'المنتجات',
      viewAllProducts: 'عرض كل المنتجات',
      followUs: 'تابعنا',
      shareOn: 'مشاركة عبر',
      copyLink: 'نسخ الرابط',
      linkCopied: 'تم نسخ الرابط!'
    },
    en: {
      back: 'Back',
      services: 'Services',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      bookNow: 'Book Now',
      about: 'About',
      workingHours: 'Working Hours',
      contact: 'Contact',
      avgTime: 'Average Service Time',
      minutes: 'minutes',
      qrCode: 'QR Code',
      share: 'Share',
      before: 'Before',
      after: 'After',
      currency: '€',
      closed: 'Closed',
      gallery: 'Work Gallery',
      products: 'Products',
      viewAllProducts: 'View All Products',
      followUs: 'Follow Us',
      shareOn: 'Share on',
      copyLink: 'Copy Link',
      linkCopied: 'Link Copied!'
    }
  };

  const t = texts[language] || texts.ar;

  const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchBarber();
    fetchReviews();
    fetchProducts();
  }, [id]);

  const fetchBarber = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/${id}`);
      setBarber(res.data);
    } catch (err) {
      console.error('Failed to fetch barber:', err);
      // Demo data for presentation
      setBarber({
        id: id,
        salon_name: 'Elite Barber Shop',
        salon_name_ar: 'صالون الأناقة الملكية',
        description: 'Premium barber services with luxury experience',
        description_ar: 'خدمات حلاقة فاخرة مع تجربة ملكية',
        city: 'الحسكة',
        country: 'سوريا',
        rating: 4.9,
        total_reviews: 120,
        total_bookings: 450,
        rank_level: 'top',
        services: [
          { name: 'Haircut', name_ar: 'قص شعر', price: 10, duration_minutes: 30 },
          { name: 'Beard Trim', name_ar: 'تشذيب الذقن', price: 5, duration_minutes: 15 },
          { name: 'Hair Color', name_ar: 'صبغة شعر', price: 20, duration_minutes: 45 }
        ],
        whatsapp: '+963935964158',
        instagram: 'https://instagram.com/barberhub',
        average_service_time: 30,
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
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews/barber/${id}`);
      setReviews(res.data);
    } catch (err) {
      // Demo reviews
      setReviews([
        { id: '1', customer_name: 'أحمد محمد', rating: 5, comment: 'خدمة ممتازة وأسعار مناسبة' },
        { id: '2', customer_name: 'علي حسين', rating: 4, comment: 'حلاق محترف جداً' }
      ]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/products/shop/${id}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleShare = () => {
    setShowShareMenu(true);
  };

  const shareOnPlatform = (platform) => {
    const url = window.location.href;
    const title = language === 'ar' ? barber?.salon_name_ar : barber?.salon_name;
    const text = language === 'ar' ? `تفضل بزيارة ${title}` : `Check out ${title}`;
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      copy: null
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setShowShareMenu(false);
      return;
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
    }
    setShowShareMenu(false);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${isMen ? 'bg-gray-900' : 'bg-white'} flex items-center justify-center`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin ${isMen ? 'border-yellow-500 border-t-transparent' : 'border-rose-400 border-t-transparent'}`} />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className={`min-h-screen ${isMen ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} flex items-center justify-center`}>
        <p>{language === 'ar' ? 'الصالون غير موجود' : 'Salon not found'}</p>
      </div>
    );
  }

  const allServices = [...(barber.services || []), ...(barber.custom_services || [])];

  return (
    <div className={`min-h-screen ${isMen ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`} dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="barber-profile-page">
      {/* Header Image */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div 
          className={`absolute inset-0 bg-cover bg-center ${isMen ? 'opacity-60' : 'opacity-40'}`}
          style={{
            backgroundImage: isMen 
              ? 'url(https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85)'
              : 'url(https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
          }}
        />
        <div className={`absolute inset-0 ${isMen ? 'bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent' : 'bg-gradient-to-t from-white via-white/50 to-transparent'}`} />
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-gray-900'}`}
          data-testid="back-btn"
        >
          {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        {/* Actions */}
        <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} flex gap-2`}>
          <button onClick={() => setShowQR(true)} className={`p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-gray-900'}`}>
            <QrCode className="w-5 h-5" />
          </button>
          <button onClick={handleShare} className={`p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-gray-900'}`}>
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Rank Badge */}
        {barber.rank_level === 'top' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className={`${isMen ? 'bg-yellow-500/90 text-black' : 'bg-rose-400/90 text-white'} px-4 py-2 rounded-full font-black flex items-center gap-2 backdrop-blur-xl`}>
              <Crown size={18}/> TOP RATED
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-32">
        {/* Basic Info Card */}
        <div className={`${isMen ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'} rounded-3xl p-6 border mb-6`}>
          <div className="text-center mb-4">
            <div className="text-5xl mb-4">{isMen ? '💈' : '💅'}</div>
            <h1 className="text-3xl font-black mb-2">
              {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
            </h1>
            <p className={`flex items-center justify-center gap-2 ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
              <MapPin size={16}/>
              {barber.address || `${barber.city}, ${barber.country}`}
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-6 h-6 ${i < Math.round(barber.rating) ? (isMen ? 'text-yellow-500 fill-yellow-500' : 'text-rose-400 fill-rose-400') : (isMen ? 'text-gray-600' : 'text-gray-300')}`} 
                />
              ))}
            </div>
            <span className="font-black text-2xl">{barber.rating?.toFixed(1)}</span>
            <span className={`${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
              ({barber.total_reviews} {t.reviews})
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`${isMen ? 'bg-gray-900' : 'bg-gray-100'} rounded-2xl p-4 text-center`}>
              <p className={`text-xs ${isMen ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1`}>
                {language === 'ar' ? 'إجمالي الحجوزات' : 'Total Bookings'}
              </p>
              <p className={`text-2xl font-black ${isMen ? 'text-yellow-500' : 'text-rose-400'}`}>
                {barber.total_bookings || 0}
              </p>
            </div>
            <div className={`${isMen ? 'bg-gray-900' : 'bg-gray-100'} rounded-2xl p-4 text-center`}>
              <p className={`text-xs ${isMen ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1`}>
                {t.avgTime}
              </p>
              <p className={`text-2xl font-black ${isMen ? 'text-yellow-500' : 'text-rose-400'}`}>
                {barber.average_service_time || 30} <span className="text-sm">{t.minutes}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className={`${isMen ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'} rounded-3xl p-6 border mb-6`}>
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <Check className={isMen ? 'text-yellow-500' : 'text-rose-400'} size={24}/>
            {t.services}
          </h2>
          <div className="space-y-3">
            {allServices.map((service, i) => (
              <div 
                key={i}
                className={`flex items-center justify-between p-4 rounded-2xl ${isMen ? 'bg-gray-900' : 'bg-gray-100'}`}
              >
                <div>
                  <p className="font-bold">{language === 'ar' ? service.name_ar : service.name}</p>
                  <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Clock size={14}/> {service.duration_minutes || 30} {t.minutes}
                  </p>
                </div>
                <span className={`text-xl font-black ${isMen ? 'text-yellow-500' : 'text-rose-400'}`}>
                  {service.price} {t.currency}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Social Media */}
        <div className={`${isMen ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'} rounded-3xl p-6 border mb-6`}>
          <h2 className="text-xl font-black mb-4">{t.contact}</h2>
          <div className="flex gap-3 flex-wrap mb-4">
            {barber.whatsapp && (
              <a
                href={`https://wa.me/${barber.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-full font-bold transition-all text-sm"
                data-testid="whatsapp-link"
              >
                <MessageCircle size={18}/> WhatsApp
              </a>
            )}
            {barber.instagram && (
              <a
                href={barber.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-full font-bold text-sm"
                data-testid="instagram-link"
              >
                <Instagram size={18}/> Instagram
              </a>
            )}
          </div>
          
          {/* Social Media Links */}
          {(barber.tiktok || barber.facebook || barber.twitter || barber.youtube || barber.snapchat) && (
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
                {t.followUs}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {barber.tiktok && (
                  <a href={barber.tiktok} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isMen ? 'bg-gray-900 text-white hover:bg-gray-700 border border-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'}`}
                    data-testid="tiktok-link">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.35a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.22z"/></svg>
                    TikTok
                  </a>
                )}
                {barber.facebook && (
                  <a href={barber.facebook} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isMen ? 'bg-gray-900 text-blue-400 hover:bg-gray-700 border border-gray-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}
                    data-testid="facebook-link">
                    <Facebook size={16}/> Facebook
                  </a>
                )}
                {barber.twitter && (
                  <a href={barber.twitter} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isMen ? 'bg-gray-900 text-sky-400 hover:bg-gray-700 border border-gray-700' : 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200'}`}
                    data-testid="twitter-link">
                    <Twitter size={16}/> X / Twitter
                  </a>
                )}
                {barber.youtube && (
                  <a href={barber.youtube} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isMen ? 'bg-gray-900 text-red-400 hover:bg-gray-700 border border-gray-700' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
                    data-testid="youtube-link">
                    <Youtube size={16}/> YouTube
                  </a>
                )}
                {barber.snapchat && (
                  <a href={`https://snapchat.com/add/${barber.snapchat}`} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isMen ? 'bg-gray-900 text-yellow-300 hover:bg-gray-700 border border-gray-700' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200'}`}
                    data-testid="snapchat-link">
                    <Sparkles size={16}/> Snapchat
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Products Showcase */}
        {products.length > 0 && (
          <div className={`${isMen ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'} rounded-3xl p-6 border mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black flex items-center gap-2">
                <ShoppingBag className={isMen ? 'text-yellow-500' : 'text-rose-400'} size={24}/>
                {t.products} ({products.length})
              </h2>
              <button
                onClick={() => navigate(`/products/${id}`)}
                className={`text-sm font-bold flex items-center gap-1 ${isMen ? 'text-yellow-500 hover:text-yellow-400' : 'text-rose-400 hover:text-rose-500'}`}
                data-testid="view-all-products-btn"
              >
                {t.viewAllProducts} <ExternalLink size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {products.slice(0, 4).map((product) => (
                <div 
                  key={product.id}
                  className={`rounded-2xl overflow-hidden border transition-all hover:-translate-y-0.5 cursor-pointer ${
                    isMen ? 'bg-gray-900 border-gray-700 hover:border-yellow-500/30' : 'bg-gray-50 border-gray-200 hover:border-rose-300'
                  }`}
                  onClick={() => navigate(`/products/${id}`)}
                >
                  <div className="relative h-28 overflow-hidden">
                    <img 
                      src={product.image_url || (isMen ? 'https://images.unsplash.com/photo-1673241073608-fae56d662d5b?w=300&h=200&fit=crop' : 'https://images.unsplash.com/photo-1695972235653-2d241f8cd412?w=300&h=200&fit=crop')}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = isMen ? 'https://images.unsplash.com/photo-1673241073608-fae56d662d5b?w=300&h=200&fit=crop' : 'https://images.unsplash.com/photo-1695972235653-2d241f8cd412?w=300&h=200&fit=crop'; }}
                    />
                    {product.featured && (
                      <span className={`absolute top-2 ${language === 'ar' ? 'right-2' : 'left-2'} px-2 py-0.5 rounded-full text-[10px] font-bold ${isMen ? 'bg-yellow-500/90 text-black' : 'bg-rose-400/90 text-white'}`}>
                        <Sparkles size={10} className="inline me-1" />{language === 'ar' ? 'مميز' : 'Featured'}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm line-clamp-1">{language === 'ar' ? product.name_ar : product.name}</p>
                    <p className={`text-lg font-black ${isMen ? 'text-yellow-500' : 'text-rose-400'}`}>
                      {product.price} {t.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className={`${isMen ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-xl'} rounded-3xl p-6 border`}>
          <h2 className="text-xl font-black mb-4">{t.reviews} ({reviews.length})</h2>
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className={`p-4 rounded-2xl ${isMen ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{review.customer_name}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-4 h-4 ${i < review.rating ? (isMen ? 'text-yellow-500 fill-yellow-500' : 'text-rose-400 fill-rose-400') : 'text-gray-500'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className={isMen ? 'text-gray-400' : 'text-gray-500'}>{review.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>{t.noReviews}</p>
          )}
        </div>
      </div>

      {/* Fixed Book Now Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => navigate(`/book/${barber.id}`)}
            className={`w-full py-6 text-lg font-black rounded-2xl ${isMen ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-rose-400 text-white hover:bg-rose-500'}`}
            data-testid="book-now-btn"
          >
            <Calendar className="w-5 h-5 me-2" />
            {t.bookNow}
          </Button>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className={isMen ? 'bg-gray-900 border-gray-700' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle>{t.qrCode}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {barber.qr_code ? (
              <div className="bg-white p-4 rounded-2xl">
                <img src={`data:image/png;base64,${barber.qr_code}`} alt="QR Code" className="w-48 h-48" />
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-yellow-500' : 'text-rose-400'}`} />
                <p className={isMen ? 'text-gray-400' : 'text-gray-500'}>
                  {language === 'ar' ? 'QR Code سيتم إنشاؤه بعد التفعيل' : 'QR Code will be generated after activation'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareMenu} onOpenChange={setShowShareMenu}>
        <DialogContent className={`${isMen ? 'bg-gray-900 border-gray-700' : 'bg-white'} max-w-sm`}>
          <DialogHeader>
            <DialogTitle className="text-center">{t.shareOn}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 p-4">
            <button
              onClick={() => shareOnPlatform('whatsapp')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all"
              data-testid="share-whatsapp"
            >
              <MessageCircle size={20}/> WhatsApp
            </button>
            <button
              onClick={() => shareOnPlatform('facebook')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all"
              data-testid="share-facebook"
            >
              <Facebook size={20}/> Facebook
            </button>
            <button
              onClick={() => shareOnPlatform('twitter')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition-all"
              data-testid="share-twitter"
            >
              <Twitter size={20}/> X / Twitter
            </button>
            <button
              onClick={() => shareOnPlatform('copy')}
              className={`flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${isMen ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'}`}
              data-testid="share-copy"
            >
              <ExternalLink size={20}/> {t.copyLink}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Navigation */}
      <div className="fixed bottom-20 left-4 flex gap-2 z-[100] scale-75 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => navigate('/home')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
      </div>
    </div>
  );
};

export default BarberProfile;
