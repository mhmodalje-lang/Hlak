import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Trophy, Check, X, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react';

/**
 * TierStatusCard — Shows the shop owner:
 *   • Current tier (colorful badge)
 *   • Composite ranking score
 *   • Next tier to aim for + granular requirement progress (✓/✗ per requirement)
 *   • Full tier ladder (collapsed)
 *
 * Backend: GET /api/barbershops/me/tier-status
 */
const TIER_COLORS = {
  global_elite:    { bg: 'from-purple-600 to-pink-600',   text: 'text-purple-300', ring: 'ring-purple-500/40' },
  country_top:     { bg: 'from-amber-500 to-orange-600',  text: 'text-amber-300',  ring: 'ring-amber-500/40' },
  governorate_top: { bg: 'from-emerald-500 to-teal-600',  text: 'text-emerald-300', ring: 'ring-emerald-500/40' },
  city_top:        { bg: 'from-sky-500 to-indigo-600',    text: 'text-sky-300',    ring: 'ring-sky-500/40' },
  normal:          { bg: 'from-slate-500 to-slate-700',   text: 'text-slate-300',  ring: 'ring-slate-500/40' },
};

const TierStatusCard = ({ API, token, isMen, language }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const T = language === 'ar' ? {
    title: 'مستواك في الترتيب',
    currentTier: 'مستواك الحالي',
    score: 'النقاط الإجمالية',
    nextTier: 'المستوى التالي',
    qualified: 'مؤهل ✓',
    needed: 'المطلوب',
    current: 'لديك',
    viewAll: 'عرض كل المستويات',
    hideAll: 'إخفاء',
    refresh: 'تحديث',
    howToImprove: 'كيف أتأهل؟',
    normalLabel: 'عادي',
    congrats: 'مبروك! لقد وصلت إلى أعلى مستوى',
    tip: 'التقييم والمراجعات والحجوزات المكتملة تعتمد على عمل مستمر مع عملائك',
  } : {
    title: 'Your Ranking Tier',
    currentTier: 'Current Tier',
    score: 'Total Score',
    nextTier: 'Next Tier',
    qualified: 'Qualified ✓',
    needed: 'Needed',
    current: 'Current',
    viewAll: 'Show all tiers',
    hideAll: 'Hide',
    refresh: 'Refresh',
    howToImprove: 'How to qualify?',
    normalLabel: 'Normal',
    congrats: "Congrats! You've reached the highest tier",
    tip: 'Rating, reviews & completed bookings grow with consistent great service',
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/barbershops/me/tier-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (e) {
      console.error('Tier status fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  if (loading) {
    return (
      <div className={`rounded-3xl p-6 ${isMen ? 'bg-[#1A1512] border border-[#3A2E1F]' : 'bg-white border border-[#E7E5E4]'}`}>
        <div className="animate-pulse h-24"></div>
      </div>
    );
  }

  if (!data) return null;

  const currentStyle = TIER_COLORS[data.current_tier] || TIER_COLORS.normal;
  const nextTier = data.next_tier;

  const RequirementRow = ({ req }) => {
    const pct = req.required > 0 ? Math.min(100, (req.current / req.required) * 100) : (req.passed ? 100 : 0);
    return (
      <div className="py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm flex items-center gap-2 ${isMen ? 'text-[#E5E5E5]' : 'text-[#44403C]'}`}>
            {req.passed
              ? <Check className="w-4 h-4 text-green-500" />
              : <X className="w-4 h-4 text-red-400" />}
            {language === 'ar' ? req.label_ar : req.label_en}
          </span>
          <span className={`text-xs font-mono ${req.passed ? 'text-green-400' : (isMen ? 'text-amber-300' : 'text-[#B76E79]')}`}>
            {req.current}{req.unit} / {req.required}{req.unit}
          </span>
        </div>
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isMen ? 'bg-[#2A1F14]' : 'bg-[#F5F5F4]'}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              req.passed ? 'bg-gradient-to-r from-green-500 to-emerald-500' : `bg-gradient-to-r ${currentStyle.bg}`
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl p-6 ${isMen ? 'bg-gradient-to-br from-[#1A1512] to-[#0F0B08] border border-[#3A2E1F]' : 'bg-white border border-[#E7E5E4]'} ring-1 ${currentStyle.ring}`}
      data-testid="tier-status-card"
    >
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className={`w-6 h-6 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          <h3 className={`font-bold text-lg ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{T.title}</h3>
        </div>
        <button
          onClick={fetchStatus}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${isMen ? 'bg-[#2A1F14] text-[#F3E5AB] hover:bg-[#3A2E1F]' : 'bg-[#F5F5F4] text-[#57534E] hover:bg-[#E7E5E4]'} transition-colors`}
        >
          <RefreshCw className="w-3 h-3" /> {T.refresh}
        </button>
      </div>

      {/* Current Tier Block */}
      <div className="flex flex-col md:flex-row gap-5 mb-6">
        <div className={`flex-1 rounded-2xl p-5 bg-gradient-to-br ${currentStyle.bg} text-white shadow-lg`}>
          <div className="text-xs uppercase tracking-wider opacity-80 mb-1">{T.currentTier}</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{data.current_tier_icon || '⭐'}</span>
            <div className="font-display font-bold text-xl">
              {language === 'ar'
                ? (data.current_tier_label_ar || T.normalLabel)
                : (data.current_tier_label_en || T.normalLabel)}
            </div>
          </div>
          <div className="text-xs opacity-80">{T.score}: <span className="font-bold">{data.current_score}</span></div>
        </div>

        {/* Next Tier */}
        {nextTier ? (
          <div className={`flex-1 rounded-2xl p-5 border-2 border-dashed ${isMen ? 'border-[#3A2E1F] bg-[#0F0B08]' : 'border-[#E7E5E4] bg-[#FAFAF9]'}`}>
            <div className={`text-xs uppercase tracking-wider mb-1 ${isMen ? 'text-[#F3E5AB]/60' : 'text-[#78716C]'}`}>{T.nextTier}</div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{nextTier.icon}</span>
              <div className={`font-bold text-base ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {language === 'ar' ? nextTier.label_ar : nextTier.label_en}
              </div>
            </div>
            <div className="space-y-0">
              {nextTier.requirements.map((r, i) => <RequirementRow key={i} req={r} />)}
            </div>
            <div className={`mt-3 pt-3 border-t ${isMen ? 'border-[#2A1F14]' : 'border-[#F5F5F4]'}`}>
              <div className={`flex items-center justify-between text-xs ${isMen ? 'text-[#F3E5AB]/70' : 'text-[#57534E]'}`}>
                <span>{T.howToImprove}</span>
                <span className="font-bold">{Math.round(nextTier.progress * 100)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`flex-1 rounded-2xl p-5 flex items-center justify-center text-center ${isMen ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-amber-500/40' : 'bg-gradient-to-br from-yellow-100 to-amber-100 border border-amber-300'}`}>
            <div>
              <div className="text-4xl mb-2">🏆</div>
              <div className={`font-bold ${isMen ? 'text-amber-300' : 'text-amber-700'}`}>{T.congrats}</div>
            </div>
          </div>
        )}
      </div>

      {/* Toggle to view all tiers */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between py-2 text-sm ${isMen ? 'text-[#F3E5AB]' : 'text-[#78716C]'} hover:opacity-80 transition-opacity`}
      >
        <span>{expanded ? T.hideAll : T.viewAll}</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 space-y-3"
        >
          {data.tiers_status.map((ts) => {
            const style = TIER_COLORS[ts.tier];
            return (
              <div
                key={ts.tier}
                className={`rounded-xl p-4 border ${ts.qualified
                  ? 'border-green-500/40 bg-green-500/5'
                  : (isMen ? 'border-[#2A1F14] bg-[#0F0B08]' : 'border-[#E7E5E4] bg-[#FAFAF9]')}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ts.icon}</span>
                    <span className={`font-bold text-sm ${style.text}`}>
                      {language === 'ar' ? ts.label_ar : ts.label_en}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ts.qualified ? 'bg-green-500/20 text-green-400' : (isMen ? 'bg-[#2A1F14] text-[#F3E5AB]/70' : 'bg-[#F5F5F4] text-[#78716C]')}`}>
                    {ts.qualified ? T.qualified : `${Math.round(ts.progress * 100)}%`}
                  </span>
                </div>
                <div className="space-y-0">
                  {ts.requirements.map((r, i) => <RequirementRow key={i} req={r} />)}
                </div>
              </div>
            );
          })}
          <div className={`text-xs italic ${isMen ? 'text-[#F3E5AB]/50' : 'text-[#A8A29E]'} flex items-start gap-2 mt-3`}>
            <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{T.tip}</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TierStatusCard;
