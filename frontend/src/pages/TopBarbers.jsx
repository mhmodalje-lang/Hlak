import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  Star, MapPin, Crown, ArrowRight, ArrowLeft, Trophy, 
  Scissors, Sparkles, Calendar
} from 'lucide-react';

const TopBarbers = () => {
  const navigate = useNavigate();
  const { API, gender, language, themeClass } = useApp();
  const [topBarbers, setTopBarbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      title: 'أفضل الحلاقين',
      titleWomen: 'أفضل الصالونات',
      subtitle: 'الأكثر تقييماً ونشاطاً',
      rank: 'المرتبة',
      reviews: 'تقييم',
      bookings: 'حجز',
      book: 'احجز الآن',
      noResults: 'لا توجد نتائج',
      top: 'الأفضل',
      featured: 'مميز'
    },
    en: {
      back: 'Back',
      title: 'Top Barbers',
      titleWomen: 'Top Salons',
      subtitle: 'Highest Rated & Most Active',
      rank: 'Rank',
      reviews: 'reviews',
      bookings: 'bookings',
      book: 'Book Now',
      noResults: 'No results found',
      top: 'Top',
      featured: 'Featured'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    fetchTopBarbers();
  }, [gender]);

  const fetchTopBarbers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/top/${gender}`, {
        params: { limit: 20 }
      });
      setTopBarbers(res.data);
    } catch (err) {
      console.error('Failed to fetch top barbers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return { bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: '🥇' };
    if (index === 1) return { bg: 'bg-gradient-to-r from-gray-300 to-gray-500', text: '🥈' };
    if (index === 2) return { bg: 'bg-gradient-to-r from-amber-600 to-amber-800', text: '🥉' };
    return { bg: isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]', text: `#${index + 1}` };
  };

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="top-barbers-page">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            data-testid="back-btn"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold font-display flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <Trophy className={`w-8 h-8 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              {isMen ? t.title : t.titleWomen}
            </h1>
            <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Leaderboard */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`${isMen ? 'card-men' : 'card-women'} h-32 animate-pulse`} />
            ))}
          </div>
        ) : topBarbers.length > 0 ? (
          <div className="space-y-4">
            {topBarbers.map((barber, index) => {
              const rankBadge = getRankBadge(index);
              return (
                <div 
                  key={barber.id}
                  className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`top-barber-${index}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank Badge */}
                    <div className={`w-14 h-14 rounded-xl ${rankBadge.bg} flex items-center justify-center text-2xl font-bold ${index > 2 ? (isMen ? 'text-[#94A3B8]' : 'text-[#57534E]') : 'text-white'}`}>
                      {rankBadge.text}
                    </div>

                    {/* Image */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img 
                        src={barber.before_after_images?.[0]?.after || (isMen 
                          ? 'https://images.unsplash.com/photo-1764670687832-6dc25615fdf3?w=200'
                          : 'https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?w=200'
                        )}
                        alt={barber.salon_name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-lg font-bold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                          {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
                        </h3>
                        {barber.rank_level === 'top' && (
                          <span className="badge-top text-xs flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            {t.top}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                        <MapPin className="w-3 h-3" />
                        {barber.city}, {barber.country}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]'}`} />
                          <span className={`font-semibold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                            {barber.rating?.toFixed(1)}
                          </span>
                          <span className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                            ({barber.total_reviews} {t.reviews})
                          </span>
                        </div>
                        <span className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                          {barber.total_bookings} {t.bookings}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      onClick={() => navigate(`/barber/${barber.id}`)}
                      className={`flex-shrink-0 ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
                      data-testid={`book-top-${index}`}
                    >
                      <Calendar className="w-4 h-4 me-2" />
                      {t.book}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#3A2E1F]' : 'text-[#E7E5E4]'}`} />
            <p className={`text-xl ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {t.noResults}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBarbers;
