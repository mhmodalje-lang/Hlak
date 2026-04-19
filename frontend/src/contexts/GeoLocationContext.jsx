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

// Country to region mapping for dynamic headers
const COUNTRY_TO_REGION = {
  // Arabic Countries
  'Jordan': { ar: 'أفخم صالونات الحلاقة في الأردن', en: 'Premium Barbers in Jordan', currency: 'JOD' },
  'Saudi Arabia': { ar: 'أفخم صالونات الحلاقة في السعودية', en: 'Premium Barbers in Saudi Arabia', currency: 'SAR' },
  'Iraq': { ar: 'أفخم صالونات الحلاقة في العراق', en: 'Premium Barbers in Iraq', currency: 'IQD' },
  'Syria': { ar: 'أفخم صالونات الحلاقة في سوريا', en: 'Premium Barbers in Syria', currency: 'USD' },
  'Lebanon': { ar: 'أفخم صالونات الحلاقة في لبنان', en: 'Premium Barbers in Lebanon', currency: 'USD' },
  'United Arab Emirates': { ar: 'أفخم صالونات الحلاقة في الإمارات', en: 'Premium Barbers in UAE', currency: 'USD' },
  'Kuwait': { ar: 'أفخم صالونات الحلاقة في الكويت', en: 'Premium Barbers in Kuwait', currency: 'USD' },
  'Qatar': { ar: 'أفخم صالونات الحلاقة في قطر', en: 'Premium Barbers in Qatar', currency: 'USD' },
  'Bahrain': { ar: 'أفخم صالونات الحلاقة في البحرين', en: 'Premium Barbers in Bahrain', currency: 'USD' },
  'Oman': { ar: 'أفخم صالونات الحلاقة في عمان', en: 'Premium Barbers in Oman', currency: 'USD' },
  'Palestine': { ar: 'أفخم صالونات الحلاقة في فلسطين', en: 'Premium Barbers in Palestine', currency: 'USD' },
  'Egypt': { ar: 'أفخم صالونات الحلاقة في مصر', en: 'Premium Barbers in Egypt', currency: 'USD' },
  
  // Europe (fallback for European countries)
  'Germany': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'France': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'United Kingdom': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Italy': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Spain': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Netherlands': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Belgium': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Sweden': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Norway': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  'Switzerland': { ar: 'أفضل الحلاقين في أوروبا', en: 'Premium Barbers in Europe', currency: 'EUR' },
  
  // Default fallback
  'default': { ar: 'أفخم صالونات الحلاقة', en: 'Premium Barbers Worldwide', currency: 'USD' }
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

  const value = {
    geoData,
    isLoading,
    error,
    country: geoData?.country || 'Unknown',
    countryCode: geoData?.countryCode || 'XX',
    city: geoData?.city || '',
    getDynamicHeader,
    getCurrency,
  };

  return (
    <GeoLocationContext.Provider value={value}>
      {children}
    </GeoLocationContext.Provider>
  );
};

export default GeoLocationContext;
