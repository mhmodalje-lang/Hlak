/**
 * Admin — Subscription Orders Approval Panel
 * Lists pending/approved/rejected subscription orders with receipt viewer and approve/reject actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, Clock, CheckCircle2, XCircle, Loader2, Eye, Check, X,
  Store, Tag, Hash, DollarSign, Image as ImageIcon, Calendar,
  Phone, MapPin, MessageSquare, Bell, MessageCircle,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'pending',  icon: Clock,        label_ar: 'قيد المراجعة', label_en: 'Pending',  color: 'amber' },
  { key: 'approved', icon: CheckCircle2, label_ar: 'مُوافَق',       label_en: 'Approved', color: 'emerald' },
  { key: 'rejected', icon: XCircle,      label_ar: 'مرفوض',        label_en: 'Rejected', color: 'red' },
];

const AdminSubscriptionOrdersPanel = ({ API, token, language }) => {
  const isRTL = language === 'ar';
  const [status, setStatus] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/subscription-orders`, {
        params: { status },
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data?.orders || []);
      setPendingCount(res.data?.pending_count || 0);
    } catch (e) {
      toast.error(isRTL ? 'تعذر تحميل الطلبات' : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [API, token, status, isRTL]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Header with pending-count banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shrink-0">
          <Bell size={22} className="text-black" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white">
            {pendingCount > 0 ? (
              <>
                <span className="text-amber-400 text-xl">{pendingCount}</span>{' '}
                {isRTL ? 'طلب اشتراك بانتظار موافقتك' : `subscription order${pendingCount > 1 ? 's' : ''} awaiting your approval`}
              </>
            ) : (
              <span className="text-gray-300">{isRTL ? 'لا توجد طلبات قيد المراجعة' : 'No pending orders'}</span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {isRTL ? 'الصالونات التي تحوّل مالاً تظهر هنا للتفعيل' : 'Salons that transfer money appear here for activation'}
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {STATUS_TABS.map(tab => {
          const Icon = tab.icon;
          const active = status === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition-colors ${active ? `text-${tab.color}-400 border-${tab.color}-400` : 'text-gray-400 border-transparent hover:text-white'}`}
              data-testid={`orders-tab-${tab.key}`}
            >
              <Icon size={16} />
              {isRTL ? tab.label_ar : tab.label_en}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="bg-amber-500 text-black text-[10px] font-bold rounded-full px-1.5 min-w-[18px] h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-amber-400" size={32} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <div className="text-sm">{isRTL ? 'لا توجد طلبات' : 'No orders found'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <OrderRow key={o.id} order={o} language={language} onView={() => setViewing(o)} />
          ))}
        </div>
      )}

      {viewing && (
        <OrderDetailModal
          API={API}
          token={token}
          language={language}
          orderId={viewing.id}
          onClose={() => setViewing(null)}
          onActionDone={() => { setViewing(null); load(); }}
        />
      )}
    </div>
  );
};

const OrderRow = ({ order, language, onView }) => {
  const isRTL = language === 'ar';
  const createdAt = order.created_at ? new Date(order.created_at).toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const badge = order.status === 'pending'
    ? <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{isRTL ? 'قيد المراجعة' : 'Pending'}</span>
    : order.status === 'approved'
      ? <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{isRTL ? 'مُوافَق' : 'Approved'}</span>
      : <span className="text-[10px] font-bold bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">{isRTL ? 'مرفوض' : 'Rejected'}</span>;

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-amber-500/30 rounded-xl p-4 transition-colors" data-testid={`order-row-${order.id}`}>
      <div className="flex items-start gap-4 flex-wrap">
        {/* Salon info */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-600/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Store size={20} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{order.salon_name || (isRTL ? 'صالون غير معروف' : 'Unknown salon')}</div>
            <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap mt-0.5">
              <span className="flex items-center gap-1"><Hash size={11} />{order.reference_code}</span>
              {badge}
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="text-center">
          <div className="text-lg font-bold bg-gradient-to-br from-amber-300 to-yellow-500 bg-clip-text text-transparent">
            {Number(order.amount).toLocaleString()} {order.currency_symbol || order.currency}
          </div>
          <div className="text-xs text-gray-500">
            {order.payment_method === 'syriatel_cash'
              ? (isRTL ? 'سيريتل كاش' : 'Syriatel Cash')
              : (isRTL ? 'حوالة مكتب' : 'Exchange')}
          </div>
        </div>

        {/* Country */}
        <div className="text-center">
          <div className="text-sm text-white font-semibold">{order.country || '—'}</div>
          <div className="text-xs text-gray-500">{order.country_code || ''}</div>
        </div>

        {/* Created at */}
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <Calendar size={12} /> {createdAt}
        </div>

        {/* WhatsApp quick-contact */}
        {order.admin_wa_link && (
          <a
            href={order.admin_wa_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5"
            data-testid={`wa-order-${order.id}`}
            title={isRTL ? 'فتح محادثة WhatsApp مع الصالون' : 'Open WhatsApp chat with salon'}
          >
            <MessageCircle size={14} /> {isRTL ? 'واتساب' : 'WhatsApp'}
          </a>
        )}

        {/* View button */}
        <button
          onClick={onView}
          className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5"
          data-testid={`view-order-${order.id}`}
        >
          <Eye size={14} /> {isRTL ? 'مراجعة' : 'Review'}
        </button>
      </div>
    </div>
  );
};

const OrderDetailModal = ({ API, token, language, orderId, onClose, onActionDone }) => {
  const isRTL = language === 'ar';
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null); // 'approve' | 'reject' | null
  const [adminNotes, setAdminNotes] = useState('');
  const [durationDays, setDurationDays] = useState(30);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/admin/subscription-orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (!active) return;
      setOrder(res.data || null);
      const ft = Number(res.data?.free_trial_months || 0);
      setDurationDays(30);
    }).catch(() => {
      toast.error(isRTL ? 'تعذر تحميل التفاصيل' : 'Failed to load details');
      onClose();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [API, token, orderId, isRTL, onClose]);

  const submit = async () => {
    if (!action) return;
    try {
      if (action === 'approve') {
        await axios.post(`${API}/admin/subscription-orders/${orderId}/approve`,
          { admin_notes: adminNotes, duration_days: Number(durationDays) || 30 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(isRTL ? 'تم التفعيل ✅' : 'Activated ✅');
      } else {
        await axios.post(`${API}/admin/subscription-orders/${orderId}/reject`,
          { admin_notes: adminNotes },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(isRTL ? 'تم الرفض' : 'Rejected');
      }
      onActionDone();
    } catch (e) {
      toast.error(isRTL ? 'فشلت العملية' : 'Action failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-start justify-center p-3 overflow-y-auto">
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl max-w-4xl w-full my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
          <h3 className="font-bold text-amber-400 flex items-center gap-2">
            <FileText size={18} /> {isRTL ? 'تفاصيل طلب الاشتراك' : 'Subscription Order Details'}
          </h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {loading || !order ? (
          <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-amber-400" size={32} /></div>
        ) : (
          <>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT: Details */}
              <div className="space-y-3">
                <DetailRow icon={Hash}  label_ar="الكود المرجعي"   label_en="Reference Code" value={order.reference_code} isRTL={isRTL} highlight />
                <DetailRow icon={Store} label_ar="اسم الصالون"     label_en="Salon Name"     value={order.salon_name} isRTL={isRTL} />
                {order.salon_phone && (
                  <DetailRow icon={Phone} label_ar="هاتف الصالون" label_en="Salon Phone"  value={order.salon_phone} isRTL={isRTL} />
                )}
                {order.admin_wa_link && (
                  <a
                    href={order.admin_wa_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"
                    data-testid="detail-wa-btn"
                  >
                    <MessageCircle size={18} />
                    {isRTL ? 'التواصل مع الصالون عبر واتساب' : 'Contact salon via WhatsApp'}
                  </a>
                )}
                <DetailRow icon={Tag}   label_ar="الخطة"           label_en="Plan"           value={isRTL ? order.plan_title_ar : order.plan_title_en} isRTL={isRTL} />
                <DetailRow icon={MapPin} label_ar="الدولة"          label_en="Country"        value={`${order.country || ''} ${order.country_code ? `(${order.country_code})` : ''}`} isRTL={isRTL} />
                <DetailRow icon={DollarSign} label_ar="المبلغ"      label_en="Amount"         value={`${Number(order.amount).toLocaleString()} ${order.currency_symbol || order.currency}`} isRTL={isRTL} highlight />
                <DetailRow icon={Tag}   label_ar="طريقة الدفع"     label_en="Payment Method"
                  value={order.payment_method === 'syriatel_cash'
                    ? (isRTL ? 'سيريتل كاش' : 'Syriatel Cash')
                    : `${isRTL ? 'حوالة - ' : 'Exchange - '}${isRTL ? order.exchange_info?.name_ar : order.exchange_info?.name_en} (${isRTL ? order.exchange_info?.recipient_ar : order.exchange_info?.recipient_en})`}
                  isRTL={isRTL} />
                {order.reference_number && <DetailRow icon={Hash} label_ar="رقم العملية"     label_en="Operation #"   value={order.reference_number} isRTL={isRTL} />}
                {order.notes && <DetailRow icon={MessageSquare} label_ar="ملاحظات الصالون" label_en="Salon Notes"   value={order.notes} isRTL={isRTL} />}
                <DetailRow icon={Calendar} label_ar="تاريخ الطلب"   label_en="Order Date"     value={order.created_at ? new Date(order.created_at).toLocaleString(isRTL ? 'ar-SY' : 'en-US') : '—'} isRTL={isRTL} />

                {order.status === 'approved' && (
                  <DetailRow icon={CheckCircle2} label_ar="مفعّل حتى" label_en="Active Until"
                    value={order.activated_until ? new Date(order.activated_until).toLocaleDateString(isRTL ? 'ar-SY' : 'en-US') : '—'}
                    isRTL={isRTL} highlight />
                )}
                {order.admin_notes && <DetailRow icon={MessageSquare} label_ar="ملاحظات الإدارة" label_en="Admin Notes" value={order.admin_notes} isRTL={isRTL} />}
              </div>

              {/* RIGHT: Receipt image */}
              <div>
                <div className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-2">
                  <ImageIcon size={14} className="text-amber-400" />
                  {isRTL ? 'صورة إشعار التحويل' : 'Transfer Receipt'}
                </div>
                {order.receipt_image ? (
                  <a href={order.receipt_image} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border-2 border-amber-500/30 hover:border-amber-400 transition-colors">
                    <img src={order.receipt_image} alt="Receipt" className="w-full h-auto max-h-[500px] object-contain bg-black" data-testid="receipt-image" />
                  </a>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
                    {isRTL ? 'لا توجد صورة' : 'No receipt image'}
                  </div>
                )}
                <p className="text-[11px] text-gray-500 mt-2 text-center">
                  {isRTL ? 'اضغط على الصورة لفتحها بحجمها الأصلي' : 'Click image to open full-size'}
                </p>
              </div>
            </div>

            {/* Actions */}
            {order.status === 'pending' && (
              <div className="border-t border-gray-800 p-5 bg-gray-950/50">
                {!action ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAction('reject')}
                      className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 font-bold flex items-center justify-center gap-2"
                      data-testid="reject-btn"
                    >
                      <X size={18} /> {isRTL ? 'رفض الطلب' : 'Reject Order'}
                    </button>
                    <button
                      onClick={() => setAction('approve')}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
                      data-testid="approve-btn"
                    >
                      <Check size={18} strokeWidth={3} /> {isRTL ? 'موافقة وتفعيل' : 'Approve & Activate'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-xl ${action === 'approve' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                      <div className={`font-bold mb-2 ${action === 'approve' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {action === 'approve' ? (isRTL ? '✅ تأكيد الموافقة والتفعيل' : '✅ Confirm Approval') : (isRTL ? '❌ تأكيد الرفض' : '❌ Confirm Rejection')}
                      </div>
                      {action === 'approve' && (
                        <label className="block mb-3">
                          <span className="text-xs font-bold text-gray-300 mb-1 block">
                            {isRTL ? 'مدة التفعيل (أيام)' : 'Activation Duration (days)'}
                          </span>
                          <div className="flex gap-2">
                            {[30, 90, 180, 365].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setDurationDays(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${durationDays === d ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-gray-800 text-gray-300 border-gray-700'}`}
                              >
                                {d === 30 ? (isRTL ? 'شهر' : '1 Month') : d === 90 ? (isRTL ? '3 أشهر' : '3 Months') : d === 180 ? (isRTL ? '6 أشهر' : '6 Months') : (isRTL ? 'سنة' : '1 Year')}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={durationDays}
                            onChange={(e) => setDurationDays(e.target.value)}
                            className="mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            data-testid="duration-days-input"
                          />
                          {Number(order.free_trial_months) > 0 && (
                            <div className="text-[11px] text-emerald-400 mt-1">
                              + {isRTL ? `${order.free_trial_months} شهر مجاني` : `${order.free_trial_months} free month(s)`}
                            </div>
                          )}
                        </label>
                      )}
                      <label className="block">
                        <span className="text-xs font-bold text-gray-300 mb-1 block">
                          {isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                        </span>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                          placeholder={isRTL ? 'ملاحظات ترسل للصالون...' : 'Notes sent to salon...'}
                          data-testid="admin-notes-textarea"
                        />
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setAction(null)} className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm">
                        {isRTL ? 'رجوع' : 'Back'}
                      </button>
                      <button
                        onClick={submit}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${action === 'approve' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'}`}
                        data-testid="confirm-action-btn"
                      >
                        {isRTL ? 'تأكيد' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label_ar, label_en, value, isRTL, highlight }) => (
  <div className={`flex items-start gap-3 p-3 rounded-xl ${highlight ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-gray-800/50 border border-gray-800'}`}>
    <Icon size={16} className={highlight ? 'text-amber-400 mt-0.5 shrink-0' : 'text-gray-400 mt-0.5 shrink-0'} />
    <div className="min-w-0 flex-1">
      <div className="text-[11px] text-gray-500 font-semibold">{isRTL ? label_ar : label_en}</div>
      <div className={`text-sm font-semibold break-words ${highlight ? 'text-amber-300' : 'text-white'}`}>
        {value || '—'}
      </div>
    </div>
  </div>
);

export default AdminSubscriptionOrdersPanel;
