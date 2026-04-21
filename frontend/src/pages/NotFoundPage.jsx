/**
 * BARBER HUB - 404 Not Found (world-class)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFoundPage = () => {
  const { language } = useLocalization();
  const isAr = language === 'ar';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" dir={isAr ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full text-center bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl p-8 md:p-12 border border-amber-200 dark:border-amber-900/40"
      >
        <div className="text-8xl md:text-9xl font-bold bg-gradient-to-br from-amber-500 to-amber-800 bg-clip-text text-transparent mb-4">
          404
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-3">
          {isAr ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-8">
          {isAr
            ? 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
            : "Sorry, the page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-800 text-white font-semibold hover:from-amber-700 hover:to-amber-900 transition-all shadow-lg hover:shadow-xl"
          >
            <Home size={18} />
            {isAr ? 'الصفحة الرئيسية' : 'Home'}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-amber-400 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all"
          >
            <ArrowLeft size={18} />
            {isAr ? 'رجوع' : 'Go Back'}
          </button>
        </div>
        <div className="mt-8 pt-8 border-t border-amber-100 dark:border-amber-900/30 text-sm text-neutral-500 dark:text-neutral-400">
          <Search size={16} className="inline mx-1" />
          {isAr ? 'جرّب البحث من الصفحة الرئيسية' : 'Try searching from the home page'}
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
