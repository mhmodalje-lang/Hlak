# BARBER HUB - Product Requirements Document

## Project Overview
BARBER HUB is a **global marketplace super-app** connecting barbers, salons, and customers. The platform features a gender-separated interface (Men/Women) with a VIP Warm Luxury theme (chocolate brown + gold for men, rose + pearl for women). Arabic/English with RTL support. Country-agnostic (no hardcoded locality strings).

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + framer-motion + lucide-react
- **Backend**: FastAPI (Python 3.11) with JWT auth + bcrypt
- **Database**: MongoDB (uuid ids, no ObjectId in responses)
- **Theme**: `--bh-gold`, `--bh-chocolate`, `--bh-pearl`, `theme-men` / `theme-women`
- **Routing**: `/api/*` for backend, `REACT_APP_BACKEND_URL` for front->back calls

## User Personas
1. **Customer (زبون)** — Books appointments, buys products, rates barbers, collects loyalty.
2. **Barber (حلاق)** — Male salon; manages services, portfolio, products, orders.
3. **Salon (صالون نسائي)** — Female salon variant of Barber.
4. **Admin (مدير)** — Platform administrator (verification, subscriptions).

## Roadmap — Super App Vision 2026
1. **Phase 1 — UI VIP Warm Luxury** ✅ (Payment, Favorites, Booking, Home)
2. **Phase 2 — Professional Portfolio** ✅ (Hero slider + 4-image gallery + Lightbox)
3. **Phase 3 — Social Commerce (Mini-Store + Orders)** ✅ *(this release)*
4. **Phase 4 — Ranking & Sponsored Ads** ⏳ P1
5. **Phase 5 — Advanced Dashboard (services / leave / revenue)** ⏳ P1
6. **Phase 6 — Regional Payments (Zain Cash, Syriatel, Asia Hawala)** ⏳ P2
7. **Phase 7 — Loyalty & Engagement** (loyalty MVP already live) ⏳ P1

## Core Features Implemented

### Phase 3 (2026-02) - Social Commerce
- **Product model extended**: `shipping_options` (pickup | local_delivery | courier), `local_delivery_fee`, `stock_quantity`.
- **Hard cap: 10 products/shop** — backend returns 400 `MAX_PRODUCTS_REACHED`, dashboard disables the Add button.
- **Orders system**
  - `POST /api/orders` — create order (guest or authenticated); validates shipping method belongs to product's allowed set; computes subtotal/shipping_fee/total.
  - `GET /api/orders/my` — customer-scoped orders.
  - `GET /api/orders/shop` — shop-scoped received orders (with optional `status` filter).
  - `GET /api/orders/{id}` — owner or shop only.
  - `PUT /api/orders/{id}/status` — shop updates (pending → confirmed → preparing → shipped → delivered → cancelled); appends `status_history`.
  - `PUT /api/orders/{id}/cancel` — customer or shop; customers blocked after shipped.
- **Frontend**
  - `components/OrderDialog.jsx` — checkout modal with shipping method picker, qty stepper, totals.
  - `components/ShopOrdersManagement.jsx` — barber dashboard orders card with filters (active / all / by-status) and one-click phone/WhatsApp.
  - `pages/MyOrders.jsx` — customer orders timeline with cancel action.
  - `pages/ProductShowcase.jsx` — now triggers OrderDialog instead of WhatsApp-only link.
  - `pages/BarberDashboard.jsx` — shipping options checkboxes + local-delivery fee field; 10-product counter `(N/10)`.
- **Order awards loyalty points**: `int(total)` is added to `users.loyalty_points` on authenticated orders; surfaced via `order_points` in `/api/users/me/loyalty`.

### Phase 3 (2026-02) - Hyper-Local Mapping
- **Profile fields added**: `latitude`, `longitude`, `district`, `neighborhood`, `village` — persisted to both `barbershops` and `barber_profiles`.
- **`components/LocationPicker.jsx`** — GPS "use my location" button, editable coordinates, district / neighborhood / village manual input + detailed address; hint explicitly covers unmapped villages.
- **Enrichment**: `enrich_barbershop_for_frontend` now exposes `village` + `neighborhood` + `district` for lossless round-trip.

### Phase 2 (2026-01) - Professional Portfolio
- Hero Slider + Lightbox gallery; max 4 images/shop; `PortfolioManagement.jsx` integrated into dashboard.

### Phase 1 (2026-01) - UI + Globalization
- VIP Warm Luxury theme across Home/Payment/Favorites/MyBookings/Booking.
- Auto-fill form data when user is authenticated; dynamic phone code based on geolocation (`lib/phoneFormat.js`).
- All "Syria"/localized strings removed — app is country-agnostic.
- 14 currencies via `CurrencyContext` + `GeoLocationContext`.

### Loyalty Points (2026-02 bug-fix)
- Fixed `entity.get('role')` → `entity.get('entity_type')` (was always returning `is_user:false`).
- `/api/users/me/loyalty` now returns `booking_points`, `order_points`, `points = booking + order`, tier, progress.

## Backend API Reference (selected)

### Orders (NEW)
- `POST /api/orders` — body `{product_id, shop_id, quantity, shipping_method, customer_name?, customer_phone, shipping_address?, shipping_city?, shipping_country?, notes?}`
- `GET /api/orders/my`
- `GET /api/orders/shop?status=pending|...`
- `GET /api/orders/{id}`
- `PUT /api/orders/{id}/status` — body `{status, tracking_note?}`
- `PUT /api/orders/{id}/cancel`

### Products (EXTENDED)
- `POST /api/products` — now takes `shipping_options[]`, `local_delivery_fee`, enforces 10-per-shop limit.
- `GET /api/products/shop/{shop_id}?category=`
- `GET /api/products/featured`
- `GET /api/products/my`
- `PUT /api/products/{id}` / `DELETE /api/products/{id}`

### Loyalty / Users
- `GET /api/users/me/loyalty` — returns `{is_user, points, booking_points, order_points, bookings_completed, tier, next_tier, progress_to_next_pct, ...}`.

### Barber Profile (EXTENDED)
- `POST /api/barbers/profile` — now accepts `latitude`, `longitude`, `district`, `neighborhood`, `village`; syncs to barbershops collection for search.

## Test Credentials
- **Admin**: `admin` / `admin123`
- **Salon**: `0935964158` / `salon123` (shop id `23a8effc-7e65-4869-9202-b1447430cf45`)
- Users: register via `POST /api/auth/register` (requires `phone_number`, `password`, `full_name`, `gender`, `country`, `city`).

## Next Action Items (P1)
1. **Phase 4 — Ranking & Sponsored Ads**: implement geo-tiered ranking (city → country → region) + subscription-driven sponsored badge on listings.
2. **Phase 5 — Advanced Dashboard**: services manager (per-service pricing in local currency), leave calendar, revenue analytics.
3. **Nearby search w/ village**: enhance `/api/search/barbers` and `/api/barbers/nearby` to match `village` text query as a fallback when GPS radius is empty.
4. **Order state machine**: enforce linear transitions (currently any-to-any allowed); block customer cancel on `shipped` ✅ already done.

## Backlog (P2)
- Phase 6 — Zain Cash / Syriatel Cash / MTN Cash / Asia Hawala receipt-upload flow.
- Stripe crypto bundle.
- Push notifications (VAPID already scaffolded).
- Admin panel for sponsored ads approval.

## Known Issues
- None blocking. 18/18 Phase 3 backend tests pass. Loyalty endpoint bug fixed and verified (order → +points surfaces correctly).
