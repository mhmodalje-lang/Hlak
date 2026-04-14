import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  ArrowRight, ArrowLeft, Clock, Check, Loader2, Phone, User,
  Calendar as CalendarIcon, MessageCircle
} from 'lucide-react';

const BookingPage = () => {
  const { barberId } = useParams();
  const navigate = useNavigate();
  const { API, gender, user, token, language, themeClass, isAuthenticated } = useApp();
  
  const [barber, setBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [bookedTimes, setBookedTimes] = useState([]);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Services, 2: Date/Time, 3: Details

  const isMen = gender === 'male';

  const texts = {
    ar: {
      back: 'رجوع',
      step1: 'اختر الخدمات',
      step2: 'اختر الموعد',
      step3: 'معلوماتك',
      selectServices: 'اختر الخدمات المطلوبة',
      selectDate: 'اختر التاريخ',
      selectTime: 'اختر الوقت',
      availableTimes: 'الأوقات المتاحة',
      bookedSlot: 'محجوز',
      yourInfo: 'معلومات الحجز',
      name: 'الاسم الكامل',
      phone: 'رقم الهاتف (واتساب)',
      notes: 'ملاحظات إضافية',
      notesPlaceholder: 'أي ملاحظات خاصة...',
      total: 'المجموع',
      duration: 'المدة الإجمالية',
      minutes: 'دقيقة',
      next: 'التالي',
      previous: 'السابق',
      confirmBooking: 'تأكيد الحجز',
      bookingSuccess: 'تم الحجز بنجاح!',
      bookingSuccessMsg: 'ستصلك رسالة تأكيد على الواتساب',
      currency: '€',
      note: 'ملاحظة: قد يكون هناك تأخير بسيط بسبب الزبائن السابقين',
      noServices: 'اختر خدمة واحدة على الأقل'
    },
    en: {
      back: 'Back',
      step1: 'Select Services',
      step2: 'Select Date & Time',
      step3: 'Your Details',
      selectServices: 'Choose your services',
      selectDate: 'Select Date',
      selectTime: 'Select Time',
      availableTimes: 'Available Times',
      bookedSlot: 'Booked',
      yourInfo: 'Booking Details',
      name: 'Full Name',
      phone: 'Phone (WhatsApp)',
      notes: 'Additional Notes',
      notesPlaceholder: 'Any special notes...',
      total: 'Total',
      duration: 'Total Duration',
      minutes: 'minutes',
      next: 'Next',
      previous: 'Previous',
      confirmBooking: 'Confirm Booking',
      bookingSuccess: 'Booking Confirmed!',
      bookingSuccessMsg: 'You will receive a confirmation on WhatsApp',
      currency: '€',
      note: 'Note: There may be slight delays due to previous customers',
      noServices: 'Please select at least one service'
    }
  };

  const t = texts[language] || texts.ar;

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  useEffect(() => {
    fetchBarber();
  }, [barberId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSchedule();
    }
  }, [selectedDate]);

  const fetchBarber = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API}/barbers/${barberId}`);
      setBarber(res.data);
    } catch (err) {
      console.error('Failed to fetch barber:', err);
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await axios.get(`${API}/bookings/barber/${barberId}/schedule`, {
        params: { date: dateStr }
      });
      setBookedTimes(res.data.booked_times || []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  };

  const toggleService = (serviceName) => {
    setSelectedServices(prev => 
      prev.includes(serviceName) 
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const allServices = barber ? [...(barber.services || []), ...(barber.custom_services || [])] : [];
  const selectedServiceObjects = allServices.filter(s => 
    selectedServices.includes(s.name) || selectedServices.includes(s.name_ar)
  );
  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);

  const handleSubmit = async () => {
    if (!selectedServices.length) {
      toast.error(t.noServices);
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error(language === 'ar' ? 'اختر التاريخ والوقت' : 'Select date and time');
      return;
    }
    if (!customerName || !customerPhone) {
      toast.error(language === 'ar' ? 'أدخل معلوماتك' : 'Enter your details');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/bookings`, {
        barber_id: barberId,
        service_ids: selectedServices,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        customer_phone: customerPhone,
        customer_name: customerName,
        notes: notes
      }, { headers });

      toast.success(t.bookingSuccess, {
        description: t.bookingSuccessMsg
      });

      // Redirect to WhatsApp with booking details
      if (barber.whatsapp) {
        const message = encodeURIComponent(
          `حجز جديد من BARBER HUB\n` +
          `الاسم: ${customerName}\n` +
          `الهاتف: ${customerPhone}\n` +
          `التاريخ: ${format(selectedDate, 'yyyy-MM-dd')}\n` +
          `الوقت: ${selectedTime}\n` +
          `الخدمات: ${selectedServices.join(', ')}\n` +
          `المجموع: ${totalPrice}€`
        );
        window.open(`https://wa.me/${barber.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
      }

      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.detail || (language === 'ar' ? 'فشل الحجز' : 'Booking failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${themeClass} flex items-center justify-center`}>
        <Loader2 className={`w-12 h-12 animate-spin ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`} />
      </div>
    );
  }

  if (!barber) return null;

  const inputClass = isMen 
    ? 'bg-[#1F1F1F] border-[#262626] text-white placeholder:text-[#94A3B8] focus:border-[#D4AF37]' 
    : 'bg-white border-[#E7E5E4] text-[#1C1917] placeholder:text-[#57534E] focus:border-[#B76E79]';

  return (
    <div className={`min-h-screen ${themeClass} py-8 px-4`} data-testid="booking-page">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className={`p-2 rounded-full ${isMen ? 'bg-[#1F1F1F] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'}`}
            data-testid="back-btn"
          >
            {language === 'ar' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          <div>
            <h1 className={`text-2xl font-bold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {language === 'ar' ? barber.salon_name_ar : barber.salon_name}
            </h1>
            <p className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
              {step === 1 ? t.step1 : step === 2 ? t.step2 : t.step3}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  s <= step 
                    ? (isMen ? 'bg-[#D4AF37] text-black' : 'bg-[#B76E79] text-white')
                    : (isMen ? 'bg-[#1F1F1F] text-[#94A3B8]' : 'bg-[#FAFAFA] text-[#57534E]')
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 rounded ${s < step ? (isMen ? 'bg-[#D4AF37]' : 'bg-[#B76E79]') : (isMen ? 'bg-[#262626]' : 'bg-[#E7E5E4]')}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Services */}
        {step === 1 && (
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
            <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {t.selectServices}
            </h2>
            <div className="space-y-3">
              {allServices.map((service, i) => (
                <div 
                  key={i}
                  onClick={() => toggleService(service.name)}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all ${
                    selectedServices.includes(service.name) || selectedServices.includes(service.name_ar)
                      ? (isMen ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37]' : 'bg-[#B76E79]/20 border-2 border-[#B76E79]')
                      : (isMen ? 'bg-[#1F1F1F] hover:bg-[#262626]' : 'bg-[#FAFAFA] hover:bg-[#F5F5F4]')
                  }`}
                  data-testid={`service-${i}`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedServices.includes(service.name) || selectedServices.includes(service.name_ar)}
                      className={isMen ? 'border-[#D4AF37] data-[state=checked]:bg-[#D4AF37]' : 'border-[#B76E79] data-[state=checked]:bg-[#B76E79]'}
                    />
                    <div>
                      <p className={`font-medium ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                        {language === 'ar' ? service.name_ar : service.name}
                      </p>
                      <p className={`text-sm flex items-center gap-1 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                        <Clock className="w-3 h-3" />
                        {service.duration_minutes || 30} {t.minutes}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                    {service.price} {t.currency}
                  </span>
                </div>
              ))}
            </div>

            {/* Summary */}
            {selectedServices.length > 0 && (
              <div className={`mt-6 p-4 rounded-lg ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}>
                <div className="flex justify-between mb-2">
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.total}</span>
                  <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                    {totalPrice} {t.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.duration}</span>
                  <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>
                    {totalDuration} {t.minutes}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep(2)}
              disabled={selectedServices.length === 0}
              className={`w-full mt-6 ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              data-testid="next-step-1"
            >
              {t.next}
              {language === 'ar' ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
            </Button>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Calendar */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
              <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <CalendarIcon className="w-5 h-5 inline me-2" />
                {t.selectDate}
              </h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={language === 'ar' ? ar : enUS}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                className={`booking-calendar ${isMen ? 'text-white' : 'text-[#1C1917]'}`}
                data-testid="booking-calendar"
              />
            </div>

            {/* Time Slots */}
            <div className={`${isMen ? 'card-men' : 'card-women'} p-6`}>
              <h2 className={`text-lg font-bold mb-4 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                <Clock className="w-5 h-5 inline me-2" />
                {t.availableTimes}
              </h2>
              <div className="time-slots">
                {timeSlots.map((time) => {
                  const isBooked = bookedTimes.includes(time);
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => !isBooked && setSelectedTime(time)}
                      disabled={isBooked}
                      className={`time-slot ${isSelected ? 'selected' : ''} ${isBooked ? 'booked' : ''} ${
                        isMen 
                          ? `${isSelected ? 'bg-[#D4AF37] text-black' : 'bg-[#1F1F1F] text-white'} border-[#262626]`
                          : `${isSelected ? 'bg-[#B76E79] text-white' : 'bg-[#FAFAFA] text-[#1C1917]'} border-[#E7E5E4]`
                      }`}
                      data-testid={`time-${time}`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
              <p className={`mt-4 text-sm ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`}>
                {t.note}
              </p>
            </div>

            <Button
              onClick={() => setStep(3)}
              disabled={!selectedTime}
              className={`w-full ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              data-testid="next-step-2"
            >
              {t.next}
              {language === 'ar' ? <ArrowLeft className="w-4 h-4 ms-2" /> : <ArrowRight className="w-4 h-4 ms-2" />}
            </Button>
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 3 && (
          <div className={`${isMen ? 'card-men' : 'card-women'} p-6 animate-fade-in`}>
            <h2 className={`text-lg font-bold mb-6 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
              {t.yourInfo}
            </h2>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.name}</Label>
                <div className="relative">
                  <User className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`${inputClass} ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
                    data-testid="customer-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.phone}</Label>
                <div className="relative">
                  <Phone className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 ${isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}`} />
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`${inputClass} ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
                    placeholder="+963 xxx xxx xxx"
                    data-testid="customer-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>{t.notes}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                  placeholder={t.notesPlaceholder}
                  rows={3}
                  data-testid="booking-notes"
                />
              </div>
            </div>

            {/* Booking Summary */}
            <div className={`mt-6 p-4 rounded-lg ${isMen ? 'bg-[#1F1F1F]' : 'bg-[#FAFAFA]'}`}>
              <h3 className={`font-semibold mb-3 ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>
                {language === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </span>
                  <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>
                    {format(selectedDate, 'yyyy-MM-dd')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                    {language === 'ar' ? 'الوقت' : 'Time'}
                  </span>
                  <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isMen ? 'text-[#94A3B8]' : 'text-[#57534E]'}>
                    {language === 'ar' ? 'الخدمات' : 'Services'}
                  </span>
                  <span className={isMen ? 'text-white' : 'text-[#1C1917]'}>{selectedServices.length}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t ${isMen ? 'border-[#262626]' : 'border-[#E7E5E4]'}`}>
                  <span className={`font-semibold ${isMen ? 'text-white' : 'text-[#1C1917]'}`}>{t.total}</span>
                  <span className={`font-bold ${isMen ? 'text-[#D4AF37]' : 'text-[#B76E79]'}`}>
                    {totalPrice} {t.currency}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !customerName || !customerPhone}
              className={`w-full mt-6 ${isMen ? 'btn-primary-men' : 'btn-primary-women'}`}
              data-testid="confirm-booking"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 me-2" />
                  {t.confirmBooking}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
