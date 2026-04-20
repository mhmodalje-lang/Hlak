/**
 * BARBER HUB - HomePage (Dark Neo-Luxury Redesign)
 * Global Brand with Arabic Soul
 * Features: Auto language, Geo-based headers, Auto currency
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useGeoLocation } from '@/contexts/GeoLocationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LanguageToggle from '@/components/LanguageToggle';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Import custom icons
import {
  Shears, Crown, Star, Heart, Location, BookCalendar,
  Search, Menu, Close, User, Logout, ArrowRight, ArrowLeft,
  WhatsApp, AIBrain, Fire
} from '@/components/icons';

const HomePage = () => {
  const navigate = useNavigate();
  const { API, gender, user, logout, themeClass, isAuthenticated, isBarber, isAdmin, token } = useApp();
  const { language } = useLocalization();
  const { getDynamicHeader, city, country } = useGeoLocation();
  const { formatPrice, currency } = useCurrency();
  
  const [barbers, setBarbers] = useState([]);
  const [topBarbers, setTopBarbers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [cities, setCities] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  // Phase 6: sponsored shops + tiered ranking
  const [sponsoredShops, setSponsoredShops] = useState([]);
  const [tiers, setTiers] = useState({ global_elite: [], country_top: [], governorate_top: [], city_top: [] });

  const isMen = gender === 'male';

  // Dynamic geo-based header
  const dynamicHeader = getDynamicHeader(language);

  // Normalize: treat "Unknown"/empty as no location
  const normalizedCountry = country && country !== 'Unknown' ? country : null;
  const normalizedCity = city && city !== 'Unknown' ? city : null;

  const t = language === 'ar' ? {
    welcome: 'مرحباً', guest: 'زائر', search: 'ابحث عن صالون أو مدينة...',
    allCities: 'كل المدن', topBarbers: 'أفضل الحلاقين', topSalons: 'أفضل الصالونات',
    nearYou: 'الصالونات القريبة منك', viewAll: 'عرض الكل', book: 'احجز الآن',
    reviews: 'تقييم', login: 'تسجيل الدخول', logout: 'خروج',
    myBookings: 'حجوزاتي', dashboard: 'لوحة التحكم', map: 'الخريطة',
    noResults: 'لا توجد نتائج', featured: 'مميز', favorites: 'المفضلة',
    aiAdvisor: 'المستشار الذكي', adminPanel: 'لوحة المدير',
    heroSubtitle: 'احجز موعدك مع نخبة الحلاقين في منطقتك',
    exploreNow: 'استكشف الآن', topRated: 'الأعلى تقييماً', bookNow: 'احجز الآن',
    location: 'الموقع', rating: 'التقييم', startJourney: 'ابدأ رحلتك',
    km: 'كم',
    sponsoredTitle: 'إعلانات مميّزة في مدينتك', sponsoredSubtitle: 'صالونات راعية',
    tierGlobal: 'النخبة العالمية', tierCountry: 'الأفضل في الدولة',
    tierGovernorate: 'الأفضل في المحافظة', tierCity: 'الأفضل في مدينتك',
    tierInCountry: 'في', inCity: 'في',
  } : {
    welcome: 'Welcome', guest: 'Guest', search: 'Search for salons or cities...',
    allCities: 'All Cities', topBarbers: 'Top Barbers', topSalons: 'Top Salons',
    nearYou: 'Salons Near You', viewAll: 'View All', book: 'Book Now',
    reviews: 'reviews', login: 'Login', logout: 'Logout',
    myBookings: 'My Bookings', dashboard: 'Dashboard', map: 'Map',
    noResults: 'No results found', featured: 'Featured', favorites: 'Favorites',
    aiAdvisor: 'AI Advisor', adminPanel: 'Admin Panel',
    heroSubtitle: 'Book your appointment with elite barbers in your area',
    exploreNow: 'Explore Now', topRated: 'Top Rated', bookNow: 'Book Now',
    location: 'Location', rating: 'Rating', startJourney: 'Start Your Journey',
    km: 'km',
    sponsoredTitle: 'Featured in Your City', sponsoredSubtitle: 'Sponsored Salons',
    tierGlobal: 'Global Elite', tierCountry: 'Country Top',
    tierGovernorate: 'Governorate Top', tierCity: 'Top in Your City',
    tierInCountry: 'in', inCity: 'in',
  };

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await axios.get(`${API}/favorites/my`, { headers: { Authorization: `Bearer ${token}` } });
      setFavoriteIds(new Set((res.data || []).map(s => s.id)));
    } catch (e) { /* ignore */ }
  }, [API, token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated, fetchFavorites]);

  const fetchBarbers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { shop_type: gender, sort: 'rating', limit: 50 };
      if (searchQuery) params.search = searchQuery;
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity;
      
      const res = await axios.get(`${API}/search/barbers`, { params });
      const data = res.data || [];
      setBarbers(data);
      setTopBarbers(data.filter(b => (b.rating || 0) >= 4.5).slice(0, 6));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API, gender, searchQuery, selectedCity]);

  // Fetch sponsored shops scoped to user's city
  const fetchSponsored = useCallback(async () => {
    try {
      const params = { limit: 6 };
      if (gender) params.gender = gender;
      if (country) params.country = country;
      if (city) params.city = city;
      const res = await axios.get(`${API}/sponsored/active`, { params });
      setSponsoredShops(res.data || []);
    } catch (err) {
      console.error('Sponsored fetch failed:', err);
      setSponsoredShops([]);
    }
  }, [API, gender, country, city]);

  // Fetch tiered ranking (city → governorate → country → global)
  const fetchTiers = useCallback(async () => {
    try {
      const params = { limit: 6 };
      if (gender) params.gender = gender;
      if (country) params.country = country;
      if (selectedCity && selectedCity !== 'all') {
        params.city = selectedCity;
      } else if (city) {
        params.city = city;
      }
      const res = await axios.get(`${API}/ranking/tiers`, { params });
      setTiers(res.data || { global_elite: [], country_top: [], governorate_top: [], city_top: [] });
    } catch (err) {
      console.error('Tiers fetch failed:', err);
      setTiers({ global_elite: [], country_top: [], governorate_top: [], city_top: [] });
    }
  }, [API, gender, country, city, selectedCity]);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  useEffect(() => {
    fetchSponsored();
    fetchTiers();
  }, [fetchSponsored, fetchTiers]);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/locations/countries`);
      const allCities = [];
      for (const countryObj of (res.data.countries || []).slice(0, 5)) {
        try {
          const citiesRes = await axios.get(`${API}/locations/cities/${countryObj.code}`);
          allCities.push(...(citiesRes.data.cities || []));
        } catch {}
      }
      setCities([...new Set(allCities)]);
    } catch (err) { console.error(err); }
  }, [API]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const toggleFavorite = async (e, shopId) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }
    try {
      if (favoriteIds.has(shopId)) {
        await axios.delete(`${API}/favorites/${shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        const next = new Set(favoriteIds); next.delete(shopId); setFavoriteIds(next);
        toast.success(language === 'ar' ? 'تم الإزالة من المفضلة' : 'Removed from favorites');
      } else {
        await axios.post(`${API}/favorites`, { shop_id: shopId }, { headers: { Authorization: `Bearer ${token}` } });
        const next = new Set(favoriteIds); next.add(shopId); setFavoriteIds(next);
        toast.success(language === 'ar' ? '❤️ تم الإضافة للمفضلة' : '❤️ Added to favorites');
      }
    } catch (err) { toast.error('Error'); }
  };

  const BarberCard = ({ barber, index, showSponsoredTag = false }) => {
    const rating = barber.rating || 0;
    const isTopRanked = rating >= 4.5;
    const isFav = favoriteIds.has(barber.id);
    const tierBadge = barber.tier_badge;

    // Color map for tier badges
    const tierStyle = {
      global_elite:    { bg: 'from-purple-600 to-pink-600',   ring: 'ring-purple-400/60' },
      country_top:     { bg: 'from-amber-500 to-orange-600',  ring: 'ring-amber-400/60' },
      governorate_top: { bg: 'from-emerald-500 to-teal-600',  ring: 'ring-emerald-400/60' },
      city_top:        { bg: 'from-sky-500 to-indigo-600',    ring: 'ring-sky-400/60' },
    };
    const ts = tierBadge ? tierStyle[tierBadge.tier] : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.5) }}
        className={`bh-glass bh-card-hover cursor-pointer overflow-hidden ${ts ? `ring-1 ${ts.ring}` : ''}`}
        onClick={() => navigate(`/barber/${barber.id}`)}
      >
        <div className="relative h-56 overflow-hidden">
          <img
            src={barber.before_after_images?.[0]?.after || barber.shop_logo || '/images/ai/hero_home.png'}
            alt={barber.shop_name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Sponsored badge (highest priority) */}
          {showSponsoredTag && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg flex items-center gap-1">
              <Fire className="w-3 h-3" />
              {language === 'ar' ? 'مُموَّل' : 'Sponsored'}
            </div>
          )}

          {/* Tier badge */}
          {!showSponsoredTag && tierBadge && ts && (
            <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r ${ts.bg} text-white shadow-lg flex items-center gap-1.5 backdrop-blur-sm`}>
              <span>{tierBadge.icon}</span>
              <span>{language === 'ar' ? tierBadge.label_ar : tierBadge.label_en}</span>
            </div>
          )}

          {/* Fallback top-rated */}
          {!showSponsoredTag && !tierBadge && isTopRanked && (
            <div className="absolute top-3 left-3 bh-vip-badge">
              <Crown className="w-3.5 h-3.5" />
              <span>{t.topRated}</span>
            </div>
          )}

          <button
            onClick={(e) => toggleFavorite(e, barber.id)}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              isFav ? 'bg-red-500/80' : 'bg-black/40 hover:bg-black/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-white' : 'text-white'}`} fill={isFav ? 'currentColor' : 'none'} />
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-display font-bold text-white mb-1">{barber.shop_name}</h3>
            <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
              <Location className="w-3.5 h-3.5" />
              <span className="truncate">{barber.city}{barber.district ? ` • ${barber.district}` : ''}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30">
              <Star className="w-4 h-4 text-[var(--bh-gold)]" fill="var(--bh-gold)" />
              <span className="font-bold text-sm text-white">{rating.toFixed(1)}</span>
              <span className="text-[10px] text-white/60">({barber.total_reviews || 0})</span>
            </div>
            {barber.min_price !== undefined && barber.min_price > 0 && (
              <div className="text-sm font-bold text-[var(--bh-gold-light)]">
                {formatPrice(barber.min_price)}
              </div>
            )}
          </div>

          {barber.services && barber.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {barber.services.slice(0, 2).map((svc, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-glass-border)] text-[var(--bh-text-secondary)]">
                  {language === 'ar' ? (svc.name_ar || svc.name) : svc.name}
                </span>
              ))}
              {barber.services.length > 2 && (
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--bh-glass-bg)] text-[var(--bh-text-muted)]">
                  +{barber.services.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/barber/${barber.id}`); }}
              className="bh-btn bh-btn-primary flex-1"
            >
              <BookCalendar className="w-4 h-4" />
              {t.book}
            </button>
            {barber.whatsapp && (
              <a href={`https://wa.me/${(barber.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-10 h-10 rounded-full bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-colors">
                <WhatsApp className="w-5 h-5 text-green-400" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Section renderer for tier lists
  const TierSection = ({ tierKey, title, subtitle, icon, shops, accent }) => {
    if (!shops || shops.length === 0) return null;
    return (
      <section className="py-12" data-testid={`tier-${tierKey}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{icon}</span>
                <h2 className={`text-2xl md:text-3xl font-display font-bold ${accent}`}>{title}</h2>
              </div>
              {subtitle && (
                <p className="text-sm text-[var(--bh-text-muted)] ps-10">{subtitle}</p>
              )}
            </div>
            <Link to="/top-barbers" className="bh-btn bh-btn-outline flex items-center gap-2 text-sm">
              {t.viewAll}
              {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.slice(0, 6).map((b, i) => <BarberCard key={b.id} barber={b} index={i} />)}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="bh-surface" data-testid="home-page">
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 left-0 opacity-20" />
      <div className="bh-orb bh-orb-burgundy w-80 h-80 bottom-0 right-0 opacity-15" />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-[var(--bh-obsidian)]/80 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2.5" data-testid="logo">
              <Shears className="w-7 h-7 text-[var(--bh-gold)]" strokeWidth={1.8} />
              <span className="text-xl font-display font-bold bh-gold-text">BARBER HUB</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/top-barbers" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors flex items-center gap-1.5">
                <Crown className="w-4 h-4" /> {t.topBarbers}
              </Link>
              <Link to="/map" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors flex items-center gap-1.5">
                <Location className="w-4 h-4" /> {t.map}
              </Link>
              <Link to="/ai-advisor" className="text-sm font-body font-bold text-[var(--bh-gold)] flex items-center gap-1.5">
                <AIBrain className="w-4 h-4" /> {t.aiAdvisor}
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/favorites" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors flex items-center gap-1.5">
                    <Heart className="w-4 h-4" /> {t.favorites}
                  </Link>
                  <Link to="/my-bookings" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors flex items-center gap-1.5">
                    <BookCalendar className="w-4 h-4" /> {t.myBookings}
                  </Link>
                  <Link to="/my-orders" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors flex items-center gap-1.5" data-testid="my-orders-nav">
                    🛍️ {language === 'ar' ? 'طلباتي' : 'Orders'}
                  </Link>
                </>
              )}
              {isBarber && <Link to="/dashboard" className="text-sm font-body text-[var(--bh-text-secondary)] hover:text-[var(--bh-gold)] transition-colors">{t.dashboard}</Link>}
              {isAdmin && <Link to="/admin" className="text-sm font-body font-bold text-[var(--bh-gold)]">{t.adminPanel}</Link>}
            </div>

            <div className="flex items-center gap-3">
              <LanguageToggle compact />
              {isAuthenticated ? (
                <>
                  <span className="hidden md:block text-sm text-[var(--bh-text-secondary)]">
                    {t.welcome}, <strong className="text-[var(--bh-gold-light)]">{user?.full_name || user?.shop_name || t.guest}</strong>
                  </span>
                  <button onClick={logout} className="bh-btn bh-btn-ghost bh-btn-sm">
                    <Logout className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/auth')} className="bh-btn bh-btn-primary bh-btn-sm" data-testid="login-btn">
                  <User className="w-4 h-4" /> {t.login}
                </button>
              )}
              <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <Close className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-[var(--bh-glass-border)] space-y-3">
              <Link to="/top-barbers" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>👑 {t.topBarbers}</Link>
              <Link to="/map" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>🗺️ {t.map}</Link>
              <Link to="/ai-advisor" className="block text-[var(--bh-gold)] font-bold" onClick={() => setIsMenuOpen(false)}>🧠 {t.aiAdvisor}</Link>
              {isAuthenticated && (
                <>
                  <Link to="/favorites" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>❤️ {t.favorites}</Link>
                  <Link to="/my-bookings" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>📅 {t.myBookings}</Link>
                  <Link to="/my-orders" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>🛍️ {language === 'ar' ? 'طلباتي' : 'My Orders'}</Link>
                  {isBarber && (
                    <>
                      <Link to="/dashboard" className="block text-[var(--bh-text-secondary)]" onClick={() => setIsMenuOpen(false)}>🏪 {t.dashboard}</Link>
                      <Link to="/payment" className="block text-[var(--bh-gold)] font-bold" onClick={() => setIsMenuOpen(false)}>💳 {language === 'ar' ? 'الاشتراك والدفع' : 'Subscription'}</Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link to="/admin" className="block text-[var(--bh-gold)] font-bold" onClick={() => setIsMenuOpen(false)}>🛡️ {t.adminPanel}</Link>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="bh-divider mb-6">
              <span className="bh-divider-text">{country}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold bh-gold-text mb-6 bh-anim-fade-up">
              {dynamicHeader}
            </h1>
            
            <p className="text-lg md:text-xl text-[var(--bh-text-secondary)] mb-8 font-body bh-anim-fade-up bh-delay-1">
              {t.heroSubtitle}
            </p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bh-glass-hi p-6 rounded-3xl bh-corner-accents max-w-3xl mx-auto"
            >
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--bh-gold)]`} />
                  <Input
                    type="text" placeholder={t.search} value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`bh-input h-12 ${language === 'ar' ? 'pr-12' : 'pl-12'}`}
                    data-testid="search-input"
                  />
                </div>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="bh-input h-12 md:w-48">
                    <SelectValue placeholder={t.allCities} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allCities}</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Currency Indicator */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mt-6 text-sm text-[var(--bh-text-muted)] flex items-center justify-center gap-2"
            >
              <span>💰</span>
              <span>{language === 'ar' ? 'العملة' : 'Currency'}: <strong className="text-[var(--bh-gold)]">{currency}</strong></span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== Sponsored in Your City ====== */}
      {sponsoredShops.length > 0 && (
        <section className="py-12" data-testid="sponsored-section">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Fire className="w-7 h-7 text-orange-400" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                    {t.sponsoredTitle}
                  </h2>
                </div>
                {normalizedCity && (
                  <p className="text-sm text-[var(--bh-text-muted)] ps-10">
                    {t.inCity} <strong className="text-[var(--bh-gold)]">{normalizedCity}</strong>
                    {normalizedCountry ? ` · ${normalizedCountry}` : ''}
                  </p>
                )}
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold">
                {t.sponsoredSubtitle}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sponsoredShops.slice(0, 6).map((b, i) => <BarberCard key={b.id} barber={b} index={i} showSponsoredTag={true} />)}
            </div>
          </div>
        </section>
      )}

      {/* ====== TIERED RANKING (City → Governorate → Country → Global) ====== */}

      {/* City Top — الأفضل في مدينتك */}
      <TierSection
        tierKey="city_top"
        title={t.tierCity}
        subtitle={normalizedCity ? `${t.inCity} ${normalizedCity}` : null}
        icon="🏙️"
        shops={tiers.city_top}
        accent="text-sky-300"
      />

      {/* Governorate Top — الأفضل في المحافظة */}
      <TierSection
        tierKey="governorate_top"
        title={t.tierGovernorate}
        subtitle={normalizedCountry ? `${t.tierInCountry} ${normalizedCountry}` : null}
        icon="🏛️"
        shops={tiers.governorate_top}
        accent="text-emerald-300"
      />

      {/* Country Top — الأفضل في الدولة */}
      <TierSection
        tierKey="country_top"
        title={t.tierCountry}
        subtitle={normalizedCountry ? `${t.tierInCountry} ${normalizedCountry}` : null}
        icon="🏳️"
        shops={tiers.country_top}
        accent="text-amber-300"
      />
      {/* Global Elite — النخبة العالمية */}
      <TierSection
        tierKey="global_elite"
        title={t.tierGlobal}
        subtitle={language === 'ar' ? 'النخبة من جميع أنحاء العالم' : 'The elite from around the world'}
        icon="🌍"
        shops={tiers.global_elite}
        accent="text-purple-300"
      />

      {/* Fallback Top Barbers (shown when no tiered results) */}
      {topBarbers.length > 0 &&
        tiers.city_top.length === 0 &&
        tiers.governorate_top.length === 0 &&
        tiers.country_top.length === 0 &&
        tiers.global_elite.length === 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white flex items-center gap-3">
                <Crown className="w-8 h-8 text-[var(--bh-gold)]" />
                {t.topBarbers}
              </h2>
              <Link to="/top-barbers" className="bh-btn bh-btn-outline flex items-center gap-2">
                {t.viewAll}
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topBarbers.map((b, i) => <BarberCard key={b.id} barber={b} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* All Barbers */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-10 flex items-center gap-3">
            <Location className="w-8 h-8 text-[var(--bh-gold)]" />
            {t.nearYou}
            <span className="text-base font-normal text-[var(--bh-text-muted)] ms-2">({barbers.length})</span>
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bh-glass h-96 animate-pulse" />
              ))}
            </div>
          ) : barbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {barbers.map((b, i) => <BarberCard key={b.id} barber={b} index={i} />)}
            </div>
          ) : (
            <div className="bh-glass-vip p-12 rounded-3xl text-center">
              <Search className="w-16 h-16 text-[var(--bh-gold)] mx-auto mb-4" />
              <p className="text-xl text-[var(--bh-text-secondary)]">{t.noResults}</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--bh-glass-border)] mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Shears className="w-6 h-6 text-[var(--bh-gold)]" />
              <span className="font-display font-bold bh-gold-text text-lg">BARBER HUB</span>
            </div>
            <div className="text-sm text-[var(--bh-text-muted)] text-center">
              © {new Date().getFullYear()} BARBER HUB. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
            </div>
            <LanguageToggle />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
