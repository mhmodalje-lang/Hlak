/**
 * BARBER HUB - LoyaltyBadge (2026 Feature)
 * Displays the user's loyalty tier, current points, progress to next tier,
 * and the % discount they unlock.
 *
 * Data source: GET /api/users/me/loyalty
 * Tiers: Bronze → Silver → Gold → Platinum → Diamond VIP
 * Design: Unified bh-* VIP Warm Luxury tokens, compact card with shimmer.
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Gem, Sparkles, TrendingUp, Loader2 } from 'lucide-react';

const TIER_LABEL_EN = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond VIP',
};

const LoyaltyBadge = ({ API, token, language = 'ar', compact = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      try {
        const res = await axios.get(`${API}/users/me/loyalty`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data || null);
      } catch (e) {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [API, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 rounded-2xl bh-glass">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--bh-gold)]" />
      </div>
    );
  }

  if (!data || !data.is_user) return null;

  const tierLabel = isRTL ? data.tier_name_ar : TIER_LABEL_EN[data.tier] || data.tier;
  const tierColor = data.tier_color || '#D4AF37';
  const progressPct = data.progress_to_next_pct || 0;
  const pointsToNext = data.next_tier_min ? data.next_tier_min - data.points : 0;

  const t = isRTL ? {
    yourTier: 'مستواك',
    points: 'نقطة',
    bookings: 'حجز',
    totalSpent: 'أنفقت',
    discount: 'خصم',
    toNext: 'نقطة للمستوى التالي',
    earnMore: '💎 احجز أكثر لترقية مستواك',
    vipReached: '🏆 وصلت لأعلى مستوى!',
  } : {
    yourTier: 'Your Tier',
    points: 'pts',
    bookings: 'bookings',
    totalSpent: 'spent',
    discount: 'discount',
    toNext: 'pts to next tier',
    earnMore: '💎 Book more to level up',
    vipReached: '🏆 Top tier reached!',
  };

  // Compact variant (minimal inline card)
  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bh-glass"
        style={{ borderColor: `${tierColor}55`, boxShadow: `0 0 12px ${tierColor}22` }}
        data-testid="loyalty-badge-compact"
      >
        <Gem className="w-4 h-4" style={{ color: tierColor }} />
        <span className="text-xs font-bold text-white">{data.points}</span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: tierColor }}>
          {tierLabel}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl overflow-hidden bh-glass-vip bh-corner-accents p-5 mb-5"
      style={{ boxShadow: `0 10px 40px ${tierColor}22` }}
      data-testid="loyalty-card"
    >
      {/* Shimmer accent */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: tierColor }}
      />

      <div className="flex items-start justify-between gap-4 relative z-10">
        {/* Left: Tier + points */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Gem className="w-5 h-5" style={{ color: tierColor }} />
            <span className="text-xs uppercase tracking-widest text-[var(--bh-text-muted)]">
              {t.yourTier}
            </span>
          </div>
          <div
            className="text-3xl md:text-4xl font-display font-black mb-1"
            style={{
              background: `linear-gradient(135deg, ${tierColor}, ${tierColor}AA)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {tierLabel}
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--bh-text-secondary)]">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" style={{ color: tierColor }} />
              <span className="font-bold text-white">{data.points}</span>
              {t.points}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--bh-text-muted)]" />
            <span>
              <span className="font-bold text-white">{data.bookings_completed}</span> {t.bookings}
            </span>
          </div>
        </div>

        {/* Right: Discount unlocked */}
        {data.discount_pct > 0 && (
          <div className="text-center flex-shrink-0">
            <div
              className="px-3 py-2 rounded-xl border"
              style={{
                backgroundColor: `${tierColor}15`,
                borderColor: `${tierColor}55`,
                boxShadow: `0 0 16px ${tierColor}22`,
              }}
            >
              <div className="text-2xl md:text-3xl font-display font-black" style={{ color: tierColor }}>
                {data.discount_pct}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--bh-text-muted)]">
                {t.discount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar to next tier */}
      {data.next_tier ? (
        <div className="mt-4 relative z-10">
          <div className="flex items-center justify-between text-[10px] text-[var(--bh-text-muted)] mb-1.5">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: tierColor }} />
              <span className="font-bold" style={{ color: tierColor }}>
                {pointsToNext}
              </span>
              {t.toNext}
            </span>
            <span className="uppercase tracking-wider font-bold">
              {isRTL ? (LOYALTY_NAMES_AR[data.next_tier] || data.next_tier) : TIER_LABEL_EN[data.next_tier] || data.next_tier}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${tierColor}, ${tierColor}DD)`,
                boxShadow: `0 0 8px ${tierColor}AA`,
              }}
            />
          </div>
          <p className="text-[10px] text-[var(--bh-text-muted)] mt-1.5 text-center italic">
            {t.earnMore}
          </p>
        </div>
      ) : (
        <div className="mt-4 text-center text-xs font-bold" style={{ color: tierColor }}>
          {t.vipReached}
        </div>
      )}
    </motion.div>
  );
};

const LOYALTY_NAMES_AR = {
  bronze: 'برونزي',
  silver: 'فضي',
  gold: 'ذهبي',
  platinum: 'بلاتيني',
  diamond: 'دايموند VIP',
};

export default LoyaltyBadge;
