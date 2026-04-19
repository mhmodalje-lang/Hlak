/**
 * BARBER HUB - GeoLocationContext
 * IP-based Geolocation + Dynamic Headers
 * Detects country via ip-api.com (free, no API key needed)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const GeoLocationContext = createContext();

export const useGeoLocation = () => {
  const context = useContext(GeoLocationContext);
  if (!context) {
    throw new Error('useGeoLocation must be used within GeoLocationProvider');
  }
  return context;
};

// Country to region mapping for dynamic headers + payment region
const COUNTRY_TO_REGION = {
  // Arabic Countries - LOCAL currencies
  'Jordan':       { ar: 'أفخم صالونات الحلاقة في الأردن',   en: 'Premium Barbers in Jordan',       currency: 'JOD', paymentRegion: 'local_arab' },
  'Saudi Arabia': { ar: 'أفخم صالونات الحلاقة في السعودية', en: 'Premium Barbers in Saudi Arabia', currency: 'SAR', paymentRegion: 'local_arab' },
  'Iraq':         { ar: 'أفخم صالونات الحلاقة في العراق',    en: 'Premium Barbers in Iraq',         currency: 'IQD', paymentRegion: 'local_arab' },
  'Syria':        { ar: 'أفخم صالونات الحلاقة في سوريا',     en: 'Premium Barbers in Syria',        currency: 'SYP', paymentRegion: 'local_arab' },
  'Lebanon':      { ar: 'أفخم صالونات الحلاقة في لبنان',     en: 'Premium Barbers in Lebanon',      currency: 'LBP', paymentRegion: 'local_arab' },
  'United Arab Emirates': { ar: 'أفخم صالونات الحلاقة في الإمارات', en: 'Premium Barbers in UAE', currency: 'AED', paymentRegion: 'local_arab' },
  'Kuwait':       { ar: 'أفخم صالونات الحلاقة في الكويت',    en: 'Premium Barbers in Kuwait',       currency: 'KWD', paymentRegion: 'local_arab' },
  'Qatar':        { ar: 'أفخم صالونات الحلاقة في قطر',       en: 'Premium Barbers in Qatar',        currency: 'QAR', paymentRegion: 'local_arab' },
  'Bahrain':      { ar: 'أفخم صالونات الحلاقة في البحرين',   en: 'Premium Barbers in Bahrain',      currency: 'BHD', paymentRegion: 'local_arab' },
  'Oman':         { ar: 'أفخم صالونات الحلاقة في عمان',      en: 'Premium Barbers in Oman',         currency: 'OMR', paymentRegion: 'local_arab' },
  'Palestine':    { ar: 'أفخم صالونات الحلاقة في فلسطين',   en: 'Premium Barbers in Palestine',    currency: 'USD', paymentRegion: 'local_arab' },
  'Egypt':        { ar: 'أفخم صالونات الحلاقة في مصر',       en: 'Premium Barbers in Egypt',        currency: 'EGP', paymentRegion: 'local_arab' },
  
  // Europe (fallback for European countries) - GLOBAL
  'Germany':        { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'France':         { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'United Kingdom': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'GBP', paymentRegion: 'global' },
  'Italy':          { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Spain':          { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Netherlands':    { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Belgium':        { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Sweden':         { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Norway':         { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'Switzerland':    { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR', paymentRegion: 'global' },
  'United States':  { ar: 'أفضل الحلاقين في أمريكا', en: 'Premium Barbers in USA',    currency: 'USD', paymentRegion: 'global' },
  'Canada':         { ar: 'أفضل الحلاقين في كندا',    en: 'Premium Barbers in Canada', currency: 'USD', paymentRegion: 'global' },
  
  // Default fallback
  'default': { ar: 'أفخم صالونات الحلاقة', en: 'Premium Barbers Worldwide', currency: 'USD', paymentRegion: 'global' }
};

export const GeoLocationProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGeoLocation = async () => {
      try {
        // Check localStorage cache (cache for 24 hours)
        const cached = localStorage.getItem('barberhub_geo');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            setGeoData(parsed.data);
            setIsLoading(false);
            return;
          }
        }

        // Fetch from ip-api.com (free, no API key needed, 45 requests/minute)
        const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,region,city,lat,lon,timezone');
        
        if (!response.ok) {
          throw new Error('Failed to fetch geolocation');
        }

        const data = await response.json();
        
        if (data.status === 'success') {
          const geoInfo = {
            country: data.country,
            countryCode: data.countryCode,
            region: data.region,
            city: data.city,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone,
          };

          // Cache the result
          localStorage.setItem('barberhub_geo', JSON.stringify({
            data: geoInfo,
            timestamp: Date.now()
          }));

          setGeoData(geoInfo);
        } else {
          throw new Error('Geolocation service returned error');
        }
      } catch (err) {
        console.error('Geolocation error:', err);
        setError(err.message);
        // Set default fallback
        setGeoData({
          country: 'Unknown',
          countryCode: 'XX',
          region: '',
          city: '',
          lat: null,
          lon: null,
          timezone: '',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeoLocation();
  }, []);

  const getDynamicHeader = (language) => {
    if (!geoData) return COUNTRY_TO_REGION.default[language];
    
    const countryMapping = COUNTRY_TO_REGION[geoData.country];
    if (countryMapping) {
      return countryMapping[language];
    }
    
    // Fallback for unmapped countries
    return COUNTRY_TO_REGION.default[language];
  };

  const getCurrency = () => {
    if (!geoData) return 'USD';
    
    const countryMapping = COUNTRY_TO_REGION[geoData.country];
    if (countryMapping) {
      return countryMapping.currency;
    }
    
    return 'USD';
  };

  /**
   * Returns 'local_arab' for Arab countries (manual transfer methods)
   * or 'global' for EU/US/UK/Canada etc. (card payment methods).
   * Used by Smart Payment Gateway on PaymentPage.
   */
  const getPaymentRegion = () => {
    if (!geoData) return 'global';
    const mapping = COUNTRY_TO_REGION[geoData.country];
    return mapping?.paymentRegion || 'global';
  };

  const value = {
    geoData,
    isLoading,
    error,
    country: geoData?.country || 'Unknown',
    countryCode: geoData?.countryCode || 'XX',
    city: geoData?.city || '',
    getDynamicHeader,
    getCurrency,
    getPaymentRegion,
  };

  return (
    <GeoLocationContext.Provider value={value}>
      {children}
    </GeoLocationContext.Provider>
  );
};

export default GeoLocationContext;
