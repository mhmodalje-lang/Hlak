import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowRight, ArrowLeft, Calendar, Clock, Star, 
  Check, X, Loader2, Settings, QrCode, Users,
  DollarSign, BarChart, Crown
} from 'lucide-react';

const BarberDashboard = () => {
  const navigate = useNavigate();
  const { API, gender, user, token, language, themeClass, isAuthenticated, isBarber } = useApp();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      dashboard: 'لوحة التحكم',
      profile: 'الملف الشخصي',
      bookings: 'الحجوزات',
      stats: 'الإحصائيات',
      editProfile: 'تعديل الملف',
      qrCode: 'رمز QR',
      todayBookings: 'حجوزات اليوم',
      totalBookings: 'إجمالي الحجوزات',
      rating: 'التقييم',
      reviews: 'التقييمات',
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      confirm: 'تأكيد',
      complete: 'إتمام',
      noBookings: 'لا توجد حجوزات',
      subscription: 'الاشتراك',
      subscriptionInactive: 'غير مفعل',
      subscriptionActive: 'مفعل',
      activateNow: 'فعّل الآن',
      setupProfile: 'إعداد الملف الشخصي',
      noProfile: 'لم يتم إنشاء الملف الشخصي بعد',
      loginRequired: 'يرجى تسجيل الدخول كحلاق'
    },
    en: {
      dashboard: 'Dashboard',
      profile: 'Profile',
      bookings: 'Bookings',
      stats: 'Statistics',
      editProfile: 'Edit Profile',
      qrCode: 'QR Code',
      todayBookings: "Today's Bookings",
      totalBookings: 'Total Bookings',
      rating: 'Rating',
      reviews: 'Reviews',
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      confirm: 'Confirm',
      complete: 'Complete',
      noBookings: 'No bookings',
      subscription: 'Subscription',
      subscriptionInactive: 'Inactive',
      subscriptionActive: 'Active',
      activateNow: 'Activate Now',
      setupProfile: 'Setup Profile',
      noProfile: 'Profile not created yet',
      loginRequired: 'Please login as barber'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    if (isAuthenticated && isBarber) {
      fetchProfile();
      fetchBookings();
    }
  }, [isAuthenticated, isBarber]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/barbers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  if (!isAuthenticated || !isBarber) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`mb-4 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center px-4`}>
        <div className="text-center">
          <Settings className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <p className={`mb-4 text-xl ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.noProfile}</p>
          <Button onClick={() => navigate('/profile-setup')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {t.setupProfile}
          </Button>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="barber-dashboard">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/home')}
              className={`p-2 rounded-full ${isMen ? 'bg-[#1F1F1F] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            >
              {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
            </button>
            <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {t.dashboard}
            </h1>
          </div>
          <Button onClick={() => navigate('/profile-setup')} variant="outline" size="sm">
            <Settings className="w-4 h-4 me-2" />
            {t.editProfile}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Calendar className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {todayBookings.length}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.todayBookings}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Users className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.total_bookings}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.totalBookings}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <Star className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.rating?.toFixed(1) || '0.0'}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.rating}</p>
          </div>
          <div className={`stat-card ${isMen ? 'card-men' : 'card-women'}`}>
            <BarChart className={`w-8 h-8 mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {profile.total_reviews}
            </p>
            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.reviews}</p>
          </div>
        </div>

        {/* Subscription Status */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className={`w-6 h-6 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              <div>
                <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.subscription}</p>
                <p className={user?.subscription_status === 'active' ? 'text-green-500' : 'text-yellow-500'}>
                  {user?.subscription_status === 'active' ? t.subscriptionActive : t.subscriptionInactive}
                </p>
              </div>
            </div>
            {user?.subscription_status !== 'active' && (
              <Button onClick={() => navigate('/payment')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
                {t.activateNow}
              </Button>
            )}
          </div>
        </div>

        {/* QR Code */}
        {profile.qr_code && (
          <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`}>
            <h3 className={`font-bold mb-4 flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <QrCode className="w-5 h-5" />
              {t.qrCode}
            </h3>
            <div className="flex justify-center">
              <div className="qr-container">
                <img src={`data:image/png;base64,${profile.qr_code}`} alt="QR Code" className="w-32 h-32" />
              </div>
            </div>
            <p className={`text-center mt-2 text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {language === 'ar' ? 'اطبعه وضعه على باب الصالون' : 'Print and place at your salon door'}
            </p>
          </div>
        )}

        {/* Bookings Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className={`grid w-full grid-cols-3 mb-4 ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#F5F5F4]'}`}>
            <TabsTrigger value="pending" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {t.pending} ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {t.confirmed} ({confirmedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="today" className={isMen ? 'data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black' : 'data-[state=active]:bg-[#B76E79] data-[state=active]:text-white'}>
              {language === 'ar' ? 'اليوم' : 'Today'} ({todayBookings.length})
            </TabsTrigger>
          </TabsList>

          {['pending', 'confirmed', 'today'].map((tab) => {
            const filteredBookings = tab === 'today' ? todayBookings : bookings.filter(b => b.status === tab);
            return (
              <TabsContent key={tab} value={tab}>
                {filteredBookings.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBookings.map((booking) => (
                      <div key={booking.id} className={`${isMen ? 'card-men' : 'card-women'} p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                              {booking.customer_name}
                            </p>
                            <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                              {booking.customer_phone}
                            </p>
                          </div>
                          <div className="text-end">
                            <p className={isMen ? 'text-white' : 'text-[#1C1917]'}>{booking.date}</p>
                            <p className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{booking.time}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {booking.services?.map((s, i) => (
                            <span key={i} className={`text-xs px-2 py-1 rounded ${isMen ? 'bg-[#262626] text-white' : 'bg-[#E7E5E4] text-[#1C1917]'}`}>
                              {language === 'ar' ? s.name_ar : s.name}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          {booking.status === 'pending' && (
                            <Button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              size="sm"
                              className={isMen ? 'btn-primary-men' : 'btn-primary-women'}
                            >
                              <Check className="w-4 h-4 me-1" />
                              {t.confirm}
                            </Button>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button
                              onClick={() => updateBookingStatus(booking.id, 'completed')}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 me-1" />
                              {t.complete}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className={`w-12 h-12 mx-auto mb-2 ${isMen ? 'text-[#262626]' : 'text-[#E7E5E4]'}`} />
                    <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.noBookings}</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};

export default BarberDashboard;
