import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Megaphone, Crown, Sparkles, Clock, Check, X as XIcon, Loader2,
  TrendingUp, MapPin, Globe, Star
} from 'lucide-react';

const SCOPE_ICONS = { city: MapPin, country: Crown, region: Globe };

const STATUS_BADGE = {
  pending:  { color: '#F59E0B', label_ar: 'قيد المراجعة', label_en: 'Pending Review', icon: Clock },
  active:   { color: '#10B981', label_ar: 'مفعّل',         label_en: 'Active',         icon: Check },
  expired:  { color: '#6B7280', label_ar: 'منتهي',         label_en: 'Expired',        icon: Clock },
  rejected: { color: '#EF4444', label_ar: 'مرفوض',         label_en: 'Rejected',       icon: XIcon },
};

/**
 * SponsoredAdsManagement - Barber-side UI to request & track sponsored ads.
 * Props: API, token, isMen, language
 */
const SponsoredAdsManagement = ({ API, token, isMen, language }) => {
  const [plans, setPlans] = useState([]);
  const [myAds, setMyAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const t = {
    ar: {
      title: 'الإعلانات الممولة',
      subtitle: 'اظهر في الأوائل وجذب المزيد من الزبائن',
      request: 'طلب إعلان',
      choosePlan: 'اختر الباقة',
      price: 'السعر',
      duration: 'المدة',
      days: 'يوم',
      confirm: 'تقديم الطلب',
      myAds: 'طلباتي السابقة',
      noAds: 'لا توجد طلبات إعلانية بعد',
      confirming: 'جاري الحفظ...',
      success: 'تم إرسال طلبك، بانتظار موافقة الإدارة',
      close: 'إغلاق'
    },
    en: {
      title: 'Sponsored Ads',
      subtitle: 'Get featured placement & attract more clients',
      request: 'Request Ad',
      choosePlan: 'Choose a plan',
      price: 'Price',
      duration: 'Duration',
      days: 'days',
      confirm: 'Submit Request',
      myAds: 'My Previous Requests',
      noAds: 'No ad requests yet',
      confirming: 'Submitting...',
      success: 'Request submitted, waiting for admin approval',
      close: 'Close'
    }
  }[language] || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        axios.get(`${API}/sponsored/plans`),
        axios.get(`${API}/sponsored/my`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPlans(p.data?.plans || []);
      setMyAds(m.data || []);
    } catch (err) {
      console.error('Sponsored fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/sponsored/request`, {
        plan: selectedPlan.id,
        duration_days: selectedPlan.duration_days
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t.success);
      setOpen(false);
      setSelectedPlan(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const gold = isMen ? '#D4AF37' : '#B76E79';

  return (
    <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`} data-testid="sponsored-ads-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <Megaphone style={{ color: gold }} className="w-5 h-5" />
          {t.title}
        </h3>
        <Button size="sm" onClick={() => setOpen(true)} className={isMen ? 'btn-primary-men' : 'btn-primary-women'} data-testid="request-ad-btn">
          <Sparkles className="w-4 h-4 me-1" />
          {t.request}
        </Button>
      </div>
      <p className={`text-xs mb-3 ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>{t.subtitle}</p>

      {/* My ads list */}
      {loading ? (
        <div className="text-center py-3 opacity-60 text-sm">...</div>
      ) : myAds.length === 0 ? (
        <p className={`text-sm ${isMen ? 'text-gray-500' : 'text-gray-400'}`}>{t.noAds}</p>
      ) : (
        <div className="space-y-2">
          {myAds.slice(0, 5).map(ad => {
            const meta = STATUS_BADGE[ad.status] || STATUS_BADGE.pending;
            const StatusIcon = meta.icon;
            const ScopeIcon = SCOPE_ICONS[ad.scope] || MapPin;
            return (
              <div key={ad.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-gray-50'}`} data-testid={`my-ad-${ad.id}`}>
                <ScopeIcon size={16} style={{ color: gold }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {language === 'ar' ? ad.plan_label_ar : ad.plan_label_en}
                  </p>
                  <p className={`text-[11px] ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                    {ad.price_eur}€ · {ad.duration_days} {t.days}
                    {ad.end_date && ad.status === 'active' && (
                      <> · ends {new Date(ad.end_date).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
                >
                  <StatusIcon size={11} />
                  {language === 'ar' ? meta.label_ar : meta.label_en}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Plans dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={isMen ? 'bg-[#1A120A] border-[#3A2E1F] text-white max-w-lg' : 'bg-white max-w-lg'}>
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <TrendingUp style={{ color: gold }} size={20} />
                {t.choosePlan}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {plans.map(plan => {
              const active = selectedPlan?.id === plan.id;
              const ScopeIcon = SCOPE_ICONS[plan.scope] || MapPin;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                    active
                      ? (isMen ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-[#B76E79] bg-[#B76E79]/5')
                      : (isMen ? 'border-[#3A2E1F] bg-[#2A1F14]' : 'border-gray-200 bg-gray-50')
                  }`}
                  data-testid={`plan-${plan.id}`}
                >
                  <ScopeIcon size={28} style={{ color: active ? gold : undefined }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">
                      {language === 'ar' ? plan.label_ar : plan.label_en}
                    </p>
                    <p className={`text-xs ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>
                      {plan.scope} · {plan.duration_days} {t.days}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-lg font-black" style={{ color: gold }}>{plan.price_eur}€</p>
                  </div>
                </button>
              );
            })}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPlan || submitting}
            className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
            data-testid="submit-ad-request"
          >
            {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Check className="w-4 h-4 me-2" />}
            {submitting ? t.confirming : t.confirm}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SponsoredAdsManagement;
