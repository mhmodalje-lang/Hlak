/**
 * BARBER HUB - Contact Us
 * WhatsApp removed per v3.9.1 — all support via platform only (email + in-app chat).
 */
import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Mail, MapPin, Send, Phone } from 'lucide-react';

const ContactPage = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';

  const channels = [
    {
      icon: Mail,
      title: isAr ? 'البريد الإلكتروني' : 'Email',
      subtitle: 'support@barberhub.com',
      href: 'mailto:support@barberhub.com',
      color: 'from-amber-500 to-amber-700',
      testId: 'contact-email',
    },
    {
      icon: Phone,
      title: isAr ? 'الهاتف' : 'Phone',
      subtitle: '+963 935 964 158',
      href: 'tel:+963935964158',
      color: 'from-neutral-700 to-neutral-900',
      testId: 'contact-phone',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'} data-testid="contact-page">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            {isAr ? 'تواصل معنا' : 'Contact Us'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {isAr ? 'جميع التواصل عبر المنصة أو البريد الإلكتروني' : 'All communication via the platform or email'}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {channels.map((ch, i) => (
            <a
              key={i}
              href={ch.href}
              target={ch.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              data-testid={ch.testId}
              className="group bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30 shadow-sm hover:shadow-xl transition-all"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${ch.color} mb-4 shadow-md`}>
                <ch.icon className="text-white" size={24} />
              </div>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-50 mb-1">{ch.title}</h3>
              <p className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-2">
                {ch.subtitle}
                <Send size={14} className="group-hover:translate-x-1 transition-transform" />
              </p>
            </a>
          ))}
        </div>

        <div className="mt-8 bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30">
          <div className="flex items-start gap-3">
            <MapPin className="text-amber-600 dark:text-amber-400 mt-1" size={20} />
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{isAr ? 'ساعات الدعم' : 'Support Hours'}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{isAr ? 'الدعم متاح ٢٤/٧، الرد على البريد خلال ٢٤ ساعة' : 'Support 24/7, Email within 24h'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
