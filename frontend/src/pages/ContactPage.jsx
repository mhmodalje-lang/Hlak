/**
 * BARBER HUB - Contact Us
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useApp } from '@/App';
import { Mail, MessageCircle, MapPin, Send } from 'lucide-react';

const ContactPage = () => {
  const { language } = useLocalization();
  const { API } = useApp();
  const isAr = language === 'ar';
  const [adminWa, setAdminWa] = useState('963935964158');

  useEffect(() => {
    axios.get(`${API}/config/public`).then(r => setAdminWa(r.data.admin_whatsapp || adminWa)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const channels = [
    {
      icon: MessageCircle,
      title: isAr ? 'واتساب الدعم' : 'WhatsApp Support',
      subtitle: `+${adminWa}`,
      href: `https://wa.me/${adminWa}?text=${encodeURIComponent(isAr ? 'مرحباً، أحتاج مساعدة من فريق BARBER HUB' : 'Hi, I need help from BARBER HUB team')}`,
      color: 'from-emerald-500 to-emerald-700',
    },
    {
      icon: Mail,
      title: isAr ? 'البريد الإلكتروني' : 'Email',
      subtitle: 'support@barberhub.com',
      href: 'mailto:support@barberhub.com',
      color: 'from-amber-500 to-amber-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-4 md:p-8" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
            {isAr ? 'تواصل معنا' : 'Contact Us'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {isAr ? 'نحن هنا لمساعدتك ٢٤/٧' : "We're here to help 24/7"}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {channels.map((ch, i) => (
            <a
              key={i}
              href={ch.href}
              target={ch.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{isAr ? 'الدردشة متاحة ٢٤/٧، البريد خلال ٢٤ ساعة' : 'Chat 24/7, Email within 24h'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
