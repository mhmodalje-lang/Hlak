import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { 
  Search, MapPin, Star, Clock, Scissors, Sparkles, 
  Crown, ArrowLeft, ArrowRight, User, LogOut, Menu, X,
  Trophy, Calendar, Map
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { API, gender, user, logout, language, themeClass, isAuthenticated, isBarber, isAdmin } = useApp();
  const [barbers, setBarbers] = useState([]);
  const [topBarbers, setTopBarbers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [cities, setCities] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      welcome: 'مرحباً',
      guest: 'زائر',
      search: 'ابحث عن صالون...',
      allCities: 'كل المدن',
      topBarbers: 'أفضل الحلاقين',
      topSalons: 'أفضل الصالونات',
      nearYou: 'بالقرب منك',
      viewAll: 'عرض الكل',
      book: 'احجز الآن',
      reviews: 'تقييم',
      login: 'تسجيل الدخول',
      logout: 'خروج',
      myBookings: 'حجوزاتي',
      dashboard: 'لوحة التحكم',
      map: 'الخريطة',
      noResults: 'لا توجد نتائج',
      featured: 'مميز',
      top: 'الأفضل',
      adminPanel: 'لوحة المدير'
    },
    en: {
      welcome: 'Welcome',
      guest: 'Guest',
      search: 'Search for salon...',
      allCities: 'All Cities',
      topBarbers: 'Top Barbers',
      topSalons: 'Top Salons',
      nearYou: 'Near You',
      viewAll: 'View All',
      book: 'Book Now',
      reviews: 'reviews',
      login: 'Login',
      logout: 'Logout',
      myBookings: 'My Bookings',
      dashboard: 'Dashboard',
      map: 'Map',
      noResults: 'No results found',
      featured: 'Featured',
      top: 'Top',
      adminPanel: 'Admin Panel'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    fetchBarbers();
    fetchCities();
  }, [gender]);

  const fetchBarbers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbershops`, {
        params: { type: gender, limit: 20, sort_by: 'ranking_score' }
      });
      setBarbers(res.data);
      // Top barbers are those with ranking_tier = 'top' or 'featured'
      setTopBarbers(res.data.filter(b => b.ranking_tier === 'top' || b.ranking_tier === 'featured').slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch barbers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API}/locations/countries`);
      const allCities = [];
      for (const country of res.data.countries.slice(0, 5)) {
        const citiesRes = await axios.get(`${API}/locations/cities/${country.code}`);
        allCities.push(...citiesRes.data.cities);
      }
      setCities([...new Set(allCities)]);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const filteredBarbers = barbers.filter(b => {
    const matchesSearch = !searchQuery || 
      b.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = !selectedCity || selectedCity === 'all' || b.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const BarberCard = ({ barber, index }) => (
    <div 
      className={`${isMen ? 'card-men' : 'card-women'} overflow-hidden animate-fade-in`}
      style={{ animationDelay: `${index * 0.1}s` }}
      data-testid={`barber-card-${barber.id}`}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={barber.shop_logo || (isMen 
            ? 'https://images.unsplash.com/photo-1764670687832-6dc25615fdf3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwxfHxiYXJiZXIlMjB0b29scyUyMHZpbnRhZ2V8ZW58MHx8fHwxNzc2MTY4NDUxfDA&ixlib=rb-4.1.0&q=85'
            : 'https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940'
          )}
          alt={barber.shop_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {/* Badge */}
        {barber.ranking_tier === 'top' && (
          <div className="absolute top-3 left-3 badge-top flex items-center gap-1">
            <Crown className="w-3 h-3" />
            <span>{t.top}</span>
          </div>
        )}
        {barber.ranking_tier === 'featured' && (
          <div className="absolute top-3 left-3 badge-featured flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{t.featured}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`text-lg font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {barber.shop_name}
            </h3>
            <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              <MapPin className="w-3 h-3" />
              {barber.city}, {barber.country}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Star className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} fill-current`} />
            <span className={`font-semibold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {barber.ranking_score?.toFixed(1) || '0.0'}
            </span>
            <span className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              ({barber.total_reviews || 0})
            </span>
          </div>
        </div>

        {/* Description */}
        {barber.description && (
          <p className={`text-sm mb-4 line-clamp-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {barber.description}
          </p>
        )}

        {/* Action */}
        <Button
          onClick={() => navigate(`/barber/${barber.id}`)}
          className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
          data-testid={`book-btn-${barber.id}`}
        >
          <Calendar className="w-4 h-4 me-2" />
          {t.book}
        </Button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${themeClass}`} data-testid="home-page">
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${isMen ? 'glass-nav-men' : 'glass-nav-women'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo">
              {isMen ? (
                <Scissors className="w-6 h-6 text-[#D4AF37]" />
              ) : (
                <Sparkles className="w-6 h-6 text-[#B76E79]" />
              )}
              <span className={`text-xl font-bold font-display ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                BARBER HUB
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <Link 
                to="/top-barbers" 
                className={`nav-link ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}
                data-testid="nav-top-barbers"
              >
                <Trophy className="w-4 h-4 inline me-1" />
                {isMen ? t.topBarbers : t.topSalons}
              </Link>
              <Link 
                to="/map" 
                className={`nav-link ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}
                data-testid="nav-map"
              >
                <Map className="w-4 h-4 inline me-1" />
                {t.map}
              </Link>
              {isAuthenticated && (
                <Link 
                  to="/my-bookings" 
                  className={`nav-link ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}
                  data-testid="nav-bookings"
                >
                  <Calendar className="w-4 h-4 inline me-1" />
                  {t.myBookings}
                </Link>
              )}
              {isBarber && (
                <Link 
                  to="/dashboard" 
                  className={`nav-link ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}`}
                  data-testid="nav-dashboard"
                >
                  {t.dashboard}
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin" 
                  className={`nav-link ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'} font-bold`}
                  data-testid="nav-admin"
                >
                  {t.adminPanel}
                </Link>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className={`hidden md:block ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    {t.welcome}, <strong>{user?.full_name || user?.shop_name}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className={isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'}
                    data-testid="logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => navigate('/auth')}
                  className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
                  data-testid="login-btn"
                >
                  <User className="w-4 h-4 me-2" />
                  {t.login}
                </Button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {isMenuOpen ? (
                  <X className={`w-6 h-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`} />
                ) : (
                  <Menu className={`w-6 h-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`} />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className={`md:hidden mt-4 py-4 border-t ${isMen ? 'border-[#262626]' : 'border-[#E7E5E4]'}`}>
              <div className="flex flex-col gap-4">
                <Link to="/top-barbers" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                  {isMen ? t.topBarbers : t.topSalons}
                </Link>
                <Link to="/map" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                  {t.map}
                </Link>
                {isAuthenticated && (
                  <Link to="/my-bookings" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                    {t.myBookings}
                  </Link>
                )}
                {isBarber && (
                  <Link to="/dashboard" className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                    {t.dashboard}
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" className={isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}>
                    {t.adminPanel}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: isMen 
              ? 'url(https://images.unsplash.com/photo-1773904215697-e6c21fc27ac2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHw0fHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85)'
              : 'url(https://images.pexels.com/photos/7195812/pexels-photo-7195812.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center mb-10 animate-fade-in">
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold font-display mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {isMen ? t.topBarbers : t.topSalons}
            </h1>
            <p className={`text-lg ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {language === 'ar' ? 'اكتشف أفضل الصالونات بالقرب منك' : 'Discover the best salons near you'}
            </p>
          </div>

          {/* Search Bar */}
          <div className={`max-w-3xl mx-auto ${isMen ? 'card-men' : 'card-women'} p-4 animate-scale-in`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />
                <Input
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${language === 'ar' ? 'pr-10' : 'pl-10'} ${isMen ? 'bg-[#1F1F1F] border-[#262626] text-white' : 'bg-[#FAFAFA] border-[#E7E5E4] text-[#1C1917]'}`}
                  data-testid="search-input"
                />
              </div>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger 
                  className={`w-full md:w-48 ${isMen ? 'bg-[#1F1F1F] border-[#262626] text-white' : 'bg-[#FAFAFA] border-[#E7E5E4] text-[#1C1917]'}`}
                  data-testid="city-filter"
                >
                  <MapPin className="w-4 h-4 me-2" />
                  <SelectValue placeholder={t.allCities} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCities}</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Top Barbers Section */}
      {topBarbers.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className={`text-2xl sm:text-3xl font-bold font-display ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <Crown className={`w-6 h-6 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
                {isMen ? t.topBarbers : t.topSalons}
              </h2>
              <Link 
                to="/top-barbers" 
                className={`flex items-center gap-1 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}
                data-testid="view-all-top"
              >
                {t.viewAll}
                {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {topBarbers.map((barber, i) => (
                <BarberCard key={barber.id} barber={barber} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Barbers Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className={`text-2xl sm:text-3xl font-bold font-display mb-8 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <MapPin className={`w-6 h-6 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            {t.nearYou}
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${isMen ? 'card-men' : 'card-women'} h-80`}>
                  <div className={`h-48 skeleton ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#F5F5F4]'}`} />
                  <div className="p-5 space-y-3">
                    <div className={`h-4 w-3/4 skeleton rounded ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#F5F5F4]'}`} />
                    <div className={`h-3 w-1/2 skeleton rounded ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#F5F5F4]'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBarbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBarbers.map((barber, i) => (
                <BarberCard key={barber.id} barber={barber} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className={`text-xl ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                {t.noResults}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 border-t ${isMen ? 'border-[#262626]' : 'border-[#E7E5E4]'}`}>
        <div className="container mx-auto px-4 text-center">
          <p className={`${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            © 2026 BARBER HUB. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
