# BARBER HUB - Product Requirements Document

## Project Overview
BARBER HUB is a **global marketplace super-app** connecting barbers, salons, and customers. The platform features a gender-separated interface (Men/Women) with a VIP Warm Luxury theme (chocolate brown + gold for men, rose + pearl for women). Arabic/English with RTL support. Country-agnostic (no hardcoded locality strings).

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + framer-motion + lucide-react
- **Backend**: FastAPI (Python 3.11) with JWT auth + bcrypt
- **Database**: MongoDB (uuid ids, no ObjectId in responses)
- **Routing**: `/api/*` for backend, `REACT_APP_BACKEND_URL` for front->back calls

## Roadmap — Super App Vision 2026
1. **Phase 1 — UI VIP Warm Luxury** ✅
2. **Phase 2 — Professional Portfolio (4-image Lightbox)** ✅
3. **Phase 3 — Social Commerce (Mini-Store + Orders)** ✅
4. **Phase 4 — Geo-Tiered Ranking + Sponsored Ads** ✅ *(this release)*
5. **Phase 5 — Advanced Dashboard (stats, leave, services)** ✅ *(this release)*
6. **Phase 6 — Regional Payments (Zain, Syriatel/MTN, Asia Hawala)** ⏳ P2
7. **Phase 7 — Loyalty & Engagement (MVP live, expand)** ⏳ P1

## Phase 4 — Geo-Tiered Ranking + Sponsored Ads (NEW)

### Backend endpoints
- `GET /api/sponsored/plans` — 3 packages:
  - `basic_city` (10€, 7 days, city scope)
  - `pro_country` (30€, 14 days, country scope)
  - `elite_region` (80€, 30 days, region scope)
- `GET /api/ranking/top?scope=global|city|country|region&gender=&country=&city=&limit=` — returns top shops pinned by sponsored; unknown scope → 400.
- `POST /api/sponsored/request` — shop requests; duplicate active/pending in same scope → 409.
- `GET /api/sponsored/my`, `GET /api/sponsored/active`
- `GET /api/admin/sponsored/pending`, `GET /api/admin/sponsored/all`
- `PUT /api/admin/sponsored/{id}/approve` (activates with `start_date`+`end_date`)
- `PUT /api/admin/sponsored/{id}/reject`
- Auto-expire on startup: active ads with `end_date < now` → status `expired`.

### Frontend
- `components/SponsoredAdsManagement.jsx` — barber dashboard card with plan picker dialog and own-ads status list.
- `pages/TopBarbers.jsx` — scope tabs (City / Country / Region) with country+city inputs; sponsored badge (Megaphone icon) on each pinned shop.
- `pages/AdminDashboard.jsx` — new "Sponsored Ad Requests" section with Approve/Reject buttons.

## Phase 5 — Advanced Dashboard (NEW)

### Backend endpoints
- `GET /api/barbershops/me/stats?days=N` — revenue analytics. Returns `total_revenue`, `service_revenue`, `product_revenue`, `revenue_by_day[]`, `top_products[]` (5), `top_services[]` (5), `completed_bookings`, `paid_orders`, `total_bookings`, `total_orders`, `window_days`.
- `POST /api/barbershops/me/leave` — set leave dates; ISO-8601 YYYY-MM-DD enforced (400 on invalid).
- `GET /api/barbershops/{shop_id}/leave` — public read.

### Frontend
- `components/RevenueStats.jsx` — KPI cards + CSS bar chart for `revenue_by_day` + top products & services tables. Selector for 7/30/90 days.
- `components/LeaveManagement.jsx` — date picker to add dates, remove individually, reason field.

## Village / Area Search Enhancement (NEW)
- `GET /api/search/barbers` now accepts `area=<text>` — case-insensitive OR match against `city`, `district`, `neighborhood`, `village`, `address`.
- The existing `search=<text>` parameter was also extended to include `district`, `neighborhood`, `village`.
- Enables customers in unmapped villages to find their local barbers by typing the village name.

## Phase 3 — Social Commerce (2026-02) — Still live
- Product model with `shipping_options` (pickup | local_delivery | courier) + `local_delivery_fee`; 10-product-per-shop cap.
- Full Orders CRUD (user + shop scopes, status history, customer-cannot-cancel-after-shipped).
- Order awards loyalty points to authenticated user (`int(total)` added to `users.loyalty_points`).
- Frontend: `OrderDialog`, `ShopOrdersManagement`, `MyOrders` page, route `/my-orders`.
- `LocationPicker` for hyper-local mapping: GPS capture + manual village/neighborhood/district input.

## Test Credentials
- **Admin**: `admin` / `admin123`
- **Salon**: `0935964158` / `salon123` (id `23a8effc-7e65-4869-9202-b1447430cf45`, country `سوريا`, city `الحسكة`)
- Users: register via `POST /api/auth/register` with `{phone_number, password, full_name, gender, country, city}`.

## Testing Status
- **Phase 3**: 18/18 backend pytest cases passed (iteration_4.json).
- **Phase 4 + 5 + area search**: 25/25 backend pytest cases passed (iteration_5.json).
- All issues raised by testing agent were fixed + verified live (unknown scope → 400, invalid leave date → 400, duplicate sponsored request → 409).

## Next Action Items (P1)
1. **Frontend polish for Phase 4/5**: add "Sponsored" callout on HomePage hero if user country has active ads; on-dashboard chart labels.
2. **Ranking score recompute**: currently `ranking_score` is only updated during booking status changes; consider a nightly job that also incorporates product sales & reviews velocity.
3. **Services in local currency (Phase 5 completion)**: `ServicesManagement` component already exists — verify it reads salon currency and displays correctly. Needs screenshot review.
4. **Loyalty MVP hardening** (optional): gate points redemption on bookings + surface `order_points` in booking checkout.

## Backlog (P2)
- Phase 6 — Regional payments (Zain Cash, Syriatel, MTN, Asia Hawala).
- Push notifications (VAPID scaffolded).
- Ranking tier auto-award: `Top Weekly` badge computed nightly (free competitive signal before paid ads).

## Known Issues
- None blocking. All backend endpoints pass. Pre-existing Python shadow-imports in `server.py` (`date`, `time`, `status` reuse as variable names) are style warnings, not bugs.


## v3.9.0 — GentoSY-Style Landing + Admin Control Center (latest)
User request (Arabic): apply the GentoSY premium black+gold landing design they saw, keep the site name "BARBER HUB" unchanged, and add an admin panel that controls:
- Contact info (phone `+963 935 964 158` provided) + social links
- Subscription prices per country, each with its own currency (e.g. Syria in SYP)

### Backend (7 new endpoints in /app/backend/server.py)
- `GET /api/site-settings` (PUBLIC) — singleton contact info + social + taglines; auto-seeds default on first read
- `PUT /api/admin/site-settings` (ADMIN)
- `GET /api/subscription-plans` (PUBLIC) — supports `?country_code=SY` with Global fallback
- `GET /api/admin/subscription-plans` (ADMIN)
- `POST /api/admin/subscription-plans` (ADMIN) — per-country plan CRUD
- `PUT /api/admin/subscription-plans/{id}` (ADMIN)
- `DELETE /api/admin/subscription-plans/{id}` (ADMIN)

### Frontend (3 new components + HomePage/AdminDashboard integration)
- `/components/HomeSections.jsx` — WhyChoose / SubscriptionPlan (country-aware) / Journey / Testimonials / PremiumFooter (all black+gold GentoSY style)
- `/components/AdminSiteSettingsPanel.jsx` — admin tab for contact info/social
- `/components/AdminSubscriptionPlansPanel.jsx` — admin tab for per-country plan CRUD with currency support
- HomePage.jsx — old simple footer replaced with the 5-section premium stack
- AdminDashboard.jsx — 2 new tabs: "إعدادات الموقع" + "خطط الاشتراك"

### Testing
- Backend: 100% pass on 7 new endpoints (tested via deep_testing_backend_v2)
- Frontend: lint clean on all modified files
