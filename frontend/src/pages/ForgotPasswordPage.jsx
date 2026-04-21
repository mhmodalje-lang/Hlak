/**
 * BARBER HUB - Forgot + Reset Password (OTP via WhatsApp)
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ShieldCheck, MessageCircle, KeyRound, ArrowLeft } from 'lucide-react';
import PasswordStrengthMeter, { isPasswordValid } from '@/components/PasswordStrengthMeter';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { API } = useApp();
  const { language } = useLocalization();
  const isAr = language === 'ar';
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [waLink, setWaLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = isAr ? {
    title: 'استعادة كلمة المرور',
    subtitle: 'أدخل رقم هاتفك لإرسال رمز التحقق',
    phone: 'رقم الهاتف',
    phoneHint: 'أدخل الرقم مع رمز الدولة، مثل 963935964158',
    sendCode: 'إرسال الرمز',
    codeSent: 'تم إرسال الرمز! انقر على زر الواتساب لإكمال الإرسال',
    openWA: 'فتح الواتساب لإرسال الرمز',
    codeLabel: 'رمز التحقق (٦ أرقام)',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور',
    reset: 'تغيير كلمة المرور',
    success: 'تم تغيير كلمة المرور بنجاح',
    mismatch: 'كلمتا المرور غير متطابقتين',
    invalidOtp: 'الرمز غير صحيح',
    backToLogin: 'العودة لتسجيل الدخول',
    enterPhone: 'الرجاء إدخال رقم الهاتف',
    weakPassword: 'كلمة المرور ضعيفة',
  } : {
    title: 'Reset Your Password',
    subtitle: "Enter your phone to receive a verification code",
    phone: 'Phone Number',
    phoneHint: 'Include country code, e.g., 963935964158',
    sendCode: 'Send Code',
    codeSent: 'Code generated! Click the WhatsApp button to deliver it',
    openWA: 'Open WhatsApp to send code',
    codeLabel: 'Verification Code (6 digits)',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    reset: 'Reset Password',
    success: 'Password reset successfully',
    mismatch: 'Passwords do not match',
    invalidOtp: 'Invalid code',
    backToLogin: 'Back to login',
    enterPhone: 'Please enter your phone number',
    weakPassword: 'Password is too weak',
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, '');
    if (p.length < 8) {
      toast.error(t.enterPhone);
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { phone_number: p });
      setWaLink(res.data.wa_link || '');
      setStep('otp');
      toast.success(t.codeSent);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t.mismatch);
      return;
    }
    if (!isPasswordValid(newPassword)) {
      toast.error(t.weakPassword);
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        phone_number: phone.replace(/\D/g, ''),
        otp: otp.trim(),
        new_password: newPassword,
      });
      toast.success(t.success);
      setTimeout(() => navigate('/auth'), 1000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || t.invalidOtp);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-white to-amber-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-8 border border-amber-200 dark:border-amber-900/40"
      >
        <Link to="/auth" className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400 hover:underline mb-4">
          <ArrowLeft size={14} />
          {t.backToLogin}
        </Link>
        <div className="text-center mb-6">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-800 mb-3">
            {step === 'phone' ? <ShieldCheck className="text-white" size={28} /> : <KeyRound className="text-white" size={28} />}
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{t.title}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">{t.subtitle}</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label className="mb-1 block">{t.phone}</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="963935964158"
                className="text-left" dir="ltr"
                required
              />
              <p className="text-xs text-neutral-500 mt-1">{t.phoneHint}</p>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white">
              {isLoading ? '...' : t.sendCode}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {waLink && (
              <a
                href={waLink}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all"
              >
                <MessageCircle size={18} /> {t.openWA}
              </a>
            )}
            <div>
              <Label className="mb-1 block">{t.codeLabel}</Label>
              <Input
                type="text" inputMode="numeric" maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                required
              />
            </div>
            <div>
              <Label className="mb-1 block">{t.newPassword}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              {newPassword.length > 0 && <PasswordStrengthMeter password={newPassword} language={language} />}
            </div>
            <div>
              <Label className="mb-1 block">{t.confirmPassword}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white">
              {isLoading ? '...' : t.reset}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
