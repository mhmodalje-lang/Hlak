import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion } from 'framer-motion';
import {
  MapPin, Star, ArrowRight, ArrowLeft, Navigation,
  Scissors, Sparkles, Calendar, Loader2, Crosshair, Search
} from 'lucide-react';

// Fix default marker icons (bundler workaround)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const createSalonIcon = (isMen, logo) => {
  const bg = isMen ? 'linear-gradient(135deg,#D4AF37,#F3E5AB)' : 'linear-gradient(135deg,#B76E79,#D8A7B1)';
  const borderColor = isMen ? '#0a0a0a' : '#ffffff';
  const iconEmoji = isMen ? '💈' : '💇‍♀';
  return L.divIcon({
    className: 'custom-marker-wrapper',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
    html: `<div style="width:48px;height:48px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${bg};border:3px solid ${borderColor};display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(0,0,0,0.4);">${logo ? `<img src='${logo}' style='width:28px;height:28px;border-radius:50%;object-fit:cover;transform:rotate(45deg);border:2px solid ${borderColor};'/>` : `<span style="transform:rotate(45deg);font-size:22px;">${iconEmoji}</span>`}</div>`,
  });
};

const userIcon = L.divIcon({
  className: 'user-marker-wrapper',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: `<div class="custom-marker-user"></div>`,
});

function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
  }, [center]);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const { API, gender, language, themeClass, isAuthenticated, token } = useApp();
  const [barbers, setBarbers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [flyCenter, setFlyCenter] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState(100);

  const isMen = gender === 'male';

  const t = language === 'ar' ? {
    back: 'رجوع', title: 'الخريطة التفاعلية', nearYou: 'بالقرب منك',
    getLocation: 'حدد موقعي', book: 'احجز الآن', km: 'كم',
    rating: 'تقييم', searchPlaceholder: 'ابحث عن صالون...',
    radiusLabel: 'نطاق البحث', noResults: 'لا توجد صالونات ضمن هذا النطاق',
    loading: 'جاري التحميل...', viewDetails: 'عرض التفاصيل', closest: 'الأقرب إليك'
  } : {
    back: 'Back', title: 'Interactive Map', nearYou: 'Near You',
    getLocation: 'Locate Me', book: 'Book Now', km: 'km',
    rating: 'rating', searchPlaceholder: 'Search salons...',
    radiusLabel: 'Search radius', noResults: 'No salons within this range',
    loading: 'Loading...', viewDetails: 'View Details', closest: 'Closest to you'
  };

  useEffect(() => {
    fetchShops();
    tryLocate();
  }, [gender]);

  const tryLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyCenter([loc.lat, loc.lng]);
      },
      () => {}
    );
  };

  const fetchShops = async (filters = {}) => {
    setIsLoading(true);
    try {
      const params = { shop_type: gender, limit: 100, ...filters };
      const res = await axios.get(`${API}/search/barbers`, { params });
      setBarbers(res.data.filter(b => b.latitude && b.longitude));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userLocation) {
      fetchShops({
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        max_distance_km: maxDistance,
        sort: 'distance',
        search: searchQuery || undefined
      });
    }
  }, [userLocation, maxDistance, searchQuery]);

  const filteredBarbers = useMemo(() => {
    if (!searchQuery) return barbers;
    return barbers.filter(b =>
      (b.shop_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.city || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [barbers, searchQuery]);

  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : (filteredBarbers[0] ? [filteredBarbers[0].latitude, filteredBarbers[0].longitude] : [36.2021, 37.1343]);

  return (
    <div className={`min-h-screen ${themeClass} ${isMen ? 'bg-luxury-men' : 'bg-luxury-women'}`} data-testid="map-page">
      {/* Header */}
      <div className={`sticky top-0 z-[1000] ${isMen ? 'glass-nav-men' : 'glass-nav-women'} px-4 py-4`}>
        <div className="container mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`} data-testid="back-btn">
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div className="flex-1">
            <h1 className={`text-xl font-bold ${isMen ? 'gradient-text-men' : 'gradient-text-women'}`}>{t.title}</h1>
            <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{filteredBarbers.length} {language === 'ar' ? 'صالون على الخريطة' : 'shops on map'}</p>
          </div>
          <button onClick={tryLocate} className={`heart-btn ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} title={t.getLocation}>
            <Crosshair className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Radius */}
        <div className="container mx-auto mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isMen ? 'bg-[#1A120A] border border-[#3A2E1F]' : 'bg-white border border-[#E7E5E4]'}`}>
            <Search className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder}
              className={`bg-transparent outline-none flex-1 text-sm ${isMen ? 'text-white placeholder:text-[#64748b]' : 'text-[#1C1917] placeholder:text-[#a8a29e]'}`}
            />
          </div>
          <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isMen ? 'bg-[#1A120A] border border-[#3A2E1F]' : 'bg-white border border-[#E7E5E4]'}`}>
            <span className={`text-xs font-medium ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{t.radiusLabel}</span>
            <input type="range" min="5" max="500" step="5" value={maxDistance} onChange={e => setMaxDistance(Number(e.target.value))}
              className={`range-slider flex-1 ${isMen ? 'range-slider-men text-[#D4AF37]' : 'range-slider-women text-[#B76E79]'}`}
              style={{ '--value': `${((maxDistance - 5) / 495) * 100}%` }}
            />
            <span className={`text-xs font-bold min-w-[50px] text-right ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{maxDistance} {t.km}</span>
          </div>
        </div>
      </div>

      {/* Map + Side List */}
      <div className="container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Map */}
        <div className={`lg:col-span-2 rounded-2xl overflow-hidden ${isMen ? 'glass-card-men' : 'glass-card-women'}`} style={{ minHeight: 400 }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className={`w-10 h-10 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            </div>
          ) : (
            <MapContainer center={defaultCenter} zoom={6} style={{ height: '100%', minHeight: 400, borderRadius: 20 }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
              <FlyTo center={flyCenter} zoom={13} />
              {userLocation && (
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                  <Popup><strong>{language === 'ar' ? 'موقعك' : 'You are here'}</strong></Popup>
                </Marker>
              )}
              {filteredBarbers.map(shop => (
                <Marker key={shop.id} position={[shop.latitude, shop.longitude]} icon={createSalonIcon(isMen, shop.shop_logo)}
                  eventHandlers={{ click: () => setSelectedShop(shop) }}>
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{shop.shop_name}</div>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}><MapPin size={12} style={{ display: 'inline' }} /> {shop.city}, {shop.country}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#D4AF37' }}>★ {shop.rating?.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>({shop.total_reviews})</span>
                        {shop.distance_km !== null && shop.distance_km !== undefined && (
                          <span style={{ fontSize: 11, color: '#059669' }}>📍 {shop.distance_km} {t.km}</span>
                        )}
                      </div>
                      <button onClick={() => navigate(`/barber/${shop.id}`)} style={{ background: isMen ? '#D4AF37' : '#B76E79', color: isMen ? '#0a0a0a' : '#fff', padding: '6px 14px', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', width: '100%' }}>{t.book}</button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Side list */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-full pr-1">
          <h3 className={`text-sm font-bold mb-1 ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>
            <Navigation className="w-4 h-4 inline me-1" /> {t.closest}
          </h3>
          {filteredBarbers.length === 0 && !isLoading && (
            <div className={`p-6 text-center rounded-xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
              <MapPin className={`w-12 h-12 mx-auto mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.noResults}</p>
            </div>
          )}
          {filteredBarbers.slice(0, 30).map((shop, idx) => (
            <motion.div key={shop.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => { setSelectedShop(shop); setFlyCenter([shop.latitude, shop.longitude]); }}
              className={`p-3 rounded-xl cursor-pointer ${isMen ? 'glass-card-men' : 'glass-card-women'} ${selectedShop?.id === shop.id ? (isMen ? 'ring-2 ring-[#D4AF37]' : 'ring-2 ring-[#B76E79]') : ''}`}
            >
              <div className="flex gap-3 items-center">
                <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  {shop.shop_logo ? <img src={shop.shop_logo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">{isMen ? '💈' : '✨'}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-sm truncate ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{shop.shop_name}</div>
                  <div className={`text-xs flex items-center gap-2 mt-0.5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                    <span>★ {shop.rating?.toFixed(1)}</span>
                    {shop.distance_km != null && <span>• {shop.distance_km} {t.km}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
