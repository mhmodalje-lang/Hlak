/**
 * BARBER HUB - BarberProfile (VIP Warm Luxury)
 * Showcase page with gallery, services, reviews
 * Features: Dynamic currency, RTL support, Mobile-first
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Import custom icons
import {
  Star, Location, Clock, ArrowLeft, Crown, Shears, BookCalendar,
  WhatsApp, PhonePremium as Phone, Heart, Gallery as GalleryIcon
} from '@/components/icons';

const BarberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API, token, isAuthenticated } = useApp();
  const { language } = useLocalization();
  const { formatPrice, currency } = useCurrency();
  
  const [barber, setBarber] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const isRTL = language === 'ar';

  const t = language === 'ar' ? {
    back: 'رجوع', services: 'الخدمات', reviews: 'التقييمات',
    noReviews: 'لا توجد تقييمات', bookNow: 'احجز الآن', about: 'عن الصالون',
    workingHours: 'ساعات العمل', contact: 'تواصل معنا', location: 'الموقع',
    gallery: 'معرض الأعمال', loading: 'جاري التحميل...', rating: 'التقييم',
    from: 'من', open: 'مفتوح', closed: 'مغلق', addToFavorites: 'إضافة للمفضلة',
    removeFromFavorites: 'إزالة من المفضلة'
  } : {
    back: 'Back', services: 'Services', reviews: 'Reviews',
    noReviews: 'No reviews yet', bookNow: 'Book Now', about: 'About',
    workingHours: 'Working Hours', contact: 'Contact', location: 'Location',
    gallery: 'Gallery', loading: 'Loading...', rating: 'Rating',
    from: 'from', open: 'Open', closed: 'Closed', addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites'
  };

  // Fetch barber details
  useEffect(() => {
    const fetchBarber = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API}/barbershops/${id}`);
        setBarber(res.data);
        
        // Fetch reviews
        try {
          const reviewsRes = await axios.get(`${API}/barbershops/${id}/reviews`);
          setReviews(reviewsRes.data.reviews || []);
        } catch {}
      } catch (err) {
        toast.error('Error loading barber');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBarber();
  }, [id, API]);

  // Check if favorite
  useEffect(() => {
    const checkFavorite = async () => {
      if (!isAuthenticated || !token) return;
      try {
        const res = await axios.get(`${API}/favorites/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const favorites = res.data || [];
        setIsFavorite(favorites.some(f => f.id === id));
      } catch {}
    };
    checkFavorite();
  }, [id, API, token, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
        toast.success(t.removeFromFavorites);
      } else {
        await axios.post(`${API}/favorites`, { shop_id: id }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
        toast.success(t.addToFavorites);
      }
    } catch (err) {
      toast.error('Error');
    }
  };

  if (isLoading) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--bh-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--bh-text-secondary)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!barber) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center">
        <p className="text-[var(--bh-text-secondary)]">Barber not found</p>
      </div>
    );
  }

  const images = barber.before_after_images || [];

  return (
    <div className="bh-surface min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[var(--bh-obsidian)]/90 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bh-btn bh-btn-ghost bh-btn-sm">
            <ArrowLeft className="w-5 h-5" />
            {t.back}
          </button>
          <h1 className="flex-1 text-xl font-display font-bold bh-gold-text truncate">
            {barber.shop_name}
          </h1>
          <button
            onClick={toggleFavorite}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isFavorite
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-[var(--bh-glass-bg)] hover:bg-[var(--bh-glass-bg-hi)]'
            }`}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? 'text-white' : 'text-[var(--bh-gold)]'}`}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Hero Gallery */}
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative h-64 md:h-96 rounded-3xl overflow-hidden mb-6 bh-glass-vip"
          >
            <img
              src={images[currentImageIndex]?.after || images[currentImageIndex]?.before || barber.shop_logo}
              alt={barber.shop_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Image navigation */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex
                        ? 'bg-[var(--bh-gold)] w-8'
                        : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-3xl font-display font-bold bh-gold-text mb-2">
                    {barber.shop_name}
                  </h2>
                  <div className="flex items-center gap-3 text-[var(--bh-text-secondary)] mb-3">
                    <div className="flex items-center gap-1">
                      <Location className="w-4 h-4" />
                      <span>{barber.city}</span>
                      {barber.district && <span>• {barber.district}</span>}
                    </div>
                  </div>
                  {barber.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bh-glass-bg)]">
                        <Star className="w-4 h-4 text-[var(--bh-gold)]" fill="var(--bh-gold)" />
                        <span className="font-bold text-white">{barber.rating.toFixed(1)}</span>
                        <span className="text-xs text-[var(--bh-text-muted)]">
                          ({barber.total_reviews || 0} {t.reviews})
                        </span>
                      </div>
                      {barber.rating >= 4.5 && (
                        <div className="bh-vip-badge">
                          <Crown className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'مميز' : 'Top Rated'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {barber.description && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-2">{t.about}</h3>
                  <p className="text-[var(--bh-text-secondary)] leading-relaxed">
                    {language === 'ar' ? (barber.description_ar || barber.description) : barber.description}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--bh-glass-border)]">
                {barber.whatsapp && (
                  <a
                    href={`https://wa.me/${barber.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold transition-all"
                  >
                    <WhatsApp className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {barber.phone && (
                  <a
                    href={`tel:${barber.phone}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bh-glass-bg)] hover:bg-[var(--bh-glass-bg-hi)] text-[var(--bh-gold)] font-bold transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    {t.contact}
                  </a>
                )}
              </div>
            </motion.div>

            {/* Services */}
            {barber.services && barber.services.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
              >
                <h3 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                  <Shears className="w-6 h-6" />
                  {t.services}
                </h3>
                <div className="space-y-3">
                  {barber.services.map((service, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-xl bg-[var(--bh-glass-bg)] hover:bg-[var(--bh-glass-bg-hi)] transition-all"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {language === 'ar' ? (service.name_ar || service.name) : service.name}
                        </p>
                        {service.duration && (
                          <p className="text-xs text-[var(--bh-text-muted)] mt-1">
                            <Clock className="w-3 h-3 inline" /> {service.duration} {language === 'ar' ? 'دقيقة' : 'min'}
                          </p>
                        )}
                      </div>
                      <div className="font-bold text-[var(--bh-gold)]">
                        {formatPrice(service.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
              >
                <h3 className="text-2xl font-display font-bold bh-gold-text mb-4">
                  {t.reviews}
                </h3>
                <div className="space-y-4">
                  {reviews.slice(0, 5).map((review, idx) => (
                    <div key={idx} className="pb-4 border-b border-[var(--bh-glass-border)] last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-[var(--bh-gold)]' : 'text-[var(--bh-text-muted)]'
                              }`}
                              fill={i < review.rating ? 'var(--bh-gold)' : 'none'}
                            />
                          ))}
                        </div>
                        <span className="font-bold text-white">{review.user_name}</span>
                      </div>
                      {review.comment && (
                        <p className="text-[var(--bh-text-secondary)] text-sm">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Sticky Book Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="sticky top-24 bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[var(--bh-gold)]">
                  <img
                    src={barber.shop_logo || '/images/ai/hero_home.png'}
                    alt={barber.shop_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="font-display font-bold text-xl text-white mb-1">
                  {barber.shop_name}
                </h4>
                {barber.min_price !== undefined && barber.min_price > 0 && (
                  <p className="text-[var(--bh-text-secondary)]">
                    {t.from} <span className="text-[var(--bh-gold)] font-bold">{formatPrice(barber.min_price)}</span>
                  </p>
                )}
              </div>

              <Button
                onClick={() => navigate(`/book/${id}`)}
                className="bh-btn bh-btn-primary w-full mb-4"
              >
                <BookCalendar className="w-5 h-5" />
                {t.bookNow}
              </Button>

              {/* Currency Info */}
              <div className="text-center text-xs text-[var(--bh-text-muted)]">
                💰 {language === 'ar' ? 'الأسعار بـ' : 'Prices in'} {currency}
              </div>

              {/* Location (if available) */}
              {barber.maps_link && (
                <a
                  href={barber.maps_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[var(--bh-glass-bg)] hover:bg-[var(--bh-glass-bg-hi)] text-[var(--bh-text-secondary)] transition-all"
                >
                  <Location className="w-4 h-4" />
                  {t.location}
                </a>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarberProfile;
