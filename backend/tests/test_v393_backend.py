"""
Barber Hub v3.9.3 — backend regression + new features.

Covers:
- Vacation endpoint now served from routers/vacation.py (identical behaviour).
- SubscriptionOrderCreate.billing_cycle = monthly|yearly|invalid.
- Admin approve durations (monthly=30d, yearly=365d, with free_trial bonus).
- Listing filters (approval_status + is_on_vacation) on /api/barbers,
  /api/barbers/nearby, /api/ranking/top, /api/ranking/tiers.
- Gender segregation (type=male / type=female).
- AdminSubscriptionOrder detail includes admin_wa_link.
- Receipt validation still strict (gif/invalid-base64/tiny rejected).
"""
import base64
import io
import os
import struct
import zlib
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

ADMIN_PHONE = "admin"
ADMIN_PASSWORD = "NewStrong2026!xYz"
SALON_PHONE = "0998765432"
SALON_PASSWORD = "TestPass2026!"
SALON_SHOP_ID = "fefee4cb-4bb7-4000-a3ee-7290f5054114"

GLOBAL_PLAN_ID = "2b31e819-4e86-4781-a51d-927a72cf5445"  # monthly 20 / yearly 200
SY_PLAN_ID = "852e7ba6-ec6d-4829-8b95-157172d89948"       # monthly 250000 / yearly None


# ---------- helpers ----------
def _make_png_bytes(size: int = 64) -> bytes:
    """Generate a valid PNG using random pixels so it compresses poorly (>100B)."""
    import os as _os
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # RGB
    raw = b"".join(b"\x00" + _os.urandom(size * 3) for _ in range(size))
    idat = zlib.compress(raw, 1)
    iend = b""
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", iend)


def _valid_receipt() -> str:
    b = _make_png_bytes(64)
    assert len(b) >= 100, f"PNG too small: {len(b)}"
    return "data:image/png;base64," + base64.b64encode(b).decode("ascii")


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"phone_number": ADMIN_PHONE, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:300]}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def salon_token(s):
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"phone_number": SALON_PHONE, "password": SALON_PASSWORD})
    assert r.status_code == 200, f"salon login failed: {r.status_code} {r.text[:300]}"
    return r.json()["access_token"]


@pytest.fixture
def h_admin(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def h_salon(salon_token):
    return {"Authorization": f"Bearer {salon_token}"}


# ==============================================================
# Vacation endpoint (now served from routers/vacation.py)
# ==============================================================
class TestVacationRouter:
    def test_vacation_on(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/barbershop/me/vacation",
                   json={"is_on_vacation": True}, headers=h_salon)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("is_on_vacation") is True

    def test_vacation_off(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/barbershop/me/vacation",
                   json={"is_on_vacation": False}, headers=h_salon)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True
        assert body.get("is_on_vacation") is False

    def test_vacation_with_messages(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/barbershop/me/vacation",
                   json={"is_on_vacation": False,
                         "vacation_message_ar": "عطلة",
                         "vacation_message_en": "On holiday"},
                   headers=h_salon)
        assert r.status_code == 200, r.text


# ==============================================================
# billing_cycle on SubscriptionOrderCreate
# ==============================================================
class TestBillingCycle:
    def _payload(self, cycle, plan_id=GLOBAL_PLAN_ID):
        return {
            "plan_id": plan_id,
            "payment_method": "syriatel_cash",
            "receipt_image": _valid_receipt(),
            "billing_cycle": cycle,
            "notes": "TEST_v393",
        }

    def test_yearly_picks_yearly_price(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._payload("yearly"), headers=h_salon)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        order = body.get("order") or body
        assert order.get("billing_cycle") == "yearly"
        assert float(order.get("amount")) == 200.0, order

    def test_monthly_picks_monthly_price(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._payload("monthly"), headers=h_salon)
        assert r.status_code in (200, 201), r.text
        order = r.json().get("order") or r.json()
        assert order.get("billing_cycle") == "monthly"
        assert float(order.get("amount")) == 20.0

    def test_invalid_cycle_weekly_rejected(self, s, h_salon):
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._payload("weekly"), headers=h_salon)
        assert r.status_code == 400, r.text
        detail = (r.json().get("detail") or "").lower()
        assert "billing_cycle" in detail and ("monthly" in detail and "yearly" in detail)

    def test_yearly_on_plan_without_yearly_price_falls_back(self, s, h_salon):
        # SY plan has yearly_price=null; code falls back to monthly_price.
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._payload("yearly", SY_PLAN_ID), headers=h_salon)
        assert r.status_code in (200, 201), r.text
        order = r.json().get("order") or r.json()
        assert order.get("billing_cycle") == "yearly"
        assert float(order.get("amount")) == 250000.0


# ==============================================================
# Admin approve durations
# ==============================================================
class TestAdminApproveDurations:
    def _create(self, s, h_salon, cycle, plan_id=GLOBAL_PLAN_ID):
        r = s.post(f"{BASE_URL}/api/subscription-orders", headers=h_salon, json={
            "plan_id": plan_id,
            "payment_method": "syriatel_cash",
            "receipt_image": _valid_receipt(),
            "billing_cycle": cycle,
            "notes": "TEST_v393_approve",
        })
        assert r.status_code in (200, 201), r.text
        order = r.json().get("order") or r.json()
        return order["id"], order

    def test_approve_yearly_without_duration_gives_365_plus_trial(self, s, h_salon, h_admin):
        order_id, order = self._create(s, h_salon, "yearly", GLOBAL_PLAN_ID)
        ft_months = int(order.get("free_trial_months") or 0)
        expected_days = 365 + ft_months * 30

        r = s.post(f"{BASE_URL}/api/admin/subscription-orders/{order_id}/approve",
                   headers=h_admin, json={"admin_notes": "TEST_v393 yearly approve"})
        assert r.status_code == 200, r.text
        activated_until = r.json()["activated_until"]
        expiry = datetime.fromisoformat(activated_until.replace("Z", "+00:00"))
        delta_days = (expiry - datetime.now(timezone.utc)).total_seconds() / 86400
        assert abs(delta_days - expected_days) < 2, \
            f"yearly approve: expected ~{expected_days} days, got {delta_days:.1f}"

    def test_approve_monthly_without_duration_gives_30_plus_trial(self, s, h_salon, h_admin):
        order_id, order = self._create(s, h_salon, "monthly", GLOBAL_PLAN_ID)
        ft_months = int(order.get("free_trial_months") or 0)
        expected_days = 30 + ft_months * 30

        r = s.post(f"{BASE_URL}/api/admin/subscription-orders/{order_id}/approve",
                   headers=h_admin, json={})
        assert r.status_code == 200, r.text
        expiry = datetime.fromisoformat(r.json()["activated_until"].replace("Z", "+00:00"))
        delta_days = (expiry - datetime.now(timezone.utc)).total_seconds() / 86400
        assert abs(delta_days - expected_days) < 2, \
            f"monthly approve: expected ~{expected_days} days, got {delta_days:.1f}"

    def test_admin_detail_includes_wa_link(self, s, h_salon, h_admin):
        order_id, _ = self._create(s, h_salon, "monthly", GLOBAL_PLAN_ID)
        r = s.get(f"{BASE_URL}/api/admin/subscription-orders/{order_id}", headers=h_admin)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "admin_wa_link" in body
        assert body["admin_wa_link"] and body["admin_wa_link"].startswith("https://wa.me/")


# ==============================================================
# Listing filters: approval_status + is_on_vacation
# ==============================================================
class TestListingFilters:
    def _salon_on_vacation(self, s, h_salon, on: bool):
        r = s.post(f"{BASE_URL}/api/barbershop/me/vacation",
                   json={"is_on_vacation": on}, headers=h_salon)
        assert r.status_code == 200

    def test_barbers_hides_vacation(self, s, h_salon):
        self._salon_on_vacation(s, h_salon, True)
        try:
            r = s.get(f"{BASE_URL}/api/barbers?limit=100")
            assert r.status_code == 200
            data = r.json()
            ids = [b.get("id") for b in (data if isinstance(data, list) else data.get("barbers", []))]
            assert SALON_SHOP_ID not in ids, "vacation salon should not appear in /api/barbers"
        finally:
            self._salon_on_vacation(s, h_salon, False)

    def test_barbers_shows_after_vacation_off(self, s):
        r = s.get(f"{BASE_URL}/api/barbers?limit=100")
        assert r.status_code == 200
        data = r.json()
        ids = [b.get("id") for b in (data if isinstance(data, list) else data.get("barbers", []))]
        assert SALON_SHOP_ID in ids

    def test_nearby_hides_vacation(self, s, h_salon):
        self._salon_on_vacation(s, h_salon, True)
        try:
            r = s.get(f"{BASE_URL}/api/barbers/nearby?lat=33.5&lng=36.3&radius=500000")
            assert r.status_code == 200, r.text
            data = r.json()
            items = data if isinstance(data, list) else data.get("barbers", [])
            ids = [b.get("id") for b in items]
            assert SALON_SHOP_ID not in ids
        finally:
            self._salon_on_vacation(s, h_salon, False)

    def test_ranking_top_filters_vacation(self, s, h_salon):
        self._salon_on_vacation(s, h_salon, True)
        try:
            r = s.get(f"{BASE_URL}/api/ranking/top?scope=global&limit=100")
            assert r.status_code == 200, r.text
            data = r.json()
            items = data if isinstance(data, list) else (
                data.get("top") or data.get("ranking") or data.get("items") or []
            )
            ids = [b.get("id") for b in items if isinstance(b, dict)]
            assert SALON_SHOP_ID not in ids, f"vacation salon leaked into ranking/top: {ids}"
        finally:
            self._salon_on_vacation(s, h_salon, False)

    def test_ranking_tiers_filters_vacation(self, s, h_salon):
        self._salon_on_vacation(s, h_salon, True)
        try:
            r = s.get(f"{BASE_URL}/api/ranking/tiers")
            assert r.status_code == 200, r.text
            # gather all ids across all tiers
            body = r.json()
            all_ids = []

            def _walk(o):
                if isinstance(o, dict):
                    if "id" in o and isinstance(o["id"], str) and len(o["id"]) > 10:
                        all_ids.append(o["id"])
                    for v in o.values():
                        _walk(v)
                elif isinstance(o, list):
                    for v in o:
                        _walk(v)
            _walk(body)
            assert SALON_SHOP_ID not in all_ids
        finally:
            self._salon_on_vacation(s, h_salon, False)


# ==============================================================
# Gender segregation on listings
# ==============================================================
class TestGenderSegregation:
    def test_barbers_type_male_only_male(self, s):
        r = s.get(f"{BASE_URL}/api/barbers?type=male&limit=100")
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("barbers", [])
        types = {b.get("shop_type") for b in items}
        assert types.issubset({"male"}) or len(items) == 0, f"leak: {types}"

    def test_barbers_type_female_excludes_male(self, s):
        r = s.get(f"{BASE_URL}/api/barbers?type=female&limit=100")
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("barbers", [])
        assert all(b.get("shop_type") == "female" for b in items)
        # Known male test salon must not appear
        ids = [b.get("id") for b in items]
        assert SALON_SHOP_ID not in ids

    def test_nearby_type_female_excludes_male(self, s):
        r = s.get(f"{BASE_URL}/api/barbers/nearby?lat=33.5&lng=36.3&radius=500000&type=female")
        assert r.status_code == 200, r.text
        data = r.json()
        items = data if isinstance(data, list) else data.get("barbers", [])
        for b in items:
            assert b.get("shop_type") == "female"
        assert SALON_SHOP_ID not in [b.get("id") for b in items]

    def test_barbershops_type_female_excludes_male(self, s):
        r = s.get(f"{BASE_URL}/api/barbershops?type=female&limit=100")
        assert r.status_code == 200, r.text
        data = r.json()
        items = data if isinstance(data, list) else data.get("barbershops", data.get("items", []))
        for b in items:
            assert b.get("shop_type") in (None, "female"), b

    def test_search_barbers_type_female_excludes_male(self, s):
        # /api/search/barbers uses query param name `shop_type` (not `type`).
        r = s.get(f"{BASE_URL}/api/search/barbers?shop_type=female")
        assert r.status_code == 200, r.text
        data = r.json()
        items = data if isinstance(data, list) else data.get("barbers", data.get("items", []))
        for b in items:
            assert b.get("shop_type") in (None, "female"), b
        assert SALON_SHOP_ID not in [b.get("id") for b in items]


# ==============================================================
# Receipt validation (v3.9.2 strict rules still intact)
# ==============================================================
class TestReceiptValidation:
    def _body(self, receipt):
        return {
            "plan_id": GLOBAL_PLAN_ID,
            "payment_method": "syriatel_cash",
            "receipt_image": receipt,
            "billing_cycle": "monthly",
        }

    def test_gif_rejected(self, s, h_salon):
        gif = "data:image/gif;base64," + base64.b64encode(b"GIF89a" + b"\x00" * 120).decode()
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._body(gif), headers=h_salon)
        assert r.status_code == 400

    def test_invalid_base64_rejected(self, s, h_salon):
        bad = "data:image/png;base64,@@@@@@@@@@@@"
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._body(bad), headers=h_salon)
        assert r.status_code == 400

    def test_tiny_image_rejected(self, s, h_salon):
        tiny = "data:image/png;base64," + base64.b64encode(b"\x89PNG" + b"\x00" * 10).decode()
        r = s.post(f"{BASE_URL}/api/subscription-orders",
                   json=self._body(tiny), headers=h_salon)
        assert r.status_code == 400
