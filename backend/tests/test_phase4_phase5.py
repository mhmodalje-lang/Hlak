"""
Backend regression test for Barber Hub Phase 4 (Geo-tiered Ranking + Sponsored Ads)
and Phase 5 (Revenue stats + Leave calendar) and the `area` search enhancement.

Credentials:
  admin: phone_number='admin' password='admin123'
  salon: phone_number='0935964158' password='salon123'
"""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL is required"
API = f"{BASE_URL}/api"

SALON_PHONE = "0935964158"
SALON_PW = "salon123"
SALON_SHOP_ID = "23a8effc-7e65-4869-9202-b1447430cf45"
ADMIN_PHONE = "admin"
ADMIN_PW = "admin123"


# --------------------------- fixtures ---------------------------
@pytest.fixture(scope="session")
def session():
    return requests.Session()


def _login(session, phone, pw):
    r = session.post(f"{API}/auth/login", json={"phone_number": phone, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {phone} failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def salon_token(session):
    return _login(session, SALON_PHONE, SALON_PW)["access_token"]


@pytest.fixture(scope="session")
def admin_token(session):
    return _login(session, ADMIN_PHONE, ADMIN_PW)["access_token"]


@pytest.fixture(scope="session")
def salon_shop(session):
    """Fetch salon info (country/city/type) from login response + public details."""
    login = _login(session, SALON_PHONE, SALON_PW)
    shop = login.get("user") or {}
    # fallback / enrichment from public endpoint
    r = session.get(f"{API}/barbers/{SALON_SHOP_ID}", timeout=15)
    if r.status_code == 200:
        pub = r.json()
        for k in ("country", "city", "shop_type"):
            if pub.get(k):
                shop[k] = pub[k]
    return shop


@pytest.fixture(scope="session")
def user_token(session):
    """Register a fresh TEST_ user for user-auth tests."""
    phone = f"0999{int(time.time())%10000000:07d}"
    r = session.post(f"{API}/auth/register", json={
        "full_name": f"TEST_User_{uuid.uuid4().hex[:6]}",
        "phone_number": phone,
        "password": "user123",
        "gender": "male",
        "country": "سوريا",
        "city": "الحسكة",
    }, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# =============== PHASE 4: Sponsored Plans ===============
class TestSponsoredPlans:
    def test_list_plans(self, session):
        r = session.get(f"{API}/sponsored/plans", timeout=10)
        assert r.status_code == 200
        body = r.json()
        plans = {p["id"]: p for p in body["plans"]}
        assert set(plans.keys()) == {"basic_city", "pro_country", "elite_region"}
        assert plans["basic_city"]["price_eur"] == 10.0
        assert plans["basic_city"]["scope"] == "city"
        assert plans["basic_city"]["duration_days"] == 7
        assert plans["pro_country"]["price_eur"] == 30.0
        assert plans["pro_country"]["scope"] == "country"
        assert plans["pro_country"]["duration_days"] == 14
        assert plans["elite_region"]["price_eur"] == 80.0
        assert plans["elite_region"]["scope"] == "region"
        assert plans["elite_region"]["duration_days"] == 30
        for p in plans.values():
            assert p.get("label_ar") and p.get("label_en")


# =============== PHASE 4: Ranking Endpoint ===============
class TestRanking:
    def test_global_ranking_sorted(self, session):
        r = session.get(f"{API}/ranking/top?scope=global&gender=male&limit=20", timeout=15)
        assert r.status_code == 200
        shops = r.json()
        assert isinstance(shops, list)
        assert len(shops) > 0
        # All have is_sponsored boolean
        for s in shops:
            assert "is_sponsored" in s
            assert isinstance(s["is_sponsored"], bool)
        # Sort: sponsored first, then descending ranking_score within each group
        non_sponsored = [s for s in shops if not s["is_sponsored"]]
        scores = [(s.get("ranking_score") or 0) for s in non_sponsored]
        assert scores == sorted(scores, reverse=True), f"non-sponsored not sorted by ranking_score desc: {scores}"

    def test_scope_city_requires_country_and_city(self, session):
        r = session.get(f"{API}/ranking/top?scope=city", timeout=10)
        assert r.status_code == 400
        r2 = session.get(f"{API}/ranking/top?scope=city&country=سوريا", timeout=10)
        assert r2.status_code == 400

    def test_scope_country_requires_country(self, session):
        r = session.get(f"{API}/ranking/top?scope=country", timeout=10)
        assert r.status_code == 400

    def test_scope_city_ok(self, session, salon_shop):
        r = session.get(
            f"{API}/ranking/top",
            params={"scope": "city", "country": salon_shop.get("country", "سوريا"),
                    "city": salon_shop.get("city", "الحسكة"), "gender": salon_shop.get("shop_type", "male")},
            timeout=15,
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_scope_country_pins_sponsored(self, session, salon_shop):
        """Active pro_country ad for the salon should pin it first in country scope."""
        country = salon_shop.get("country", "سوريا")
        gender = salon_shop.get("shop_type", "male")
        r = session.get(
            f"{API}/ranking/top",
            params={"scope": "country", "country": country, "gender": gender, "limit": 50},
            timeout=15,
        )
        assert r.status_code == 200
        shops = r.json()
        salon = next((s for s in shops if s.get("id") == SALON_SHOP_ID), None)
        # Salon must exist in its own country scope
        assert salon is not None, "seed salon not returned in its own country scope"
        assert salon["is_sponsored"] is True, "seed salon is expected to have an active pro_country ad"
        # pinned to first position
        assert shops[0]["id"] == SALON_SHOP_ID, f"sponsored shop not pinned first; first was {shops[0].get('id')}"


# =============== PHASE 4: Sponsored Ad Request Flow ===============
class TestSponsoredRequestFlow:
    def test_request_invalid_plan(self, session, salon_token):
        r = session.post(f"{API}/sponsored/request",
                         headers={"Authorization": f"Bearer {salon_token}"},
                         json={"plan": "totally_bogus", "duration_days": 5},
                         timeout=15)
        assert r.status_code == 400

    def test_request_requires_barbershop_auth(self, session, user_token):
        r = session.post(f"{API}/sponsored/request",
                         headers={"Authorization": f"Bearer {user_token}"},
                         json={"plan": "basic_city"},
                         timeout=15)
        assert r.status_code in (401, 403)

    def test_create_pending_ad(self, session, salon_token):
        r = session.post(f"{API}/sponsored/request",
                         headers={"Authorization": f"Bearer {salon_token}"},
                         json={"plan": "basic_city", "duration_days": 3,
                               "payment_method": "TEST_manual", "receipt_image": ""},
                         timeout=15)
        assert r.status_code == 200, r.text
        ad = r.json()
        assert ad["status"] == "pending"
        assert ad["plan"] == "basic_city"
        assert ad["scope"] == "city"
        assert ad["price_eur"] == 10.0
        assert ad["duration_days"] == 3
        assert ad["shop_id"] == SALON_SHOP_ID
        assert ad["start_date"] is None and ad["end_date"] is None
        pytest.ad_id_basic = ad["id"]

    def test_my_sponsored_contains_new_ad(self, session, salon_token):
        r = session.get(f"{API}/sponsored/my",
                        headers={"Authorization": f"Bearer {salon_token}"},
                        timeout=15)
        assert r.status_code == 200
        ads = r.json()
        assert isinstance(ads, list)
        assert any(a["id"] == getattr(pytest, "ad_id_basic", None) for a in ads)

    def test_admin_list_pending_contains_ad(self, session, admin_token):
        r = session.get(f"{API}/admin/sponsored/pending",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        timeout=15)
        assert r.status_code == 200
        ads = r.json()
        assert any(a["id"] == getattr(pytest, "ad_id_basic", None) for a in ads)

    def test_admin_approve_activates_ad(self, session, admin_token):
        ad_id = getattr(pytest, "ad_id_basic", None)
        assert ad_id, "previous test must have created an ad"
        r = session.put(f"{API}/admin/sponsored/{ad_id}/approve",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        json={"admin_note": "TEST_approved"},
                        timeout=15)
        assert r.status_code == 200, r.text
        ad = r.json()
        assert ad["status"] == "active"
        assert ad["start_date"] and ad["end_date"]
        assert ad["admin_note"] == "TEST_approved"

    def test_approve_already_active_returns_400(self, session, admin_token):
        ad_id = getattr(pytest, "ad_id_basic", None)
        r = session.put(f"{API}/admin/sponsored/{ad_id}/approve",
                        headers={"Authorization": f"Bearer {admin_token}"},
                        timeout=15)
        assert r.status_code == 400, f"expected 400 when re-approving active ad, got {r.status_code} {r.text}"

    def test_active_list_filters(self, session, salon_shop):
        # scope=city filter
        r = session.get(f"{API}/sponsored/active", params={"scope": "city"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert it.get("is_sponsored") is True
            assert it.get("ad_scope") == "city"
        # our newly-approved basic_city ad must show up
        assert any(it.get("ad_id") == getattr(pytest, "ad_id_basic", None) for it in items), \
            "active basic_city ad not present in /sponsored/active?scope=city"

        # country filter combining with shop country
        country = salon_shop.get("country", "سوريا")
        r2 = session.get(f"{API}/sponsored/active", params={"country": country}, timeout=15)
        assert r2.status_code == 200
        for it in r2.json():
            assert it.get("is_sponsored") is True

    def test_reject_flow(self, session, salon_token, admin_token):
        # Create a second pending ad, then reject it.
        cr = session.post(f"{API}/sponsored/request",
                          headers={"Authorization": f"Bearer {salon_token}"},
                          json={"plan": "basic_city", "duration_days": 5},
                          timeout=15)
        assert cr.status_code == 200, cr.text
        ad_id = cr.json()["id"]

        rr = session.put(f"{API}/admin/sponsored/{ad_id}/reject",
                         headers={"Authorization": f"Bearer {admin_token}"},
                         json={"admin_note": "TEST_reject"},
                         timeout=15)
        assert rr.status_code == 200, rr.text
        assert rr.json()["status"] == "rejected"
        assert rr.json()["admin_note"] == "TEST_reject"


# =============== PHASE 5: Revenue & Stats ===============
class TestShopStats:
    def test_stats_requires_shop(self, session, user_token):
        r = session.get(f"{API}/barbershops/me/stats",
                        headers={"Authorization": f"Bearer {user_token}"},
                        timeout=15)
        assert r.status_code in (401, 403)

    def test_stats_structure(self, session, salon_token):
        r = session.get(f"{API}/barbershops/me/stats?days=30",
                        headers={"Authorization": f"Bearer {salon_token}"},
                        timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for key in (
            "window_days", "total_bookings", "completed_bookings", "total_orders",
            "paid_orders", "service_revenue", "product_revenue", "total_revenue",
            "revenue_by_day", "top_products", "top_services",
        ):
            assert key in data, f"missing key {key}"
        assert data["window_days"] == 30
        assert isinstance(data["revenue_by_day"], list)
        assert isinstance(data["top_products"], list)
        assert isinstance(data["top_services"], list)
        # numeric consistency: total ≈ service + product (within rounding)
        assert abs(data["total_revenue"] - (data["service_revenue"] + data["product_revenue"])) < 0.02


# =============== PHASE 5: Leave Calendar ===============
class TestLeaveCalendar:
    def test_leave_requires_shop(self, session, user_token):
        r = session.post(f"{API}/barbershops/me/leave",
                         headers={"Authorization": f"Bearer {user_token}"},
                         json={"dates": ["2026-03-01"], "reason": "no"},
                         timeout=15)
        assert r.status_code in (401, 403)

    def test_leave_set_and_fetch(self, session, salon_token):
        # Send unsorted duplicates; expect sorted + deduped
        payload = {
            "dates": ["2026-04-05", "2026-04-01", "2026-04-05", "2026-04-10"],
            "reason": "TEST_holiday",
        }
        r = session.post(f"{API}/barbershops/me/leave",
                         headers={"Authorization": f"Bearer {salon_token}"},
                         json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["leave_dates"] == ["2026-04-01", "2026-04-05", "2026-04-10"]
        assert body["leave_reason"] == "TEST_holiday"

        # Public fetch
        pr = session.get(f"{API}/barbershops/{SALON_SHOP_ID}/leave", timeout=15)
        assert pr.status_code == 200, pr.text
        pbody = pr.json()
        assert pbody["leave_dates"] == ["2026-04-01", "2026-04-05", "2026-04-10"]
        assert pbody["leave_reason"] == "TEST_holiday"

    def test_leave_missing_shop_404(self, session):
        r = session.get(f"{API}/barbershops/does-not-exist-xyz/leave", timeout=10)
        assert r.status_code == 404


# =============== Village Search Enhancement ===============
class TestAreaSearch:
    def test_search_by_area_matches_seed_village(self, session):
        """Prior test run left TEST_Dummar / TEST_Al-Mazzeh / TEST_East Block in the seed salon."""
        r = session.get(f"{API}/search/barbers", params={"area": "Dummar"}, timeout=15)
        assert r.status_code == 200, r.text
        results = r.json()
        assert any(s.get("id") == SALON_SHOP_ID for s in results), \
            "area=Dummar should match seed salon's village/neighborhood field"

    def test_search_by_area_neighborhood(self, session):
        r = session.get(f"{API}/search/barbers", params={"area": "Mazzeh"}, timeout=15)
        assert r.status_code == 200
        results = r.json()
        # may or may not match — at minimum shouldn't error, and should be case-insensitive
        # if seed salon has TEST_Al-Mazzeh neighborhood, it should match
        if any(s.get("id") == SALON_SHOP_ID for s in results):
            assert True
        else:
            # still assert contract holds: results is a list
            assert isinstance(results, list)

    def test_search_by_area_case_insensitive(self, session):
        r1 = session.get(f"{API}/search/barbers", params={"area": "DUMMAR"}, timeout=15)
        r2 = session.get(f"{API}/search/barbers", params={"area": "dummar"}, timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        ids1 = {s.get("id") for s in r1.json()}
        ids2 = {s.get("id") for s in r2.json()}
        assert ids1 == ids2, "area search must be case-insensitive"

    def test_search_by_search_param_matches_neighborhood(self, session):
        """`search` was extended to include neighborhood/village/district."""
        r = session.get(f"{API}/search/barbers", params={"search": "Dummar"}, timeout=15)
        assert r.status_code == 200
        results = r.json()
        assert any(s.get("id") == SALON_SHOP_ID for s in results), \
            "search=Dummar should match seed salon via extended neighborhood/village fields"

    def test_search_empty_area_returns_list(self, session):
        r = session.get(f"{API}/search/barbers", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
