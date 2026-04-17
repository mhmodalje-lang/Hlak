import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Brain, Wand2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';

const UsageStats = ({ API, token, isMen, language }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const t = language === 'ar' ? {
    title: 'إحصائيات استخدام الذكاء الاصطناعي',
    subtitle: 'تتبع استهلاك API Credits',
    totalCalls: 'إجمالي المكالمات',
    last30Days: 'آخر 30 يوم',
    aiAdvisor: 'المستشار الذكي',
    aiTryon: 'التجربة الافتراضية',
    estimatedCost: 'التكلفة المقدرة',
    topUsers: 'أكثر المستخدمين نشاطاً',
    calls: 'مكالمة',
    policy: 'السياسة',
    oneShotPolicy: 'محاولة واحدة لكل حجز',
    noData: 'لا توجد بيانات بعد'
  } : {
    title: 'AI Usage Statistics',
    subtitle: 'Track API Credits Consumption',
    totalCalls: 'Total API Calls',
    last30Days: 'Last 30 Days',
    aiAdvisor: 'AI Advisor',
    aiTryon: 'AI Try-On',
    estimatedCost: 'Estimated Cost',
    topUsers: 'Top Users',
    calls: 'calls',
    policy: 'Policy',
    oneShotPolicy: 'ONE attempt per booking',
    noData: 'No data yet'
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/usage-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch usage stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <div className="animate-pulse space-y-4">
          <div className={`h-4 ${isMen ? 'bg-[#3A2E1F]' : 'bg-[#E7E5E4]'} rounded w-1/2`}></div>
          <div className={`h-20 ${isMen ? 'bg-[#3A2E1F]' : 'bg-[#E7E5E4]'} rounded`}></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`p-6 rounded-2xl text-center ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
        <AlertCircle className={`w-10 h-10 mx-auto mb-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
        <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.noData}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl ${isMen ? 'glass-card-men' : 'glass-card-women'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className={`w-6 h-6 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
        <div>
          <h3 className={`text-lg font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.title}</h3>
          <p className={`text-xs ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.subtitle}</p>
        </div>
      </div>

      {/* Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <span className={`text-xs font-bold ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.totalCalls}</span>
          </div>
          <p className={`text-3xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {stats.total_api_calls.total}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <span className={`text-xs font-bold ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.aiAdvisor}</span>
          </div>
          <p className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {stats.total_api_calls.ai_advisor}
          </p>
          <p className={`text-xs mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {stats.last_30_days.ai_advisor} {t.last30Days.toLowerCase()}
          </p>
        </div>

        <div className={`p-4 rounded-xl ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className={`w-4 h-4 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <span className={`text-xs font-bold ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.aiTryon}</span>
          </div>
          <p className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {stats.total_api_calls.ai_tryon}
          </p>
          <p className={`text-xs mt-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {stats.last_30_days.ai_tryon} {t.last30Days.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Estimated Cost */}
      <div className={`p-4 rounded-xl mb-4 ${isMen ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/30' : 'bg-[#B76E79]/10 border border-[#B76E79]/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className={`w-5 h-5 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            <span className={`text-sm font-bold ${isMen ? 'text-[#F3E5AB]' : 'text-[#9E5B66]'}`}>{t.estimatedCost}</span>
          </div>
          <span className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            ${stats.estimated_cost_usd}
          </span>
        </div>
      </div>

      {/* Policy */}
      <div className={`p-3 rounded-lg ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
        <p className={`text-xs font-bold mb-1 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>{t.policy}:</p>
        <ul className={`text-xs space-y-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
          <li>• AI Advisor: {stats.policy.ai_advisor}</li>
          <li>• AI Try-On: {stats.policy.ai_tryon}</li>
        </ul>
      </div>
    </div>
  );
};

export default UsageStats;
