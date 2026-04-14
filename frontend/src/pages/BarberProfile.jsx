import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import { 
  Star, MapPin, Clock, Phone, Calendar, ArrowRight, ArrowLeft,
  Instagram, MessageCircle, Share2, QrCode, Scissors, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const BarberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API, gender, language, themeClass } = useApp();
  const [barber, setBarber] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
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
      location: 'الموقع',
      contact: 'تواصل معنا',
      avgTime: 'متوسط وقت الخدمة',
      minutes: 'دقيقة',
      qrCode: 'رمز QR',
      share: 'مشاركة',
      before: 'قبل',
      after: 'بعد',
      currency: '€',
      closed: 'مغلق'
    },
    en: {
      back: 'Back',
      services: 'Services',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      bookNow: 'Book Now',
      about: 'About',
      workingHours: 'Working Hours',
      location: 'Location',
      contact: 'Contact',
      avgTime: 'Average Service Time',
      minutes: 'minutes',
      qrCode: 'QR Code',
      share: 'Share',
      before: 'Before',
      after: 'After',
      currency: '€',
      closed: 'Closed'
    }
  };

  const t = texts[language] || texts.ar;

  const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchBarber();
    fetchReviews();
  }, [id]);

  const fetchBarber = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/${id}`);
      setBarber(res.data);
    } catch (err) {
      console.error('Failed to fetch barber:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/reviews/barber/${id}`);
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: barber.salon_name,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <div className={`w-12 h-12 border-4 rounded-full animate-spin ${isMen ? 'border-[#D4AF37] border-t-transparent' : 'border-[#B76E79] border-t-transparent'}`} />
      </div>
    );
  }

  if (!barber) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
          {language === 'ar' ? 'الصالون غير موجود' : 'Salon not found'}
        </p>
      </div>
    );
  }

  const allServices = [...(barber.services || []), ...(barber.custom_services || [])];
  const beforeAfterImages = barber.before_after_images || [];

  return (
    <div className={`min-h-screen ${themeClass}`} data-testid="barber-profile-page">
      {/* Header */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        <img 
          src={beforeAfterImages[0]?.after || (isMen 
            ? 'https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85'
            : 'https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
          )}
          alt={barber.salon_name}
          className="w-full h-full object-cover"
        />
        <div className={`absolute inset-0 ${isMen ? 'bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent' : 'bg-gradient-to-t from-[#FDFBF7] via-transparent to-transparent'}`} />
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`absolute top-4 ${language === 'ar' ? 'right-4' : 'left-4'} p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-[#1C1917]'}`}
          data-testid="back-btn"
        >
          {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
        </button>

        {/* Actions */}
        <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} flex gap-2`}>
          <button
            onClick={() => setShowQR(true)}
            className={`p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-[#1C1917]'}`}
            data-testid="qr-btn"
          >
            <QrCode className="w-5 h-5" />
          </button>
          <button
            onClick={handleShare}
            className={`p-3 rounded-full backdrop-blur-xl ${isMen ? 'bg-black/50 text-white' : 'bg-white/50 text-[#1C1917]'}`}
            data-testid="share-btn"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Logo */}
        {barber.logo_url && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <img src={barber.logo_url} alt="Logo" className="w-20 h-20 rounded-full border-4 border-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Basic Info */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className={`text-3xl sm:text-4xl font-bold font-display mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
          </h1>
          <p className={`flex items-center justify-center gap-2 mb-4 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            <MapPin className="w-4 h-4" />
            {barber.address || `${barber.city}, ${barber.country}`}
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-5 h-5 ${i < Math.round(barber.rating) ? (isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]') : (isMen ? 'text-[#262626]' : 'text-[#E7E5E4]')}`} 
                />
              ))}
              <span className={`ms-2 font-semibold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {barber.rating?.toFixed(1)}
              </span>
              <span className={`${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                ({barber.total_reviews} {t.reviews})
              </span>
            </div>
          </div>
        </div>

        {/* Book Now Button - Sticky */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
          <div className="container mx-auto">
            <Button
              onClick={() => navigate(`/book/${barber.id}`)}
              className={`w-full py-6 text-lg ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              data-testid="book-now-btn"
            >
              <Calendar className="w-5 h-5 me-2" />
              {t.bookNow}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-24">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            {barber.description && (
              <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
                <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                  {t.about}
                </h2>
                <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                  {language === 'ar' ? barber.description_ar : barber.description}
                </p>
              </div>
            )}

            {/* Before/After Gallery */}
            {beforeAfterImages.length > 0 && (
              <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
                <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                  {t.before} / {t.after}
                </h2>
                <div className="relative">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm mb-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.before}</p>
                      <img 
                        src={beforeAfterImages[currentImageIndex]?.before || 'https://via.placeholder.com/300'} 
                        alt="Before"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <div>
                      <p className={`text-sm mb-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.after}</p>
                      <img 
                        src={beforeAfterImages[currentImageIndex]?.after || 'https://via.placeholder.com/300'} 
                        alt="After"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  </div>
                  {beforeAfterImages.length > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      {beforeAfterImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`w-3 h-3 rounded-full transition-all ${currentImageIndex === i 
                            ? (isMen ? 'bg-[#D4AF37]' : 'bg-[#B76E79]') 
                            : (isMen ? 'bg-[#262626]' : 'bg-[#E7E5E4]')
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Services */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {t.services}
              </h2>
              <div className="space-y-3">
                {allServices.map((service, i) => (
                  <div 
                    key={i}
                    className={`flex items-center justify-between p-4 rounded-lg ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}
                  >
                    <div className="flex items-center gap-3">
                      {isMen ? <Scissors className="w-5 h-5 text-[#D4AF37]" /> : <Sparkles className="w-5 h-5 text-[#B76E79]" />}
                      <div>
                        <p className={`font-medium ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {language === 'ar' ? service.name_ar : service.name}
                        </p>
                        <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                          <Clock className="w-3 h-3" />
                          {service.duration_minutes} {t.minutes}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-bold price-tag ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                      {service.price} {t.currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {t.reviews} ({reviews.length})
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review) => (
                    <div 
                      key={review.id}
                      className={`p-4 rounded-lg ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {review.customer_name}
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? (isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]') : (isMen ? 'text-[#262626]' : 'text-[#E7E5E4]')}`} 
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                  {t.noReviews}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Working Hours */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <Clock className="w-5 h-5 inline me-2" />
                {t.workingHours}
              </h2>
              <div className="space-y-2">
                {(language === 'ar' ? daysAr : daysEn).map((day, i) => {
                  const dayKey = daysEn[i].toLowerCase();
                  const hours = barber.working_hours?.[dayKey];
                  return (
                    <div key={day} className="flex justify-between">
                      <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{day}</span>
                      <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>
                        {hours ? `${hours.start} - ${hours.end}` : t.closed}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average Service Time */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
              <h2 className={`text-lg font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {t.avgTime}
              </h2>
              <p className={`text-3xl font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                {barber.average_service_time || 30} <span className="text-lg">{t.minutes}</span>
              </p>
            </div>

            {/* Contact */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
              <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {t.contact}
              </h2>
              <div className="flex gap-3">
                {barber.whatsapp && (
                  <a
                    href={`https://wa.me/${barber.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-btn flex-1 justify-center"
                    data-testid="whatsapp-link"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </a>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {barber.instagram && (
                  <a
                    href={barber.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link instagram"
                    data-testid="instagram-link"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {barber.tiktok && (
                  <a
                    href={barber.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link tiktok"
                    data-testid="tiktok-link"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className={isMen ? 'bg-[#141414] border-[#262626]' : 'bg-white border-[#E7E5E4]'}>
          <DialogHeader>
            <DialogTitle className={isMen ? 'text-white' : 'text-[#1C1917]'}>
              {t.qrCode}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {barber.qr_code && (
              <div className="qr-container">
                <img 
                  src={`data:image/png;base64,${barber.qr_code}`} 
                  alt="QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
          </div>
          <p className={`text-center ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {language === 'ar' ? 'امسح الرمز للوصول السريع' : 'Scan for quick access'}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BarberProfile;
