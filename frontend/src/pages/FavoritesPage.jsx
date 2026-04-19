/**
 * BARBER HUB - FavoritesPage (VIP Warm Luxury)
 * User's favorite salons with quick-book action
 * Features: Unified bh-* theme, dynamic currency, RTL support, quick WhatsApp
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, ArrowLeft, ArrowRight, Star, Location, BookCalendar,
  Shears, Crown, WhatsApp
} from '@/components/icons';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { API, token, isAuthenticated } = useApp();
  const { language } = useLocalization();
  const { formatPrice } = useCurrency();
  const isRTL = language === 'ar';

  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const t = isRTL ? {
    title: 'المفضلة',
    back: 'رجوع',
    empty: 'لا يوجد صالونات في المفضلة',
    emptyDesc: 'أضف صالوناتك المفضلة لتصل إليها بسهولة لاحقاً',
    remove: 'إزالة',
    book: 'احجز الآن',
    explore: 'استكشف الصالونات',
    loginFirst: 'يجب تسجيل الدخول لعرض المفضلة',
    login: 'تسجيل الدخول',
    shops: 'صالون',
    removed: 'تمت الإزالة من المفضلة',
    failed: 'فشلت العملية',
    startFrom: 'يبدأ من',
    view: 'عرض الصالون'
  } : {
    title: 'Favorites',
    back: 'Back',
    empty: 'No favorites yet',
    emptyDesc: 'Add your favorite salons for quick access later',
    remove: 'Remove',
    book: 'Book Now',
    explore: 'Explore salons',
    loginFirst: 'Please login to view favorites',
    login: 'Login',
    shops: 'salons',
    removed: 'Removed from favorites',
    failed: 'Failed',
    startFrom: 'from',
    view: 'View Shop'
  };

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchFavs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchFavs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/favorites/my`, { headers: { Authorization: `Bearer ${token}` } });
      setFavs(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const removeFav = async (shopId) => {
    setRemovingId(shopId);
    try {
      await axios.delete(`${API}/favorites/${shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      setFavs(prev => prev.filter(f => f.id !== shopId));
      toast.success(t.removed);
    } catch (e) {
      toast.error(t.failed);
    } finally {
      setRemovingId(null);
    }
  };

  // ---------- Not logged in ----------
  if (!isAuthenticated) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="bh-orb bh-orb-gold w-80 h-80 top-0 left-0 opacity-20" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bh-glass-vip bh-corner-accents rounded-3xl p-8 text-center relative z-10"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--bh-gold)]/30 to-[var(--bh-gold-deep)]/20 flex items-center justify-center">
            <Heart className="w-10 h-10 text-[var(--bh-gold)]" fill="currentColor" />
          </div>
          <h2 className="text-2xl font-display font-bold bh-gold-text mb-2">{t.title}</h2>
          <p className="text-[var(--bh-text-secondary)] mb-6">{t.loginFirst}</p>
          <button
            onClick={() => navigate('/auth')}
            className="bh-btn bh-btn-primary w-full"
            data-testid="fav-login-btn"
          >
            <Crown className="w-5 h-5" />
            {t.login}
          </button>
        </motion.div>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--bh-gold)] mx-auto mb-3" />
          <p className="text-[var(--bh-text-secondary)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------
  return (
    <div className="bh-surface min-h-screen" data-testid="favorites-page" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-15" />
      <div className="bh-orb bh-orb-burgundy w-80 h-80 bottom-0 left-0 opacity-10" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[var(--bh-obsidian)]/85 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="bh-btn bh-btn-ghost bh-btn-sm" data-testid="back-btn">
            {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            <span className="hidden sm:inline">{t.back}</span>
          </button>
          <h1 className="flex-1 text-xl md:text-2xl font-display font-bold bh-gold-text flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
            {t.title}
          </h1>
          <div className="px-3 py-1.5 rounded-full bg-[var(--bh-gold)]/15 border border-[var(--bh-gold)]/30 text-[var(--bh-gold)] text-sm font-bold">
            {favs.length}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 relative z-10">
        {favs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bh-glass-vip bh-corner-accents rounded-3xl p-12 text-center max-w-md mx-auto mt-10"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--bh-gold)]/20 to-[var(--bh-burgundy)]/10 flex items-center justify-center">
              <Heart className="w-12 h-12 text-[var(--bh-gold)]" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-2">{t.empty}</h2>
            <p className="text-[var(--bh-text-secondary)] mb-8">{t.emptyDesc}</p>
            <button
              onClick={() => navigate('/home')}
              className="bh-btn bh-btn-primary"
              data-testid="explore-btn"
            >
              <Sparkles className="w-5 h-5" />
              {t.explore}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {favs.map((shop, idx) => {
                const rating = shop.rating || 0;
                const isTop = rating >= 4.5;
                const heroImg = shop.before_after_images?.[0]?.after || shop.shop_logo;
                const whatsappNum = (shop.whatsapp || shop.phone || '').replace(/\D/g, '');

                return (
                  <motion.div
                    key={shop.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                    className="bh-glass bh-card-hover overflow-hidden cursor-pointer group"
                    onClick={() => navigate(`/barber/${shop.id}`)}
                    data-testid={`fav-card-${shop.id}`}
                  >
                    {/* Hero image */}
                    <div className="relative h-48 overflow-hidden">
                      {heroImg ? (
                        <img
                          src={heroImg}
                          alt={shop.shop_name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-[var(--bh-obsidian)] to-[var(--bh-glass-bg)]">
                          {shop.shop_type === 'female' ? '✨' : '💈'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      {/* Top-rated badge */}
                      {isTop && (
                        <div className="absolute top-3 start-3 bh-vip-badge">
                          <Crown className="w-3.5 h-3.5" />
                          <span>{isRTL ? 'الأعلى تقييماً' : 'Top Rated'}</span>
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFav(shop.id); }}
                        disabled={removingId === shop.id}
                        className="absolute top-3 end-3 w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-lg disabled:opacity-50"
                        data-testid={`remove-fav-${shop.id}`}
                        aria-label={t.remove}
                      >
                        {removingId === shop.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Heart className="w-5 h-5" fill="currentColor" />
                        }
                      </button>

                      {/* Shop name overlay */}
                      <div className="absolute bottom-0 start-0 end-0 p-4">
                        <h3 className="text-lg font-display font-bold text-white truncate">{shop.shop_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-white/85 mt-1">
                          <Location className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            {[shop.city, shop.district, shop.country].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40">
                          <Star className="w-4 h-4 text-[var(--bh-gold)]" fill="currentColor" />
                          <span className="font-bold text-sm text-white">{rating.toFixed(1)}</span>
                          <span className="text-[10px] text-white/60">({shop.total_reviews || 0})</span>
                        </div>
                        {shop.min_price !== undefined && shop.min_price > 0 && (
                          <div className="text-right">
                            <div className="text-[10px] text-[var(--bh-text-muted)]">{t.startFrom}</div>
                            <div className="text-sm font-bold bh-gold-text">{formatPrice(shop.min_price)}</div>
                          </div>
                        )}
                      </div>

                      {/* Services tags */}
                      {shop.services && shop.services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {shop.services.slice(0, 2).map((svc, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-1 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-glass-border)] text-[var(--bh-text-secondary)]"
                            >
                              {isRTL ? (svc.name_ar || svc.name) : svc.name}
                            </span>
                          ))}
                          {shop.services.length > 2 && (
                            <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--bh-glass-bg)] text-[var(--bh-text-muted)]">
                              +{shop.services.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Quick actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/book/${shop.id}`); }}
                          className="bh-btn bh-btn-primary flex-1 bh-btn-sm"
                          data-testid={`book-fav-${shop.id}`}
                        >
                          <BookCalendar className="w-4 h-4" />
                          {t.book}
                        </button>
                        {whatsappNum && (
                          <a
                            href={`https://wa.me/${whatsappNum}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 h-10 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-colors flex-shrink-0"
                            aria-label="WhatsApp"
                          >
                            <WhatsApp className="w-5 h-5 text-green-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
