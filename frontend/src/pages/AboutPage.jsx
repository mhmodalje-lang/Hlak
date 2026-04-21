/**
 * BARBER HUB - About Us
 */
import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Crown, Users, Globe, Award, Heart, Sparkles } from 'lucide-react';

const AboutPage = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';

  const stats = [
    { icon: Users, label: isAr ? 'مستخدم' : 'Users', value: '50K+' },
    { icon: Crown, label: isAr ? 'صالون شريك' : 'Salons', value: '2K+' },
    { icon: Globe, label: isAr ? 'دولة' : 'Countries', value: '25+' },
    { icon: Award, label: isAr ? 'حجز ناجح' : 'Bookings', value: '200K+' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-800 mb-4 shadow-lg">
            <Crown className="text-white" size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-amber-600 to-amber-900 bg-clip-text text-transparent mb-3">
            BARBER HUB
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            {isAr
              ? 'المنصة العالمية الأولى للأناقة الرجالية والعناية النسائية، تجمع النخبة من الحلاقين والصالونات في مكان واحد.'
              : "The world's premier platform for men's styling and women's care — bringing elite barbers and salons together in one place."}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((s, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/30 shadow-sm text-center">
              <s.icon className="mx-auto text-amber-600 dark:text-amber-400 mb-2" size={24} />
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{s.value}</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-10 border border-amber-100 dark:border-amber-900/30 shadow-xl">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Sparkles className="mx-auto text-amber-600 mb-2" size={28} />
              <h3 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{isAr ? 'ذكاء اصطناعي' : 'AI-Powered'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{isAr ? 'استشاري أنماط شعر ذكي + تجريب افتراضي بالـ AI.' : 'Smart hairstyle advisor + virtual try-on with AI.'}</p>
            </div>
            <div className="text-center">
              <Heart className="mx-auto text-amber-600 mb-2" size={28} />
              <h3 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{isAr ? 'مصنوع بشغف' : 'Built With Passion'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{isAr ? 'فريق مهووس بالتفاصيل والأناقة، من أجل تجربة استثنائية.' : 'A team obsessed with detail and style for an exceptional experience.'}</p>
            </div>
            <div className="text-center">
              <Globe className="mx-auto text-amber-600 mb-2" size={28} />
              <h3 className="font-bold text-lg mb-2 text-neutral-900 dark:text-neutral-50">{isAr ? 'عالمي' : 'Global'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{isAr ? '١٠ لغات، ٢٥+ دولة، عملات محلية، أنماط ثقافية.' : '10 languages, 25+ countries, local currencies, cultural styles.'}</p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-amber-100 dark:border-amber-900/30">
            <h2 className="text-xl font-bold mb-3 text-neutral-900 dark:text-neutral-50">{isAr ? 'مهمتنا' : 'Our Mission'}</h2>
            <p className="text-neutral-700 dark:text-neutral-300">
              {isAr ? 'نربط بين أفضل الحلاقين والصالونات والعملاء عبر منصة سهلة، آمنة، ذكية، تحترم خصوصيتك وتحترم تراث مهنة الحلاقة العريقة.' : 'We connect the best barbers, salons, and customers through an easy, secure, and smart platform that respects your privacy and honors the heritage of the barbering craft.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
