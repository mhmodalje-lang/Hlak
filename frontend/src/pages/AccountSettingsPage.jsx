/**
 * BARBER HUB - Account Settings
 * GDPR-compliant: Data export + Account deletion + 2FA + device management
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Download, Trash2, Shield, Sun, Moon, Monitor, LogOut, ShieldCheck, Phone } from 'lucide-react';

const SectionCard = ({ title, icon: Icon, children, tone = 'amber' }) => (
  <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      {Icon && (
        <div className={`p-2 rounded-lg bg-${tone}-100 dark:bg-${tone}-900/30 text-${tone}-700 dark:text-${tone}-400`}>
          <Icon size={18} />
        </div>
      )}
      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{title}</h2>
    </div>
    {children}
  </div>
);

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { API, token, user, userType, logout } = useApp();
  const { language } = useLocalization();
  const { theme, setTheme } = useTheme();
  const isAr = language === 'ar';
  const [tfaStatus, setTfaStatus] = useState(null);
  const [tfaSetup, setTfaSetup] = useState(null);
  const [tfaCode, setTfaCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [busy, setBusy] = useState(false);

  const t = isAr ? {
    settings: 'الإعدادات',
    appearance: 'المظهر',
    light: 'فاتح', dark: 'داكن', auto: 'تلقائي',
    security: 'الأمان',
    twofa: 'المصادقة الثنائية (2FA)',
    tfaDisabled: 'غير مُفعّل',
    tfaEnabled: 'مُفعّل',
    setupTfa: 'تفعيل',
    disableTfa: 'تعطيل',
    verify: 'تحقق',
    enterCode: 'أدخل الرمز المكوّن من ٦ أرقام من تطبيق المصادقة',
    scanQr: 'امسح هذا الرمز بتطبيق Google Authenticator أو Authy',
    backupCodes: 'رموز النسخ الاحتياطي (احفظها بأمان!):',
    privacy: 'الخصوصية والبيانات',
    exportData: 'تصدير بياناتي (JSON)',
    exportDesc: 'تنزيل نسخة كاملة من كل بياناتك (حجوزات، مراجعات، مفضلة...)',
    deleteAccount: 'حذف الحساب نهائياً',
    deleteDesc: 'سيُحذف حسابك وكل بياناتك الشخصية نهائياً. هذا الإجراء لا يمكن التراجع عنه.',
    confirmWord: 'اكتب "حذف" للتأكيد:',
    confirmWordEn: 'حذف',
    confirmDeleteBtn: 'حذف نهائي',
    logoutAll: 'تسجيل الخروج من كل الأجهزة',
    logoutAllDesc: 'يسجل خروجك من كل الأجهزة التي سجلت دخولاً سابقاً.',
    success: 'تم بنجاح',
    error: 'حدث خطأ',
  } : {
    settings: 'Settings',
    appearance: 'Appearance',
    light: 'Light', dark: 'Dark', auto: 'Auto',
    security: 'Security',
    twofa: 'Two-Factor Authentication',
    tfaDisabled: 'Not enabled',
    tfaEnabled: 'Enabled',
    setupTfa: 'Enable',
    disableTfa: 'Disable',
    verify: 'Verify',
    enterCode: 'Enter the 6-digit code from your authenticator app',
    scanQr: 'Scan this QR with Google Authenticator / Authy',
    backupCodes: 'Backup codes (save these securely!):',
    privacy: 'Privacy & Data',
    exportData: 'Export my data (JSON)',
    exportDesc: 'Download a complete copy of all your data (bookings, reviews, favorites...).',
    deleteAccount: 'Delete account permanently',
    deleteDesc: 'Your account and all personal data will be permanently deleted. This cannot be undone.',
    confirmWord: 'Type "DELETE" to confirm:',
    confirmWordEn: 'DELETE',
    confirmDeleteBtn: 'Permanently Delete',
    logoutAll: 'Sign out of all devices',
    logoutAllDesc: 'Signs you out of every device where you previously logged in.',
    success: 'Done',
    error: 'Error',
  };

  const auth = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const isAdmin = userType === 'admin';

  useEffect(() => {
    if (!token) { navigate('/auth'); return; }
    if (isAdmin) {
      axios.get(`${API}/admin/2fa/status`, auth).then(r => setTfaStatus(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleExport = async () => {
    setBusy(true);
    try {
      const r = await axios.get(`${API}/users/me/export`, auth);
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `barberhub-data-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success(t.success);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (confirmDelete.trim() !== t.confirmWordEn) {
      toast.error(t.error);
      return;
    }
    if (!window.confirm(t.deleteDesc)) return;
    setBusy(true);
    try {
      await axios.delete(`${API}/users/me/account`, auth);
      toast.success(t.success);
      logout();
      navigate('/');
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  const handleLogoutAll = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/auth/logout-all`, {}, auth);
      toast.success(t.success);
      logout();
      navigate('/auth');
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  const setupTfa = async () => {
    setBusy(true);
    try {
      const r = await axios.post(`${API}/admin/2fa/setup`, {}, auth);
      setTfaSetup(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  const verifyTfa = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/admin/2fa/verify`, { code: tfaCode }, auth);
      toast.success(t.success);
      setTfaSetup(null); setTfaCode('');
      const r = await axios.get(`${API}/admin/2fa/status`, auth);
      setTfaStatus(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  const disableTfa = async () => {
    if (!tfaCode) return toast.error(t.enterCode);
    setBusy(true);
    try {
      await axios.post(`${API}/admin/2fa/disable`, { code: tfaCode }, auth);
      toast.success(t.success);
      setTfaCode('');
      const r = await axios.get(`${API}/admin/2fa/status`, auth);
      setTfaStatus(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t.error);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">{t.settings}</h1>

        {/* Appearance */}
        <SectionCard title={t.appearance} icon={Monitor}>
          <div className="flex gap-2">
            {[
              { key: 'light', label: t.light, icon: Sun },
              { key: 'dark', label: t.dark, icon: Moon },
              { key: 'auto', label: t.auto, icon: Monitor },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTheme(opt.key)}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${theme === opt.key ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'}`}
              >
                <opt.icon size={16} />
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Security - 2FA (admin only) */}
        {isAdmin && (
          <SectionCard title={t.security} icon={Shield}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-50">{t.twofa}</div>
                <div className={`text-sm ${tfaStatus?.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500'}`}>
                  {tfaStatus?.enabled ? `✓ ${t.tfaEnabled}` : t.tfaDisabled}
                </div>
              </div>
              {!tfaStatus?.enabled && !tfaSetup && (
                <Button onClick={setupTfa} disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {t.setupTfa}
                </Button>
              )}
            </div>
            {tfaSetup && (
              <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{t.scanQr}</p>
                <img src={tfaSetup.qr_code} alt="QR" className="w-48 h-48 mx-auto bg-white rounded-lg" />
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono bg-white dark:bg-neutral-800 p-2 rounded break-all">
                  {tfaSetup.secret}
                </div>
                <Input
                  placeholder="123456" value={tfaCode} onChange={e => setTfaCode(e.target.value.replace(/\D/g,''))}
                  maxLength={6} className="text-center text-xl tracking-widest font-mono"
                />
                <Button onClick={verifyTfa} disabled={tfaCode.length !== 6 || busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  {t.verify}
                </Button>
                <div className="mt-2">
                  <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">{t.backupCodes}</div>
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono bg-white dark:bg-neutral-800 p-2 rounded">
                    {tfaSetup.backup_codes?.map((c, i) => <div key={i}>{c}</div>)}
                  </div>
                </div>
              </div>
            )}
            {tfaStatus?.enabled && !tfaSetup && (
              <div className="flex gap-2">
                <Input placeholder="123456" value={tfaCode} onChange={e => setTfaCode(e.target.value.replace(/\D/g,''))} maxLength={6} className="text-center tracking-widest font-mono" />
                <Button onClick={disableTfa} disabled={busy} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50">
                  {t.disableTfa}
                </Button>
              </div>
            )}
          </SectionCard>
        )}

        {/* Sessions */}
        <SectionCard title={t.logoutAll} icon={LogOut}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">{t.logoutAllDesc}</p>
          <Button onClick={handleLogoutAll} disabled={busy} variant="outline" className="border-amber-400">
            <LogOut size={16} className="mr-2" />
            {t.logoutAll}
          </Button>
        </SectionCard>

        {/* Privacy */}
        <SectionCard title={t.privacy} icon={Download}>
          <div className="mb-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">{t.exportDesc}</p>
            <Button onClick={handleExport} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download size={16} className="mr-2" />
              {t.exportData}
            </Button>
          </div>
        </SectionCard>

        {/* Danger zone */}
        <SectionCard title={t.deleteAccount} icon={Trash2} tone="red">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">{t.deleteDesc}</p>
          <label className="block text-sm font-medium text-red-700 dark:text-red-400 mb-2">{t.confirmWord}</label>
          <Input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder={t.confirmWordEn} className="mb-3 border-red-300" />
          <Button
            onClick={handleDelete}
            disabled={busy || confirmDelete.trim() !== t.confirmWordEn}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            <Trash2 size={16} className="mr-2" />
            {t.confirmDeleteBtn}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
