# BARBER HUB - Product Requirements Document

## Project Overview
BARBER HUB is a global booking platform connecting barbers, salons, and customers. The platform features a gender-separated interface (Men/Women) with distinct themes.

## Original Problem Statement
منصة عالمية للحجوزات تربط الحلاقين والصالونات بالزبائن مع:
- فصل كامل بين واجهات الرجال والنساء
- نظام تسجيل برقم الهاتف
- ملفات شخصية للحلاقين مع صور قبل/بعد
- نظام حجز مواعيد
- تقييم وترتيب
- خريطة Google Maps
- QR Code لكل صالون
- لوحة تحكم للمدير
- نظام دفع يدوي

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Styling**: Dual themes (Dark/Gold for Men, Light/Rose Gold for Women)

## User Personas
1. **Customer (زبون)**: Books appointments, rates barbers
2. **Barber (حلاق)**: Male barber with profile
3. **Salon (صالون نسائي)**: Female salon with profile
4. **Admin (مدير)**: Platform administrator

## Core Requirements (Static)
- [x] Gender selection page (50/50 split)
- [x] Phone number registration
- [x] Barber/Salon profiles with services & prices
- [x] Booking system with calendar
- [x] Rating & review system
- [x] QR Code generation for each salon
- [x] Admin dashboard
- [x] Manual payment page
- [x] Multi-language support (AR/EN)

## What's Been Implemented (April 14, 2026)

### Backend APIs
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/barbers` - List barbers
- `/api/barbers/{id}` - Get barber profile
- `/api/barbers/profile` - Create/Update barber profile
- `/api/barbers/top/{gender}` - Top rated barbers
- `/api/barbers/nearby` - Nearby barbers (location-based)
- `/api/bookings` - Create/Get bookings
- `/api/bookings/barber/{id}/schedule` - Get booked slots
- `/api/reviews` - Create/Get reviews
- `/api/reports` - Create reports
- `/api/subscriptions/request` - Request subscription
- `/api/admin/*` - Admin endpoints
- `/api/locations/countries` - Get countries
- `/api/locations/cities/{code}` - Get cities

### Frontend Pages
- `GenderSelection.jsx` - 50/50 split entry page
- `AuthPage.jsx` - Login/Register with phone
- `HomePage.jsx` - Main listing page
- `BarberProfile.jsx` - Detailed barber view
- `BookingPage.jsx` - 3-step booking flow
- `TopBarbers.jsx` - Leaderboard
- `MapPage.jsx` - Map view (pending API key)
- `MyBookings.jsx` - Customer bookings
- `BarberDashboard.jsx` - Barber management
- `AdminDashboard.jsx` - Admin panel
- `PaymentPage.jsx` - Manual payment instructions
- `ProfileSetup.jsx` - Barber profile creation

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Gender selection & theme switching
- [x] User authentication
- [x] Barber listing & profiles
- [x] Booking system
- [x] Rating system

### P1 (High Priority - Pending)
- [ ] WhatsApp Business API integration (awaiting key)
- [ ] Google Maps API integration (awaiting key)
- [ ] Push notifications
- [ ] Image upload for profiles

### P2 (Medium Priority)
- [ ] Referral system
- [ ] Mini store feature (5 products)
- [ ] Shipping integration
- [ ] Advanced analytics

### P3 (Low Priority)
- [ ] Crypto payment option
- [ ] Mobile app version
- [ ] SMS notifications

## Test Credentials
- Admin: phone=`admin`, password=`admin123`

## Next Tasks
1. Add Google Maps API key for map functionality
2. Add WhatsApp Business API for notifications
3. Create sample barber profiles for demo
4. Test complete booking flow end-to-end
