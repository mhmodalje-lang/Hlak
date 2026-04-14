import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, ArrowLeft, MessageCircle, CreditCard, 
  Building, User, CheckCircle
} from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { gender, language, themeClass } = useApp();

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      title: 'تفعيل الاشتراك',
      subtitle: 'بسبب عدم توفر أدوات دفع في المنطقة، يرجى تفعيل الاشتراك عبر التحويل المالي',
      plans: 'باقات الاشتراك',
      basic: 'عادي',
      barber: 'حلاق',
      store: 'متجر',
      vip: 'VIP',
      basicDesc: 'ملف شخصي + حجوزات',
      barberDesc: 'كل الميزات + QR Code',
      storeDesc: 'متجر مصغر + 5 منتجات',
      vipDesc: 'ظهور مميز + أولوية',
      yearly: 'سنوياً',
      howTo: 'طريقة التفعيل',
      step1: 'اختر الباقة المناسبة',
      step2: 'قم بالتحويل المالي',
      step3: 'أرسل إشعار التحويل عبر واتساب',
      step4: 'سيتم تفعيل اشتراكك خلال 24 ساعة',
      transferInfo: 'معلومات التحويل',
      name: 'الاسم: محمد الرجب',
      location: 'الموقع: سوريا - الحسكة',
      method: 'الطريقة: من أي مكتب صراف قريب عليك أو أي شخص يمكنه الدفع عنك',
      sendReceipt: 'أرسل إشعار التحويل',
      whatsappNumber: '+963 935 964 158',
      disclaimer: 'ملاحظة: بعد إرسال إشعار التحويل باسمك، سيتم تفعيل اشتراكك خلال 24 ساعة'
    },
    en: {
      back: 'Back',
      title: 'Activate Subscription',
      subtitle: 'Due to limited payment options in the region, please activate via bank transfer',
      plans: 'Subscription Plans',
      basic: 'Basic',
      barber: 'Barber',
      store: 'Store',
      vip: 'VIP',
      basicDesc: 'Profile + Bookings',
      barberDesc: 'All features + QR Code',
      storeDesc: 'Mini store + 5 products',
      vipDesc: 'Featured + Priority',
      yearly: 'Yearly',
      howTo: 'How to Activate',
      step1: 'Choose your plan',
      step2: 'Make the transfer',
      step3: 'Send receipt via WhatsApp',
      step4: 'Activation within 24 hours',
      transferInfo: 'Transfer Information',
      name: 'Name: Mohammed Al-Rajab',
      location: 'Location: Syria - Hasakah',
      method: 'Method: From any nearby exchange office or anyone who can pay on your behalf',
      sendReceipt: 'Send Transfer Receipt',
      whatsappNumber: '+963 935 964 158',
      disclaimer: 'Note: After sending the transfer receipt with your name, your subscription will be activated within 24 hours'
    }
  };

  const t = texts[language] || texts.ar;

  const plans = [
    { key: 'basic', price: 75, color: 'from-gray-400 to-gray-600' },
    { key: 'barber', price: 100, color: 'from-blue-400 to-blue-600' },
    { key: 'store', price: 150, color: 'from-purple-400 to-purple-600' },
    { key: 'vip', price: 175, color: 'from-yellow-400 to-yellow-600' }
  ];

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      language === 'ar' 
        ? 'مرحباً، أريد تفعيل اشتراك في BARBER HUB'
        : 'Hello, I want to activate a BARBER HUB subscription'
    );
    window.open(`https://wa.me/963935964158?text=${message}`, '_blank');
  };

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="payment-page">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#1F1F1F] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              <CreditCard className={`w-6 h-6 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
              {t.title}
            </h1>
            <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.subtitle}</p>
          </div>
        </div>

        {/* Plans */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-6 mb-6`}>
          <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {t.plans}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div 
                key={plan.key}
                className={`p-4 rounded-xl bg-gradient-to-br ${plan.color} text-white text-center`}
              >
                <p className="text-sm opacity-80">{t[plan.key]}</p>
                <p className="text-3xl font-bold my-2">{plan.price}€</p>
                <p className="text-xs opacity-80">{t.yearly}</p>
                <p className="text-xs mt-2 opacity-70">{t[`${plan.key}Desc`]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to Activate */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-6 mb-6`}>
          <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            {t.howTo}
          </h2>
          <div className="space-y-4">
            {[t.step1, t.step2, t.step3, t.step4].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white'}`}>
                  {i + 1}
                </div>
                <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Info */}
        <div className={`${isMen ? 'card-men' : 'card-women'} p-6 mb-6`}>
          <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <Building className="w-5 h-5 inline me-2" />
            {t.transferInfo}
          </h2>
          <div className={`p-4 rounded-lg ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}>
            <div className="space-y-3">
              <p className={`flex items-center gap-2 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <User className="w-4 h-4" />
                {t.name}
              </p>
              <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.location}</p>
              <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.method}</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Button */}
        <div className="text-center">
          <Button
            onClick={openWhatsApp}
            className="whatsapp-btn text-lg px-8 py-6"
            data-testid="whatsapp-payment-btn"
          >
            <MessageCircle className="w-6 h-6 me-2" />
            {t.sendReceipt}
          </Button>
          <p className={`mt-4 text-lg font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
            {t.whatsappNumber}
          </p>
          <p className={`mt-4 text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
            {t.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
