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
  'USD': '$',
  'EUR': '€',
};

const CURRENCY_NAMES = {
  'JOD': { ar: 'دينار أردني', en: 'JOD' },
  'SAR': { ar: 'ريال سعودي', en: 'SAR' },
  'IQD': { ar: 'دينار عراقي', en: 'IQD' },
  'USD': { ar: 'دولار', en: 'USD' },
  'EUR': { ar: 'يورو', en: 'EUR' },
};

// Approximate conversion rates (USD as base)
const CONVERSION_RATES = {
  'USD': 1,
  'JOD': 0.71,   // 1 USD = 0.71 JOD
  'SAR': 3.75,   // 1 USD = 3.75 SAR
  'IQD': 1310,   // 1 USD = 1310 IQD
  'EUR': 0.92,   // 1 USD = 0.92 EUR
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
    if (currency === 'IQD') {
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
