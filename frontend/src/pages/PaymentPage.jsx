import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { MessageCircle } from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { gender, language } = useApp();

  const isMen = gender === 'male';

  const texts = {
    ar: {
      title: 'تفعيل الاشتراك السنوي',
      subtitle: 'بسبب عدم توفر أدوات الدفع الإلكتروني المباشرة في منطقتك، يتم تفعيل الاشتراك عبر الحوالة اليدوية لضمان الأمان والسرعة.',
      transferData: 'بيانات التحويل:',
      amountRequired: 'المبلغ المطلوب:',
      amountNote: '(حسب الباقة)',
      recipientName: 'اسم المستلم:',
      address: 'العنوان:',
      transferNote: 'يمكنك التحويل من أي مكتب صرافة قريب منك، أو عن طريق أي شخص ينوب عنك.',
      afterTransfer: 'بعد التحويل، يرجى إرسال صورة "إشعار التحويل" عبر الواتساب لتفعيل حسابك خلال 24 ساعة.',
      contactBtn: 'تواصل لتأكيد الحوالة',
      adminNumber: 'رقم المدير:',
      packages: 'باقات الاشتراك',
      basic: 'عادي',
      barber: 'حلاق',
      store: 'متجر',
      vip: 'VIP'
    },
    en: {
      title: 'Activate Annual Subscription',
      subtitle: 'Due to the lack of direct electronic payment options in your region, subscription is activated via manual transfer to ensure security and speed.',
      transferData: 'Transfer Details:',
      amountRequired: 'Amount Required:',
      amountNote: '(based on package)',
      recipientName: 'Recipient Name:',
      address: 'Address:',
      transferNote: 'You can transfer from any nearby exchange office, or through anyone who can transfer on your behalf.',
      afterTransfer: 'After transfer, please send a photo of the "Transfer Receipt" via WhatsApp to activate your account within 24 hours.',
      contactBtn: 'Contact to Confirm Transfer',
      adminNumber: 'Admin Number:',
      packages: 'Subscription Packages',
      basic: 'Basic',
      barber: 'Barber',
      store: 'Store',
      vip: 'VIP'
    }
  };

  const t = texts[language] || texts.ar;

  const packages = [
    { name: t.basic, price: 75, color: 'from-gray-400 to-gray-600', features: language === 'ar' ? 'ملف شخصي + حجوزات' : 'Profile + Bookings' },
    { name: t.barber, price: 100, color: 'from-blue-400 to-blue-600', features: language === 'ar' ? 'كل الميزات + QR Code' : 'All features + QR Code' },
    { name: t.store, price: 150, color: 'from-purple-400 to-purple-600', features: language === 'ar' ? 'متجر مصغر + 5 منتجات' : 'Mini store + 5 products' },
    { name: t.vip, price: 175, color: 'from-yellow-400 to-yellow-600', features: language === 'ar' ? 'ظهور مميز + أولوية' : 'Featured + Priority' }
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
    <div className="min-h-screen bg-gray-950 text-white p-8" dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="payment-page">
      <div className="max-w-2xl mx-auto">
        {/* Main Card */}
        <div className="bg-gray-900 p-10 rounded-[3rem] border border-yellow-500/30 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-yellow-500 text-black rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg">
              💶
            </div>
            <h1 className="text-3xl font-black">{t.title}</h1>
            <p className="text-gray-400 mt-3 text-sm leading-relaxed">{t.subtitle}</p>
          </div>

          {/* Packages */}
          <div className="mb-8">
            <h3 className="text-yellow-500 font-bold mb-4">{t.packages}</h3>
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <div 
                  key={pkg.name}
                  className={`bg-gradient-to-br ${pkg.color} p-4 rounded-2xl text-center text-white`}
                >
                  <p className="text-xs opacity-80">{pkg.name}</p>
                  <p className="text-2xl font-black my-1">{pkg.price}€</p>
                  <p className="text-[10px] opacity-70">{pkg.features}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Details */}
          <div className="bg-black/50 p-6 rounded-3xl border border-gray-800 mb-8">
            <h2 className="text-yellow-500 font-bold mb-4 underline underline-offset-8">{t.transferData}</h2>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">{t.amountRequired}</span>
                <span className="font-black text-xl">75€ - 175€ <span className="text-xs font-normal opacity-50 text-gray-400">{t.amountNote}</span></span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">{t.recipientName}</span>
                <span className="font-black">محمد الرجب</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">{t.address}</span>
                <span className="font-black">سوريا، الحسكة</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 italic text-center">{t.transferNote}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <p className="text-sm font-bold">{t.afterTransfer}</p>
            <button 
              onClick={openWhatsApp}
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full font-black text-xl transition-all shadow-xl hover:scale-105"
              data-testid="whatsapp-payment-btn"
            >
              <MessageCircle size={28}/> {t.contactBtn}
            </button>
            <p className="text-[10px] text-gray-600">{t.adminNumber} +963 935 964 158</p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="fixed bottom-4 left-4 flex gap-2 z-[100] scale-75 opacity-50 hover:opacity-100 transition-opacity">
          <button onClick={() => navigate('/')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
            {language === 'ar' ? 'شاشة الدخول' : 'Landing'}
          </button>
          <button onClick={() => navigate('/home')} className="bg-white text-black p-2 rounded-lg text-[10px] font-bold">
            {language === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
