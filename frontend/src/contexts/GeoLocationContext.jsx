/**
 * BARBER HUB - GeoLocationContext
 * IP-based Geolocation + Dynamic Headers
 * Detects country via ipwho.is (free, no API key, HTTPS - prevents mixed-content)
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

/**
 * Country-specific administrative division label.
 * Returns the correct term for the user's country (governorate / state / province / emirate / ...).
 * Used to dynamically label the second-level regional ranking tier in the UI.
 */
const REGION_LABELS = {
  // Arab "محافظة" (governorate)
  SY: { ar: 'المحافظة', en: 'Governorate' },
  EG: { ar: 'المحافظة', en: 'Governorate' },
  LB: { ar: 'المحافظة', en: 'Governorate' },
  JO: { ar: 'المحافظة', en: 'Governorate' },
  IQ: { ar: 'المحافظة', en: 'Governorate' },
  PS: { ar: 'المحافظة', en: 'Governorate' },
  KW: { ar: 'المحافظة', en: 'Governorate' },
  BH: { ar: 'المحافظة', en: 'Governorate' },
  OM: { ar: 'المحافظة', en: 'Governorate' },
  YE: { ar: 'المحافظة', en: 'Governorate' },
  QA: { ar: 'البلدية',   en: 'Municipality' },
  // Arab "ولاية" (wilayah)
  TN: { ar: 'الولاية', en: 'Governorate' },
  DZ: { ar: 'الولاية', en: 'Province' },
  SD: { ar: 'الولاية', en: 'State' },
  MR: { ar: 'الولاية', en: 'Region' },
  LY: { ar: 'الشعبية',  en: 'District' },
  MA: { ar: 'الجهة',    en: 'Region' },
  SA: { ar: 'المنطقة',  en: 'Region' },
  // Emirates
  AE: { ar: 'الإمارة', en: 'Emirate' },
  // States
  US: { ar: 'الولاية', en: 'State' },
  MX: { ar: 'الولاية', en: 'State' },
  BR: { ar: 'الولاية', en: 'State' },
  AU: { ar: 'الولاية', en: 'State' },
  IN: { ar: 'الولاية', en: 'State' },
  DE: { ar: 'الولاية', en: 'State' },
  AT: { ar: 'الولاية', en: 'State' },
  NG: { ar: 'الولاية', en: 'State' },
  MY: { ar: 'الولاية', en: 'State' },
  // Provinces
  CA: { ar: 'المقاطعة', en: 'Province' },
  CN: { ar: 'المقاطعة', en: 'Province' },
  ES: { ar: 'المقاطعة', en: 'Province' },
  IT: { ar: 'المقاطعة', en: 'Province' },
  NL: { ar: 'المقاطعة', en: 'Province' },
  AR: { ar: 'المقاطعة', en: 'Province' },
  ZA: { ar: 'المقاطعة', en: 'Province' },
  // Counties
  GB: { ar: 'المقاطعة', en: 'County' },
  IE: { ar: 'المقاطعة', en: 'County' },
  // Departments (FR)
  FR: { ar: 'المنطقة',  en: 'Region' },
  // Cantons
  CH: { ar: 'الكانتون', en: 'Canton' },
  // Prefectures
  JP: { ar: 'المحافظة', en: 'Prefecture' },
  // Generic
  default: { ar: 'المنطقة', en: 'Region' }
};

const getRegionLabelForCountry = (countryCode, lang = 'ar') => {
  const entry = REGION_LABELS[countryCode] || REGION_LABELS.default;
  return entry[lang] || entry.en;
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

        // Fetch from ipwho.is (free, HTTPS, no API key needed, 10K requests/month)
        // Fallback to ipapi.co if primary fails.
        let data = null;
        try {
          const response = await fetch('https://ipwho.is/?fields=success,country,country_code,region,city,latitude,longitude,timezone');
          if (response.ok) {
            const raw = await response.json();
            if (raw && raw.success !== false) {
              data = {
                status: 'success',
                country: raw.country,
                countryCode: raw.country_code,
                region: raw.region,
                city: raw.city,
                lat: raw.latitude,
                lon: raw.longitude,
                timezone: raw.timezone && raw.timezone.id ? raw.timezone.id : raw.timezone,
              };
            }
          }
        } catch (_) { /* fall back below */ }

        if (!data) {
          // Secondary provider (HTTPS) — https://ipapi.co
          const response = await fetch('https://ipapi.co/json/');
          if (!response.ok) throw new Error('Failed to fetch geolocation');
          const raw = await response.json();
          data = {
            status: 'success',
            country: raw.country_name || raw.country,
            countryCode: raw.country_code || raw.country,
            region: raw.region,
            city: raw.city,
            lat: raw.latitude,
            lon: raw.longitude,
            timezone: raw.timezone,
          };
        }
        
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
    region: geoData?.region || '',
    getDynamicHeader,
    getCurrency,
    getPaymentRegion,
    getRegionLabel: (lang = 'ar') => getRegionLabelForCountry(geoData?.countryCode, lang),
  };

  return (
    <GeoLocationContext.Provider value={value}>
      {children}
    </GeoLocationContext.Provider>
  );
};

export default GeoLocationContext;
