import React, { createContext, useContext, useState, useEffect } from "react";
import "@/App.css";
import "@/premium.css";
import "@/styles/neo-luxury.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { detectLanguage, saveLanguage, isRTL } from "@/lib/i18n";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { GeoLocationProvider } from "@/contexts/GeoLocationContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

// Pages
import GenderSelection from "@/pages/GenderSelection";
import AuthPage from "@/pages/AuthPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import HomePage from "@/pages/HomePage";
import BarberProfile from "@/pages/BarberProfile";
import BookingPage from "@/pages/BookingPage";
import TopBarbers from "@/pages/TopBarbers";
import MapPage from "@/pages/MapPage";
import MyBookings from "@/pages/MyBookings";
import BarberDashboard from "@/pages/BarberDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import PaymentPage from "@/pages/PaymentPage";
import ProfileSetup from "@/pages/ProfileSetup";
import ProductShowcase from "@/pages/ProductShowcase";
import AIAdvisor from "@/pages/AIAdvisor";
import FavoritesPage from "@/pages/FavoritesPage";
import MyOrders from "@/pages/MyOrders";
import InstallPrompt from "@/components/InstallPrompt";
import ErrorBoundary from "@/components/ErrorBoundary";

// Context
const AppContext = createContext();

export const useApp = () => useContext(AppContext);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [gender, setGender] = useState(() => localStorage.getItem('barber_hub_gender') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('barber_hub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('barber_hub_token') || null);
  const [userType, setUserType] = useState(() => localStorage.getItem('barber_hub_user_type') || null);
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('barber_hub_lang');
    if (saved) return saved;
    // Auto-detect language from browser
    const browserLang = navigator.language || navigator.userLanguage || 'ar';
    return browserLang.startsWith('ar') ? 'ar' : 'en';
  });

  useEffect(() => {
    if (gender) localStorage.setItem('barber_hub_gender', gender);
    else localStorage.removeItem('barber_hub_gender');
  }, [gender]);

  useEffect(() => {
    if (user) localStorage.setItem('barber_hub_user', JSON.stringify(user));
    else localStorage.removeItem('barber_hub_user');
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('barber_hub_token', token);
    else localStorage.removeItem('barber_hub_token');
  }, [token]);

  useEffect(() => {
    if (userType) localStorage.setItem('barber_hub_user_type', userType);
    else localStorage.removeItem('barber_hub_user_type');
  }, [userType]);

  const login = (userData, accessToken, type) => {
    setUser(userData);
    setToken(accessToken);
    setUserType(type);
    if (userData.gender) {
      setGender(userData.gender);
    } else if (userData.shop_type) {
      setGender(userData.shop_type);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setUserType(null);
    localStorage.removeItem('barber_hub_user');
    localStorage.removeItem('barber_hub_token');
    localStorage.removeItem('barber_hub_user_type');
  };

  const themeClass = gender === 'female' ? 'theme-women' : 'theme-men';

  const contextValue = {
    gender,
    setGender,
    user,
    setUser,
    token,
    userType,
    login,
    logout,
    language,
    setLanguage,
    API,
    themeClass,
    isAuthenticated: !!token,
    isBarber: userType === 'barbershop',
    isAdmin: userType === 'admin',
    isUser: userType === 'user'
  };

  return (
    <ErrorBoundary>
      <LocalizationProvider>
        <GeoLocationProvider>
          <CurrencyProvider>
            <AppContext.Provider value={contextValue}>
              <div className={`App bh-surface min-h-screen ${gender ? themeClass : ''}`} dir={isRTL(language) ? 'rtl' : 'ltr'}>
                <BrowserRouter>
                  <Routes>
                    {/* Gender Selection - Entry Point */}
                    <Route path="/" element={!gender ? <GenderSelection /> : <Navigate to="/home" />} />
                    
                    {/* Auth */}
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    
                    {/* Main Pages */}
                    <Route path="/home" element={gender ? <HomePage /> : <Navigate to="/" />} />
                    <Route path="/barber/:id" element={<BarberProfile />} />
                    <Route path="/book/:barberId" element={<BookingPage />} />
                    <Route path="/products/:shopId" element={<ProductShowcase />} />
                    <Route path="/products" element={<ProductShowcase />} />
                    <Route path="/top-barbers" element={<TopBarbers />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/my-bookings" element={<MyBookings />} />
                    <Route path="/my-orders" element={<MyOrders />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/ai-advisor" element={<AIAdvisor />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    
                    {/* Barber/Salon Dashboard */}
                    <Route path="/dashboard" element={<BarberDashboard />} />
                    <Route path="/profile-setup" element={<ProfileSetup />} />
                    
                    {/* Admin */}
                    <Route path="/admin" element={<AdminDashboard />} />
                    
                    {/* Catch all */}
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </BrowserRouter>
                <Toaster position="top-center" richColors />
                <InstallPrompt />
              </div>
            </AppContext.Provider>
          </CurrencyProvider>
        </GeoLocationProvider>
      </LocalizationProvider>
    </ErrorBoundary>
  );
}

export default App;
