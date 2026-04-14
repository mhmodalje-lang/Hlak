# BARBER HUB - Product Requirements Document

## Project Overview
BARBER HUB is a global booking platform connecting barbers, salons, and customers. The platform features a gender-separated interface (Men/Women) with distinct themes.

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

## Core Features Implemented

### Backend API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login (user/barber/admin)
- `POST /api/auth/register-barbershop` - Barbershop registration with QR code
- `GET /api/users/me` - Current user profile

#### Barber Profiles (Compatibility Layer)
- `GET /api/barbers/{id}` - Enriched barber profile (services, gallery, reviews aggregated)
- `GET /api/barbers/profile/me` - Current barber's full profile
- `POST /api/barbers/profile` - Create/update barber extended profile
- `PUT /api/barbers/profile` - Update barber profile
- `GET /api/barbers/top/{gender}` - Top rated barbers by gender
- `GET /api/barbers/nearby` - Nearby barbers (location-based)
- `GET /api/barbers` - List all barbers

#### Barbershops (Original Endpoints)
- `GET /api/barbershops` - List barbershops with filtering
- `GET /api/barbershops/{id}` - Get barbershop details
- `PUT /api/barbershops/me` - Update barbershop
- `GET /api/barbershops/{id}/available-slots` - Available booking slots

#### Services
- `POST /api/barbershops/me/services` - Add service
- `GET /api/barbershops/{id}/services` - List services
- `DELETE /api/barbershops/me/services/{id}` - Delete service

#### Gallery
- `POST /api/barbershops/me/gallery` - Add gallery image (max 3)
- `GET /api/barbershops/{id}/gallery` - Get gallery
- `DELETE /api/barbershops/me/gallery/{id}` - Delete image

#### Bookings
- `POST /api/bookings` - Create booking (supports both old/new field names)
- `GET /api/bookings/my` - My bookings
- `GET /api/bookings/barber/{id}/schedule` - Barber's booked times
- `GET /api/bookings/{id}` - Get booking details
- `PUT /api/bookings/{id}/status` - Update status (confirm/complete/cancel)
- `PUT /api/bookings/{id}/cancel` - Cancel booking
- `DELETE /api/bookings/{id}` - Cancel booking (frontend compat)
- `PUT /api/bookings/{id}/confirm` - Confirm booking
- `PUT /api/bookings/{id}/complete` - Complete booking

#### Reviews
- `POST /api/reviews` - Create review (frontend compat)
- `GET /api/reviews/barber/{id}` - Reviews by barber
- `POST /api/bookings/{id}/review` - Review a booking
- `GET /api/barbershops/{id}/reviews` - Shop reviews

#### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - All users (customers + barbershops)
- `GET /api/admin/subscriptions` - Pending subscriptions
- `PUT /api/admin/subscriptions/{id}/approve` - Approve subscription
- `GET /api/admin/reports` - Pending reports
- `PUT /api/admin/reports/{id}/resolve` - Resolve report
- `GET /api/admin/pending-barbershops` - Pending verification
- `PUT /api/admin/barbershops/{id}/verify` - Verify barbershop

#### Other
- `POST /api/subscriptions` - Create subscription request
- `POST /api/reports` - Create report
- `POST /api/referrals/generate` - Generate referral code
- `GET /api/referrals/my` - My referral stats
- `GET /api/notifications/my` - My notifications
- `GET /api/locations/countries` - Countries list (18 countries)
- `GET /api/locations/cities/{code}` - Cities by country

### Frontend Pages
- `GenderSelection.jsx` - 50/50 split entry page (Men/Women)
- `AuthPage.jsx` - Login/Register with phone
- `HomePage.jsx` - Main listing page with search & filter
- `BarberProfile.jsx` - Detailed barber view with QR code
- `BookingPage.jsx` - 3-step booking flow
- `TopBarbers.jsx` - Leaderboard
- `MapPage.jsx` - Map view (pending Google Maps API key)
- `MyBookings.jsx` - Customer bookings with review capability
- `BarberDashboard.jsx` - Barber management panel
- `AdminDashboard.jsx` - Admin panel with subscription management
- `PaymentPage.jsx` - Manual payment instructions (WhatsApp: +963 935 964 158)
- `ProfileSetup.jsx` - Barber profile creation with services, gallery, hours

## Test Credentials
- Admin: phone=`admin`, password=`admin123`

## Pending (Awaiting API Keys)
- Google Maps API integration
- WhatsApp Business API integration
- Push notifications
