import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, Calendar, DollarSign, AlertTriangle, Check, X, 
  Loader2, Crown, Ban, CreditCard, LayoutDashboard, Shield
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { API, token, language, isAdmin, gender } = useApp();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      title: 'لوحة تحكم المدير الملكي 👑',
      totalRevenue: 'إجمالي الأرباح',
      activeSubscribers: 'المشتركين النشطين',
      newReports: 'بلاغات جديدة',
      pendingTransfers: 'طلبات بانتظار التحويل',
      subscriptionRequests: 'طلبات تفعيل الاشتراكات (يدوياً)',
      salonName: 'اسم الصالون',
      subscriptionType: 'نوع الاشتراك',
      expectedAmount: 'المبلغ المتوقع',
      action: 'الإجراء',
      activateAfterConfirm: 'تفعيل بعد التأكد',
      users: 'المستخدمون',
      reports: 'البلاغات',
      exit: 'خروج',
      loginRequired: 'يرجى تسجيل الدخول كمدير',
      noData: 'لا توجد بيانات',
      dismiss: 'رفض',
      warn: 'تحذير',
      ban: 'حظر'
    },
    en: {
      title: 'Royal Admin Dashboard 👑',
      totalRevenue: 'Total Revenue',
      activeSubscribers: 'Active Subscribers',
      newReports: 'New Reports',
      pendingTransfers: 'Pending Transfers',
      subscriptionRequests: 'Subscription Activation Requests (Manual)',
      salonName: 'Salon Name',
      subscriptionType: 'Subscription Type',
      expectedAmount: 'Expected Amount',
      action: 'Action',
      activateAfterConfirm: 'Activate After Confirm',
      users: 'Users',
      reports: 'Reports',
      exit: 'Exit',
      loginRequired: 'Please login as admin',
      noData: 'No data',
      dismiss: 'Dismiss',
      warn: 'Warn',
      ban: 'Ban'
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
      toast.success(language === 'ar' ? 'تم تفعيل الاشتراك' : 'Subscription activated');
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <p className="mb-4 text-gray-400">{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className="bg-yellow-500 text-black hover:bg-yellow-400">
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />
      </div>
    );
  }

  // Calculate estimated revenue
  const estimatedRevenue = (stats?.total_barbers || 0) * 100;

  return (
    <div className="min-h-screen bg-black text-white p-6" dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-black text-yellow-500">{t.title}</h1>
          <button onClick={() => navigate('/home')} className="bg-gray-800 px-4 py-2 rounded-lg text-xs hover:bg-gray-700 transition-colors">
            {t.exit}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl">
            <p className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-widest">{t.totalRevenue}</p>
            <p className="text-4xl font-black text-green-500 tracking-tighter">${estimatedRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl">
            <p className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-widest">{t.activeSubscribers}</p>
            <p className="text-4xl font-black">{stats?.total_barbers || 0}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl">
            <p className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-widest">{t.newReports}</p>
            <p className="text-4xl font-black text-red-500">{stats?.pending_reports || 0}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-xl">
            <p className="text-gray-500 text-xs mb-1 font-bold uppercase tracking-widest">{t.pendingTransfers}</p>
            <p className="text-4xl font-black text-yellow-500">{stats?.pending_subscriptions || 0}</p>
          </div>
        </div>

        {/* Subscription Management */}
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 mb-8">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-blue-400">
            <CreditCard size={20}/> {t.subscriptionRequests}
          </h3>
          {subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="pb-4">{t.salonName}</th>
                    <th className="pb-4">{t.subscriptionType}</th>
                    <th className="pb-4">{t.expectedAmount}</th>
                    <th className="pb-4">{t.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-800/30">
                      <td className="py-4 font-bold">{sub.user_id}</td>
                      <td className="py-4 font-bold text-purple-400 underline">{sub.subscription_type}</td>
                      <td className="py-4 text-yellow-500 font-black">{sub.price}€</td>
                      <td className="py-4">
                        <button 
                          onClick={() => approveSubscription(sub.id)}
                          className="bg-green-600 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-green-500 transition-colors"
                        >
                          {t.activateAfterConfirm}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>{t.noData}</p>
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 mb-8">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-red-400">
            <AlertTriangle size={20}/> {t.reports}
          </h3>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-gray-800/50 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold">{report.reported_user_id}</p>
                      <p className="text-sm text-gray-500">{report.reason}</p>
                      {report.description && (
                        <p className="text-xs text-gray-600 mt-1">{report.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveReport(report.id, 'dismiss')}
                      className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-600"
                    >
                      {t.dismiss}
                    </button>
                    <button
                      onClick={() => resolveReport(report.id, 'warn')}
                      className="bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-yellow-500"
                    >
                      <AlertTriangle size={12} className="inline me-1"/>
                      {t.warn}
                    </button>
                    <button
                      onClick={() => resolveReport(report.id, 'ban')}
                      className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-red-500"
                    >
                      <Ban size={12} className="inline me-1"/>
                      {t.ban}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>{t.noData}</p>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
          <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-blue-400">
            <Users size={20}/> {t.users}
          </h3>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="text-gray-500 border-b border-gray-800">
                  <tr>
                    <th className="pb-4">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                    <th className="pb-4">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                    <th className="pb-4">{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="pb-4">{language === 'ar' ? 'الدولة' : 'Country'}</th>
                    <th className="pb-4">{language === 'ar' ? 'الاشتراك' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30">
                      <td className="py-4 font-bold">{user.name}</td>
                      <td className="py-4 text-gray-400">{user.phone}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.user_type === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                          user.user_type === 'barber' ? 'bg-blue-500/20 text-blue-400' :
                          user.user_type === 'salon' ? 'bg-pink-500/20 text-pink-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.user_type}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400">{user.country}</td>
                      <td className="py-4">
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
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>{t.noData}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="fixed bottom-4 left-4 flex gap-2 z-[100] scale-75 opacity-50 hover:opacity-100 transition-opacity">
        <button onClick={() => navigate('/')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'الرئيسية' : 'Home'}
        </button>
        <button onClick={() => navigate('/payment')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
          {language === 'ar' ? 'الدفع' : 'Payment'}
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
