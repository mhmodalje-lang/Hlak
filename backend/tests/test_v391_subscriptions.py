"""
Backend regression tests for Barber Hub v3.9.1
- Subscription plans (country_code, Global fallback)
- Transfer recipients (syriatel_cash + exchanges)
- Subscription orders (create/validate/admin list/approve)
- Vacation toggle + listing/search hide
- Working hours persistence via PUT /api/barbers/profile
"""
import os
import re
import pytest
import requests

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    # Fallback: read from /app/frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not found")

BASE_URL = _load_backend_url()

ADMIN_CREDS = {"phone_number": "admin", "password": "NewStrong2026!xYz"}
SALON_CREDS = {"phone_number": "0998765432", "password": "TestPass2026!"}
SALON_SHOP_ID = "fefee4cb-4bb7-4000-a3ee-7290f5054114"

# 1x1 PNG data URI
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX///+nxBvIAAAA"
    "C0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="
)
RECEIPT_DATA_URI = f"data:image/png;base64,{TINY_PNG_B64}"


# -------------------- Fixtures --------------------

@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def salon_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json=SALON_CREDS)
    assert r.status_code == 200, f"Salon login failed: {r.status_code} {r.text}"
    return r.json().get("access_token")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def salon_headers(salon_token):
    return {"Authorization": f"Bearer {salon_token}"}


# -------------------- Subscription Plans --------------------

class TestSubscriptionPlans:
    def test_plans_sy_returns_plans_wrapper(self, s):
        r = s.get(f"{BASE_URL}/api/subscription-plans", params={"country_code": "SY"})
        assert r.status_code == 200
        body = r.json()
        assert "plans" in body and isinstance(body["plans"], list)
        assert len(body["plans"]) >= 1
        # Should find Syria plan OR fall back to Global
        plan = body["plans"][0]
        assert "id" in plan
        assert "monthly_price" in plan
        assert "currency" in plan

    def test_plans_unknown_country_falls_back_to_global(self, s):
        r = s.get(f"{BASE_URL}/api/subscription-plans", params={"country_code": "ZZ"})
        assert r.status_code == 200
        body = r.json()
        assert "plans" in body
        assert len(body["plans"]) >= 1
        # fallback should give GLOBAL
        codes = [p.get("country_code") for p in body["plans"]]
        assert "GLOBAL" in codes

    def test_plans_no_filter_returns_all(self, s):
        r = s.get(f"{BASE_URL}/api/subscription-plans")
        assert r.status_code == 200
        assert len(r.json().get("plans", [])) >= 1


# -------------------- Transfer Recipients --------------------

class TestTransferRecipients:
    def test_public_transfer_recipients_shape(self, s):
        r = s.get(f"{BASE_URL}/api/transfer-recipients")
        assert r.status_code == 200
        body = r.json()
        assert "syriatel_cash" in body
        assert "exchanges" in body and isinstance(body["exchanges"], list)
        assert len(body["exchanges"]) >= 4
        # Each exchange must have id and name
        for ex in body["exchanges"]:
            assert "id" in ex
            assert ex.get("name_ar") or ex.get("name_en") or ex.get("name")
        expected_ids = {"al-haram", "al-admiral", "al-fuad", "balance-transfer"}
        actual_ids = {ex["id"] for ex in body["exchanges"]}
        assert expected_ids.issubset(actual_ids), f"Missing: {expected_ids - actual_ids}"


# -------------------- Subscription Orders --------------------

class TestSubscriptionOrders:
    @pytest.fixture(scope="class")
    def plan_id_sy(self, s):
        r = s.get(f"{BASE_URL}/api/subscription-plans", params={"country_code": "SY"})
        assert r.status_code == 200
        return r.json()["plans"][0]["id"]

    def test_create_order_syriatel_cash_happy(self, s, salon_headers, plan_id_sy):
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "syriatel_cash",
            "reference_number": "TEST_REF_12345",
            "receipt_image": RECEIPT_DATA_URI,
            "notes": "TEST_v391 order",
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert "reference_code" in body
        # BH-YY-XXXXXX format
        assert re.match(r"^BH-\d{2}-[A-Z0-9]{4,8}$", body["reference_code"]), body["reference_code"]
        assert body.get("order", {}).get("status") == "pending"
        # admin_wa_link should be a wa.me URL (salon phone is on file)
        assert body.get("admin_wa_link", "").startswith("https://wa.me/")

    def test_create_order_exchange_requires_exchange_id(self, s, salon_headers, plan_id_sy):
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "exchange",
            # missing exchange_id
            "receipt_image": RECEIPT_DATA_URI,
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 400, r.text

    def test_create_order_invalid_exchange_id_404(self, s, salon_headers, plan_id_sy):
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "exchange",
            "exchange_id": "NOT_A_REAL_EXCHANGE",
            "receipt_image": RECEIPT_DATA_URI,
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 404, r.text

    def test_create_order_invalid_plan_404(self, s, salon_headers):
        payload = {
            "plan_id": "PLAN_DOES_NOT_EXIST",
            "payment_method": "syriatel_cash",
            "receipt_image": RECEIPT_DATA_URI,
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 404, r.text

    def test_create_order_missing_receipt_400(self, s, salon_headers, plan_id_sy):
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "syriatel_cash",
            # missing receipt_image
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 400, r.text

    def test_create_order_plain_text_receipt_400(self, s, salon_headers, plan_id_sy):
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "syriatel_cash",
            "receipt_image": "not-a-data-uri",
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 400, r.text

    def test_my_orders_lists_and_excludes_receipt(self, s, salon_headers):
        r = s.get(f"{BASE_URL}/api/my-subscription-orders", headers=salon_headers)
        assert r.status_code == 200
        orders = r.json().get("orders", [])
        assert isinstance(orders, list)
        assert len(orders) >= 1
        for o in orders:
            assert "receipt_image" not in o
            assert "reference_code" in o

    def test_admin_list_orders_with_wa_link(self, s, admin_headers):
        r = s.get(f"{BASE_URL}/api/admin/subscription-orders", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert "orders" in body and "pending_count" in body
        assert isinstance(body["orders"], list)
        # At least one order should have wa link (salon has phone)
        wa_links = [o.get("admin_wa_link") for o in body["orders"] if o.get("admin_wa_link")]
        assert any(link.startswith("https://wa.me/") for link in wa_links)

    def test_admin_list_requires_admin(self, s, salon_headers):
        r = s.get(f"{BASE_URL}/api/admin/subscription-orders", headers=salon_headers)
        assert r.status_code in (401, 403)

    def test_admin_approve_activates_salon(self, s, admin_headers, salon_headers, plan_id_sy):
        # Create a fresh order
        payload = {
            "plan_id": plan_id_sy,
            "payment_method": "syriatel_cash",
            "reference_number": "TEST_APPROVE",
            "receipt_image": RECEIPT_DATA_URI,
            "notes": "TEST_approve",
        }
        r = s.post(f"{BASE_URL}/api/subscription-orders", json=payload, headers=salon_headers)
        assert r.status_code == 200
        order_id = r.json()["order"]["id"]

        # Admin approves
        r2 = s.post(
            f"{BASE_URL}/api/admin/subscription-orders/{order_id}/approve",
            json={"admin_notes": "TEST approve", "duration_days": 30},
            headers=admin_headers,
        )
        assert r2.status_code == 200, r2.text
        assert r2.json().get("success") is True
        assert "activated_until" in r2.json()

        # Verify order status = approved
        r3 = s.get(f"{BASE_URL}/api/admin/subscription-orders/{order_id}", headers=admin_headers)
        assert r3.status_code == 200
        assert r3.json().get("status") == "approved"

        # Re-approve should 400
        r4 = s.post(
            f"{BASE_URL}/api/admin/subscription-orders/{order_id}/approve",
            json={}, headers=admin_headers,
        )
        assert r4.status_code == 400


# -------------------- Vacation --------------------

class TestVacation:
    @pytest.fixture(autouse=True)
    def _ensure_salon_approved(self, s, admin_headers):
        """Ensure the test salon is approved so it can appear in listings."""
        try:
            s.put(
                f"{BASE_URL}/api/admin/barbershops/{SALON_SHOP_ID}/approve",
                json={}, headers=admin_headers,
            )
        except Exception:
            pass

    def _get_listing_ids(self, s):
        r = s.get(f"{BASE_URL}/api/barbershops")
        assert r.status_code == 200
        shops = r.json() if isinstance(r.json(), list) else r.json().get("barbershops", [])
        return [b.get("id") for b in shops]

    def _get_search_ids(self, s):
        # Use search by country/city matching the test salon if possible; fallback to empty
        r = s.get(f"{BASE_URL}/api/search/barbers")
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("results", body.get("barbers", []))
        return [b.get("id") for b in items]

    def test_vacation_on_hides_from_listing_and_search(self, s, salon_headers):
        # Turn ON vacation
        r = s.post(
            f"{BASE_URL}/api/barbershop/me/vacation",
            json={"is_on_vacation": True, "vacation_message_ar": "TEST", "vacation_message_en": "TEST"},
            headers=salon_headers,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("is_on_vacation") is True

        # Verify profile reflects the flag
        p = s.get(f"{BASE_URL}/api/barbers/profile/me", headers=salon_headers)
        assert p.status_code == 200
        prof = p.json()
        assert prof.get("is_on_vacation") is True

        listing_ids = self._get_listing_ids(s)
        assert SALON_SHOP_ID not in listing_ids, "Salon should be hidden from /api/barbershops when on vacation"

        search_ids = self._get_search_ids(s)
        assert SALON_SHOP_ID not in search_ids, "Salon should be hidden from /api/search/barbers when on vacation"

    def test_vacation_off_appears_in_listing(self, s, salon_headers):
        r = s.post(
            f"{BASE_URL}/api/barbershop/me/vacation",
            json={"is_on_vacation": False},
            headers=salon_headers,
        )
        assert r.status_code == 200
        assert r.json().get("is_on_vacation") is False

        listing_ids = self._get_listing_ids(s)
        assert SALON_SHOP_ID in listing_ids, "Salon should reappear in listings after vacation=false"


# -------------------- Working Hours --------------------

class TestWorkingHours:
    def test_put_working_hours_persists_closed_flag(self, s, salon_headers):
        working_hours = {
            "monday":    {"open": "09:00", "close": "18:00", "closed": False},
            "tuesday":   {"open": "09:00", "close": "18:00", "closed": False},
            "wednesday": {"open": "10:00", "close": "20:00", "closed": False},
            "thursday":  {"open": "09:00", "close": "18:00", "closed": False},
            "friday":    {"closed": True},
            "saturday":  {"open": "10:00", "close": "22:00", "closed": False},
            "sunday":    {"closed": True},
        }
        r = s.put(
            f"{BASE_URL}/api/barbers/profile",
            json={"working_hours": working_hours},
            headers=salon_headers,
        )
        assert r.status_code == 200, r.text

        # GET to verify persistence
        p = s.get(f"{BASE_URL}/api/barbers/profile/me", headers=salon_headers)
        assert p.status_code == 200
        prof = p.json()
        wh = prof.get("working_hours", {})
        assert wh, "working_hours should be present in profile"
        assert wh.get("friday", {}).get("closed") is True
        assert wh.get("sunday", {}).get("closed") is True
        assert wh.get("wednesday", {}).get("open") == "10:00"
        assert wh.get("wednesday", {}).get("close") == "20:00"
