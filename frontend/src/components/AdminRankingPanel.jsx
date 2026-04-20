import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { RefreshCw, BarChart3, Loader2, Clock } from 'lucide-react';

/**
 * AdminRankingPanel — Lives inside the Admin Dashboard.
 * Shows:
 *   • Current tier distribution counts
 *   • Last recompute timestamp
 *   • Button to manually trigger /api/admin/ranking/recompute
 *
 * Backend endpoints used:
 *   GET  /api/admin/ranking/stats
 *   POST /api/admin/ranking/recompute
 */
const TIER_META = {
  global_elite:    { icon: '🌍', ar: 'النخبة العالمية',    en: 'Global Elite',    color: 'from-purple-500 to-pink-500' },
  country_top:     { icon: '🏳️', ar: 'الأفضل في الدولة',    en: 'Country Top',     color: 'from-amber-500 to-orange-500' },
  governorate_top: { icon: '🏛️', ar: 'الأفضل في المحافظة', en: 'Governorate Top', color: 'from-emerald-500 to-teal-500' },
  city_top:        { icon: '🏙️', ar: 'الأفضل في المدينة',  en: 'City Top',        color: 'from-sky-500 to-indigo-500' },
  normal:          { icon: '⭐', ar: 'عادي',                en: 'Normal',          color: 'from-slate-500 to-slate-600' },
};

const AdminRankingPanel = ({ API, token, language }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const T = language === 'ar' ? {
    title: 'محرّك الترتيب والمستويات',
    subtitle: 'توزيع الصالونات على المستويات + إعادة الحساب اليدوية',
    total: 'إجمالي الصالونات',
    lastComputed: 'آخر حساب',
    recomputeBtn: 'إعادة حساب الآن',
    recomputing: 'جاري الحساب...',
    recomputeSuccess: 'تم تحديث التوزيع بنجاح',
    recomputeFailed: 'فشل إعادة الحساب',
    never: 'لم يتم بعد',
    refresh: 'تحديث',
  } : {
    title: 'Ranking & Tiers Engine',
    subtitle: 'Salon tier distribution + manual recompute',
    total: 'Total Salons',
    lastComputed: 'Last Computed',
    recomputeBtn: 'Recompute Now',
    recomputing: 'Recomputing...',
    recomputeSuccess: 'Distribution updated',
    recomputeFailed: 'Recompute failed',
    never: 'Never',
    refresh: 'Refresh',
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/ranking/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (e) {
      console.error('Ranking stats fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await axios.post(`${API}/admin/ranking/recompute`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(T.recomputeSuccess + ` (${res.data.updated})`);
      // Refresh stats after recompute
      await fetchStats();
    } catch (e) {
      console.error(e);
      toast.error(T.recomputeFailed);
    } finally {
      setRecomputing(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return T.never;
    try {
      const d = new Date(iso);
      return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
        dateStyle: 'medium', timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const tierOrder = ['global_elite', 'country_top', 'governorate_top', 'city_top', 'normal'];
  const tierCounts = stats?.tier_counts || {};
  const totalShops = stats?.total_shops || 0;

  return (
    <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800 mb-8" data-testid="admin-ranking-panel">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-purple-300">{T.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{T.subtitle}</p>
          </div>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition-opacity"
          data-testid="btn-recompute-ranking"
        >
          {recomputing
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {T.recomputing}</>
            : <><RefreshCw className="w-4 h-4" /> {T.recomputeBtn}</>}
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-800/50 rounded-2xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{T.total}</div>
          <div className="font-black text-2xl text-white">{loading ? '...' : totalShops}</div>
        </div>
        <div className="col-span-1 md:col-span-3 bg-gray-800/50 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div className="flex-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{T.lastComputed}</div>
            <div className="text-sm text-gray-300 font-mono">{formatDate(stats?.last_computed_at)}</div>
          </div>
        </div>
      </div>

      {/* Tier distribution */}
      <div className="space-y-2">
        {tierOrder.map((tier) => {
          const meta = TIER_META[tier];
          const count = tierCounts[tier] || 0;
          const pct = totalShops > 0 ? (count / totalShops) * 100 : 0;
          return (
            <div key={tier} className="bg-gray-800/30 rounded-xl p-3" data-testid={`tier-row-${tier}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="font-bold text-sm text-gray-200">
                    {language === 'ar' ? meta.ar : meta.en}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                  <span className="font-black text-lg text-white min-w-[2rem] text-right">{count}</span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-900 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${meta.color} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRankingPanel;
