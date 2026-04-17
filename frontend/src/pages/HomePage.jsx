import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, MapPin, Star, Scissors, Sparkles,
  Crown, ArrowLeft, ArrowRight, User, LogOut, Menu, X,
  Trophy, Calendar, Map, Check, Instagram, MessageCircle,
  Heart, SlidersHorizontal, Brain, ChevronDown
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { API, gender, user, logout, language, themeClass, isAuthenticated, isBarber, isAdmin, token } = useApp();
  const [barbers, setBarbers] = useState([]);
  const [topBarbers, setTopBarbers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('rating');
  const [userLocation, setUserLocation] = useState(null);
  const [maxDistance, setMaxDistance] = useState(500);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const isMen = gender === 'male';

  const t = language === 'ar' ? {
    welcome: 'مرحباً', guest: 'زائر', search: 'ابحث عن صالون أو مدينة...',
    allCities: 'كل المدن', allCountries: 'كل الدول',
    topBarbers: 'أفضل الحلاقين', topSalons: 'أفضل الصالونات',
    nearYou: 'جميع الصالونات', viewAll: 'عرض الكل', book: 'احجز الآن',
    reviews: 'تقييم', login: 'تسجيل الدخول', logout: 'خروج',
    myBookings: 'حجوزاتي', dashboard: 'لوحة التحكم', map: 'الخريطة',
    noResults: 'لا توجد نتائج', featured: 'مميز', top: 'الأفضل',
    adminPanel: 'لوحة المدير', favorites: 'المفضلة', aiAdvisor: 'المستشار الذكي',
    advancedFilters: 'فلاتر متقدمة', priceRange: 'نطاق السعر', minRating: 'أقل تقييم',
    sortBy: 'ترتيب حسب', sortRating: 'الأعلى تقييماً', sortDistance: 'الأقرب',
    sortPriceAsc: 'الأرخص', sortPriceDesc: 'الأغلى',
    maxDistance: 'أقصى مسافة', clearFilters: 'مسح الفلاتر',
    heroTitle: 'احجز موعدك مع أفضل الحلاقين',
    heroTitleWomen: 'اكتشفي أناقتك في أرقى الصالونات',
    heroSubtitle: 'منصة عالمية تجمعك بأفضل الصالونات في بلدك',
    aiBanner: 'استشير الذكاء الاصطناعي لاختيار أنسب قصة لك',
    aiBannerCta: 'جرّب المستشار الذكي',
    apply: 'تطبيق', km: 'كم'
  } : {
    welcome: 'Welcome', guest: 'Guest', search: 'Search salons or cities...',
    allCities: 'All Cities', allCountries: 'All Countries',
    topBarbers: 'Top Barbers', topSalons: 'Top Salons',
    nearYou: 'All Salons', viewAll: 'View All', book: 'Book Now',
    reviews: 'reviews', login: 'Login', logout: 'Logout',
    myBookings: 'My Bookings', dashboard: 'Dashboard', map: 'Map',
    noResults: 'No results found', featured: 'Featured', top: 'Top',
    adminPanel: 'Admin Panel', favorites: 'Favorites', aiAdvisor: 'AI Advisor',
    advancedFilters: 'Advanced Filters', priceRange: 'Price Range', minRating: 'Min Rating',
    sortBy: 'Sort By', sortRating: 'Top Rated', sortDistance: 'Closest',
    sortPriceAsc: 'Price: Low to High', sortPriceDesc: 'Price: High to Low',
    maxDistance: 'Max Distance', clearFilters: 'Clear Filters',
    heroTitle: 'Book with the world\u2019s best barbers',
    heroTitleWomen: 'Discover your elegance at top salons',
    heroSubtitle: 'A global platform connecting you to the finest salons worldwide',
    aiBanner: 'Ask our AI for the perfect haircut for you',
    aiBannerCta: 'Try AI Advisor',
    apply: 'Apply', km: 'km'
  };

  // Get user location silently (no prompt force)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated || !token) return;
    try {
      const res = await axios.get(`${API}/favorites/my`, { headers: { Authorization: `Bearer ${token}` } });
      setFavoriteIds(new Set((res.data || []).map(s => s.id)));
    } catch (e) { /* ignore */ }
  }, [API, token, isAuthenticated]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const fetchBarbersAdvanced = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        shop_type: gender,
        sort: sortBy,
        limit: 50,
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedCity && selectedCity !== 'all') params.city = selectedCity;
      if (selectedCountry && selectedCountry !== 'all') params.country = selectedCountry;
      if (minRating > 0) params.rating_min = minRating;
      if (priceRange[0] > 0) params.price_min = priceRange[0];
      if (priceRange[1] < 200) params.price_max = priceRange[1];
      if (userLocation && sortBy === 'distance') {
        params.user_lat = userLocation.lat;
        params.user_lng = userLocation.lng;
        params.max_distance_km = maxDistance;
      }
      const res = await axios.get(`${API}/search/barbers`, { params });
      const data = res.data || [];
      setBarbers(data);
      setTopBarbers(data.filter(b => b.ranking_tier === 'top' || b.ranking_tier === 'featured' || (b.rating || 0) >= 4.5).slice(0, 5));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API, gender, sortBy, searchQuery, selectedCity, selectedCountry, minRating, priceRange, userLocation, maxDistance]);

  useEffect(() => { fetchBarbersAdvanced(); }, [fetchBarbersAdvanced]);

  const fetchLocations = async () => {
    try {
      const res = await axios.get(`${API}/locations/countries`);
      setCountries(res.data.countries || []);
      const allCities = [];
      for (const country of (res.data.countries || []).slice(0, 5)) {
        try {
          const citiesRes = await axios.get(`${API}/locations/cities/${country.code}`);
          allCities.push(...(citiesRes.data.cities || []));
        } catch {}
      }
      setCities([...new Set(allCities)]);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchLocations(); }, []);

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

  const clearFilters = () => {
    setSearchQuery(''); setSelectedCity('all'); setSelectedCountry('all');
    setPriceRange([0, 200]); setMinRating(0); setSortBy('rating'); setMaxDistance(500);
  };

  const BarberCard = ({ barber, index }) => {
    const rating = barber.rating || 0;
    const isTopRanked = rating >= 4.5;
    const isFeatured = barber.ranking_tier === 'featured' || (rating >= 4.0 && rating < 4.5);
    const isFav = favoriteIds.has(barber.id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.5) }}
        className={`${isMen ? 'glass-card-men' : 'glass-card-women'} overflow-hidden group cursor-pointer`}
        onClick={() => navigate(`/barber/${barber.id}`)}
        data-testid={`barber-card-${barber.id}`}
      >
        <div className="relative h-48 overflow-hidden">
          <img
            src={barber.before_after_images?.[0]?.after || barber.shop_logo || (isMen
              ? 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80'
              : 'https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?w=600&q=80'
            )}
            alt={barber.shop_name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {isTopRanked && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ${
              isMen ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black' : 'bg-gradient-to-r from-[#B76E79] to-[#D8A7B1] text-white'
            }`}>
              <Crown className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'الأفضل' : 'Top'}</span>
            </div>
          )}
          {!isTopRanked && isFeatured && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
              isMen ? 'bg-black/60 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-white/80 text-[#B76E79] border border-[#B76E79]/50'
            }`}>
              <Star className="w-3 h-3 fill-current" />
              <span>{language === 'ar' ? 'مميز' : 'Featured'}</span>
            </div>
          )}

          <button
            onClick={(e) => toggleFavorite(e, barber.id)}
            className={`absolute top-3 right-3 heart-btn ${isFav ? 'favorited' : ''}`}
            title={t.favorites}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-red-500' : (isMen ? 'text-white' : 'text-[#1C1917]')}`} fill={isFav ? 'currentColor' : 'none'} />
          </button>

          {barber.distance_km != null && (
            <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-bold backdrop-blur-md ${
              isMen ? 'bg-black/60 text-[#F3E5AB]' : 'bg-white/80 text-[#9E5B66]'
            }`}>
              📍 {barber.distance_km} {t.km}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {barber.shop_name}
              </h3>
              <p className={`text-sm flex items-center gap-1 mt-0.5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{barber.city}{barber.district ? ` • ${barber.district}` : ''}</span>
              </p>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}>
              <Star className={`w-4 h-4 luxury-star ${isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]'}`} />
              <span className={`font-bold text-sm ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{rating.toFixed(1)}</span>
              <span className={`text-[10px] ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>({barber.total_reviews || 0})</span>
            </div>
          </div>

          {barber.services && barber.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {barber.services.slice(0, 3).map((svc, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                  isMen ? 'bg-[#1F1F1F] text-[#F3E5AB] border border-[#D4AF37]/20' : 'bg-[#FDF2F4] text-[#9E5B66] border border-[#B76E79]/20'
                }`}>
                  {language === 'ar' ? (svc.name_ar || svc.name) : svc.name}
                </span>
              ))}
              {barber.services.length > 3 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isMen ? 'bg-[#1F1F1F] text-[#94A3B8]' : 'bg-[#FAFAFA] text-[#57534E]'}`}>
                  +{barber.services.length - 3}
                </span>
              )}
            </div>
          )}

          {barber.min_price !== undefined && barber.max_price !== undefined && barber.min_price > 0 && (
            <div className={`text-xs mb-3 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              💰 {barber.min_price}{barber.max_price > barber.min_price ? ` - ${barber.max_price}` : ''} USD
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => { e.stopPropagation(); navigate(`/barber/${barber.id}`); }}
              className={`flex-1 ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'}`}
              data-testid={`book-btn-${barber.id}`}
            >
              <Calendar className="w-4 h-4 me-2" />
              {t.book}
            </Button>
            {barber.whatsapp && (
              <a href={`https://wa.me/${(barber.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`heart-btn ${isMen ? 'text-green-400' : 'text-green-600'}`}>
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'}`} data-testid="home-page">
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${isMen ? 'glass-nav-men' : 'glass-nav-women'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0" data-testid="logo">
              {isMen ? <Scissors className="w-6 h-6 text-[#D4AF37]" /> : <Sparkles className="w-6 h-6 text-[#B76E79]" />}
              <span className={`text-xl font-bold font-display ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>BARBER HUB</span>
            </Link>

            <div className="hidden md:flex items-center gap-5">
              <Link to="/top-barbers" className={`nav-link flex items-center gap-1 text-sm ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}>
                <Trophy className="w-4 h-4" /> {isMen ? t.topBarbers : t.topSalons}
              </Link>
              <Link to="/map" className={`nav-link flex items-center gap-1 text-sm ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}>
                <Map className="w-4 h-4" /> {t.map}
              </Link>
              <Link to="/ai-advisor" className={`nav-link flex items-center gap-1 text-sm font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                <Brain className="w-4 h-4" /> {t.aiAdvisor}
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/favorites" className={`nav-link flex items-center gap-1 text-sm ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}>
                    <Heart className="w-4 h-4" /> {t.favorites}
                  </Link>
                  <Link to="/my-bookings" className={`nav-link flex items-center gap-1 text-sm ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}>
                    <Calendar className="w-4 h-4" /> {t.myBookings}
                  </Link>
                </>
              )}
              {isBarber && <Link to="/dashboard" className={`nav-link text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.dashboard}</Link>}
              {isAdmin && <Link to="/admin" className={`nav-link text-sm font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{t.adminPanel}</Link>}
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <span className={`hidden md:block text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    {t.welcome}, <strong>{user?.full_name || user?.shop_name || t.guest}</strong>
                  </span>
                  <Button variant="ghost" size="sm" onClick={logout} className={isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'} data-testid="login-btn">
                  <User className="w-4 h-4 me-2" /> {t.login}
                </Button>
              )}
              <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className={`w-6 h-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`} /> : <Menu className={`w-6 h-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`} />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className={`md:hidden mt-4 py-4 border-t ${isMen ? 'border-[#262626]' : 'border-[#E7E5E4]'}`}>
              <div className="flex flex-col gap-3">
                <Link to="/top-barbers" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'} onClick={() => setIsMenuOpen(false)}>🏆 {isMen ? t.topBarbers : t.topSalons}</Link>
                <Link to="/map" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'} onClick={() => setIsMenuOpen(false)}>🗺️ {t.map}</Link>
                <Link to="/ai-advisor" className={isMen ? 'text-[#D4AF37] font-bold' : 'text-[#B76E79] font-bold'} onClick={() => setIsMenuOpen(false)}>🧠 {t.aiAdvisor}</Link>
                {isAuthenticated && (
                  <>
                    <Link to="/favorites" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'} onClick={() => setIsMenuOpen(false)}>❤️ {t.favorites}</Link>
                    <Link to="/my-bookings" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'} onClick={() => setIsMenuOpen(false)}>📅 {t.myBookings}</Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className={`hero-premium ${isMen ? 'hero-men' : 'hero-women'}`}>
        <div className="container mx-auto px-4 relative z-10 py-16 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
            className={`text-3xl sm:text-5xl lg:text-6xl font-bold font-display mb-4 ${isMen ? 'gradient-text-men' : 'text-white'}`}
            style={!isMen ? { textShadow: '0 4px 20px rgba(0,0,0,0.4)' } : {}}
          >
            {isMen ? t.heroTitle : t.heroTitleWomen}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
            className={`text-lg max-w-xl mx-auto mb-8 ${isMen ? 'text-[#F3E5AB]' : 'text-white'}`}
            style={!isMen ? { textShadow: '0 2px 10px rgba(0,0,0,0.4)' } : {}}
          >
            {t.heroSubtitle}
          </motion.p>

          {/* AI Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
            onClick={() => navigate('/ai-advisor')}
            className={`cursor-pointer max-w-2xl mx-auto mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 ${isMen ? 'glass-card-men glow-gold' : 'glass-card-women glow-rose'}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isMen ? 'bg-[#D4AF37]/20' : 'bg-[#B76E79]/20'}`}>
                <Brain className={`w-6 h-6 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              </div>
              <div className="text-left min-w-0" style={language === 'ar' ? { textAlign: 'right' } : {}}>
                <div className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>✨ {t.aiAdvisor}</div>
                <div className={`text-sm truncate ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.aiBanner}</div>
              </div>
            </div>
            <ArrowRight className={`w-5 h-5 flex-shrink-0 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} ${language === 'ar' ? 'rotate-180' : ''}`} />
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className={`max-w-3xl mx-auto p-4 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}
          >
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                <Input
                  type="text" placeholder={t.search} value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${language === 'ar' ? 'pr-10' : 'pl-10'} h-11 ${isMen ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-[#E7E5E4] text-[#1C1917]'}`}
                  data-testid="search-input"
                />
              </div>
              <Button onClick={() => setShowFilters(!showFilters)} className={`h-11 ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'} flex items-center gap-2`}>
                <SlidersHorizontal className="w-4 h-4" /> {t.advancedFilters}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-white/10 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{t.sortBy}</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className={isMen ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-[#E7E5E4]'}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating">⭐ {t.sortRating}</SelectItem>
                        <SelectItem value="distance" disabled={!userLocation}>📍 {t.sortDistance}</SelectItem>
                        <SelectItem value="price_asc">💰 {t.sortPriceAsc}</SelectItem>
                        <SelectItem value="price_desc">💎 {t.sortPriceDesc}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>🌍 {t.allCountries}</label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className={isMen ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-[#E7E5E4]'}><SelectValue placeholder={t.allCountries} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allCountries}</SelectItem>
                        {countries.map(c => <SelectItem key={c.code} value={c.name}>{language === 'ar' ? (c.name_ar || c.name) : c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>🏙️ {t.allCities}</label>
                    <Select value={selectedCity} onValueChange={setSelectedCity}>
                      <SelectTrigger className={isMen ? 'bg-[#141414] border-[#262626] text-white' : 'bg-white border-[#E7E5E4]'}><SelectValue placeholder={t.allCities} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.allCities}</SelectItem>
                        {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`text-xs font-medium mb-2 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
                      💰 {t.priceRange}: ${priceRange[0]} - ${priceRange[1]}
                    </label>
                    <div className="flex gap-2">
                      <input type="range" min="0" max="200" value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className={`range-slider flex-1 ${isMen ? 'range-slider-men text-[#D4AF37]' : 'range-slider-women text-[#B76E79]'}`}
                        style={{ '--value': `${priceRange[0] / 2}%` }} />
                      <input type="range" min="0" max="200" value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className={`range-slider flex-1 ${isMen ? 'range-slider-men text-[#D4AF37]' : 'range-slider-women text-[#B76E79]'}`}
                        style={{ '--value': `${priceRange[1] / 2}%` }} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-2 block ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>⭐ {t.minRating}: {minRating.toFixed(1)}</label>
                    <div className="flex gap-1">
                      {[0, 3, 3.5, 4, 4.5].map(r => (
                        <button key={r} onClick={() => setMinRating(r)}
                          className={`filter-chip flex-1 justify-center text-xs ${isMen ? 'filter-chip-men' : 'filter-chip-women'} ${minRating === r ? 'active' : ''}`}>
                          {r === 0 ? (language === 'ar' ? 'الكل' : 'All') : `${r}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={clearFilters} variant="outline"
                      className={`w-full ${isMen ? 'border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10' : 'border-[#B76E79]/40 text-[#B76E79] hover:bg-[#B76E79]/10'}`}>
                      {t.clearFilters}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Top Barbers */}
      {topBarbers.length > 0 && !searchQuery && selectedCity === 'all' && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold font-display flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <Crown className={`w-7 h-7 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                {isMen ? t.topBarbers : t.topSalons}
              </h2>
              <Link to="/top-barbers" className={`flex items-center gap-1 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                {t.viewAll}
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {topBarbers.map((b, i) => <BarberCard key={b.id} barber={b} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* All Barbers */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className={`text-2xl sm:text-3xl font-bold font-display mb-8 flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <MapPin className={`w-7 h-7 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            {t.nearYou}
            <span className={`text-sm font-normal ms-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>({barbers.length})</span>
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`h-80 skeleton-card ${isMen ? 'bg-[#1F1F1F]/50' : 'bg-[#F5F5F4]'}`} />
              ))}
            </div>
          ) : barbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {barbers.map((b, i) => <BarberCard key={b.id} barber={b} index={i} />)}
            </div>
          ) : (
            <div className={`empty-state rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
              <div className={`empty-state-icon ${isMen ? 'empty-state-icon-men' : 'empty-state-icon-women'}`}>
                <Search className={`w-12 h-12 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              </div>
              <p className={`text-xl ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.noResults}</p>
              <Button onClick={clearFilters} className={`mt-4 ${isMen ? 'btn-luxury-men' : 'btn-luxury-women'}`}>{t.clearFilters}</Button>
            </div>
          )}
        </div>
      </section>

      <footer className={`py-10 border-t mt-8 ${isMen ? 'border-[#262626]' : 'border-[#E7E5E4]'}`}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {isMen ? <Scissors className="w-5 h-5 text-[#D4AF37]" /> : <Sparkles className="w-5 h-5 text-[#B76E79]" />}
            <span className={`font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>BARBER HUB</span>
          </div>
          <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            © 2026 BARBER HUB. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
