import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Heart, ArrowRight, ArrowLeft, Star, MapPin, Loader2, Scissors, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { API, gender, language, themeClass, token, isAuthenticated } = useApp();
  const isMen = gender === 'male';
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = language === 'ar' ? {
    title: 'المفضلة', back: 'رجوع', empty: 'لا يوجد صالونات في المفضلة',
    emptyDesc: 'أضف صالوناتك المفضلة لسهولة الوصول إليها لاحقاً',
    remove: 'إزالة', book: 'احجز', explore: 'استكشف الصالونات', loginFirst: 'يجب تسجيل الدخول'
  } : {
    title: 'Favorites', back: 'Back', empty: 'No favorites yet',
    emptyDesc: 'Add your favorite salons for quick access later',
    remove: 'Remove', book: 'Book', explore: 'Explore salons', loginFirst: 'Please login first'
  };

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchFavs();
  }, [isAuthenticated]);

  const fetchFavs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/favorites/my`, { headers: { Authorization: `Bearer ${token}` } });
      setFavs(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const removeFav = async (shopId) => {
    try {
      await axios.delete(`${API}/favorites/${shopId}`, { headers: { Authorization: `Bearer ${token}` } });
      setFavs(favs.filter(f => f.id !== shopId));
      toast.success(language === 'ar' ? 'تم الإزالة من المفضلة' : 'Removed');
    } catch (e) { toast.error('Failed'); }
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'} flex items-center justify-center p-6`}>
        <div className={`max-w-md w-full p-8 rounded-3xl text-center ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
          <Heart className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <p className={`mb-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.loginFirst}</p>
          <button onClick={() => navigate('/auth')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'}`} data-testid="favorites-page">
      <div className={`sticky top-0 z-50 ${isMen ? 'glass-nav-men' : 'glass-nav-women'} px-4 py-4`}>
        <div className="container mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full ${isMen ? 'bg-[#1F1F1F] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`} data-testid="back-btn">
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className={`text-xl font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>
            <Heart className="inline w-5 h-5 me-2" fill="currentColor" /> {t.title}
          </h1>
          <span className={`ms-auto text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{favs.length}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className={`w-10 h-10 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} /></div>
        ) : favs.length === 0 ? (
          <div className={`empty-state p-12 rounded-3xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
            <div className={`empty-state-icon ${isMen ? 'empty-state-icon-men' : 'empty-state-icon-women'}`}>
              <Heart className={`w-12 h-12 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.empty}</h3>
            <p className={`mb-6 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.emptyDesc}</p>
            <button onClick={() => navigate('/home')} className={isMen ? 'btn-luxury-men' : 'btn-luxury-women'}>{t.explore}</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favs.map((shop, idx) => (
              <motion.div key={shop.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className={`p-4 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'} cursor-pointer`}
                onClick={() => navigate(`/barber/${shop.id}`)}>
                <div className="relative">
                  <div className={`h-36 rounded-xl overflow-hidden ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}>
                    {shop.before_after_images?.[0]?.after ? (
                      <img src={shop.before_after_images[0].after} className="w-full h-full object-cover" />
                    ) : shop.shop_logo ? (
                      <img src={shop.shop_logo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">{isMen ? '💈' : '✨'}</div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFav(shop.id); }}
                    className="heart-btn favorited absolute top-2 right-2">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
                <h3 className={`font-bold mt-3 truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{shop.shop_name}</h3>
                <div className={`flex items-center gap-3 text-sm mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                  <div className="flex items-center gap-1">
                    <Star className={`w-4 h-4 luxury-star ${isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]'}`} />
                    <span>{shop.rating?.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span><MapPin className="w-3 h-3 inline" /> {shop.city}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
