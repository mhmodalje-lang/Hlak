/**
 * BARBER HUB - Terms of Service
 */
import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { FileText } from 'lucide-react';

const TermsPage = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 md:p-10 border border-amber-100 dark:border-amber-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700">
            <FileText className="text-white" size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-50">
            {isAr ? 'شروط الاستخدام' : 'Terms of Service'}
          </h1>
        </div>
        <div className="prose prose-amber dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 space-y-4">
          {isAr ? (
            <>
              <p>باستخدامك تطبيق <strong>BARBER HUB</strong> فإنك توافق على الشروط التالية:</p>
              <h2>١. الحساب</h2>
              <p>أنت مسؤول عن سرية كلمة المرور. أي نشاط من حسابك يعتبر صادراً منك.</p>
              <h2>٢. الحجوزات</h2>
              <p>الحجز عقد بينك وبين الصالون، والتطبيق وسيط فقط. يحق لك الإلغاء قبل الموعد المحدد في إعدادات الصالون.</p>
              <h2>٣. الدفع</h2>
              <p>المبالغ المدفوعة للاشتراكات غير قابلة للاسترداد ما لم يُنص على ذلك. رسوم الصالونات تُدفع مباشرة لهم.</p>
              <h2>٤. السلوك</h2>
              <p>يُحظر: التحرش، المحتوى المسيء، المراجعات المزيفة، انتحال الشخصية، أو محاولة اختراق النظام.</p>
              <h2>٥. الملكية الفكرية</h2>
              <p>الشعار والتصميم والكود ملك لـ BARBER HUB. محتواك يبقى ملكك لكنك تمنحنا ترخيصاً لعرضه.</p>
              <h2>٦. إخلاء المسؤولية</h2>
              <p>التطبيق مقدم "كما هو". لا نضمن خلوه من الأخطاء. الاستخدام على مسؤوليتك.</p>
              <h2>٧. إنهاء الحساب</h2>
              <p>يحق لنا تعليق أو حذف أي حساب يخالف هذه الشروط.</p>
              <h2>٨. القانون الحاكم</h2>
              <p>تخضع هذه الشروط للقوانين المحلية في بلد التسجيل.</p>
            </>
          ) : (
            <>
              <p>By using <strong>BARBER HUB</strong>, you agree to the following:</p>
              <h2>1. Account</h2>
              <p>You are responsible for keeping your password secret. Any activity from your account is attributed to you.</p>
              <h2>2. Bookings</h2>
              <p>A booking is a contract between you and the salon; the app is only an intermediary. You may cancel before the salon's cutoff.</p>
              <h2>3. Payments</h2>
              <p>Subscription fees are non-refundable unless stated. Salon fees are paid directly to them.</p>
              <h2>4. Conduct</h2>
              <p>Forbidden: harassment, offensive content, fake reviews, impersonation, or attempting to hack the system.</p>
              <h2>5. Intellectual Property</h2>
              <p>The logo, design, and code belong to BARBER HUB. Your content remains yours but you grant us a license to display it.</p>
              <h2>6. Disclaimer</h2>
              <p>The service is provided "as is". We do not guarantee it is error-free. Use at your own risk.</p>
              <h2>7. Termination</h2>
              <p>We may suspend or delete accounts that violate these terms.</p>
              <h2>8. Governing Law</h2>
              <p>These terms are governed by the laws of the country where you registered.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
