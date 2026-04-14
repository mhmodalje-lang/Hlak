import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { 
  Search, MapPin, Star, Clock, Crown, LayoutDashboard,
  Calendar, MessageCircle, QrCode, User, LogOut, Menu, X
} from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();
  const { API, gender, user, logout, language, themeClass, isAuthenticated, isBarber, isAdmin } = useApp();
  const [barbers, setBarbers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      search: 'ابحث بالدولة، المدينة، أو الحي...',
      searchTitle: 'ابحث عن أفضل حلاق في منطقتك',
      searchTitleWomen: 'ابحث عن أجمل صالون تجميل في منطقتك',
      topRanking: 'الأعلى تقييماً',
      reviews: 'تعليق',
      viewProfile: 'عرض الملف والحجز',
      login: 'تسجيل الدخول',
      logout: 'خروج',
      changeSection: 'تغيير القسم',
      noResults: 'لا توجد نتائج',
      admin: 'لوحة المدير'
    },
    en: {
      search: 'Search by country, city, or neighborhood...',
      searchTitle: 'Find the best barber in your area',
      searchTitleWomen: 'Find the most beautiful salon in your area',
      topRanking: 'Top Ranking',
      reviews: 'reviews',
      viewProfile: 'View Profile & Book',
      login: 'Login',
      logout: 'Logout',
      changeSection: 'Change Section',
      noResults: 'No results found',
      admin: 'Admin Panel'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    fetchBarbers();
  }, [gender]);

  const fetchBarbers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers`, {
        params: { gender, limit: 20 }
      });
      setBarbers(res.data);
    } catch (err) {
      console.error('Failed to fetch barbers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBarbers = barbers.filter(b => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      b.salon_name?.toLowerCase().includes(query) ||
      b.salon_name_ar?.includes(searchQuery) ||
      b.city?.toLowerCase().includes(query) ||
      b.country?.toLowerCase().includes(query) ||
      b.neighborhood?.toLowerCase().includes(query)
    );
  });

  const BarberCard = ({ barber, rank }) => (
    <div 
      className={`${isMen ? 'bg-gray-800/40 border-gray-700/50 hover:border-yellow-500' : 'bg-white border-gray-200 hover:border-rose-400'} rounded-3xl p-6 border transition-all cursor-pointer group`}
      data-testid={`barber-card-${barber.id}`}
      onClick={() => navigate(`/barber/${barber.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4">
          {/* Logo/Image */}
          <div className={`w-16 h-16 ${isMen ? 'bg-gray-700' : 'bg-gray-100'} rounded-2xl flex items-center justify-center text-2xl overflow-hidden`}>
            {barber.logo_url ? (
              <img src={barber.logo_url} alt={barber.salon_name} className="w-full h-full object-cover" />
            ) : (
              <span>📸</span>
            )}
          </div>
          <div>
            <h3 className={`font-bold text-xl ${isMen ? 'group-hover:text-yellow-500' : 'group-hover:text-rose-400'} transition-colors`}>
              {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
            </h3>
            <p className={`text-xs ${isMen ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1`}>
              <MapPin size={12}/>
              {barber.city}, {barber.country}
            </p>
          </div>
        </div>
        {/* Rank Badge */}
        {rank <= 3 && (
          <div className={`${isMen ? 'bg-yellow-500/10 text-yellow-500' : 'bg-rose-400/10 text-rose-400'} px-3 py-1 rounded-full text-xs font-black`}>
            TOP #{rank}
          </div>
        )}
        {barber.rank_level === 'top' && rank > 3 && (
          <div className={`${isMen ? 'bg-yellow-500/10 text-yellow-500' : 'bg-rose-400/10 text-rose-400'} px-3 py-1 rounded-full text-xs font-black flex items-center gap-1`}>
            <Crown size={12} /> TOP
          </div>
        )}
      </div>
      
      {/* Gallery - 3 Images */}
      <div className="grid grid-cols-3 gap-2 my-4">
        {barber.before_after_images?.slice(0, 3).map((img, i) => (
          <div key={i} className={`aspect-square ${isMen ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} rounded-lg overflow-hidden border`}>
            <img src={img.after} alt={`Work ${i+1}`} className="w-full h-full object-cover" />
          </div>
        ))}
        {(!barber.before_after_images || barber.before_after_images.length < 3) && 
          [...Array(3 - (barber.before_after_images?.length || 0))].map((_, i) => (
            <div key={`empty-${i}`} className={`aspect-square ${isMen ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} rounded-lg border`}></div>
          ))
        }
      </div>

      <div className={`flex justify-between items-center pt-4 border-t ${isMen ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className={`flex items-center gap-1 ${isMen ? 'text-yellow-400' : 'text-rose-400'} font-bold`}>
          <Star size={14} className="fill-current"/>
          {barber.rating?.toFixed(1) || '0.0'}
          <span className={`text-[10px] ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
            ({barber.total_reviews || 0} {t.reviews})
          </span>
        </div>
        <button className="text-sm font-bold underline">
          {t.viewProfile}
        </button>
      </div>
    </div>
  );

  // Demo data for empty state
  const demoBarbers = [
    { id: 'demo-1', salon_name: 'Elite Barber Shop', salon_name_ar: 'صالون الأناقة الملكية', city: 'الحسكة', country: 'سوريا', rating: 4.9, total_reviews: 120, rank_level: 'top' },
    { id: 'demo-2', salon_name: 'Royal Cuts', salon_name_ar: 'قصات ملكية', city: 'دمشق', country: 'سوريا', rating: 4.8, total_reviews: 95, rank_level: 'featured' },
    { id: 'demo-3', salon_name: 'Golden Scissors', salon_name_ar: 'المقص الذهبي', city: 'بغداد', country: 'العراق', rating: 4.7, total_reviews: 78, rank_level: 'featured' },
    { id: 'demo-4', salon_name: 'Style Masters', salon_name_ar: 'أساتذة الستايل', city: 'عمان', country: 'الأردن', rating: 4.6, total_reviews: 65, rank_level: 'normal' },
  ];

  const displayBarbers = filteredBarbers.length > 0 ? filteredBarbers : (isLoading ? [] : demoBarbers);

  return (
    <div className={`min-h-screen ${isMen ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`} dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="home-page">
      {/* Navigation */}
      <nav className={`p-4 flex justify-between items-center border-b ${isMen ? 'border-gray-700/20' : 'border-gray-200'} sticky top-0 bg-opacity-90 backdrop-blur-md z-50 ${isMen ? 'bg-gray-900/90' : 'bg-white/90'}`}>
        <Link to="/" className="text-xl font-black tracking-tighter" data-testid="logo">
          BARBER <span className={isMen ? 'text-yellow-500' : 'text-rose-400'}>HUB</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className={`${isMen ? 'text-yellow-500' : 'text-rose-400'} hover:opacity-80`}
              data-testid="admin-btn"
            >
              <LayoutDashboard size={18}/>
            </button>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className={`hidden md:block text-sm ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                {user?.name}
              </span>
              <button onClick={logout} className="text-xs opacity-50 hover:opacity-100" data-testid="logout-btn">
                <LogOut size={18}/>
              </button>
            </div>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className={`${isMen ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-rose-400 text-white hover:bg-rose-500'}`}
              size="sm"
              data-testid="login-btn"
            >
              <User size={16} className="me-2"/>
              {t.login}
            </Button>
          )}
          
          <button 
            onClick={() => navigate('/')} 
            className={`text-xs ${isMen ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >
            {t.changeSection}
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-6">
        {/* Smart Search */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {isMen ? t.searchTitle : t.searchTitleWomen}
          </h2>
          <div className={`flex ${isMen ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'} rounded-2xl p-2 max-w-xl mx-auto border shadow-2xl`}>
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent flex-grow p-3 outline-none text-sm ${isMen ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'}`}
              data-testid="search-input"
            />
            <button className={`px-6 py-2 rounded-xl font-bold ${isMen ? 'bg-yellow-500 text-black' : 'bg-rose-400 text-white'}`}>
              <Search size={18}/>
            </button>
          </div>
        </div>

        {/* Barber Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`${isMen ? 'bg-gray-800/40' : 'bg-gray-100'} rounded-3xl p-6 animate-pulse h-64`}></div>
            ))}
          </div>
        ) : displayBarbers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayBarbers.map((barber, index) => (
              <BarberCard key={barber.id} barber={barber} rank={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{isMen ? '💈' : '💅'}</div>
            <p className={`text-xl ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>
              {t.noResults}
            </p>
          </div>
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div className="fixed bottom-4 left-4 flex gap-2 z-[100] scale-75 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => navigate('/')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'شاشة الدخول' : 'Landing'}
        </button>
        <button onClick={() => navigate('/top-barbers')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'الأفضل' : 'Top'}
        </button>
        <button onClick={() => navigate('/payment')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'صفحة الدفع' : 'Payment'}
        </button>
        {isAdmin && (
          <button onClick={() => navigate('/admin')} className={`${isMen ? 'bg-yellow-500' : 'bg-rose-400'} text-black p-2 rounded-lg text-[10px] font-bold`}>
            {language === 'ar' ? 'لوحة المدير' : 'Admin'}
          </button>
        )}
      </div>

      {/* Footer */}
      <footer className={`py-8 border-t ${isMen ? 'border-gray-800' : 'border-gray-200'} mt-12`}>
        <div className="container mx-auto px-4 text-center">
          <p className={isMen ? 'text-gray-500' : 'text-gray-400'}>
            © 2026 BARBER HUB. {language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
