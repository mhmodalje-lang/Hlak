import React, { createContext, useContext, useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Pages
import GenderSelection from "@/pages/GenderSelection";
import AuthPage from "@/pages/AuthPage";
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
  const [language, setLanguage] = useState(() => localStorage.getItem('barber_hub_lang') || 'ar');

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
    localStorage.setItem('barber_hub_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const login = (userData, accessToken) => {
    setUser(userData);
    setToken(accessToken);
    setGender(userData.gender);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('barber_hub_user');
    localStorage.removeItem('barber_hub_token');
  };

  const themeClass = gender === 'female' ? 'theme-women' : 'theme-men';

  const contextValue = {
    gender,
    setGender,
    user,
    setUser,
    token,
    login,
    logout,
    language,
    setLanguage,
    API,
    themeClass,
    isAuthenticated: !!token,
    isBarber: user?.user_type === 'barber' || user?.user_type === 'salon',
    isAdmin: user?.user_type === 'admin'
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={`App min-h-screen ${gender ? themeClass : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <BrowserRouter>
          <Routes>
            {/* Gender Selection - Entry Point */}
            <Route path="/" element={!gender ? <GenderSelection /> : <Navigate to="/home" />} />
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Main Pages */}
            <Route path="/home" element={gender ? <HomePage /> : <Navigate to="/" />} />
            <Route path="/barber/:id" element={<BarberProfile />} />
            <Route path="/book/:barberId" element={<BookingPage />} />
            <Route path="/top-barbers" element={<TopBarbers />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/payment" element={<PaymentPage />} />
            
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
      </div>
    </AppContext.Provider>
  );
}

export default App;
