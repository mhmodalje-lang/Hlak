import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowRight, ArrowLeft, Calendar, Clock, Star, 
  Check, X, Loader2, AlertTriangle, MessageCircle
} from 'lucide-react';

const MyBookings = () => {
  const navigate = useNavigate();
  const { API, gender, token, language, themeClass, isAuthenticated } = useApp();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      title: 'حجوزاتي',
      noBookings: 'لا توجد حجوزات',
      loginRequired: 'يرجى تسجيل الدخول',
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      cancel: 'إلغاء',
      review: 'تقييم',
      cancelConfirm: 'هل تريد إلغاء الحجز؟',
      cancelSuccess: 'تم إلغاء الحجز',
      reviewTitle: 'قيّم تجربتك',
      submitReview: 'إرسال التقييم',
      reviewSuccess: 'شكراً على تقييمك',
      services: 'الخدمات',
      total: 'المجموع',
      currency: '€'
    },
    en: {
      back: 'Back',
      title: 'My Bookings',
      noBookings: 'No bookings found',
      loginRequired: 'Please login',
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      cancel: 'Cancel',
      review: 'Review',
      cancelConfirm: 'Cancel this booking?',
      cancelSuccess: 'Booking cancelled',
      reviewTitle: 'Rate your experience',
      submitReview: 'Submit Review',
      reviewSuccess: 'Thanks for your review',
      services: 'Services',
      total: 'Total',
      currency: '€'
    }
  };

  const t = texts[language] || texts.ar;

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm(t.cancelConfirm)) return;
    
    try {
      await axios.delete(`${API}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t.cancelSuccess);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  const handleReview = async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/reviews`, {
        barber_id: selectedBooking.barber_id,
        booking_id: selectedBooking.id,
        rating: reviewRating,
        comment: reviewComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t.reviewSuccess);
      setShowReviewDialog(false);
      setSelectedBooking(null);
      setReviewRating(5);
      setReviewComment('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'confirmed': return 'bg-blue-500/20 text-blue-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return t.pending;
      case 'confirmed': return t.confirmed;
      case 'completed': return t.completed;
      case 'cancelled': return t.cancelled;
      default: return status;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`mb-4 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.loginRequired}</p>
          <Button onClick={() => navigate('/auth')} className={isMen ? 'btn-primary-men' : 'btn-primary-women'}>
            {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="my-bookings-page">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#2A1F14] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            data-testid="back-btn"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
            <Calendar className={`w-6 h-6 inline me-2 ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
            {t.title}
          </h1>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking, index) => (
              <div 
                key={booking.id}
                className={`${isMen ? 'card-men' : 'card-women'} p-5 animate-fade-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
                data-testid={`booking-${index}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                      {booking.barber_name}
                    </h3>
                    <p className={`text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                      <Calendar className="w-4 h-4 inline me-1" />
                      {booking.date} • {booking.time}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>

                {/* Services */}
                <div className={`p-3 rounded-lg mb-4 ${isMen ? 'bg-[#2A1F14]' : 'bg-[#FAFAFA]'}`}>
                  <p className={`text-sm mb-2 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>{t.services}:</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.services?.map((s, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded ${isMen ? 'bg-[#3A2E1F] text-white' : 'bg-[#E7E5E4] text-[#1C1917]'}`}>
                        {language === 'ar' ? s.name_ar : s.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3">
                    <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.total}</span>
                    <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                      {booking.total_price} {t.currency}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {booking.status === 'pending' && (
                    <Button
                      variant="outline"
                      onClick={() => handleCancel(booking.id)}
                      className={`flex-1 ${isMen ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-red-400 text-red-400 hover:bg-red-400/10'}`}
                      data-testid={`cancel-${index}`}
                    >
                      <X className="w-4 h-4 me-2" />
                      {t.cancel}
                    </Button>
                  )}
                  {booking.status === 'completed' && (
                    <Button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowReviewDialog(true);
                      }}
                      className={`flex-1 ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
                      data-testid={`review-${index}`}
                    >
                      <Star className="w-4 h-4 me-2" />
                      {t.review}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Calendar className={`w-16 h-16 mx-auto mb-4 ${isMen ? 'text-[#3A2E1F]' : 'text-[#E7E5E4]'}`} />
            <p className={`text-xl ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
              {t.noBookings}
            </p>
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className={isMen ? 'bg-[#1A120A] border-[#3A2E1F]' : 'bg-white border-[#E7E5E4]'}>
          <DialogHeader>
            <DialogTitle className={isMen ? 'text-white' : 'text-[#1C1917]'}>
              {t.reviewTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Star Rating */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="rating-star"
                >
                  <Star 
                    className={`w-8 h-8 ${star <= reviewRating 
                      ? (isMen ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#B76E79] fill-[#B76E79]')
                      : (isMen ? 'text-[#3A2E1F]' : 'text-[#E7E5E4]')
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <Textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={language === 'ar' ? 'اكتب تعليقك...' : 'Write your comment...'}
              className={isMen ? 'bg-[#2A1F14] border-[#3A2E1F] text-white' : 'bg-[#FAFAFA] border-[#E7E5E4] text-[#1C1917]'}
              rows={3}
            />

            <Button
              onClick={handleReview}
              disabled={isSubmitting}
              className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submitReview}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookings;
