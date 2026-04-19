/**
 * BARBER HUB - CurrencyContext
 * Automatic Currency Switching based on Geolocation
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGeoLocation } from './GeoLocationContext';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};

const CURRENCY_SYMBOLS = {
  'JOD': 'د.ا',
  'SAR': 'ر.س',
  'IQD': 'د.ع',
  'SYP': 'ل.س',
  'LBP': 'ل.ل',
  'AED': 'د.إ',
  'KWD': 'د.ك',
  'QAR': 'ر.ق',
  'BHD': 'د.ب',
  'OMR': 'ر.ع',
  'EGP': 'ج.م',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
};

const CURRENCY_NAMES = {
  'JOD': { ar: 'دينار أردني', en: 'JOD' },
  'SAR': { ar: 'ريال سعودي', en: 'SAR' },
  'IQD': { ar: 'دينار عراقي', en: 'IQD' },
  'SYP': { ar: 'ليرة سورية', en: 'SYP' },
  'LBP': { ar: 'ليرة لبنانية', en: 'LBP' },
  'AED': { ar: 'درهم إماراتي', en: 'AED' },
  'KWD': { ar: 'دينار كويتي', en: 'KWD' },
  'QAR': { ar: 'ريال قطري', en: 'QAR' },
  'BHD': { ar: 'دينار بحريني', en: 'BHD' },
  'OMR': { ar: 'ريال عماني', en: 'OMR' },
  'EGP': { ar: 'جنيه مصري', en: 'EGP' },
  'USD': { ar: 'دولار', en: 'USD' },
  'EUR': { ar: 'يورو', en: 'EUR' },
  'GBP': { ar: 'جنيه استرليني', en: 'GBP' },
};

// Approximate conversion rates (USD as base) - updated 2025
const CONVERSION_RATES = {
  'USD': 1,
  'JOD': 0.71,    // 1 USD = 0.71 JOD
  'SAR': 3.75,    // 1 USD = 3.75 SAR
  'IQD': 1310,    // 1 USD = 1310 IQD
  'SYP': 13000,   // 1 USD ≈ 13,000 SYP (black market avg 2025)
  'LBP': 89500,   // 1 USD ≈ 89,500 LBP (post-devaluation)
  'AED': 3.67,    // 1 USD = 3.67 AED
  'KWD': 0.31,    // 1 USD = 0.31 KWD
  'QAR': 3.64,    // 1 USD = 3.64 QAR
  'BHD': 0.38,    // 1 USD = 0.38 BHD
  'OMR': 0.38,    // 1 USD = 0.38 OMR
  'EGP': 49.5,    // 1 USD ≈ 49.5 EGP
  'EUR': 0.92,    // 1 USD = 0.92 EUR
  'GBP': 0.79,    // 1 USD = 0.79 GBP
};

export const CurrencyProvider = ({ children }) => {
  const { getCurrency, isLoading: geoLoading } = useGeoLocation();
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!geoLoading) {
      const detectedCurrency = getCurrency();
      setCurrency(detectedCurrency);
    }
  }, [geoLoading, getCurrency]);

  const formatPrice = (priceUSD, showSymbol = true) => {
    if (priceUSD == null || isNaN(priceUSD)) return '-';
    
    const rate = CONVERSION_RATES[currency] || 1;
    const converted = priceUSD * rate;
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    
    // Format based on currency
    let formatted;
    if (currency === 'IQD' || currency === 'SYP' || currency === 'LBP' || currency === 'EGP') {
      formatted = Math.round(converted).toLocaleString();
    } else {
      formatted = converted.toFixed(2);
    }
    
    return showSymbol ? `${symbol} ${formatted}` : formatted;
  };

  const getCurrencyName = (language) => {
    const name = CURRENCY_NAMES[currency];
    return name ? name[language] : currency;
  };

  const value = {
    currency,
    setCurrency,
    formatPrice,
    getCurrencyName,
    currencySymbol: CURRENCY_SYMBOLS[currency] || '$',
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
