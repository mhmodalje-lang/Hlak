/**
 * BARBER HUB - Privacy Policy (bilingual AR/EN)
 * Required for App Store + Google Play
 */
import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Shield, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPage = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';
  const updated = '2026-04-21';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 md:p-10 border border-amber-100 dark:border-amber-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
            <Shield className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-50">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {isAr ? 'آخر تحديث:' : 'Last updated:'} {updated}
            </p>
          </div>
        </div>
        <div className="prose prose-amber dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 space-y-4">
          {isAr ? <ArabicContent /> : <EnglishContent />}
        </div>
        <div className="mt-8 pt-6 border-t border-amber-100 dark:border-amber-900/30 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Mail size={16} />
          <span>{isAr ? 'للاستفسارات:' : 'Contact:'}</span>
          <Link to="/contact" className="text-amber-700 dark:text-amber-400 hover:underline">{isAr ? 'صفحة التواصل' : 'Contact page'}</Link>
        </div>
      </div>
    </div>
  );
};

const ArabicContent = () => (
  <>
    <p>نحن في <strong>BARBER HUB</strong> نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفق أعلى المعايير الدولية بما فيها GDPR.</p>
    <h2>١. البيانات التي نجمعها</h2>
    <ul>
      <li>معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، كلمة المرور (مشفرة).</li>
      <li>معلومات الموقع: الدولة، المدينة، الحي (لإظهار أفضل الصالونات القريبة).</li>
      <li>سجل الحجوزات والمشتريات.</li>
      <li>الصور التي ترفعها (اختياري) للاستشارة الذكية بالـ AI.</li>
      <li>بيانات تقنية: IP، نوع الجهاز، المتصفح.</li>
    </ul>
    <h2>٢. كيف نستخدم بياناتك</h2>
    <ul>
      <li>تقديم خدمات الحجز والاستشارة.</li>
      <li>إرسال إشعارات الحجوزات وتأكيدها.</li>
      <li>تحسين التطبيق وتخصيص التوصيات.</li>
      <li>مكافحة الاحتيال وحماية الحسابات.</li>
    </ul>
    <h2>٣. المشاركة مع أطراف ثالثة</h2>
    <p>لا نبيع بياناتك. نشاركها فقط مع: الصالون الذي تحجز فيه (الاسم والهاتف)، مزودي خدمات الدفع (Stripe)، ومزودي خدمات الـ AI (Google Gemini / OpenAI عبر Emergent).</p>
    <h2>٤. حقوقك (GDPR)</h2>
    <ul>
      <li><strong>حق الوصول والتصدير:</strong> يمكنك تنزيل نسخة كاملة من بياناتك من <code>الإعدادات → تصدير بياناتي</code>.</li>
      <li><strong>حق الحذف:</strong> يمكنك حذف حسابك وكل بياناتك من <code>الإعدادات → حذف الحساب</code>.</li>
      <li><strong>حق التصحيح:</strong> عدّل معلوماتك من صفحة الملف الشخصي.</li>
      <li><strong>حق الاعتراض:</strong> يمكنك إيقاف الإشعارات من الإعدادات.</li>
    </ul>
    <h2>٥. أمان البيانات</h2>
    <p>نستخدم تشفير bcrypt لكلمات المرور، JWT tokens قصيرة العمر، HTTPS لجميع الاتصالات، ورموز CSRF. نحتفظ بسجل تدقيق لكل العمليات الحساسة.</p>
    <h2>٦. الأطفال</h2>
    <p>خدمتنا موجهة لمن هم ١٣ سنة فأكثر.</p>
    <h2>٧. الكوكيز</h2>
    <p>نستخدم تخزيناً محلياً فقط (localStorage) لحفظ إعدادات اللغة والسمة وجلسة الدخول. لا نستخدم كوكيز تتبّع خارجية.</p>
    <h2>٨. التغييرات على السياسة</h2>
    <p>سننشر أي تحديثات هنا مع تاريخ التعديل. الاستمرار في الاستخدام يعني القبول.</p>
  </>
);

const EnglishContent = () => (
  <>
    <p>At <strong>BARBER HUB</strong> we respect your privacy and commit to protecting your personal data per leading international standards including GDPR and CCPA.</p>
    <h2>1. Data We Collect</h2>
    <ul>
      <li>Account information: name, email, phone, password (bcrypt-hashed).</li>
      <li>Location: country, city, district (to surface the best nearby barbers).</li>
      <li>Booking &amp; purchase history.</li>
      <li>Images you upload (optional) for AI styling advice.</li>
      <li>Technical data: IP, device type, browser.</li>
    </ul>
    <h2>2. How We Use Your Data</h2>
    <ul>
      <li>Providing booking and advisory services.</li>
      <li>Sending booking confirmations and notifications.</li>
      <li>Improving the app and personalizing recommendations.</li>
      <li>Fraud prevention and account protection.</li>
    </ul>
    <h2>3. Third Parties</h2>
    <p>We do not sell your data. We share minimal data with: the barbershop you book (name + phone), payment processors (Stripe), and AI providers (Google Gemini / OpenAI via Emergent).</p>
    <h2>4. Your Rights (GDPR)</h2>
    <ul>
      <li><strong>Access &amp; Export:</strong> Download a complete copy of your data from <code>Settings → Export My Data</code>.</li>
      <li><strong>Erasure:</strong> Delete your account + data from <code>Settings → Delete Account</code>.</li>
      <li><strong>Rectification:</strong> Edit your profile anytime.</li>
      <li><strong>Object:</strong> Disable notifications in Settings.</li>
    </ul>
    <h2>5. Data Security</h2>
    <p>We use bcrypt for passwords, short-lived JWT tokens, HTTPS for all traffic, and CSRF protection. All sensitive actions are recorded in an audit log.</p>
    <h2>6. Children</h2>
    <p>Our service is intended for users 13+ years old.</p>
    <h2>7. Cookies</h2>
    <p>We use browser localStorage only (language, theme, session). No third-party tracking cookies.</p>
    <h2>8. Changes</h2>
    <p>Updates will be posted here with a revision date. Continued use means acceptance.</p>
  </>
);

export default PrivacyPage;
