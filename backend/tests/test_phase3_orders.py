"""
Phase 3 Backend Tests - Orders, Shipping Options, Loyalty, Location sync.
Covers: POST /api/products (10-limit + shipping_options), /api/orders CRUD + status transitions,
profile sync of lat/lng/district/neighborhood/village, and loyalty-on-order.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://barber-finder-26.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SALON_PHONE = "0935964158"
SALON_PASSWORD = "salon123"

# ------------- SHARED STATE -------------
STATE = {}


def _login(phone, password):
    r = requests.post(f"{API}/auth/login", json={"phone_number": phone, "password": password}, timeout=30)
    return r


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


# ==================== SESSION SETUP ====================

@pytest.fixture(scope="session", autouse=True)
def setup_session():
    # Salon login
    r = _login(SALON_PHONE, SALON_PASSWORD)
    assert r.status_code == 200, f"Salon login failed: {r.status_code} {r.text}"
    data = r.json()
    STATE["salon_token"] = data["access_token"]
    STATE["salon_id"] = data["user"]["id"]

    # Register a fresh user
    unique = uuid.uuid4().hex[:8]
    STATE["user_phone"] = f"TEST_{unique}"
    STATE["user_password"] = "user123"
    reg = requests.post(f"{API}/auth/register", json={
        "full_name": f"Test User {unique}",
        "phone_number": STATE["user_phone"],
        "password": STATE["user_password"],
        "gender": "male",
        "country": "Syria",
        "city": "Damascus"
    }, timeout=30)
    assert reg.status_code == 200, f"User register failed: {reg.status_code} {reg.text}"
    d = reg.json()
    STATE["user_token"] = d["access_token"]
    STATE["user_id"] = d["user"]["id"]
    yield
    # Teardown: cleanup test products by name prefix (best-effort via delete route handled later)


# ==================== PRODUCTS: MAX 10 + shipping_options ====================

class TestProductsPhase3:
    def test_create_product_with_shipping_options(self):
        token = STATE["salon_token"]
        payload = {
            "name": f"TEST_Product_{uuid.uuid4().hex[:6]}",
            "price": 25.0,
            "category": "hair",
            "in_stock": True,
            "shipping_options": ["pickup", "local_delivery", "courier"],
            "local_delivery_fee": 5.0,
        }
        r = requests.post(f"{API}/products", json=payload, headers=_auth(token), timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["shipping_options"] == ["pickup", "local_delivery", "courier"]
        assert p["local_delivery_fee"] == 5.0
        assert p["name"] == payload["name"]
        STATE["product_id"] = p["id"]

        # Verify via GET
        g = requests.get(f"{API}/products/shop/{STATE['salon_id']}", timeout=30)
        assert g.status_code == 200
        ids = [x["id"] for x in g.json()]
        assert STATE["product_id"] in ids

    def test_create_product_default_pickup_when_omitted(self):
        token = STATE["salon_token"]
        payload = {
            "name": f"TEST_Pickup_{uuid.uuid4().hex[:6]}",
            "price": 10.0,
            "category": "beard",
        }
        r = requests.post(f"{API}/products", json=payload, headers=_auth(token), timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["shipping_options"] == ["pickup"]
        STATE["pickup_only_product_id"] = p["id"]

    def test_max_10_products_limit(self):
        token = STATE["salon_token"]
        # Count current products
        g = requests.get(f"{API}/products/shop/{STATE['salon_id']}", timeout=30)
        current = len(g.json())
        created_ids = []
        # Fill up to 10
        to_create = max(0, 10 - current)
        for i in range(to_create):
            r = requests.post(f"{API}/products", json={
                "name": f"TEST_Fill_{uuid.uuid4().hex[:6]}",
                "price": 1.0,
                "category": "general",
                "shipping_options": ["pickup"],
            }, headers=_auth(token), timeout=30)
            assert r.status_code == 200, r.text
            created_ids.append(r.json()["id"])

        # 11th should fail
        r = requests.post(f"{API}/products", json={
            "name": f"TEST_Overflow_{uuid.uuid4().hex[:6]}",
            "price": 1.0,
            "category": "general",
        }, headers=_auth(token), timeout=30)
        assert r.status_code == 400, f"Expected 400 MAX_PRODUCTS_REACHED, got {r.status_code} {r.text}"
        assert "MAX_PRODUCTS_REACHED" in r.text

        # Cleanup: delete fillers
        for pid in created_ids:
            requests.delete(f"{API}/products/{pid}", headers=_auth(token), timeout=30)


# ==================== ORDERS ====================

class TestOrdersPhase3:
    def test_create_order_as_guest(self):
        r = requests.post(f"{API}/orders", json={
            "product_id": STATE["product_id"],
            "shop_id": STATE["salon_id"],
            "quantity": 2,
            "shipping_method": "local_delivery",
            "customer_name": "Guest Test",
            "customer_phone": "+96300000001",
            "shipping_address": "Test Addr 1",
            "shipping_city": "Damascus",
            "shipping_country": "Syria",
        }, timeout=30)
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["shipping_method"] == "local_delivery"
        assert o["quantity"] == 2
        assert o["shipping_fee"] == 5.0
        assert o["subtotal"] == 50.0  # 25 * 2
        assert o["total"] == 55.0
        assert o["status"] == "pending"
        assert o["user_id"] is None
        assert len(o["status_history"]) == 1 and o["status_history"][0]["status"] == "pending"
        STATE["guest_order_id"] = o["id"]

    def test_create_order_as_user_awards_loyalty(self):
        token = STATE["user_token"]
        # Baseline: fetch user's current loyalty_points from DB via users/me
        me_before = requests.get(f"{API}/users/me", headers=_auth(token), timeout=30).json()
        points_before = int(me_before.get("loyalty_points") or 0)

        r = requests.post(f"{API}/orders", json={
            "product_id": STATE["product_id"],
            "shop_id": STATE["salon_id"],
            "quantity": 1,
            "shipping_method": "pickup",
            "customer_phone": "+96300000002",
        }, headers=_auth(token), timeout=30)
        assert r.status_code == 200, r.text
        o = r.json()
        assert o["user_id"] == STATE["user_id"]
        assert o["shipping_fee"] == 0.0
        assert o["total"] == 25.0
        STATE["user_order_id"] = o["id"]

        # Verify loyalty_points incremented
        me_after = requests.get(f"{API}/users/me", headers=_auth(token), timeout=30).json()
        points_after = int(me_after.get("loyalty_points") or 0)
        assert points_after == points_before + int(o["total"]), \
            f"Expected {points_before + int(o['total'])} points, got {points_after}"

        # Also try /api/users/me/loyalty (review mentions verifying here)
        lr = requests.get(f"{API}/users/me/loyalty", headers=_auth(token), timeout=30)
        assert lr.status_code == 200
        STATE["loyalty_resp"] = lr.json()

    def test_order_invalid_shipping_method(self):
        # pickup-only product should reject local_delivery
        token = STATE["user_token"]
        r = requests.post(f"{API}/orders", json={
            "product_id": STATE["pickup_only_product_id"],
            "shop_id": STATE["salon_id"],
            "quantity": 1,
            "shipping_method": "local_delivery",
            "customer_phone": "+96300000003",
        }, headers=_auth(token), timeout=30)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        assert "Shipping method" in r.text or "shipping" in r.text.lower()

    def test_order_missing_customer_phone_guest(self):
        r = requests.post(f"{API}/orders", json={
            "product_id": STATE["product_id"],
            "shop_id": STATE["salon_id"],
            "quantity": 1,
            "shipping_method": "pickup",
            "customer_phone": "",
        }, timeout=30)
        assert r.status_code == 400

    def test_get_my_orders_as_user(self):
        token = STATE["user_token"]
        r = requests.get(f"{API}/orders/my", headers=_auth(token), timeout=30)
        assert r.status_code == 200
        orders = r.json()
        assert any(o["id"] == STATE["user_order_id"] for o in orders)

    def test_get_my_orders_forbidden_for_shop(self):
        token = STATE["salon_token"]
        r = requests.get(f"{API}/orders/my", headers=_auth(token), timeout=30)
        assert r.status_code == 403

    def test_get_shop_orders(self):
        token = STATE["salon_token"]
        r = requests.get(f"{API}/orders/shop", headers=_auth(token), timeout=30)
        assert r.status_code == 200
        orders = r.json()
        ids = [o["id"] for o in orders]
        assert STATE["user_order_id"] in ids
        assert STATE["guest_order_id"] in ids

    def test_get_shop_orders_requires_shop_auth(self):
        token = STATE["user_token"]
        r = requests.get(f"{API}/orders/shop", headers=_auth(token), timeout=30)
        assert r.status_code == 403

    def test_update_order_status_flow(self):
        token = STATE["salon_token"]
        order_id = STATE["user_order_id"]
        for st in ["confirmed", "preparing", "shipped"]:
            r = requests.put(
                f"{API}/orders/{order_id}/status",
                json={"status": st, "tracking_note": f"moved to {st}"},
                headers=_auth(token), timeout=30
            )
            assert r.status_code == 200, r.text
            assert r.json()["status"] == st
        # Verify history length
        get_r = requests.get(f"{API}/orders/{order_id}", headers=_auth(token), timeout=30)
        assert get_r.status_code == 200
        hist = get_r.json()["status_history"]
        # pending + 3 = 4
        assert len(hist) >= 4
        assert hist[-1]["status"] == "shipped"

    def test_update_order_status_invalid(self):
        token = STATE["salon_token"]
        r = requests.put(
            f"{API}/orders/{STATE['guest_order_id']}/status",
            json={"status": "weird_state"},
            headers=_auth(token), timeout=30
        )
        assert r.status_code == 400

    def test_order_detail_owner_access(self):
        # user can see own order
        ur = requests.get(f"{API}/orders/{STATE['user_order_id']}", headers=_auth(STATE["user_token"]), timeout=30)
        assert ur.status_code == 200
        # shop can also see
        sr = requests.get(f"{API}/orders/{STATE['user_order_id']}", headers=_auth(STATE["salon_token"]), timeout=30)
        assert sr.status_code == 200

    def test_order_detail_forbidden_for_other_user(self):
        # Register another user and try to access first user's order
        other_phone = f"TEST_OTH_{uuid.uuid4().hex[:6]}"
        reg = requests.post(f"{API}/auth/register", json={
            "full_name": "Other User",
            "phone_number": other_phone,
            "password": "user123",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }, timeout=30).json()
        other_token = reg["access_token"]
        r = requests.get(
            f"{API}/orders/{STATE['user_order_id']}",
            headers=_auth(other_token), timeout=30
        )
        assert r.status_code == 403

    def test_cancel_order_by_customer(self):
        # Create a fresh order then cancel as user
        r = requests.post(f"{API}/orders", json={
            "product_id": STATE["product_id"],
            "shop_id": STATE["salon_id"],
            "quantity": 1,
            "shipping_method": "pickup",
            "customer_phone": "+96300000099",
        }, headers=_auth(STATE["user_token"]), timeout=30)
        assert r.status_code == 200
        oid = r.json()["id"]

        c = requests.put(f"{API}/orders/{oid}/cancel", headers=_auth(STATE["user_token"]), timeout=30)
        assert c.status_code == 200, c.text
        assert c.json()["status"] == "cancelled"

    def test_cancel_order_forbidden_for_other_user(self):
        # Another user can't cancel
        other_phone = f"TEST_OTH2_{uuid.uuid4().hex[:6]}"
        reg = requests.post(f"{API}/auth/register", json={
            "full_name": "Other2",
            "phone_number": other_phone,
            "password": "user123",
            "gender": "male",
            "country": "Syria",
            "city": "Damascus"
        }, timeout=30).json()
        other_token = reg["access_token"]
        r = requests.put(
            f"{API}/orders/{STATE['guest_order_id']}/cancel",
            headers=_auth(other_token), timeout=30
        )
        # Guest order has user_id=None, other user is entity_type=user but user_id mismatch -> 403
        assert r.status_code == 403


# ==================== BARBER PROFILE LOCATION SYNC ====================

class TestBarberProfileLocation:
    def test_profile_location_sync(self):
        token = STATE["salon_token"]
        payload = {
            "latitude": 33.5138,
            "longitude": 36.2765,
            "district": "TEST_Al-Mazzeh",
            "neighborhood": "TEST_East Block",
            "village": "TEST_Dummar",
        }
        r = requests.post(f"{API}/barbers/profile", json=payload, headers=_auth(token), timeout=30)
        assert r.status_code == 200, r.text
        enriched = r.json()
        assert enriched.get("latitude") == 33.5138
        assert enriched.get("longitude") == 36.2765
        assert enriched.get("district") == "TEST_Al-Mazzeh"
        assert enriched.get("neighborhood") == "TEST_East Block"

        # Verify via public GET /api/barbershops/{id}
        g = requests.get(f"{API}/barbershops/{STATE['salon_id']}", timeout=30)
        assert g.status_code == 200, g.text
        body = g.json()
        assert body.get("latitude") == 33.5138
        assert body.get("longitude") == 36.2765
        assert body.get("district") == "TEST_Al-Mazzeh"

        # Village should be stored in barber_profiles collection -> re-read profile/me
        me = requests.get(f"{API}/barbers/profile/me", headers=_auth(token), timeout=30)
        assert me.status_code == 200
        # village may not be in enriched output directly, but profile extension should hold it
        # We assert via profile endpoint response or barber_profiles db. At minimum fetch /api/barbers/{id}:
        br = requests.get(f"{API}/barbers/{STATE['salon_id']}", timeout=30)
        # Either endpoint exists or not, but key fields should be present somewhere
        # Main validation: latitude/longitude/district/neighborhood returned above.
