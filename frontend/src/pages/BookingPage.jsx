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
import { useGeoLocation } from '@/contexts/GeoLocationContext';
import { getPhonePlaceholder } from '@/lib/phoneFormat';
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
import { ArrowLeft, ArrowRight, Clock, Check, User, PhonePremium as Phone, BookCalendar, Crown, Shears, Location } from '@/components/icons';
import { Edit2, LogIn, Sparkles } from 'lucide-react';

const BookingPage = () => {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const { API, user, token, isAuthenticated } = useApp();
  const { language } = useLocalization();
  const { formatPrice, currency } = useCurrency();
  const { countryCode } = useGeoLocation();
  
  const [barber, setBarber] = useState(null);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone_number || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  const isRTL = language === 'ar';
  const ChevronIcon = isRTL ? ArrowLeft : ArrowRight;

  // Re-sync user info when they log in / out while this page is open
  useEffect(() => {
    if (isAuthenticated && user) {
      setCustomerName(user.full_name || '');
      setCustomerPhone(user.phone_number || '');
    }
  }, [isAuthenticated, user]);

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
        const [res, staffRes] = await Promise.all([
          axios.get(`${API}/barbershops/${barberId}`),
          axios.get(`${API}/barbershops/${barberId}/staff`).catch(() => ({ data: [] })),
        ]);
        setBarber(res.data);
        const staffList = Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data?.staff || []);
        setStaffMembers(staffList.filter(s => s.active !== false));
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
        staff_id: selectedStaffId || null,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        service_ids: selectedServices.map(s => s.id || s.name),
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

            {/* v3.9.7 — Staff / Barber Selection (only shown when salon has 2+ staff) */}
            {staffMembers.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
                data-testid="staff-picker"
              >
                <h2 className="text-2xl font-display font-bold bh-gold-text mb-4 flex items-center gap-2">
                  <Shears className="w-6 h-6" />
                  {isRTL ? 'اختر الحلاق' : 'Pick your barber'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className={`p-4 rounded-xl border-2 transition-all text-start ${
                      selectedStaffId === null
                        ? 'border-[var(--bh-gold)] bg-gradient-to-br from-[var(--bh-gold)]/25 to-[var(--bh-gold-deep)]/10'
                        : 'border-transparent bg-[var(--bh-glass-bg)] hover:border-[var(--bh-gold)]/40'
                    }`}
                    data-testid="staff-any"
                  >
                    <div className="text-2xl mb-1">⭐</div>
                    <p className="font-bold text-[var(--bh-text-primary)] text-sm">
                      {isRTL ? 'أي حلاق متاح' : 'Any available'}
                    </p>
                    <p className="text-[11px] text-[var(--bh-text-muted)]">
                      {isRTL ? 'يختاره الصالون' : 'Salon decides'}
                    </p>
                  </button>
                  {staffMembers.map(staff => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-start ${
                        selectedStaffId === staff.id
                          ? 'border-[var(--bh-gold)] bg-gradient-to-br from-[var(--bh-gold)]/25 to-[var(--bh-gold-deep)]/10'
                          : 'border-transparent bg-[var(--bh-glass-bg)] hover:border-[var(--bh-gold)]/40'
                      }`}
                      data-testid={`staff-${staff.id}`}
                    >
                      {staff.avatar_url ? (
                        <img src={staff.avatar_url} alt={staff.name} className="w-10 h-10 rounded-full object-cover mb-2" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--bh-gold)]/20 flex items-center justify-center mb-2 text-[var(--bh-gold)] font-bold">
                          {(staff.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="font-bold text-[var(--bh-text-primary)] text-sm truncate">{staff.name || staff.full_name}</p>
                      {staff.specialty && (
                        <p className="text-[11px] text-[var(--bh-text-muted)] truncate">{staff.specialty}</p>
                      )}
                    </button>
                  ))}
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

            {/* Customer Info - Auth-Aware */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bh-glass-vip rounded-3xl p-6 bh-corner-accents"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold bh-gold-text flex items-center gap-2">
                  <User className="w-6 h-6" />
                  {t.yourInfo}
                </h2>
                {isAuthenticated && !isEditingContact && (
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(true)}
                    className="flex items-center gap-1.5 text-xs text-[var(--bh-gold)] hover:text-[var(--bh-gold-deep)] transition-colors"
                    data-testid="edit-contact-btn"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                )}
              </div>

              {/* Guest banner (not logged in) */}
              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-[var(--bh-gold)]/10 to-[var(--bh-gold-deep)]/5 border border-[var(--bh-gold)]/30 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  data-testid="guest-banner"
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--bh-gold)]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[var(--bh-gold)]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-white text-sm">
                      {language === 'ar' ? '✨ سجّل دخول للحصول على تجربة أسرع' : '✨ Login for a faster experience'}
                    </div>
                    <div className="text-xs text-[var(--bh-text-secondary)] mt-0.5">
                      {language === 'ar' ? 'اسمك ورقمك يُملأ تلقائياً + اكسب نقاط ولاء' : 'Auto-fill your name & phone + earn loyalty points'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => navigate('/auth', { state: { redirect: `/book/${barberId}` } })}
                    className="bh-btn bh-btn-primary bh-btn-sm whitespace-nowrap"
                    data-testid="guest-login-btn"
                  >
                    <LogIn className="w-4 h-4" />
                    {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Button>
                </motion.div>
              )}

              {/* Logged-in welcome banner */}
              {isAuthenticated && !isEditingContact && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4 p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-[var(--bh-gold)]/10 border border-green-400/20 flex items-center gap-3"
                  data-testid="welcome-banner"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--bh-gold)] to-[var(--bh-gold-deep)] flex items-center justify-center text-[var(--bh-obsidian)] font-bold flex-shrink-0">
                    {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--bh-text-muted)]">
                      {language === 'ar' ? 'الحجز باسم' : 'Booking as'}
                    </div>
                    <div className="font-bold text-white truncate">
                      {customerName || user?.username}
                    </div>
                    {customerPhone && (
                      <div className="text-xs text-[var(--bh-text-secondary)] flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        {customerPhone}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Editable fields (for guests OR logged-in user who clicked Edit) */}
              {(!isAuthenticated || isEditingContact) && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.name}</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="bh-input"
                      placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                      data-testid="customer-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.phone}</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bh-input"
                      placeholder={getPhonePlaceholder(countryCode, language)}
                      dir="ltr"
                      data-testid="customer-phone-input"
                    />
                  </div>
                </div>
              )}

              {/* Notes always visible */}
              <div className="mt-4">
                <Label className="text-[var(--bh-text-secondary)] mb-2 block">{t.notes}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bh-input min-h-[100px]"
                  placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any special requests...'}
                  data-testid="booking-notes"
                />
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

              {/* Global Support Badge */}
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bh-glass-bg)] border border-[var(--bh-gold)]/30">
                  <Sparkles className="w-3 h-3 text-[var(--bh-gold)]" />
                  <span className="text-xs text-[var(--bh-gold)] font-bold">
                    {language === 'ar' ? '🌍 متوفر عالمياً' : '🌍 Available Worldwide'}
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
