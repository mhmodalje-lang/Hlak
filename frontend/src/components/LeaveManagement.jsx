import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { CalendarOff, X, Check, Plus, Loader2 } from 'lucide-react';

/**
 * LeaveManagement - Phase 5 dashboard card.
 * Lets the shop mark vacation / closed days.
 * Props: API, token, isMen, language, shopId (public reading if provided)
 */
const LeaveManagement = ({ API, token, isMen, language }) => {
  const [dates, setDates] = useState([]);
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const t = {
    ar: {
      title: 'أيام الإجازة والإغلاق',
      subtitle: 'الأيام التي سيُخفى فيها الجدول من الزبائن',
      addDate: 'أضف تاريخاً',
      reason: 'السبب (اختياري)',
      reasonPlaceholder: 'مثال: إجازة عيد',
      save: 'حفظ',
      saving: 'جاري الحفظ...',
      saved: 'تم حفظ أيام الإجازة',
      noDates: 'لم تتم إضافة أيام إجازة بعد',
      remove: 'إزالة',
      alreadyAdded: 'هذا التاريخ مضاف مسبقاً',
      invalidDate: 'اختر تاريخاً صحيحاً'
    },
    en: {
      title: 'Leave / Closed Days',
      subtitle: 'Days hidden from the booking calendar',
      addDate: 'Add a date',
      reason: 'Reason (optional)',
      reasonPlaceholder: 'e.g. public holiday',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Leave dates saved',
      noDates: 'No leave dates yet',
      remove: 'Remove',
      alreadyAdded: 'Date already added',
      invalidDate: 'Pick a valid date'
    }
  }[language] || {};

  const fetchLeave = useCallback(async () => {
    setLoading(true);
    try {
      // Endpoint is public but we need shop_id — fetch profile to get it
      const profRes = await axios.get(`${API}/barbers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const shopId = profRes.data?.id;
      if (shopId) {
        const res = await axios.get(`${API}/barbershops/${shopId}/leave`);
        setDates(res.data?.leave_dates || []);
        setReason(res.data?.leave_reason || '');
      }
    } catch (err) {
      console.error('Leave fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [API, token]);

  useEffect(() => { fetchLeave(); }, [fetchLeave]);

  const addDate = () => {
    if (!newDate) { toast.error(t.invalidDate); return; }
    if (dates.includes(newDate)) { toast.error(t.alreadyAdded); return; }
    setDates([...dates, newDate].sort());
    setNewDate('');
  };

  const removeDate = (d) => setDates(dates.filter(x => x !== d));

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/barbershops/me/leave`, { dates, reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t.saved);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const gold = isMen ? '#D4AF37' : '#B76E79';
  const inputClass = isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : '';

  return (
    <div className={`${isMen ? 'card-men' : 'card-women'} p-5 mb-8`} data-testid="leave-management-card">
      <div className="mb-3">
        <h3 className={`font-bold flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
          <CalendarOff style={{ color: gold }} className="w-5 h-5" />
          {t.title}
        </h3>
        <p className={`text-xs mt-1 ${isMen ? 'text-gray-400' : 'text-gray-500'}`}>{t.subtitle}</p>
      </div>

      {loading ? (
        <div className="text-center py-3 opacity-60 text-sm">...</div>
      ) : (
        <>
          {/* Add date row */}
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className={inputClass}
                data-testid="leave-date-input"
              />
            </div>
            <Button onClick={addDate} size="sm" className={isMen ? 'btn-primary-men' : 'btn-primary-women'} data-testid="add-leave-btn">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Reason */}
          <Input
            placeholder={t.reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputClass} mb-4`}
            data-testid="leave-reason-input"
          />

          {/* Dates list */}
          {dates.length === 0 ? (
            <p className={`text-sm ${isMen ? 'text-gray-500' : 'text-gray-400'} mb-4`}>{t.noDates}</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4" data-testid="leave-dates-list">
              {dates.map(d => (
                <span
                  key={d}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-gray-100 text-gray-900'}`}
                >
                  {d}
                  <button onClick={() => removeDate(d)} className="hover:text-red-500" data-testid={`remove-leave-${d}`}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`} data-testid="save-leave-btn">
            {saving ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Check className="w-4 h-4 me-2" />}
            {saving ? t.saving : t.save}
          </Button>
        </>
      )}
    </div>
  );
};

export default LeaveManagement;
