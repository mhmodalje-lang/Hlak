import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, X, MessageSquare, Star, Store, Loader2, ShieldCheck, Trash2 } from 'lucide-react';

/**
 * AdminReviewModeration
 * Admin panel for approving / rejecting / deleting user reviews
 * before they become publicly visible.
 */
const AdminReviewModeration = ({ API, token, language = 'ar' }) => {
  const [filter, setFilter] = useState('pending'); // pending | approved | rejected
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const t = language === 'ar' ? {
    title: 'مراجعة التعليقات',
    subtitle: 'مراقبة وموافقة تعليقات العملاء قبل نشرها',
    pending: 'قيد المراجعة',
    approved: 'مقبولة',
    rejected: 'مرفوضة',
    approve: 'قبول ونشر',
    reject: 'رفض',
    delete: 'حذف',
    noReviews: 'لا توجد تعليقات',
    loading: 'جاري التحميل...',
    shop: 'الصالون',
    customer: 'العميل',
    rating: 'التقييم',
    approved_ok: 'تم قبول التعليق ونشره ✓',
    rejected_ok: 'تم رفض التعليق ✗',
    deleted_ok: 'تم حذف التعليق',
    confirm_delete: 'هل أنت متأكد من حذف هذا التعليق نهائياً؟',
    error: 'حدث خطأ'
  } : {
    title: 'Review Moderation',
    subtitle: 'Approve or reject customer reviews before they go live',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    noReviews: 'No reviews',
    loading: 'Loading...',
    shop: 'Shop',
    customer: 'Customer',
    rating: 'Rating',
    approved_ok: 'Review approved ✓',
    rejected_ok: 'Review rejected ✗',
    deleted_ok: 'Review deleted',
    confirm_delete: 'Permanently delete this review?',
    error: 'Error'
  };

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reviews?status=${filter}&limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(res.data?.reviews || []);
    } catch (err) {
      console.error('Failed to load moderation reviews', err);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  }, [API, token, filter, t.error]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const moderate = async (reviewId, action) => {
    setActioningId(reviewId);
    try {
      if (action === 'delete') {
        if (!window.confirm(t.confirm_delete)) { setActioningId(null); return; }
        await axios.delete(`${API}/admin/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(t.deleted_ok);
      } else {
        await axios.put(`${API}/admin/reviews/${reviewId}/${action}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(action === 'approve' ? t.approved_ok : t.rejected_ok);
      }
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error(err);
      toast.error(t.error);
    } finally {
      setActioningId(null);
    }
  };

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    rejected: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
  };

  return (
    <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 mb-8" data-testid="admin-review-moderation">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2 text-cyan-400">
            <ShieldCheck size={20} /> {t.title}
            <span className="ms-2 text-sm text-gray-500">({reviews.length})</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filter === s
                  ? 'bg-cyan-500 text-black border-cyan-400'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-cyan-500/40'
              }`}
              data-testid={`review-filter-${s}`}
            >
              {t[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{t.loading}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{t.noReviews}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className="bg-gray-800/50 rounded-2xl p-4 border border-gray-800 hover:border-cyan-500/30 transition-all"
              data-testid={`review-moderation-item-${r.id}`}
            >
              <div className="flex flex-wrap items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-white">
                      {r.customer_name || r.user_name || 'Anonymous'}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${statusColors[r.status || 'pending']}`}>
                      {t[r.status || 'pending']}
                    </span>
                  </div>
                  {r.shop_name && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Store size={11} /> {r.shop_name}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={14}
                        className={i <= (r.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ms-1">{r.rating}/5</span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600 whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en') : ''}
                </div>
              </div>

              {r.comment && (
                <div className="bg-gray-900/80 rounded-xl p-3 mb-3 border border-gray-800">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {r.status !== 'approved' && (
                  <button
                    onClick={() => moderate(r.id, 'approve')}
                    disabled={actioningId === r.id}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all"
                    data-testid={`approve-review-${r.id}`}
                  >
                    {actioningId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {t.approve}
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button
                    onClick={() => moderate(r.id, 'reject')}
                    disabled={actioningId === r.id}
                    className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all"
                    data-testid={`reject-review-${r.id}`}
                  >
                    <X size={12} /> {t.reject}
                  </button>
                )}
                <button
                  onClick={() => moderate(r.id, 'delete')}
                  disabled={actioningId === r.id}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all"
                  data-testid={`delete-review-${r.id}`}
                >
                  <Trash2 size={12} /> {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviewModeration;
