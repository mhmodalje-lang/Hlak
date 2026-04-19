/**
 * BARBER HUB - MyBookings (VIP Warm Luxury)
 * User bookings list with status tracking
 * Features: Dynamic currency, Cancel/Review, RTL support
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';

// Import custom icons
import {
  ArrowLeft, BookCalendar, Clock, Star, Check, Close, Location, Shears, Crown
} from '@/components/icons';

const MyBookings = () => {
  const navigate = useNavigate();
  const { API, token, isAuthenticated } = useApp();
  const { language } = useLocalization();
  const { formatPrice } = useCurrency();
  
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRTL = language === 'ar';

  const t = language === 'ar' ? {
    back: 'رجوع', title: 'حجوزاتي', noBookings: 'لا توجد حجوزات',
    loginRequired: 'يرجى تسجيل الدخول', pending: 'قيد الانتظار',
    confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي',
    cancel: 'إلغاء', review: 'تقييم', cancelConfirm: 'هل تريد إلغاء الحجز؟',
    cancelSuccess: 'تم إلغاء الحجز', reviewTitle: 'قيّم تجربتك',
    submitReview: 'إرسال التقييم', reviewSuccess: 'شكراً على تقييمك',
    services: 'الخدمات', total: 'المجموع', date: 'التاريخ',
    time: 'الوقت', location: 'الموقع', status: 'الحالة',
    viewShop: 'عرض الصالون', cancelBooking: 'إلغاء الحجز',
    writeReview: 'اكتب تقييمك...', loading: 'جاري التحميل...'
  } : {
    back: 'Back', title: 'My Bookings', noBookings: 'No bookings yet',
    loginRequired: 'Please login', pending: 'Pending',
    confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
    cancel: 'Cancel', review: 'Review', cancelConfirm: 'Cancel this booking?',
    cancelSuccess: 'Booking cancelled', reviewTitle: 'Rate your experience',
    submitReview: 'Submit Review', reviewSuccess: 'Thank you for your review',
    services: 'Services', total: 'Total', date: 'Date',
    time: 'Time', location: 'Location', status: 'Status',
    viewShop: 'View Shop', cancelBooking: 'Cancel Booking',
    writeReview: 'Write your review...', loading: 'Loading...'
  };

  // Fetch bookings
  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate('/auth');
      return;
    }

    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(res.data.bookings || []);
      } catch (err) {
        toast.error('Error loading bookings');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [API, token, isAuthenticated, navigate]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t.cancelConfirm)) return;

    try {
      await axios.put(
        `${API}/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
      toast.success(t.cancelSuccess);
    } catch (err) {
      toast.error('Error cancelling booking');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBooking) return;

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API}/barbershops/${selectedBooking.barbershop_id}/reviews`,
        {
          booking_id: selectedBooking.id,
          rating: reviewRating,
          comment: reviewComment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t.reviewSuccess);
      setShowReviewDialog(false);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      toast.error('Error submitting review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'confirmed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)] border-[var(--bh-glass-border)]';
    }
  };

  if (isLoading) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--bh-gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--bh-text-secondary)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bh-surface min-h-screen">
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-10" />

      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[var(--bh-obsidian)]/90 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bh-btn bh-btn-ghost bh-btn-sm">
            <ArrowLeft className="w-5 h-5" />
            {t.back}
          </button>
          <h1 className="flex-1 text-2xl font-display font-bold bh-gold-text flex items-center gap-2">
            <BookCalendar className="w-7 h-7" />
            {t.title}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {bookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bh-glass-vip rounded-3xl p-12 text-center bh-corner-accents"
          >
            <BookCalendar className="w-20 h-20 text-[var(--bh-gold)] mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-2">{t.noBookings}</h2>
            <p className="text-[var(--bh-text-secondary)] mb-6">
              {language === 'ar' ? 'ابدأ بحجز موعدك الأول!' : 'Start by booking your first appointment!'}
            </p>
            <Button onClick={() => navigate('/home')} className="bh-btn bh-btn-primary">
              <Shears className="w-5 h-5" />
              {language === 'ar' ? 'تصفح الصالونات' : 'Browse Salons'}
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left: Barber Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-display font-bold text-white mb-2">
                          {booking.barbershop_name || 'Salon'}
                        </h3>
                        {booking.barbershop_city && (
                          <div className="flex items-center gap-2 text-[var(--bh-text-secondary)] mb-2">
                            <Location className="w-4 h-4" />
                            <span>{booking.barbershop_city}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                        {t[booking.status?.toLowerCase()] || booking.status}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bh-glass p-3 rounded-xl">
                        <div className="text-xs text-[var(--bh-text-muted)] mb-1">{t.date}</div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <BookCalendar className="w-4 h-4 text-[var(--bh-gold)]" />
                          {booking.date ? format(new Date(booking.date), 'dd MMM yyyy', {
                            locale: language === 'ar' ? ar : enUS
                          }) : '-'}
                        </div>
                      </div>
                      <div className="bh-glass p-3 rounded-xl">
                        <div className="text-xs text-[var(--bh-text-muted)] mb-1">{t.time}</div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[var(--bh-gold)]" />
                          {booking.time || '-'}
                        </div>
                      </div>
                    </div>

                    {/* Services */}
                    {booking.services && booking.services.length > 0 && (
                      <div className="mb-4">
                        <div className="text-sm text-[var(--bh-text-muted)] mb-2">{t.services}:</div>
                        <div className="flex flex-wrap gap-2">
                          {booking.services.map((service, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-[var(--bh-glass-bg)] text-xs text-white">
                              {language === 'ar' ? (service.name_ar || service.name) : service.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total Price */}
                    <div className="pt-4 border-t border-[var(--bh-glass-border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--bh-text-secondary)]">{t.total}:</span>
                        <span className="text-2xl font-display font-bold bh-gold-text">
                          {formatPrice(booking.total_price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-3 md:w-48">
                    <Button
                      onClick={() => navigate(`/barber/${booking.barbershop_id}`)}
                      className="bh-btn bh-btn-outline w-full"
                    >
                      {t.viewShop}
                    </Button>

                    {booking.status === 'confirmed' && (
                      <Button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="bh-btn bh-btn-ghost w-full text-red-400 hover:bg-red-500/20"
                      >
                        <Close className="w-4 h-4" />
                        {t.cancel}
                      </Button>
                    )}

                    {booking.status === 'completed' && !booking.has_review && (
                      <Button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowReviewDialog(true);
                        }}
                        className="bh-btn bh-btn-primary w-full"
                      >
                        <Star className="w-4 h-4" />
                        {t.review}
                      </Button>
                    )}

                    {booking.status === 'completed' && booking.has_review && (
                      <div className="flex items-center justify-center gap-1 py-2 text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-bold">
                          {language === 'ar' ? 'تم التقييم' : 'Reviewed'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bh-glass-vip border border-[var(--bh-gold)]/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold bh-gold-text flex items-center gap-2">
              <Crown className="w-6 h-6" />
              {t.reviewTitle}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= reviewRating ? 'text-[var(--bh-gold)]' : 'text-[var(--bh-text-muted)]'
                    }`}
                    fill={star <= reviewRating ? 'var(--bh-gold)' : 'none'}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t.writeReview}
              className="bh-input min-h-[120px]"
            />

            {/* Submit */}
            <Button
              onClick={handleSubmitReview}
              disabled={isSubmitting}
              className="bh-btn bh-btn-primary w-full"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--bh-obsidian)] border-t-transparent rounded-full animate-spin" />
                  {language === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5" />
                  {t.submitReview}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;
