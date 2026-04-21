import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Users, Calendar, DollarSign, AlertTriangle, Check, X,
  Loader2, Crown, Ban, CreditCard, LayoutDashboard, Shield,
  Megaphone, TrendingUp, Store, UserPlus, Wallet, Image as ImageIcon,
  MapPin, Plus, Trash2, Edit, ReceiptText, Phone
} from 'lucide-react';
import AdminRankingPanel from '@/components/AdminRankingPanel';
import AdminReviewModeration from '@/components/AdminReviewModeration';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { API, token, language, isAdmin, user } = useApp();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [sponsoredAds, setSponsoredAds] = useState([]);
  const [pendingShops, setPendingShops] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [agents, setAgents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isRTL = language === 'ar';
  const isMaster = user?.is_master || user?.role === 'master_admin';

  const t = isRTL ? {
    title: 'لوحة تحكم المدير الرئيسي',
    overview: 'نظرة عامة',
    approvals: 'موافقات الصالونات',
    receipts: 'إيصالات الدفع',
    wallets: 'المحافظ',
    agents: 'الوكلاء',
    misc: 'متفرقات',
    totalRevenue: 'إجمالي الأرباح',
    activeSubscribers: 'المشتركين النشطين',
    newReports: 'بلاغات جديدة',
    pendingTransfers: 'طلبات بانتظار التحويل',
    pendingApprovals: 'صالونات بانتظار الموافقة',
    subscriptionRequests: 'طلبات تفعيل الاشتراكات (يدوياً)',
    salonName: 'اسم الصالون',
    subscriptionType: 'نوع الاشتراك',
    expectedAmount: 'المبلغ المتوقع',
    action: 'الإجراء',
    activateAfterConfirm: 'تفعيل',
    exit: 'خروج',
    loginRequired: 'يرجى تسجيل الدخول كمدير',
    noData: 'لا توجد بيانات',
    dismiss: 'رفض',
    warn: 'تحذير',
    ban: 'حظر',
    approve: 'قبول',
    reject: 'رفض',
    rejectReason: 'سبب الرفض',
    city: 'المدينة',
    country: 'الدولة',
    phone: 'الهاتف',
    owner: 'المالك',
    addMethod: 'إضافة طريقة دفع',
    addAgent: 'إضافة وكيل',
    methodName: 'اسم الطريقة',
    recipient: 'المستلم',
    number: 'الرقم',
    enabled: 'مفعل',
    disabled: 'معطل',
    commission: 'العمولة',
    save: 'حفظ',
    cancel: 'إلغاء',
    fullName: 'الاسم الكامل',
    password: 'كلمة المرور',
    amount: 'المبلغ',
    method: 'الطريقة',
    status: 'الحالة',
    date: 'التاريخ',
    viewReceipt: 'عرض الإيصال',
    pending: 'قيد الانتظار',
    approved: 'مقبول',
    rejected: 'مرفوض',
  } : {
    title: 'Master Admin Dashboard',
    overview: 'Overview',
    approvals: 'Shop Approvals',
    receipts: 'Payment Receipts',
    wallets: 'Wallets',
    agents: 'Agents',
    misc: 'More',
    totalRevenue: 'Total Revenue',
    activeSubscribers: 'Active Subscribers',
    newReports: 'New Reports',
    pendingTransfers: 'Pending Transfers',
    pendingApprovals: 'Pending Shop Approvals',
    subscriptionRequests: 'Subscription Activation Requests',
    salonName: 'Salon Name',
    subscriptionType: 'Subscription Type',
    expectedAmount: 'Expected Amount',
    action: 'Action',
    activateAfterConfirm: 'Activate',
    exit: 'Exit',
    loginRequired: 'Please login as admin',
    noData: 'No data',
    dismiss: 'Dismiss',
    warn: 'Warn',
    ban: 'Ban',
    approve: 'Approve',
    reject: 'Reject',
    rejectReason: 'Rejection reason',
    city: 'City',
    country: 'Country',
    phone: 'Phone',
    owner: 'Owner',
    addMethod: 'Add payment method',
    addAgent: 'Add agent',
    methodName: 'Method name',
    recipient: 'Recipient',
    number: 'Number',
    enabled: 'Enabled',
    disabled: 'Disabled',
    commission: 'Commission',
    save: 'Save',
    cancel: 'Cancel',
    fullName: 'Full name',
    password: 'Password',
    amount: 'Amount',
    method: 'Method',
    status: 'Status',
    date: 'Date',
    viewReceipt: 'View receipt',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, subsRes, reportsRes, adsRes, pendingRes, methodsRes, agentsRes, receiptsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: authHeaders }).catch(() => ({ data: null })),
        axios.get(`${API}/admin/users`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/subscriptions`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/reports`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/sponsored/pending`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/pending-barbershops`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/payment-methods?all=true`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/agents`, { headers: authHeaders }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/payment-receipts`, { headers: authHeaders }).catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data || []);
      setSubscriptions(subsRes.data || []);
      setReports(reportsRes.data || []);
      setSponsoredAds(adsRes.data || []);
      setPendingShops(pendingRes.data || []);
      setPaymentMethods(methodsRes.data || []);
      setAgents(agentsRes.data || []);
      setReceipts(receiptsRes.data || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API, token]); // eslint-disable-line

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const approveSubscription = async (subId) => {
    try {
      await axios.put(`${API}/admin/subscriptions/${subId}/approve`, {}, { headers: authHeaders });
      toast.success(isRTL ? 'تم تفعيل الاشتراك' : 'Subscription activated');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const resolveReport = async (reportId, action) => {
    try {
      await axios.put(`${API}/admin/reports/${reportId}/resolve?action=${action}`, {}, { headers: authHeaders });
      toast.success(isRTL ? 'تم معالجة البلاغ' : 'Report resolved');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleAdAction = async (adId, action) => {
    try {
      await axios.put(`${API}/admin/sponsored/${adId}/${action}`, {}, { headers: authHeaders });
      toast.success(isRTL ? (action === 'approve' ? 'تم التفعيل' : 'تم الرفض') : (action === 'approve' ? 'Approved' : 'Rejected'));
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const approveShop = async (shopId) => {
    try {
      await axios.put(`${API}/admin/barbershops/${shopId}/approve`, {}, { headers: authHeaders });
      toast.success(isRTL ? '✅ تم قبول الصالون' : 'Shop approved');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const rejectShop = async (shopId) => {
    const reason = prompt(isRTL ? 'سبب الرفض:' : 'Rejection reason:');
    if (!reason || reason.length < 3) return;
    try {
      await axios.put(`${API}/admin/barbershops/${shopId}/reject`, { reason }, { headers: authHeaders });
      toast.success(isRTL ? 'تم رفض الصالون' : 'Shop rejected');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const approveReceipt = async (id) => {
    try {
      await axios.put(`${API}/admin/payment-receipts/${id}/approve`, {}, { headers: authHeaders });
      toast.success(isRTL ? 'تم قبول الإيصال' : 'Receipt approved');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const rejectReceipt = async (id) => {
    const reason = prompt(isRTL ? 'سبب الرفض:' : 'Rejection reason:');
    if (!reason) return;
    try {
      await axios.put(`${API}/admin/payment-receipts/${id}/reject`, { rejection_reason: reason }, { headers: authHeaders });
      toast.success(isRTL ? 'تم رفض الإيصال' : 'Receipt rejected');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <p className="mb-4 text-gray-400">{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className="bg-yellow-500 text-black hover:bg-yellow-400" data-testid="admin-login-redirect-btn">
            {isRTL ? 'تسجيل الدخول' : 'Login'}
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

  const estimatedRevenue = (stats?.total_barbers || 0) * 100;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="admin-dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-yellow-500 flex items-center gap-2">
              <Crown className="w-7 h-7" /> {t.title}
            </h1>
            {isMaster && (
              <span className="text-[10px] uppercase tracking-widest text-yellow-400/70 mt-1 inline-block">
                {isRTL ? '👑 المالك الأعلى' : '👑 Master Owner'}
              </span>
            )}
          </div>
          <button onClick={() => navigate('/home')} className="bg-gray-800 px-3 py-2 rounded-lg text-xs hover:bg-gray-700 transition-colors" data-testid="admin-exit-btn">
            {t.exit}
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900/60 border border-gray-800 w-full justify-start overflow-x-auto flex-nowrap flex gap-1 p-1 mb-6">
            <TabsTrigger value="overview" data-testid="tab-overview">{t.overview}</TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              {t.approvals} {pendingShops.length > 0 && <span className="ms-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingShops.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="receipts" data-testid="tab-receipts">
              {t.receipts} {receipts.filter(r => r.status === 'pending').length > 0 && <span className="ms-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{receipts.filter(r => r.status === 'pending').length}</span>}
            </TabsTrigger>
            <TabsTrigger value="wallets" data-testid="tab-wallets">{t.wallets}</TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents">{t.agents}</TabsTrigger>
            <TabsTrigger value="misc" data-testid="tab-misc">{t.misc}</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard title={t.totalRevenue} value={`$${estimatedRevenue.toLocaleString()}`} color="text-green-500" />
              <StatCard title={t.activeSubscribers} value={stats?.total_barbers || 0} />
              <StatCard title={t.newReports} value={stats?.pending_reports || 0} color="text-red-500" />
              <StatCard title={t.pendingApprovals} value={pendingShops.length} color="text-yellow-500" />
            </div>

            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-400">
                <CreditCard size={18}/> {t.subscriptionRequests}
              </h3>
              {subscriptions.length > 0 ? (
                <div className="space-y-2">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                      <div>
                        <p className="font-bold text-sm">{sub.user_id}</p>
                        <p className="text-xs text-gray-400">{sub.subscription_type} · {sub.price}€</p>
                      </div>
                      <button onClick={() => approveSubscription(sub.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold" data-testid={`approve-sub-${sub.id}`}>
                        <Check size={12} className="inline me-1"/>{t.activateAfterConfirm}
                      </button>
                    </div>
                  ))}
                </div>
              ) : <EmptyRow icon={<CreditCard className="w-10 h-10 opacity-30"/>} text={t.noData} />}
            </div>
          </TabsContent>

          {/* Approvals */}
          <TabsContent value="approvals">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-yellow-400">
                <Store size={18}/> {t.pendingApprovals}
                <span className="ms-2 text-sm text-gray-500">({pendingShops.length})</span>
              </h3>
              {pendingShops.length > 0 ? (
                <div className="space-y-3">
                  {pendingShops.map(s => (
                    <div key={s.id} className="bg-gray-800/50 rounded-xl p-4 flex flex-wrap items-center gap-4" data-testid={`pending-shop-${s.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white">{s.shop_name} <span className="text-xs font-normal text-gray-500">({s.shop_type})</span></p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin size={11}/>{s.city || '-'}, {s.country || '-'}</span>
                          <span className="flex items-center gap-1"><Phone size={11}/>{s.phone_number}</span>
                          <span className="text-gray-500">· {t.owner}: {s.owner_name}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveShop(s.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold" data-testid={`approve-shop-${s.id}`}>
                          <Check size={12} className="inline me-1"/>{t.approve}
                        </button>
                        <button onClick={() => rejectShop(s.id)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold" data-testid={`reject-shop-${s.id}`}>
                          <X size={12} className="inline me-1"/>{t.reject}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyRow icon={<Store className="w-10 h-10 opacity-30"/>} text={t.noData} />}
            </div>
          </TabsContent>

          {/* Receipts */}
          <TabsContent value="receipts">
            <ReceiptsPanel
              receipts={receipts}
              onApprove={approveReceipt}
              onReject={rejectReceipt}
              t={t}
              isRTL={isRTL}
            />
          </TabsContent>

          {/* Wallets */}
          <TabsContent value="wallets">
            <WalletsPanel API={API} token={token} methods={paymentMethods} onChanged={fetchData} t={t} isRTL={isRTL} />
          </TabsContent>

          {/* Agents */}
          <TabsContent value="agents">
            <AgentsPanel API={API} token={token} agents={agents} onChanged={fetchData} t={t} isRTL={isRTL} isMaster={isMaster} />
          </TabsContent>

          {/* Misc */}
          <TabsContent value="misc">
            <AdminRankingPanel API={API} token={token} language={language} />
            <AdminReviewModeration API={API} token={token} language={language} />

            {/* Sponsored Ads */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6" data-testid="admin-sponsored-section">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-amber-400">
                <Megaphone size={18}/> {isRTL ? 'طلبات الإعلانات الممولة' : 'Sponsored Ad Requests'}
              </h3>
              {sponsoredAds.length > 0 ? (
                <div className="space-y-3">
                  {sponsoredAds.map(ad => (
                    <div key={ad.id} className="bg-gray-800/50 rounded-xl p-3 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{ad.shop_name}</p>
                        <p className="text-[11px] text-gray-400">{ad.city}, {ad.country} · {ad.price_eur}€ · {ad.duration_days}{isRTL ? ' يوم' : 'd'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAdAction(ad.id, 'approve')} className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold" data-testid={`approve-ad-${ad.id}`}>{t.approve}</button>
                        <button onClick={() => handleAdAction(ad.id, 'reject')} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold" data-testid={`reject-ad-${ad.id}`}>{t.reject}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyRow icon={<Megaphone className="w-10 h-10 opacity-30"/>} text={t.noData} />}
            </div>

            {/* Reports */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-400">
                <AlertTriangle size={18}/> {isRTL ? 'البلاغات' : 'Reports'}
              </h3>
              {reports.length > 0 ? (
                <div className="space-y-2">
                  {reports.map(report => (
                    <div key={report.id} className="bg-gray-800/50 rounded-xl p-3">
                      <p className="font-bold text-sm">{report.reported_user_id}</p>
                      <p className="text-xs text-gray-500">{report.reason}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => resolveReport(report.id, 'dismiss')} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-bold">{t.dismiss}</button>
                        <button onClick={() => resolveReport(report.id, 'warn')} className="bg-yellow-600 text-white px-3 py-1 rounded-full text-xs font-bold">{t.warn}</button>
                        <button onClick={() => resolveReport(report.id, 'ban')} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">{t.ban}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <EmptyRow icon={<AlertTriangle className="w-10 h-10 opacity-30"/>} text={t.noData} />}
            </div>

            {/* Users */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-400">
                <Users size={18}/> {isRTL ? 'المستخدمون' : 'Users'} <span className="text-gray-500 text-sm">({users.length})</span>
              </h3>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs">
                  <thead className="text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="py-2 text-start">{isRTL ? 'الاسم' : 'Name'}</th>
                      <th className="py-2 text-start">{t.phone}</th>
                      <th className="py-2 text-start">{t.country}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {users.slice(0, 50).map(u => (
                      <tr key={u.id}>
                        <td className="py-2 font-bold">{u.name || u.full_name}</td>
                        <td className="py-2 text-gray-400">{u.phone || u.phone_number}</td>
                        <td className="py-2 text-gray-400">{u.country || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ========== Sub components ==========

const StatCard = ({ title, value, color = '' }) => (
  <div className="bg-gray-900 p-4 md:p-5 rounded-2xl border border-gray-800 shadow-xl">
    <p className="text-gray-500 text-[10px] md:text-xs mb-1 font-bold uppercase tracking-wider">{title}</p>
    <p className={`text-2xl md:text-3xl font-black ${color} tracking-tight`}>{value}</p>
  </div>
);

const EmptyRow = ({ icon, text }) => (
  <div className="text-center py-6 text-gray-500 flex flex-col items-center">
    {icon}<p className="mt-2 text-sm">{text}</p>
  </div>
);

const ReceiptsPanel = ({ receipts, onApprove, onReject, t, isRTL }) => {
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const filtered = receipts.filter(r => statusFilter === 'all' || r.status === statusFilter);
  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800" data-testid="receipts-panel">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-400">
          <ReceiptText size={18}/> {t.receipts}
        </h3>
        <div className="flex gap-1 text-xs">
          {['pending', 'approved', 'rejected', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full font-bold ${statusFilter === s ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
              {t[s] || s}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <EmptyRow icon={<ReceiptText className="w-10 h-10 opacity-30"/>} text={t.noData} />
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-gray-800/50 rounded-xl p-3 flex flex-wrap items-center gap-3" data-testid={`receipt-${r.id}`}>
              {r.receipt_image && (
                <img src={r.receipt_image} alt="receipt" onClick={() => setSelected(r.receipt_image)} className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-yellow-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{r.amount} {r.currency} <span className="text-xs font-normal text-gray-500">· {r.method_name || '-'}</span></p>
                <p className="text-[11px] text-gray-400">{r.target_type} · {r.payer_name || '-'} · {r.payer_phone || '-'}</p>
                <p className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                r.status === 'approved' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>{t[r.status] || r.status}</span>
              {r.status === 'pending' && (
                <div className="flex gap-1">
                  <button onClick={() => onApprove(r.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold" data-testid={`approve-receipt-${r.id}`}>{t.approve}</button>
                  <button onClick={() => onReject(r.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold" data-testid={`reject-receipt-${r.id}`}>{t.reject}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div onClick={() => setSelected(null)} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer">
          <img src={selected} alt="receipt full" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
};

const WalletsPanel = ({ API, token, methods, onChanged, t, isRTL }) => {
  const [form, setForm] = useState(null);
  const authHeaders = { Authorization: `Bearer ${token}` };
  const startCreate = () => setForm({ id: null, country: 'SY', country_name: '', name_ar: '', name_en: '', recipient: '', number: '', qr_image: '', icon: 'smartphone', enabled: true, kind: 'mobile_wallet', order: 1 });
  const startEdit = async (m) => {
    try {
      const r = await axios.get(`${API}/payment-methods/${m.id}`);
      setForm({ ...m, ...r.data });
    } catch {
      setForm({ ...m });
    }
  };

  const save = async () => {
    if (!form.name_ar || !form.country) { toast.error(isRTL ? 'عبّئ الحقول المطلوبة' : 'Fill required fields'); return; }
    try {
      if (form.id) {
        await axios.put(`${API}/admin/payment-methods/${form.id}`, form, { headers: authHeaders });
        toast.success(isRTL ? 'تم التحديث' : 'Updated');
      } else {
        await axios.post(`${API}/admin/payment-methods`, form, { headers: authHeaders });
        toast.success(isRTL ? 'تمت الإضافة' : 'Added');
      }
      setForm(null);
      onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const remove = async (id) => {
    if (!window.confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
    try {
      await axios.delete(`${API}/admin/payment-methods/${id}`, { headers: authHeaders });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const uploadQR = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error(isRTL ? 'حجم الصورة كبير (حد أقصى 3MB)' : 'Image too large (max 3MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, qr_image: reader.result });
    reader.readAsDataURL(f);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800" data-testid="wallets-panel">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-lg flex items-center gap-2 text-blue-400">
          <Wallet size={18}/> {t.wallets} <span className="text-gray-500 text-sm">({methods.length})</span>
        </h3>
        <button onClick={startCreate} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1" data-testid="add-wallet-btn">
          <Plus size={12}/>{t.addMethod}
        </button>
      </div>

      {form && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-yellow-500/30 space-y-2" data-testid="wallet-form">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder={t.country + ' (ISO 2)'} value={form.country} onChange={e => setForm({...form, country: e.target.value.toUpperCase()})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" />
            <input placeholder={isRTL ? 'اسم الدولة' : 'Country name'} value={form.country_name || ''} onChange={e => setForm({...form, country_name: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" />
            <input placeholder={t.methodName + ' (AR)'} value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="wallet-name-ar-input" />
            <input placeholder={t.methodName + ' (EN)'} value={form.name_en || ''} onChange={e => setForm({...form, name_en: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" />
            <input placeholder={t.recipient} value={form.recipient || ''} onChange={e => setForm({...form, recipient: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" />
            <input placeholder={t.number} value={form.number || ''} onChange={e => setForm({...form, number: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="wallet-number-input" />
            <select value={form.kind} onChange={e => setForm({...form, kind: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm">
              <option value="mobile_wallet">Mobile Wallet</option>
              <option value="hawala">Hawala</option>
              <option value="bank">Bank</option>
              <option value="wire">Wire / Western Union</option>
              <option value="crypto">Crypto</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} />
              {t.enabled}
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-400">{isRTL ? 'صورة QR (اختياري)' : 'QR image (optional)'}</label>
            <input type="file" accept="image/*" onChange={uploadQR} className="block text-xs mt-1" />
            {form.qr_image && <img src={form.qr_image} alt="qr preview" className="w-24 h-24 mt-2 rounded border border-gray-700" />}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={save} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold" data-testid="wallet-save-btn">{t.save}</button>
            <button onClick={() => setForm(null)} className="bg-gray-700 text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {methods.map(m => (
          <div key={m.id} className="bg-gray-800/50 rounded-xl p-3 flex flex-wrap items-center gap-3" data-testid={`wallet-row-${m.id}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{isRTL ? m.name_ar : (m.name_en || m.name_ar)} <span className="text-[10px] text-gray-500 ms-1">({m.country})</span></p>
              <p className="text-[11px] text-gray-400">{m.recipient} · {m.number}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.enabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
              {m.enabled ? t.enabled : t.disabled}
            </span>
            <div className="flex gap-1">
              <button onClick={() => startEdit(m)} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-full" data-testid={`edit-wallet-${m.id}`}><Edit size={12}/></button>
              <button onClick={() => remove(m.id)} className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full" data-testid={`delete-wallet-${m.id}`}><Trash2 size={12}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AgentsPanel = ({ API, token, agents, onChanged, t, isRTL, isMaster }) => {
  const [form, setForm] = useState(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  if (!isMaster) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3"/>
        <p className="text-gray-400">{isRTL ? 'إدارة الوكلاء مقتصرة على المالك الأعلى.' : 'Only Master Admin can manage agents.'}</p>
      </div>
    );
  }

  const startCreate = () => setForm({ full_name: '', phone_number: '', password: '', email: '', country: '', city: '', commission_percent: 10 });

  const save = async () => {
    if (!form.full_name || !form.phone_number || !form.password || !form.city) {
      toast.error(isRTL ? 'عبّئ كل الحقول المطلوبة' : 'Fill required fields'); return;
    }
    try {
      await axios.post(`${API}/admin/agents`, form, { headers: authHeaders });
      toast.success(isRTL ? 'تم إنشاء الوكيل' : 'Agent created');
      setForm(null); onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const toggleActive = async (a) => {
    try {
      await axios.put(`${API}/admin/agents/${a.id}`, { active: !a.active }, { headers: authHeaders });
      onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const remove = async (id) => {
    if (!window.confirm(isRTL ? 'حذف الوكيل؟' : 'Delete agent?')) return;
    try {
      await axios.delete(`${API}/admin/agents/${id}`, { headers: authHeaders });
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      onChanged();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800" data-testid="agents-panel">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400">
          <UserPlus size={18}/> {t.agents} <span className="text-gray-500 text-sm">({agents.length})</span>
        </h3>
        <button onClick={startCreate} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1" data-testid="add-agent-btn">
          <Plus size={12}/>{t.addAgent}
        </button>
      </div>

      {form && (
        <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-yellow-500/30 space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="agent-form">
          <input placeholder={t.fullName} value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="agent-name-input"/>
          <input placeholder={t.phone} value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="agent-phone-input"/>
          <input type="password" placeholder={t.password} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="agent-password-input"/>
          <input placeholder="Email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm"/>
          <input placeholder={t.country} value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm"/>
          <input placeholder={t.city} value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm" data-testid="agent-city-input"/>
          <input type="number" placeholder={t.commission + ' %'} value={form.commission_percent} onChange={e => setForm({...form, commission_percent: parseFloat(e.target.value) || 0})} className="bg-gray-900 border border-gray-700 rounded p-2 text-sm"/>
          <div className="col-span-full flex gap-2 mt-1">
            <button onClick={save} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold" data-testid="agent-save-btn">{t.save}</button>
            <button onClick={() => setForm(null)} className="bg-gray-700 text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold">{t.cancel}</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {agents.length === 0 ? <EmptyRow icon={<UserPlus className="w-10 h-10 opacity-30"/>} text={t.noData}/> : agents.map(a => (
          <div key={a.id} className="bg-gray-800/50 rounded-xl p-3 flex flex-wrap items-center gap-3" data-testid={`agent-row-${a.id}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{a.full_name} <span className="text-[10px] text-gray-500 ms-1">({a.phone_number})</span></p>
              <p className="text-[11px] text-gray-400">{a.city}, {a.country} · {t.commission}: {a.commission_percent}% · {isRTL ? 'جمع' : 'Collected'}: {a.total_collected || 0}</p>
            </div>
            <button onClick={() => toggleActive(a)} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.active ? 'bg-green-500/20 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
              {a.active ? t.enabled : t.disabled}
            </button>
            <button onClick={() => remove(a.id)} className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-full" data-testid={`delete-agent-${a.id}`}><Trash2 size={12}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
