/**
 * BARBER HUB - Change Password page (v3.7)
 * Reached when an account logs in with must_change_password=true,
 * or when the user proactively wants to rotate credentials.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import PasswordStrengthMeter, { isPasswordValid } from '@/components/PasswordStrengthMeter';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { API, token, logout } = useApp();
  const { language } = useLocalization();
  const isRTL = language === 'ar';

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const t = language === 'ar'
    ? {
        title: 'تغيير كلمة المرور',
        subtitle: 'لحماية حسابك، يرجى تعيين كلمة مرور قوية وفريدة',
        current: 'كلمة المرور الحالية',
        new: 'كلمة المرور الجديدة',
        confirm: 'تأكيد كلمة المرور الجديدة',
        save: 'حفظ كلمة المرور',
        back: 'رجوع',
        noMatch: 'كلمتا المرور غير متطابقتين',
        sameAsOld: 'يجب أن تختلف كلمة المرور الجديدة عن القديمة',
        success: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى.',
        failure: 'فشل في تغيير كلمة المرور',
      }
    : {
        title: 'Change Password',
        subtitle: 'For your account safety, choose a strong and unique password',
        current: 'Current password',
        new: 'New password',
        confirm: 'Confirm new password',
        save: 'Save password',
        back: 'Back',
        noMatch: 'Passwords do not match',
        sameAsOld: 'New password must differ from the current one',
        success: 'Password changed successfully. Please log in again.',
        failure: 'Failed to change password',
      };

  const submit = async (e) => {
    e.preventDefault();
    if (newPw !== confirm) {
      toast.error(t.noMatch);
      return;
    }
    if (oldPw && oldPw === newPw) {
      toast.error(t.sameAsOld);
      return;
    }
    if (!isPasswordValid(newPw)) {
      toast.error(
        language === 'ar'
          ? 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على رقم'
          : 'Password must be at least 8 characters and include a digit'
      );
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        { old_password: oldPw, new_password: newPw },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.success);
      // Force re-login for a clean session
      try { logout && logout(); } catch (_) {}
      setTimeout(() => navigate('/auth'), 400);
    } catch (err) {
      toast.error(err.response?.data?.detail || t.failure);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bh-surface min-h-[100dvh] flex items-center justify-center p-4 relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-15" />
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-50 bh-btn bh-btn-ghost"
      >
        <ArrowLeft className="w-5 h-5" />
        {t.back}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-full bh-glass-hi flex items-center justify-center"
            style={{ border: '2px solid var(--bh-gold)', boxShadow: '0 0 40px rgba(212,175,55,0.35)' }}
          >
            <ShieldCheck className="w-10 h-10" style={{ color: 'var(--bh-gold)' }} />
          </div>
          <h1 className="bh-h1 text-2xl mb-1">{t.title}</h1>
          <p className="text-sm" style={{ color: 'var(--bh-text-secondary)' }}>{t.subtitle}</p>
        </div>

        <form onSubmit={submit} className="bh-glass rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>{t.current}</Label>
            <Input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              required
              className="bh-input"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label>{t.new}</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              className="bh-input"
              autoComplete="new-password"
            />
            <PasswordStrengthMeter password={newPw} language={language} />
          </div>

          <div className="space-y-2">
            <Label>{t.confirm}</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="bh-input"
              autoComplete="new-password"
            />
            {confirm && confirm !== newPw && (
              <p className="text-xs" style={{ color: '#C07B1F' }}>{t.noMatch}</p>
            )}
          </div>

          <Button
            type="submit"
            className="bh-btn bh-btn-primary w-full"
            disabled={loading || !isPasswordValid(newPw) || newPw !== confirm}
          >
            {loading ? '...' : t.save}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
