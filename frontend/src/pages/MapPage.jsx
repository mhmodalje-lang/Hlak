import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  MapPin, Star, ArrowRight, ArrowLeft, Navigation, 
  Scissors, Sparkles, Calendar, Loader2
} from 'lucide-react';

const MapPage = () => {
  const navigate = useNavigate();
  const { API, gender, language, themeClass } = useApp();
  const [barbers, setBarbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      title: 'الخريطة',
      nearYou: 'بالقرب منك',
      getLocation: 'تحديد موقعي',
      locationError: 'تعذر الحصول على الموقع',
      enableLocation: 'يرجى تفعيل خدمة الموقع',
      noBarbers: 'لا توجد صالونات بالقرب منك',
      book: 'احجز',
      km: 'كم',
      mapNote: 'سيتم إضافة خريطة تفاعلية عند توفير مفتاح Google Maps API'
    },
    en: {
      back: 'Back',
      title: 'Map',
      nearYou: 'Near You',
      getLocation: 'Get My Location',
      locationError: 'Could not get location',
      enableLocation: 'Please enable location services',
      noBarbers: 'No salons near you',
      book: 'Book',
      km: 'km',
      mapNote: 'Interactive map will be added when Google Maps API key is provided'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          fetchNearbyBarbers(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(t.locationError);
          fetchAllBarbers();
        }
      );
    } else {
      setLocationError(t.enableLocation);
      fetchAllBarbers();
    }
  }, []);

  const fetchNearbyBarbers = async (lat, lng) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/nearby`, {
        params: { lat, lng, radius_km: 50, gender, limit: 20 }
      });
      setBarbers(res.data);
    } catch (err) {
      console.error('Failed to fetch nearby barbers:', err);
      fetchAllBarbers();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllBarbers = async () => {
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

  const calcDistance = (barber) => {
    if (!userLocation || !barber.location) return null;
    const dlat = Math.abs(barber.location.lat - userLocation.lat);
    const dlng = Math.abs(barber.location.lng - userLocation.lng);
    return ((dlat ** 2 + dlng ** 2) ** 0.5 * 111).toFixed(1);
  };

  return (
    <div className={`min-h-screen ${themeClass}`} data-testid="map-page">
      {/* Header */}
      <div className={`sticky top-0 z-50 ${isMen ? 'glass-nav-men' : 'glass-nav-women'} px-4 py-4`}>
        <div className="container mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#1F1F1F] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            data-testid="back-btn"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h1 className={`text-xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <MapPin className={`w-5 h-5 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              {t.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Map Placeholder */}
        <div className={`${isMen ? 'card-men' : 'card-women'} h-64 flex items-center justify-center mb-8`}>
          <div className="text-center">
            <MapPin className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
              {t.mapNote}
            </p>
            {userLocation && (
              <p className={`mt-2 text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Nearby Barbers List */}
        <h2 className={`text-xl font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Navigation className={`w-5 h-5 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          {t.nearYou}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          </div>
        ) : barbers.length > 0 ? (
          <div className="space-y-4">
            {barbers.map((barber, index) => {
              const distance = calcDistance(barber);
              return (
                <div 
                  key={barber.id}
                  className={`${isMen ? 'card-men' : 'card-women'} p-4 animate-fade-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`nearby-barber-${index}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
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
                      <h3 className={`font-bold truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                        {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
                      </h3>
                      <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                        <MapPin className="w-3 h-3" />
                        {barber.address || `${barber.city}, ${barber.country}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className={`w-4 h-4 ${isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]'}`} />
                          <span className={`text-sm ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                            {barber.rating?.toFixed(1)}
                          </span>
                        </div>
                        {distance && (
                          <span className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                            📍 {distance} {t.km}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      onClick={() => navigate(`/barber/${barber.id}`)}
                      size="sm"
                      className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
                    >
                      <Calendar className="w-4 h-4 me-1" />
                      {t.book}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#262626]' : 'text-[#E7E5E4]'}`} />
            <p className={`text-xl ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {t.noBarbers}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
