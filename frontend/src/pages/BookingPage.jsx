/**
 * BARBER HUB - BookingPage (VIP Warm Luxury)
 * Full Booking Flow: Barber → Date → Time → Services → Summary → Confirm
 * Features: Dynamic Currency, Geo-aware, Mobile-First, RTL Support
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Import custom icons
import { ArrowLeft, ArrowRight, Clock, Check, User, Phone, BookCalendar, Crown, Shears, Location } from '@/components/icons';

const BookingPage = () => {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const { API, user, token, isAuthenticated } = useApp();
  const { language } = useLocalization();
  const { formatPrice, currency } = useCurrency();
  
  const [barber, setBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone_number || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRTL = language === 'ar';
  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  const t = language === 'ar' ? {
    back: 'رجوع', loading: 'جاري التحميل...', selectDate: 'اختر التاريخ',
    selectTime: 'اختر الوقت', availableTimes: 'الأوقات المتاحة',
    selectServices: 'اختر الخدمات', services: 'الخدمات', noServices: 'لا توجد خدمات',
    bookingSummary: 'ملخص الحجز', date: 'التاريخ', time: 'الوقت',
    total: 'الإجمالي', yourInfo: 'معلوماتك', name: 'الاسم الكامل',
    phone: 'رقم الهاتف', notes: 'ملاحظات (اختياري)', confirmBooking: 'تأكيد الحجز',
    booked: 'محجوز', pleaseLogin: 'يرجى تسجيل الدخول أولاً', bookingSuccess: 'تم الحجز بنجاح!',
    bookingError: 'حدث خطأ في الحجز', selectAtLeastOne: 'اختر خدمة واحدة على الأقل',
    selectDateTime: 'اختر التاريخ والوقت', fillInfo: 'أكمل معلوماتك',
    location: 'الموقع', rating: 'التقييم', from: 'من'
  } : {
    back: 'Back', loading: 'Loading...', selectDate: 'Select Date',
    selectTime: 'Select Time', availableTimes: 'Available Times',
    selectServices: 'Select Services', services: 'Services', noServices: 'No services available',
    bookingSummary: 'Booking Summary', date: 'Date', time: 'Time',
    total: 'Total', yourInfo: 'Your Info', name: 'Full Name',
    phone: 'Phone Number', notes: 'Notes (optional)', confirmBooking: 'Confirm Booking',
    booked: 'Booked', pleaseLogin: 'Please login first', bookingSuccess: 'Booking successful!',
    bookingError: 'Booking error', selectAtLeastOne: 'Select at least one service',
    selectDateTime: 'Select date and time', fillInfo: 'Fill your info',
    location: 'Location', rating: 'Rating', from: 'from'
  };

  // Fetch barber details
  useEffect(() => {
    const fetchBarber = async () => {
      if (!barberId) return;
      setIsLoading(true);
      try {
        const res = await axios.get(`${API}/barbershops/${barberId}`);
        setBarber(res.data);
      } catch (err) {
        toast.error(t.bookingError);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBarber();
  }, [barberId, API, t.bookingError]);

  // Fetch booked times for selected date
  const fetchBookedTimes = useCallback(async (date) => {
    if (!barberId || !date) return;
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await axios.get(`${API}/bookings/barber/${barberId}/date/${dateStr}`);
      setBookedTimes(res.data.booked_times || []);
    } catch (err) {
      console.error(err);
    }
  }, [barberId, API]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedTimes(selectedDate);
    }
  }, [selectedDate, fetchBookedTimes]);

  // Generate time slots (9 AM - 8 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Toggle service selection
  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  // Calculate total price
  const calculateTotal = () => {
    return selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  };

  // Handle booking submission
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error(t.pleaseLogin);
      navigate('/auth');
      return;
    }

    if (selectedServices.length === 0) {
      toast.error(t.selectAtLeastOne);
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast.error(t.selectDateTime);
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error(t.fillInfo);
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingData = {
        barbershop_id: barberId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        services: selectedServices.map(s => s.id),
        customer_name: customerName,
        customer_phone: customerPhone,
        notes: notes,
        total_price: calculateTotal(),
      };

      await axios.post(`${API}/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(t.bookingSuccess);
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.detail || t.bookingError);
    } finally {
      setIsSubmitting(false);
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

  if (!barber) {
    return (
      <div className="bh-surface min-h-screen flex items-center justify-center">
        <p className="text-[var(--bh-text-secondary)]">{t.bookingError}</p>
      </div>
    );
  }

  return (
    <div className="bh-surface min-h-screen pb-20">
      {/* Ambient Orbs */}
      <div className="bh-orb bh-orb-gold w-96 h-96 top-0 right-0 opacity-10" />
      
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-2xl bg-[var(--bh-obsidian)]/90 border-b border-[var(--bh-glass-border)]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="bh-btn bh-btn-ghost bh-btn-sm">
            <ArrowLeft className="w-5 h-5" />
            {t.back}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold bh-gold-text">{barber.shop_name}</h1>
            <div className="flex items-center gap-3 text-sm text-[var(--bh-text-secondary)] mt-1">
              <div className="flex items-center gap-1">
                <Location className="w-3.5 h-3.5" />
                <span>{barber.city}</span>
              </div>
              {barber.rating && (
                <div className="flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-[var(--bh-gold)]" />
                  <span>{barber.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar & Time */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Calendar Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <h2 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                <BookCalendar className="w-6 h-6" />
                {t.selectDate}
              </h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={language === 'ar' ? ar : enUS}
                className="rounded-lg bh-calendar"
              />
            </motion.div>

            {/* Time Slots */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
              >
                <h2 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  {t.availableTimes}
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {timeSlots.map((time) => {
                    const isBooked = bookedTimes.includes(time);
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => !isBooked && setSelectedTime(time)}
                        disabled={isBooked}
                        className={`p-3 rounded-xl font-bold text-sm transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[var(--bh-gold)] to-[var(--bh-gold-deep)] text-[var(--bh-obsidian)] shadow-lg'
                            : isBooked
                            ? 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-muted)] cursor-not-allowed opacity-50'
                            : 'bg-[var(--bh-glass-bg)] text-[var(--bh-text-secondary)] hover:bg-[var(--bh-glass-bg-hi)] hover:border-[var(--bh-gold)]'
                        } border border-transparent`}
                      >
                        {time}
                        {isBooked && <div className="text-xs mt-1">{t.booked}</div>}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Services Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <h2 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                <Shears className="w-6 h-6" />
                {t.services}
              </h2>
              {barber.services && barber.services.length > 0 ? (
                <div className="space-y-3">
                  {barber.services.map((service) => {
                    const isSelected = selectedServices.find(s => s.id === service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-gradient-to-r from-[var(--bh-gold)]/20 to-[var(--bh-gold-deep)]/10 border-[var(--bh-gold)]'
                            : 'bg-[var(--bh-glass-bg)] border-transparent hover:border-[var(--bh-gold)]/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'bg-[var(--bh-gold)] border-[var(--bh-gold)]' : 'border-[var(--bh-text-muted)]'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-[var(--bh-obsidian)]" />}
                            </div>
                            <div>
                              <p className="font-bold text-white">{language === 'ar' ? (service.name_ar || service.name) : service.name}</p>
                              {service.duration && (
                                <p className="text-xs text-[var(--bh-text-muted)] mt-0.5">
                                  {service.duration} {language === 'ar' ? 'دقيقة' : 'min'}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="font-bold text-[var(--bh-gold)]">
                            {formatPrice(service.price)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[var(--bh-text-muted)] text-center py-8">{t.noServices}</p>
              )}
            </motion.div>

            {/* Customer Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <h2 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                <User className="w-6 h-6" />
                {t.yourInfo}
              </h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.name}</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="bh-input"
                    placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                  />
                </div>
                <div>
                  <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.phone}</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="bh-input"
                    placeholder="+963 9XX XXX XXX"
                  />
                </div>
                <div>
                  <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.notes}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bh-input min-h-[100px]"
                    placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any special requests...'}
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Summary (Sticky) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="sticky top-24 bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <h2 className="text-2xl font-display font-bold bh-gold-text mb-6 flex items-center gap-2">
                <Crown className="w-6 h-6" />
                {t.bookingSummary}
              </h2>

              <div className="space-y-4 mb-6">
                {/* Date */}
                {selectedDate && (
                  <div className="flex items-start justify-between pb-3 border-b border-[var(--bh-glass-border)]">
                    <span className="text-[var(--bh-text-secondary)]">{t.date}:</span>
                    <span className="font-bold text-white">
                      {format(selectedDate, 'dd MMM yyyy', { locale: language === 'ar' ? ar : enUS })}
                    </span>
                  </div>
                )}

                {/* Time */}
                {selectedTime && (
                  <div className="flex items-start justify-between pb-3 border-b border-[var(--bh-glass-border)]">
                    <span className="text-[var(--bh-text-secondary)]">{t.time}:</span>
                    <span className="font-bold text-white">{selectedTime}</span>
                  </div>
                )}

                {/* Services */}
                {selectedServices.length > 0 && (
                  <div className="pb-3 border-b border-[var(--bh-glass-border)]">
                    <p className="text-[var(--bh-text-secondary)] mb-2">{t.services}:</p>
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex justify-between text-sm">
                          <span className="text-white">{language === 'ar' ? (service.name_ar || service.name) : service.name}</span>
                          <span className="text-[var(--bh-gold)]">{formatPrice(service.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                {selectedServices.length > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-lg font-bold text-[var(--bh-text-primary)]">{t.total}:</span>
                    <span className="text-2xl font-display font-bold bh-gold-text">
                      {formatPrice(calculateTotal())}
                    </span>
                  </div>
                )}

                {/* Currency Note */}
                <p className="text-xs text-[var(--bh-text-muted)] text-center">
                  💰 {language === 'ar' ? 'الأسعار بـ' : 'Prices in'} {currency}
                </p>
              </div>

              {/* Confirm Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedServices.length === 0 || !selectedDate || !selectedTime}
                className="bh-btn bh-btn-primary w-full"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[var(--bh-obsidian)] border-t-transparent rounded-full animate-spin" />
                    {language === 'ar' ? 'جاري الحجز...' : 'Booking...'}
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5" />
                    {t.confirmBooking}
                  </>
                )}
              </Button>

              {/* VIP Badge */}
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-gold)]/30">
                  <span className="text-xs text-[var(--bh-gold)] font-bold">
                    {language === 'ar' ? '🇸🇾 يدعم سوريا' : '🇸🇾 Syria Supported'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
