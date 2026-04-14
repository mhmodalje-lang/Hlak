import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowRight, Phone, User, MapPin, Lock, Loader2, ArrowLeft, Store } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const { API, login, gender, language, themeClass } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [authType, setAuthType] = useState('user'); // 'user' or 'barbershop'
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  const [loginData, setLoginData] = useState({ phone_number: '', password: '' });
  const [registerData, setRegisterData] = useState({
    phone_number: '',
    password: '',
    full_name: '',
    email: '',
    country: '',
    city: '',
    district: '',
    gender: gender || 'male'
  });
  const [shopRegisterData, setShopRegisterData] = useState({
    phone_number: '',
    password: '',
    owner_name: '',
    shop_name: '',
    email: '',
    country: '',
    city: '',
    district: '',
    shop_type: gender || 'male',
    whatsapp_number: ''
  });

  const texts = {
    ar: {
      login: 'تسجيل الدخول',
      register: 'حساب جديد',
      phone: 'رقم الهاتف',
      password: 'كلمة المرور',
      name: 'الاسم الكامل',
      ownerName: 'اسم صاحب الصالون',
      shopName: 'اسم الصالون',
      email: 'البريد الإلكتروني (اختياري)',
      country: 'الدولة',
      city: 'المدينة',
      district: 'الحي (اختياري)',
      selectCountry: 'اختر الدولة',
      selectCity: 'اختر المدينة',
      whatsapp: 'رقم واتساب',
      accountType: 'نوع الحساب',
      customer: 'زبون',
      barbershop: 'صالون / حلاق',
      loginBtn: 'دخول',
      registerBtn: 'إنشاء حساب',
      back: 'رجوع',
      asCustomer: 'كزبون',
      asBarbershop: 'كصالون'
    },
    en: {
      login: 'Login',
      register: 'Register',
      phone: 'Phone Number',
      password: 'Password',
      name: 'Full Name',
      ownerName: 'Owner Name',
      shopName: 'Shop Name',
      email: 'Email (optional)',
      country: 'Country',
      city: 'City',
      district: 'District (optional)',
      selectCountry: 'Select Country',
      selectCity: 'Select City',
      whatsapp: 'WhatsApp Number',
      accountType: 'Account Type',
      customer: 'Customer',
      barbershop: 'Barbershop',
      loginBtn: 'Login',
      registerBtn: 'Create Account',
      back: 'Back',
      asCustomer: 'As Customer',
      asBarbershop: 'As Barbershop'
    }
  };

  const t = texts[language] || texts.ar;
  const isMen = gender === 'male';

  React.useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await axios.get(`${API}/locations/countries`);
      setCountries(res.data.countries);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const fetchCities = async (countryCode) => {
    try {
      const res = await axios.get(`${API}/locations/cities/${countryCode}`);
      setCities(res.data.cities);
    } catch (err) {
      console.error('Failed to fetch cities:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, loginData);
      login(res.data.user, res.data.access_token, res.data.user_type);
      toast.success(language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login successful');
      
      if (res.data.user_type === 'admin') {
        navigate('/admin');
      } else if (res.data.user_type === 'barbershop') {
        navigate('/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!registerData.phone_number || !registerData.password || !registerData.full_name || !registerData.country || !registerData.city) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, registerData);
      login(res.data.user, res.data.access_token, res.data.user_type);
      toast.success(language === 'ar' ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully');
      navigate('/home');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBarbershop = async (e) => {
    e.preventDefault();
    if (!shopRegisterData.phone_number || !shopRegisterData.password || !shopRegisterData.owner_name || 
        !shopRegisterData.shop_name || !shopRegisterData.country || !shopRegisterData.city) {
      toast.error(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register-barbershop`, shopRegisterData);
      login(res.data.user, res.data.access_token, res.data.user_type);
      toast.success(language === 'ar' ? 'تم إنشاء حساب الصالون بنجاح' : 'Barbershop account created successfully');
      navigate('/profile-setup');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل إنشاء الحساب' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = isMen 
    ? 'bg-[#1F1F1F] border-[#262626] text-white placeholder:text-[#94A3B8] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20' 
    : 'bg-white border-[#E7E5E4] text-[#1C1917] placeholder:text-[#57534E] focus:border-[#B76E79] focus:ring-[#B76E79]/20';

  const labelClass = isMen ? 'text-[#94A3B8]' : 'text-[#57534E]';

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="auth-page">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage: isMen 
            ? 'url(https://images.unsplash.com/photo-1759134198561-e2041049419c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBiYXJiZXIlMjBzaG9wfGVufDB8fHx8MTc3NjE2ODQ1MXww&ixlib=rb-4.1.0&q=85)'
            : 'url(https://images.pexels.com/photos/7195799/pexels-photo-7195799.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      />

      <div className="relative z-10 max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/home')}
          className={`flex items-center gap-2 mb-8 ${isMen ? 'text-[#94A3B8] hover:text-[#D4AF37]' : 'text-[#57534E] hover:text-[#B76E79]'} transition-colors`}
          data-testid="back-btn"
        >
          {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          <span>{t.back}</span>
        </button>

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className={`text-3xl font-bold font-display ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
            BARBER HUB
          </h1>
        </div>

        {/* Auth Card */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-8 animate-scale-in`}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 mb-8 ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#F5F5F4]'}`}>
              <TabsTrigger 
                value="login" 
                className={`${isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}`}
                data-testid="login-tab"
              >
                {t.login}
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className={`${isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}`}
                data-testid="register-tab"
              >
                {t.register}
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className={labelClass}>{t.phone}</Label>
                  <div className="relative">
                    <Phone className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />
                    <Input
                      type="tel"
                      placeholder="+963 xxx xxx xxx"
                      value={loginData.phone_number}
                      onChange={(e) => setLoginData({ ...loginData, phone_number: e.target.value })}
                      className={`${inputClass} ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
                      data-testid="login-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={labelClass}>{t.password}</Label>
                  <div className="relative">
                    <Lock className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className={`${inputClass} ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
                      data-testid="login-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
                  data-testid="login-submit"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.loginBtn}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              {/* Account Type Toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  type="button"
                  variant={authType === 'user' ? 'default' : 'outline'}
                  onClick={() => setAuthType('user')}
                  className={`flex-1 ${authType === 'user' ? (isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white') : ''}`}
                >
                  <User className="w-4 h-4 me-2" />
                  {t.asCustomer}
                </Button>
                <Button
                  type="button"
                  variant={authType === 'barbershop' ? 'default' : 'outline'}
                  onClick={() => setAuthType('barbershop')}
                  className={`flex-1 ${authType === 'barbershop' ? (isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white') : ''}`}
                >
                  <Store className="w-4 h-4 me-2" />
                  {t.asBarbershop}
                </Button>
              </div>

              {/* User Registration */}
              {authType === 'user' && (
                <form onSubmit={handleRegisterUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>{t.name} *</Label>
                    <Input
                      value={registerData.full_name}
                      onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                      className={inputClass}
                      data-testid="register-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.phone} *</Label>
                    <Input
                      type="tel"
                      value={registerData.phone_number}
                      onChange={(e) => setRegisterData({ ...registerData, phone_number: e.target.value })}
                      className={inputClass}
                      data-testid="register-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.password} *</Label>
                    <Input
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className={inputClass}
                      data-testid="register-password"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={labelClass}>{t.country} *</Label>
                      <Select
                        value={registerData.country}
                        onValueChange={(val) => {
                          setRegisterData({ ...registerData, country: val, city: '' });
                          fetchCities(val);
                        }}
                      >
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder={t.selectCountry} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {language === 'ar' ? c.name : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className={labelClass}>{t.city} *</Label>
                      <Select
                        value={registerData.city}
                        onValueChange={(val) => setRegisterData({ ...registerData, city: val })}
                        disabled={!registerData.country}
                      >
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder={t.selectCity} />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
                    data-testid="register-submit"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.registerBtn}
                  </Button>
                </form>
              )}

              {/* Barbershop Registration */}
              {authType === 'barbershop' && (
                <form onSubmit={handleRegisterBarbershop} className="space-y-4">
                  <div className="space-y-2">
                    <Label className={labelClass}>{t.shopName} *</Label>
                    <Input
                      value={shopRegisterData.shop_name}
                      onChange={(e) => setShopRegisterData({ ...shopRegisterData, shop_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.ownerName} *</Label>
                    <Input
                      value={shopRegisterData.owner_name}
                      onChange={(e) => setShopRegisterData({ ...shopRegisterData, owner_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.phone} *</Label>
                    <Input
                      type="tel"
                      value={shopRegisterData.phone_number}
                      onChange={(e) => setShopRegisterData({ ...shopRegisterData, phone_number: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.password} *</Label>
                    <Input
                      type="password"
                      value={shopRegisterData.password}
                      onChange={(e) => setShopRegisterData({ ...shopRegisterData, password: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={labelClass}>{t.whatsapp}</Label>
                    <Input
                      type="tel"
                      value={shopRegisterData.whatsapp_number}
                      onChange={(e) => setShopRegisterData({ ...shopRegisterData, whatsapp_number: e.target.value })}
                      className={inputClass}
                      placeholder="+963935964158"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={labelClass}>{t.country} *</Label>
                      <Select
                        value={shopRegisterData.country}
                        onValueChange={(val) => {
                          setShopRegisterData({ ...shopRegisterData, country: val, city: '' });
                          fetchCities(val);
                        }}
                      >
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder={t.selectCountry} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {language === 'ar' ? c.name : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className={labelClass}>{t.city} *</Label>
                      <Select
                        value={shopRegisterData.city}
                        onValueChange={(val) => setShopRegisterData({ ...shopRegisterData, city: val })}
                        disabled={!shopRegisterData.country}
                      >
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder={t.selectCity} />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.registerBtn}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
