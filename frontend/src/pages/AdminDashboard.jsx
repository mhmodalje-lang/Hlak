import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowRight, ArrowLeft, Users, Calendar, DollarSign, 
  AlertTriangle, Check, X, Loader2, BarChart, Shield,
  Crown, Ban
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { API, token, language, isAdmin } = useApp();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const texts = {
    ar: {
      dashboard: 'لوحة تحكم المدير',
      overview: 'نظرة عامة',
      users: 'المستخدمون',
      subscriptions: 'الاشتراكات',
      reports: 'البلاغات',
      totalUsers: 'إجمالي المستخدمين',
      totalBarbers: 'الحلاقين والصالونات',
      totalBookings: 'إجمالي الحجوزات',
      todayBookings: 'حجوزات اليوم',
      pendingSubscriptions: 'اشتراكات معلقة',
      pendingReports: 'بلاغات معلقة',
      approve: 'موافقة',
      reject: 'رفض',
      dismiss: 'رفض البلاغ',
      warn: 'تحذير',
      ban: 'حظر',
      loginRequired: 'يرجى تسجيل الدخول كمدير',
      noData: 'لا توجد بيانات',
      type: 'النوع',
      price: 'السعر',
      status: 'الحالة',
      action: 'الإجراء',
      reason: 'السبب',
      currency: '€'
    },
    en: {
      dashboard: 'Admin Dashboard',
      overview: 'Overview',
      users: 'Users',
      subscriptions: 'Subscriptions',
      reports: 'Reports',
      totalUsers: 'Total Users',
      totalBarbers: 'Barbers & Salons',
      totalBookings: 'Total Bookings',
      todayBookings: "Today's Bookings",
      pendingSubscriptions: 'Pending Subscriptions',
      pendingReports: 'Pending Reports',
      approve: 'Approve',
      reject: 'Reject',
      dismiss: 'Dismiss',
      warn: 'Warn',
      ban: 'Ban',
      loginRequired: 'Please login as admin',
      noData: 'No data',
      type: 'Type',
      price: 'Price',
      status: 'Status',
      action: 'Action',
      reason: 'Reason',
      currency: '€'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, subsRes, reportsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/subscriptions`, { headers }),
        axios.get(`${API}/admin/reports`, { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setSubscriptions(subsRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const approveSubscription = async (subId) => {
    try {
      await axios.put(`${API}/admin/subscriptions/${subId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم الموافقة على الاشتراك' : 'Subscription approved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await axios.put(`${API}/admin/reports/${reportId}/resolve?action=${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === 'ar' ? 'تم معالجة البلاغ' : 'Report resolved');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen theme-men flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
          <p className="mb-4 text-[#94A3B8]">{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className="btn-primary-men">
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen theme-men flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-men py-8 px-4" data-testid="admin-dashboard">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-full bg-[#1F1F1F] text-white"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4AF37]" />
            {t.dashboard}
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="stat-card card-men">
            <Users className="w-6 h-6 mb-2 text-[#D4AF37]" />
            <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.totalUsers}</p>
          </div>
          <div className="stat-card card-men">
            <Crown className="w-6 h-6 mb-2 text-[#D4AF37]" />
            <p className="text-2xl font-bold text-white">{stats?.total_barbers || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.totalBarbers}</p>
          </div>
          <div className="stat-card card-men">
            <Calendar className="w-6 h-6 mb-2 text-[#D4AF37]" />
            <p className="text-2xl font-bold text-white">{stats?.total_bookings || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.totalBookings}</p>
          </div>
          <div className="stat-card card-men">
            <BarChart className="w-6 h-6 mb-2 text-[#D4AF37]" />
            <p className="text-2xl font-bold text-white">{stats?.today_bookings || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.todayBookings}</p>
          </div>
          <div className="stat-card card-men">
            <DollarSign className="w-6 h-6 mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-white">{stats?.pending_subscriptions || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.pendingSubscriptions}</p>
          </div>
          <div className="stat-card card-men">
            <AlertTriangle className="w-6 h-6 mb-2 text-red-500" />
            <p className="text-2xl font-bold text-white">{stats?.pending_reports || 0}</p>
            <p className="text-xs text-[#94A3B8]">{t.pendingReports}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-[#1F1F1F]">
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              {t.subscriptions}
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              {t.reports}
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-black">
              {t.users}
            </TabsTrigger>
          </TabsList>

          {/* Subscriptions */}
          <TabsContent value="subscriptions">
            {subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="card-men p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{sub.user_id}</p>
                      <p className="text-sm text-[#94A3B8]">
                        {t.type}: {sub.subscription_type} • {t.price}: {sub.price}{t.currency}
                      </p>
                    </div>
                    <Button
                      onClick={() => approveSubscription(sub.id)}
                      size="sm"
                      className="btn-primary-men"
                    >
                      <Check className="w-4 h-4 me-1" />
                      {t.approve}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto mb-2 text-[#262626]" />
                <p className="text-[#94A3B8]">{t.noData}</p>
              </div>
            )}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="card-men p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-white font-medium">{report.reported_user_id}</p>
                        <p className="text-sm text-[#94A3B8]">
                          {t.reason}: {report.reason}
                        </p>
                        {report.description && (
                          <p className="text-sm text-[#94A3B8] mt-1">{report.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => resolveReport(report.id, 'dismiss')}
                        size="sm"
                        variant="outline"
                        className="border-gray-500 text-gray-400"
                      >
                        {t.dismiss}
                      </Button>
                      <Button
                        onClick={() => resolveReport(report.id, 'warn')}
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        <AlertTriangle className="w-4 h-4 me-1" />
                        {t.warn}
                      </Button>
                      <Button
                        onClick={() => resolveReport(report.id, 'ban')}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Ban className="w-4 h-4 me-1" />
                        {t.ban}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-[#262626]" />
                <p className="text-[#94A3B8]">{t.noData}</p>
              </div>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            {users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#262626]">
                      <th className="text-start py-3 text-[#94A3B8] font-medium">
                        {language === 'ar' ? 'الاسم' : 'Name'}
                      </th>
                      <th className="text-start py-3 text-[#94A3B8] font-medium">
                        {language === 'ar' ? 'الهاتف' : 'Phone'}
                      </th>
                      <th className="text-start py-3 text-[#94A3B8] font-medium">
                        {language === 'ar' ? 'النوع' : 'Type'}
                      </th>
                      <th className="text-start py-3 text-[#94A3B8] font-medium">
                        {language === 'ar' ? 'الاشتراك' : 'Subscription'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-[#262626]">
                        <td className="py-3 text-white">{user.name}</td>
                        <td className="py-3 text-[#94A3B8]">{user.phone}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.user_type === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                            user.user_type === 'barber' ? 'bg-blue-500/20 text-blue-400' :
                            user.user_type === 'salon' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.user_type}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {user.subscription_status || 'inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-2 text-[#262626]" />
                <p className="text-[#94A3B8]">{t.noData}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
