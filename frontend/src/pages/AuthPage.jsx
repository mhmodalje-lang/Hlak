/**
 * BARBER HUB - AuthPage (Warm Luxury - VIP Private Club)
 * Login & Register with Brown & Gold theme
 * Feels like entering an exclusive members club
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useGeoLocation } from '@/contexts/GeoLocationContext';
import { getPhonePlaceholder } from '@/lib/phoneFormat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { motion } from 'framer-motion';

// Import custom icons
import { User, ShieldCheck as Lock, PhonePremium as Phone, Location, ArrowLeft, Crown, Shears } from '@/components/icons';
import { Globe as GlobeIcon } from 'lucide-react';
import PasswordStrengthMeter, { isPasswordValid } from '@/components/PasswordStrengthMeter';

const AuthPage = () => {
  const navigate = useNavigate();
  const { API, login, gender } = useApp();
  const { language } = useLocalization();
  const { country: geoCountry, countryCode: geoCountryCode, city: geoCity } = useGeoLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState('user'); // 'user' or 'barbershop'
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const [loginData, setLoginData] = useState({ email_or_phone: '', password: '' });
  const [registerData, setRegisterData] = useState({
    phone_number: '', password: '', full_name: '', email: '',
    country: '', city: '', district: '', gender: gender || 'male'
  });
  const [shopRegisterData, setShopRegisterData] = useState({
    phone_number: '', password: '', owner_name: '', shop_name: '', email: '',
    country: '', city: '', district: '', shop_type: gender || 'male', whatsapp_number: ''
  });

  const isRTL = language === 'ar';

  const t = language === 'ar' ? {
    login: 'تسجيل الدخول', register: 'حساب جديد', phone: 'رقم الهاتف',
    password: 'كلمة المرور', name: 'الاسم الكامل', ownerName: 'اسم صاحب الصالون',
    shopName: 'اسم الصالون', email: 'البريد الإلكتروني',
    country: 'الدولة', city: 'المدينة', district: 'الحي (اختياري)',
    selectCountry: 'اختر الدولة', selectCity: 'اختر المدينة',
    whatsapp: 'رقم واتساب', accountType: 'نوع الحساب',
    customer: 'زبون', barbershop: 'صالون / حلاق', loginBtn: 'دخول',
    registerBtn: 'إنشاء حساب', back: 'رجوع', asCustomer: 'كزبون',
    asBarbershop: 'كصالون', welcome: 'أهلاً بك في', subtitle: 'ادخل لعالم الفخامة',
    registerSubtitle: 'انضم لنادينا الحصري', emailOrPhone: 'البريد الإلكتروني أو الهاتف',
    loginMethod: 'طريقة الدخول', withEmail: 'بالبريد', withPhone: 'بالهاتف'
  } : {
    login: 'Login', register: 'Register', phone: 'Phone Number',
    password: 'Password', name: 'Full Name', ownerName: 'Owner Name',
    shopName: 'Shop Name', email: 'Email', country: 'Country',
    city: 'City', district: 'District (optional)', selectCountry: 'Select Country',
    selectCity: 'Select City', whatsapp: 'WhatsApp Number', accountType: 'Account Type',
    customer: 'Customer', barbershop: 'Barbershop', loginBtn: 'Login',
    registerBtn: 'Register', back: 'Back', asCustomer: 'As Customer',
    asBarbershop: 'As Barbershop', welcome: 'Welcome to', subtitle: 'Enter the world of luxury',
    registerSubtitle: 'Join our exclusive club', emailOrPhone: 'Email or Phone',
    loginMethod: 'Login Method', withEmail: 'With Email', withPhone: 'With Phone'
  };

  // Fetch countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await axios.get(`${API}/locations/countries`);
        setCountries(res.data.countries || []);
      } catch (e) { console.error(e); }
    };
    fetchCountries();
  }, [API]);

  // Auto-fill country/city from Geo on first load (only if user hasn't typed anything yet)
  useEffect(() => {
    if (hasAutoFilled) return;
    if (!geoCountry || geoCountry === 'Unknown') return;
    if (countries.length === 0) return;
    // Match detected country against the list from the backend
    const matched = countries.find(
      (c) => c.name === geoCountry || c.code === geoCountryCode
    );
    if (!matched) return;
    setRegisterData((prev) =>
      prev.country ? prev : { ...prev, country: matched.name, city: geoCity || prev.city }
    );
    setShopRegisterData((prev) =>
      prev.country ? prev : { ...prev, country: matched.name, city: geoCity || prev.city }
    );
    fetchCities(matched.code);
    setHasAutoFilled(true);
  }, [geoCountry, geoCountryCode, geoCity, countries, hasAutoFilled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cities when country changes
  const fetchCities = useCallback(async (countryCode) => {
    if (!countryCode) return;
    try {
      const res = await axios.get(`${API}/locations/cities/${countryCode}`);
      setCities(res.data.cities || []);
    } catch (e) { console.error(e); }
  }, [API]);

  // v3.7 — route each role to its native surface.
  // Salon -> /dashboard (their control panel: profile, products, services, gallery, bookings).
  // Admin -> /admin (super-admin dashboard).
  // Customer -> /home (discovery, booking, AI advisor, favorites).
  const routeForEntity = (user) => {
    const etype = user?.entity_type || user?.role || (user?.shop_name ? 'barbershop' : 'user');
    if (etype === 'barbershop') return '/dashboard';
    if (etype === 'admin' || etype === 'master_admin' || etype === 'sub_admin') return '/admin';
    return '/home';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // v3.7 FIX: backend expects {phone_number, password} — map email_or_phone -> phone_number.
      const payload = {
        phone_number: (loginData.email_or_phone || loginData.phone_number || '').trim(),
        password: loginData.password,
      };
      const res = await axios.post(`${API}/auth/login`, payload);
      login(res.data.access_token || res.data.token, res.data.user);
      // If the account requires password change, bounce user to the change screen.
      if (res.data?.user?.must_change_password) {
        toast.info(language === 'ar' ? 'يرجى تغيير كلمة المرور أولاً' : 'Please change your password first');
        navigate('/change-password');
        return;
      }
      toast.success(language === 'ar' ? '✨ مرحباً بعودتك!' : '✨ Welcome back!');
      navigate(routeForEntity(res.data.user));
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'خطأ في تسجيل الدخول' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = authType === 'user' ? registerData : shopRegisterData;
      // v3.7 FIX: backend endpoint is /auth/register-barbershop (not /barbershops/register)
      const endpoint = authType === 'user'
        ? `${API}/auth/register`
        : `${API}/auth/register-barbershop`;
      const res = await axios.post(endpoint, data);
      login(res.data.access_token || res.data.token, res.data.user);
      toast.success(language === 'ar' ? '🎉 تم إنشاء حسابك!' : '🎉 Account created!');
      // v3.7 — after salon registration, go directly to the dashboard
      // so the owner can upload their logo, gallery, and products straight away.
      // v3.7.5 BUGFIX: authType is 'user' or 'barbershop' (never 'shop').
      //                 The previous check was broken, causing new salons to land on /home
      //                 instead of their dashboard.
      navigate(authType === 'barbershop' ? '/dashboard' : '/home');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'خطأ في التسجيل' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bh-surface min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Orbs - Warm Brown & Gold */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-15" />
      <div className="bh-orb w-80 h-80 bottom-0 left-0 opacity-10" 
        style={{ background: 'radial-gradient(circle, rgba(205,127,50,0.3), transparent)' }} />

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 bh-btn bh-btn-ghost"
        data-testid="back-button"
      >
        <ArrowLeft className="w-5 h-5" />
        {t.back}
      </button>

      {/* Main Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* VIP Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bh-glass-hi flex items-center justify-center"
            style={{
              border: '2px solid var(--bh-gold)',
              boxShadow: '0 0 40px rgba(212,175,55,0.4)',
            }}
          >
            <Shears className="w-10 h-10 text-[var(--bh-gold)]" strokeWidth={1.5} />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-display font-bold bh-gold-text mb-2"
          >
            {t.welcome}
            <br />
            <span className="text-white">BARBER HUB</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[var(--bh-text-secondary)] font-body"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* Auth Form Card */}
        <div className="bh-glass-vip rounded-3xl p-6 md:p-8 bh-corner-accents">
          <Tabs defaultValue="login" className="w-full">
            {/* Tabs List */}
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[var(--bh-glass-bg)] p-1 rounded-xl">
              <TabsTrigger
                value="login"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--bh-gold)] data-[state=active]:to-[var(--bh-gold-deep)] data-[state=active]:text-[var(--bh-obsidian)] font-bold transition-all"
              >
                {t.login}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--bh-gold)] data-[state=active]:to-[var(--bh-gold-deep)] data-[state=active]:text-[var(--bh-obsidian)] font-bold transition-all"
              >
                {t.register}
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login" className="space-y-4">
              {/* Login Method Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all ${
                    loginMethod === 'email'
                      ? 'bg-gradient-to-r from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)]'
                      : 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)]'
                  }`}
                >
                  📧 {t.withEmail}
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all ${
                    loginMethod === 'phone'
                      ? 'bg-gradient-to-r from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)]'
                      : 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)]'
                  }`}
                >
                  📱 {t.withPhone}
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email-phone" className="text-[var(--bh-text-secondary)] font-body flex items-center gap-2">
                    {loginMethod === 'email' ? <User className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    {loginMethod === 'email' ? t.email : t.phone}
                  </Label>
                  <Input
                    id="login-email-phone"
                    type={loginMethod === 'email' ? 'email' : 'tel'}
                    placeholder={loginMethod === 'email' ? 'you@example.com' : getPhonePlaceholder(geoCountryCode, language)}
                    value={loginData.email_or_phone}
                    onChange={(e) => setLoginData({ ...loginData, email_or_phone: e.target.value })}
                    required
                    className="bh-input"
                    data-testid="login-email-phone"
                    dir={loginMethod === 'phone' ? 'ltr' : undefined}
                  />
                  {loginMethod === 'phone' && (
                    <p className="text-xs text-[var(--bh-text-muted)] flex items-center gap-1.5">
                      <GlobeIcon className="w-3 h-3" />
                      {language === 'ar' ? 'متوفر عالمياً • أدخل الرقم مع مفتاح الدولة' : 'Available worldwide • Include country code'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-[var(--bh-text-secondary)] font-body flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {t.password}
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    className="bh-input"
                    data-testid="login-password"
                  />
                  <div className="text-right rtl:text-left">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs text-[var(--bh-gold)] hover:text-[var(--bh-gold-deep)] hover:underline transition-colors"
                      data-testid="forgot-password-link"
                    >
                      {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bh-btn bh-btn-primary w-full"
                  disabled={isLoading}
                  data-testid="login-submit"
                >
                  {isLoading ? '...' : t.loginBtn}
                  {!isLoading && <Crown className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register" className="space-y-4">
              {/* Account Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAuthType('user')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                    authType === 'user'
                      ? 'bg-gradient-to-r from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)]'
                      : 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)] hover:bg-[var(--bh-glass-bg-hi)]'
                  }`}
                  data-testid="toggle-user"
                >
                  <User className="w-4 h-4 inline mr-1.5" />
                  {t.customer}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('barbershop')}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${
                    authType === 'barbershop'
                      ? 'bg-gradient-to-r from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)]'
                      : 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)] hover:bg-[var(--bh-glass-bg-hi)]'
                  }`}
                  data-testid="toggle-shop"
                >
                  <Shears className="w-4 h-4 inline mr-1.5" />
                  {t.barbershop}
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {authType === 'user' ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[var(--bh-text-secondary)] font-body">{t.name}</Label>
                      <Input
                        type="text"
                        value={registerData.full_name}
                        onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                        required
                        className="bh-input"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[var(--bh-text-secondary)] font-body">{t.ownerName}</Label>
                      <Input
                        type="text"
                        value={shopRegisterData.owner_name}
                        onChange={(e) => setShopRegisterData({ ...shopRegisterData, owner_name: e.target.value })}
                        required
                        className="bh-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[var(--bh-text-secondary)] font-body">{t.shopName}</Label>
                      <Input
                        type="text"
                        value={shopRegisterData.shop_name}
                        onChange={(e) => setShopRegisterData({ ...shopRegisterData, shop_name: e.target.value })}
                        required
                        className="bh-input"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-[var(--bh-text-secondary)] font-body">{t.phone}</Label>
                  <Input
                    type="tel"
                    placeholder={getPhonePlaceholder(geoCountryCode, language)}
                    value={authType === 'user' ? registerData.phone_number : shopRegisterData.phone_number}
                    onChange={(e) => {
                      const val = e.target.value;
                      authType === 'user'
                        ? setRegisterData({ ...registerData, phone_number: val })
                        : setShopRegisterData({ ...shopRegisterData, phone_number: val });
                    }}
                    required
                    className="bh-input"
                    dir="ltr"
                    data-testid="register-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--bh-text-secondary)] font-body">{t.password}</Label>
                  <Input
                    type="password"
                    value={authType === 'user' ? registerData.password : shopRegisterData.password}
                    onChange={(e) => {
                      const val = e.target.value;
                      authType === 'user'
                        ? setRegisterData({ ...registerData, password: val })
                        : setShopRegisterData({ ...shopRegisterData, password: val });
                    }}
                    required
                    className="bh-input"
                    autoComplete="new-password"
                    aria-describedby="password-strength"
                  />
                  {/* v3.7 Live password strength guidance */}
                  <div id="password-strength">
                    <PasswordStrengthMeter
                      password={authType === 'user' ? registerData.password : shopRegisterData.password}
                      language={language}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[var(--bh-text-secondary)] font-body text-sm">{t.country}</Label>
                    <Select
                      value={authType === 'user' ? registerData.country : shopRegisterData.country}
                      onValueChange={(val) => {
                        if (authType === 'user') {
                          setRegisterData({ ...registerData, country: val });
                        } else {
                          setShopRegisterData({ ...shopRegisterData, country: val });
                        }
                        const country = countries.find(c => c.name === val);
                        if (country) fetchCities(country.code);
                      }}
                    >
                      <SelectTrigger className="bh-input h-11">
                        <SelectValue placeholder={t.selectCountry} />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[var(--bh-text-secondary)] font-body text-sm">{t.city}</Label>
                    <Select
                      value={authType === 'user' ? registerData.city : shopRegisterData.city}
                      onValueChange={(val) => {
                        authType === 'user'
                          ? setRegisterData({ ...registerData, city: val })
                          : setShopRegisterData({ ...shopRegisterData, city: val });
                      }}
                    >
                      <SelectTrigger className="bh-input h-11">
                        <SelectValue placeholder={t.selectCity} />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bh-btn bh-btn-primary w-full"
                  disabled={
                    isLoading ||
                    !isPasswordValid(authType === 'user' ? registerData.password : shopRegisterData.password)
                  }
                  data-testid="register-submit"
                >
                  {isLoading ? '...' : t.registerBtn}
                  {!isLoading && <Crown className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* VIP Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bh-glass border border-[var(--bh-gold)]/30">
            <Crown className="w-4 h-4 text-[var(--bh-gold)]" />
            <span className="text-xs text-[var(--bh-gold)] font-bold tracking-wider">
              {language === 'ar' ? 'نادي حصري' : 'EXCLUSIVE CLUB'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
