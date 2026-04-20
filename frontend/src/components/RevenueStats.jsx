import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TrendingUp, Package as PackageIcon, Scissors, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * RevenueStats - Phase 5 dashboard analytics card.
 * Shows total revenue split into services/products, daily breakdown chart,
 * and top products/services tables.
 * Props: API, token, isMen, language
 */
const RevenueStats = ({ API, token, isMen, language }) => {
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const t = {
    ar: {
      title: 'الإحصائيات والأرباح',
      window: 'الفترة',
      days_7: '٧ أيام',
      days_30: '٣٠ يوم',
      days_90: '٩٠ يوم',
      total: 'إجمالي الدخل',
      services: 'الخدمات',
      products: 'المنتجات',
      bookings: 'الحجوزات',
      orders: 'الطلبات',
      topProducts: 'أعلى المنتجات مبيعاً',
      topServices: 'أكثر الخدمات طلباً',
      revenueByDay: 'الدخل اليومي',
      noData: 'لا توجد بيانات لهذه الفترة',
      qty: 'الكمية'
    },
    en: {
      title: 'Revenue & Analytics',
      window: 'Window',
      days_7: '7 days',
      days_30: '30 days',
      days_90: '90 days',
      total: 'Total revenue',
      services: 'Services',
      products: 'Products',
      bookings: 'Bookings',
      orders: 'Orders',
      topProducts: 'Top Products',
      topServices: 'Top Services',
      revenueByDay: 'Daily Revenue',
      noData: 'No data for this period',
      qty: 'Qty'
    }
  }[language] || {};

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/barbershops/me/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [API, token, days]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const gold = isMen ? '#D4AF37' : '#B76E79';
  const mutedTxt = isMen ? 'text-gray-400' : 'text-gray-500';
  const rowBg = isMen ? 'bg-[#2A1F14]' : 'bg-gray-50';

  // Max revenue for chart scaling
  const maxDayRevenue = stats?.revenue_by_day?.length
    ? Math.max(...stats.revenue_by_day.map(d => d.total), 1)
    : 1;

  return (
    <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`} data-testid="revenue-stats-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <TrendingUp style={{ color: gold }} className="w-5 h-5" />
          {t.title}
        </h3>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className={`w-24 h-8 text-xs ${isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : ''}`} data-testid="stats-window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t.days_7}</SelectItem>
              <SelectItem value="30">{t.days_30}</SelectItem>
              <SelectItem value="90">{t.days_90}</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => setExpanded(!expanded)} className={`p-1.5 rounded-lg ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-gray-100 text-gray-700'}`}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {loading ? (
            <div className="text-center py-6 opacity-60 text-sm">...</div>
          ) : !stats ? (
            <p className={`text-sm ${mutedTxt}`}>{t.noData}</p>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className={`${rowBg} rounded-xl p-3`}>
                  <div className={`text-[11px] font-bold ${mutedTxt}`}>{t.total}</div>
                  <div className="text-2xl font-black" style={{ color: gold }} data-testid="kpi-total">{stats.total_revenue}€</div>
                </div>
                <div className={`${rowBg} rounded-xl p-3`}>
                  <div className={`text-[11px] font-bold ${mutedTxt}`}>{t.services}</div>
                  <div className="text-xl font-black">{stats.service_revenue}€</div>
                  <div className={`text-[10px] ${mutedTxt}`}>{stats.completed_bookings}/{stats.total_bookings} {t.bookings}</div>
                </div>
                <div className={`${rowBg} rounded-xl p-3`}>
                  <div className={`text-[11px] font-bold ${mutedTxt}`}>{t.products}</div>
                  <div className="text-xl font-black">{stats.product_revenue}€</div>
                  <div className={`text-[10px] ${mutedTxt}`}>{stats.paid_orders}/{stats.total_orders} {t.orders}</div>
                </div>
                <div className={`${rowBg} rounded-xl p-3`}>
                  <div className={`text-[11px] font-bold ${mutedTxt}`}>{t.window}</div>
                  <div className="text-xl font-black">{stats.window_days}</div>
                  <div className={`text-[10px] ${mutedTxt}`}>{language === 'ar' ? 'يوم' : 'days'}</div>
                </div>
              </div>

              {/* Revenue-by-day bar chart (CSS only) */}
              {stats.revenue_by_day && stats.revenue_by_day.length > 0 && (
                <div className={`${rowBg} rounded-xl p-3 mb-5`}>
                  <p className={`text-xs font-bold mb-2 ${mutedTxt}`}>{t.revenueByDay}</p>
                  <div className="flex items-end gap-1 h-28" data-testid="revenue-chart">
                    {stats.revenue_by_day.slice(-30).map((d, i) => {
                      const pct = Math.max(2, Math.round((d.total / maxDayRevenue) * 100));
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center min-w-0 group" title={`${d.date}: ${d.total}€`}>
                          <div
                            className="w-full rounded-sm transition-all"
                            style={{ height: `${pct}%`, background: gold, opacity: 0.85 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top products */}
              {stats.top_products && stats.top_products.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold mb-2 flex items-center gap-1">
                    <PackageIcon size={14} style={{ color: gold }} /> {t.topProducts}
                  </p>
                  <div className="space-y-2">
                    {stats.top_products.map(p => (
                      <div key={p.product_id} className={`${rowBg} rounded-lg p-2 flex items-center gap-3`} data-testid={`top-product-${p.product_id}`}>
                        {p.image ? (
                          <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${isMen ? 'bg-[#3A2E1F]' : 'bg-gray-200'}`}>
                            <PackageIcon size={12} className={mutedTxt} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {language === 'ar' ? (p.name_ar || p.name) : p.name}
                          </p>
                          <p className={`text-[11px] ${mutedTxt}`}>{t.qty}: {p.qty}</p>
                        </div>
                        <span className="text-sm font-bold" style={{ color: gold }}>{p.revenue}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top services */}
              {stats.top_services && stats.top_services.length > 0 && (
                <div>
                  <p className="text-sm font-bold mb-2 flex items-center gap-1">
                    <Scissors size={14} style={{ color: gold }} /> {t.topServices}
                  </p>
                  <div className="space-y-1.5">
                    {stats.top_services.map((s, i) => (
                      <div key={i} className={`${rowBg} rounded-lg p-2 flex items-center justify-between`}>
                        <span className="text-sm">{s.name}</span>
                        <span className="text-xs font-bold" style={{ color: gold }}>×{s.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueStats;
