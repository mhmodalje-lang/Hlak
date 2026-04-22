/**
 * WorkingHoursVacation — Salon-dashboard card combining:
 *  1. Per-day working hours (start/end + day-off toggle)
 *  2. Vacation / temporary-closed toggle (hides the salon from search results)
 *
 * Backend:
 *  - PUT  /api/barbers/profile/me  (body: { working_hours })      — existing endpoint
 *  - POST /api/barbershop/me/vacation (body: { is_on_vacation })  — existing endpoint
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Clock, Palmtree, Loader2, Save, Moon, Sun } from 'lucide-react';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_LABELS = {
  ar: {
    sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء',
    thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
  },
  en: {
    sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
  },
};

const DEFAULT_HOURS = {
  sunday:    { start: '09:00', end: '21:00', closed: false },
  monday:    { start: '09:00', end: '21:00', closed: false },
  tuesday:   { start: '09:00', end: '21:00', closed: false },
  wednesday: { start: '09:00', end: '21:00', closed: false },
  thursday:  { start: '09:00', end: '21:00', closed: false },
  friday:    { start: '09:00', end: '21:00', closed: false },
  saturday:  { start: '09:00', end: '21:00', closed: false },
};

const normalizeHours = (raw) => {
  const merged = { ...DEFAULT_HOURS };
  if (raw && typeof raw === 'object') {
    DAY_KEYS.forEach(k => {
      if (raw[k]) {
        merged[k] = {
          start: raw[k].start || '09:00',
          end: raw[k].end || '21:00',
          closed: !!raw[k].closed,
        };
      }
    });
  }
  return merged;
};

const WorkingHoursVacation = ({ API, token, profile, language = 'ar', isMen = true, onRefresh }) => {
  const isRTL = language === 'ar';
  const [hours, setHours] = useState(normalizeHours(profile?.working_hours));
  const [isOnVacation, setIsOnVacation] = useState(!!profile?.is_on_vacation);
  const [saving, setSaving] = useState(false);
  const [togglingVacation, setTogglingVacation] = useState(false);

  useEffect(() => {
    setHours(normalizeHours(profile?.working_hours));
    setIsOnVacation(!!profile?.is_on_vacation);
  }, [profile]);

  const t = isRTL ? {
    title: 'ساعات العمل',
    subtitle: 'حدّد أوقات العمل لكل يوم. يمكنك تعطيل يوم كامل.',
    save: 'حفظ ساعات العمل',
    saved: 'تم حفظ ساعات العمل',
    saveError: 'فشل الحفظ',
    open: 'من',
    close: 'إلى',
    dayOff: 'إجازة',
    working: 'عمل',
    vacationTitle: 'وضع الإجازة',
    vacationDesc: 'عند تفعيل الإجازة، يختفي صالونك من البحث حتى إعادة تشغيله.',
    vacationOn: 'مفعّل — الصالون مخفي',
    vacationOff: 'موقوف — الصالون يظهر',
    turnOn: 'تفعيل الإجازة',
    turnOff: 'العودة للعمل',
    vacationSuccess: 'تم تحديث الحالة',
  } : {
    title: 'Working Hours',
    subtitle: 'Set open / close time per day, or mark a day as closed.',
    save: 'Save working hours',
    saved: 'Hours saved',
    saveError: 'Save failed',
    open: 'Open',
    close: 'Close',
    dayOff: 'Day off',
    working: 'Open',
    vacationTitle: 'Vacation Mode',
    vacationDesc: 'When enabled, your salon is hidden from search results until you turn it off.',
    vacationOn: 'ON — salon hidden',
    vacationOff: 'OFF — salon visible',
    turnOn: 'Start vacation',
    turnOff: 'Reopen salon',
    vacationSuccess: 'Status updated',
  };

  const updateDay = (day, field, value) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const toggleClosed = (day) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !prev[day].closed } }));
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      // Use PUT /barbers/profile — it accepts partial updates including working_hours
      await axios.put(`${API}/barbers/profile`,
        { working_hours: hours },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.saved);
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleVacation = async () => {
    setTogglingVacation(true);
    const newValue = !isOnVacation;
    try {
      await axios.post(`${API}/barbershop/me/vacation`,
        { is_on_vacation: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsOnVacation(newValue);
      toast.success(t.vacationSuccess);
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || t.saveError);
    } finally {
      setTogglingVacation(false);
    }
  };

  const accent = isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]';
  const accentBg = isMen ? 'from-[#D4AF37] to-[#B8860B]' : 'from-[#B76E79] to-[#8B4A55]';
  const textMain = isMen ? 'text-white' : 'text-[#1C1917]';
  const textMuted = isMen ? 'text-[#94A3B8]' : 'text-[#57534E]';
  const cardBg = isMen ? 'bg-[#1a1209]/80 border border-[#2a1f14]' : 'bg-white border border-[#E7E5E4]';
  const rowBg = isMen ? 'bg-[#2A1F14]/60' : 'bg-[#FAFAFA]';
  const inputBg = isMen ? 'bg-[#0f0b05] border-[#3a2e1f] text-white' : 'bg-white border-[#D6D3D1] text-[#1C1917]';

  return (
    <div className="space-y-6" data-testid="working-hours-vacation-section">
      {/* Vacation Card */}
      <div className={`p-5 rounded-2xl ${cardBg}`} data-testid="vacation-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentBg} flex items-center justify-center shadow-lg`}>
              <Palmtree className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${textMain}`}>{t.vacationTitle}</h3>
              <p className={`text-xs mt-0.5 ${isOnVacation ? 'text-amber-500' : 'text-emerald-500'} font-semibold`}>
                {isOnVacation ? t.vacationOn : t.vacationOff}
              </p>
              <p className={`text-xs mt-1 ${textMuted} max-w-xs`}>{t.vacationDesc}</p>
            </div>
          </div>
          <button
            onClick={toggleVacation}
            disabled={togglingVacation}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 ${
              isOnVacation
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:shadow-lg hover:shadow-amber-500/30'
            }`}
            data-testid="toggle-vacation-btn"
          >
            {togglingVacation ? <Loader2 className="w-4 h-4 animate-spin" /> : (isOnVacation ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            {isOnVacation ? t.turnOff : t.turnOn}
          </button>
        </div>
      </div>

      {/* Working Hours Card */}
      <div className={`p-5 rounded-2xl ${cardBg}`} data-testid="working-hours-card">
        <div className="flex items-center gap-3 mb-4">
          <Clock className={`w-5 h-5 ${accent}`} />
          <div>
            <h3 className={`font-bold ${textMain}`}>{t.title}</h3>
            <p className={`text-xs ${textMuted}`}>{t.subtitle}</p>
          </div>
        </div>

        <div className="space-y-2">
          {DAY_KEYS.map(day => {
            const d = hours[day];
            const label = DAY_LABELS[isRTL ? 'ar' : 'en'][day];
            return (
              <div key={day} className={`p-3 rounded-xl ${rowBg} flex items-center gap-3 flex-wrap`} data-testid={`day-row-${day}`}>
                <div className="flex items-center gap-2 min-w-[90px]">
                  <span className={`font-semibold text-sm ${textMain}`}>{label}</span>
                </div>

                {d.closed ? (
                  <span className="text-xs text-gray-500 flex-1 italic">{t.dayOff}</span>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] ${textMuted}`}>{t.open}</span>
                      <input
                        type="time"
                        value={d.start}
                        onChange={e => updateDay(day, 'start', e.target.value)}
                        className={`px-2 py-1 rounded-lg text-xs border ${inputBg}`}
                        data-testid={`start-${day}`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] ${textMuted}`}>{t.close}</span>
                      <input
                        type="time"
                        value={d.end}
                        onChange={e => updateDay(day, 'end', e.target.value)}
                        className={`px-2 py-1 rounded-lg text-xs border ${inputBg}`}
                        data-testid={`end-${day}`}
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={() => toggleClosed(day)}
                  className={`ms-auto text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                    d.closed
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                  data-testid={`toggle-closed-${day}`}
                >
                  {d.closed ? t.dayOff : t.working}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={saveHours}
          disabled={saving}
          className={`mt-4 w-full py-3 rounded-xl font-bold text-sm transition-all bg-gradient-to-r ${accentBg} text-${isMen ? 'black' : 'white'} hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2`}
          data-testid="save-hours-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t.save}
        </button>
      </div>
    </div>
  );
};

export default WorkingHoursVacation;
