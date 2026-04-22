"""
Manual-payment subscription router (v3.9.5 split from server.py)

This module owns all endpoints related to:
  • Subscription plans (per country, admin managed)
  • Manual transfer recipients (Syriatel Cash + exchange offices)
  • Subscription orders (salon uploads receipt → admin approves)

Factory pattern: `build_router(db, require_auth, require_admin, logger)` — returns
an APIRouter wired with the caller's shared deps. Mirrors routers/vacation.py.
No direct import from server.py → zero circular-import risk.
"""
from __future__ import annotations

import base64
import re
import urllib.parse as _urlp
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel


# ---------- Pydantic models ----------
class SubscriptionPlanCreate(BaseModel):
    country: str
    country_code: Optional[str] = None
    country_ar: Optional[str] = None
    currency: str = "USD"
    currency_symbol: Optional[str] = None
    monthly_price: float = 20.0
    yearly_price: Optional[float] = None
    free_trial_months: int = 2
    subscribe_url: Optional[str] = None
    badge_text_ar: Optional[str] = "🎉 عرض خاص - أول شهرين مجاناً 🎉"
    badge_text_en: Optional[str] = "🎉 Special Offer - First 2 Months Free 🎉"
    title_ar: Optional[str] = "اشتراك احترافي"
    title_en: Optional[str] = "Professional Subscription"
    description_ar: Optional[str] = "باقة متكاملة لإدارة صالونك باحترافية عالية"
    description_en: Optional[str] = "Full package to run your salon professionally"
    features_ar: Optional[List[str]] = None
    features_en: Optional[List[str]] = None
    active: bool = True


class SubscriptionPlanUpdate(BaseModel):
    country: Optional[str] = None
    country_code: Optional[str] = None
    country_ar: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    free_trial_months: Optional[int] = None
    subscribe_url: Optional[str] = None
    badge_text_ar: Optional[str] = None
    badge_text_en: Optional[str] = None
    title_ar: Optional[str] = None
    title_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    features_ar: Optional[List[str]] = None
    features_en: Optional[List[str]] = None
    active: Optional[bool] = None


class ExchangeRecipient(BaseModel):
    id: str
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    recipient_ar: Optional[str] = None
    recipient_en: Optional[str] = None
    province_ar: Optional[str] = None
    province_en: Optional[str] = None
    phone: Optional[str] = None
    active: bool = True


class SyriatelCashRecipient(BaseModel):
    number: Optional[str] = None
    display_name_ar: Optional[str] = None
    display_name_en: Optional[str] = None
    instructions_ar: Optional[str] = None
    instructions_en: Optional[str] = None
    active: Optional[bool] = None


class TransferRecipientsUpdate(BaseModel):
    syriatel_cash: Optional[SyriatelCashRecipient] = None
    exchanges: Optional[List[ExchangeRecipient]] = None
    general_note_ar: Optional[str] = None
    general_note_en: Optional[str] = None


class SubscriptionOrderCreate(BaseModel):
    plan_id: str
    payment_method: str
    exchange_id: Optional[str] = None
    reference_number: Optional[str] = None
    receipt_image: Optional[str] = None
    notes: Optional[str] = None
    billing_cycle: str = "monthly"


class SubscriptionOrderAdminAction(BaseModel):
    admin_notes: Optional[str] = None
    duration_days: Optional[int] = None


# ---------- Seed data ----------
DEFAULT_PLAN_FEATURES_AR = [
    "إدارة كاملة للصالون وفريق العمل والخدمات",
    "نظام حجوزات متقدم مع تنبيهات فورية وتذكيرات تلقائية",
    "معرض صور احترافي لعرض أعمالك وجذب المزيد من العملاء",
    "تقارير وإحصائيات لمتابعة الأداء والإيرادات",
    "دعم فني مميز على مدار الساعة لمساعدتك",
]
DEFAULT_PLAN_FEATURES_EN = [
    "Full salon, staff & services management",
    "Advanced booking system with instant alerts & auto-reminders",
    "Professional gallery to showcase your work",
    "Reports & analytics to track performance & revenue",
    "Premium 24/7 technical support",
]

DEFAULT_TRANSFER_RECIPIENTS = {
    "id": "transfer_recipients_singleton",
    "syriatel_cash": {
        "number": "+963 935 964 158",
        "display_name_ar": "سيريتل كاش",
        "display_name_en": "Syriatel Cash",
        "instructions_ar": "حوّل المبلغ إلى الرقم أعلاه ثم ارفع صورة إشعار التحويل وأدخل رقم العملية المرجعي.",
        "instructions_en": "Transfer the amount to the number above, then upload the transfer receipt and enter the reference number.",
        "active": True,
    },
    "exchanges": [
        {"id": "al-haram", "name_ar": "مكتب الهرم", "name_en": "Al-Haram Exchange", "recipient_ar": "ابراهيم الرجب", "recipient_en": "Ibrahim Al-Rajab", "province_ar": "معبدة", "province_en": "Maabada", "phone": "", "active": True},
        {"id": "al-admiral", "name_ar": "مكتب الأدميرال", "name_en": "Al-Admiral Exchange", "recipient_ar": "احمد الرجب", "recipient_en": "Ahmad Al-Rajab", "province_ar": "معبدة", "province_en": "Maabada", "phone": "", "active": True},
        {"id": "al-fuad", "name_ar": "مكتب الفؤاد", "name_en": "Al-Fuad Exchange", "recipient_ar": "احمد الرجب", "recipient_en": "Ahmad Al-Rajab", "province_ar": "معبدة", "province_en": "Maabada", "phone": "", "active": True},
        {"id": "balance-transfer", "name_ar": "تحويل رصيد", "name_en": "Balance Transfer", "recipient_ar": "احمد الرجب", "recipient_en": "Ahmad Al-Rajab", "province_ar": "—", "province_en": "—", "phone": "+963 935 964 158", "active": True},
    ],
    "general_note_ar": "بعد التحويل، ارفع صورة إشعار الدفع ليتم تفعيل اشتراكك خلال 24 ساعة.",
    "general_note_en": "After transferring, upload the payment receipt. Your subscription will be activated within 24 hours.",
    "updated_at": None,
}


def _generate_reference_code() -> str:
    year = datetime.now(timezone.utc).strftime("%y")
    rand = uuid.uuid4().hex[:6].upper()
    return f"BH-{year}-{rand}"


def _normalize_wa_digits(phone: str) -> str:
    digits = re.sub(r"\D", "", str(phone or ""))
    if digits.startswith("0") and 9 <= len(digits) <= 11:
        digits = "963" + digits.lstrip("0")
    return digits


def _wa_link(digits: str, message: str) -> Optional[str]:
    if not digits:
        return None
    return f"https://wa.me/{digits}?text={_urlp.quote(message)}"


def build_router(db, require_auth, require_admin, logger=None, sec_extras=None) -> APIRouter:
    """Factory: returns a fully-wired APIRouter. Caller decides prefix.

    sec_extras is the `security_extras` module imported in server.py. If provided
    and web-push is enabled (VAPID keys configured), new subscription orders
    trigger an immediate push notification to every admin who subscribed.
    """
    router = APIRouter(tags=["subscriptions"])

    # ---------- Plans seeding ----------
    async def _seed_default_plans_if_empty():
        count = await db.subscription_plans.count_documents({})
        if count > 0:
            return
        now = datetime.now(timezone.utc).isoformat()
        defaults = [
            {
                "id": str(uuid.uuid4()),
                "country": "Syria", "country_code": "SY", "country_ar": "سوريا",
                "currency": "SYP", "currency_symbol": "ل.س",
                "monthly_price": 250000.0, "yearly_price": None, "free_trial_months": 2,
                "subscribe_url": "",
                "badge_text_ar": "🎉 عرض خاص - أول شهرين مجاناً 🎉",
                "badge_text_en": "🎉 Special Offer - First 2 Months Free 🎉",
                "title_ar": "اشتراك احترافي", "title_en": "Professional Subscription",
                "description_ar": "باقة متكاملة لإدارة صالونك باحترافية عالية",
                "description_en": "Full package to run your salon professionally",
                "features_ar": DEFAULT_PLAN_FEATURES_AR, "features_en": DEFAULT_PLAN_FEATURES_EN,
                "active": True, "created_at": now, "updated_at": now,
            },
            {
                "id": str(uuid.uuid4()),
                "country": "Global", "country_code": "GLOBAL", "country_ar": "عالمي",
                "currency": "USD", "currency_symbol": "$",
                "monthly_price": 20.0, "yearly_price": 200.0, "free_trial_months": 2,
                "subscribe_url": "",
                "badge_text_ar": "🎉 عرض خاص - أول شهرين مجاناً 🎉",
                "badge_text_en": "🎉 Special Offer - First 2 Months Free 🎉",
                "title_ar": "اشتراك احترافي", "title_en": "Professional Subscription",
                "description_ar": "باقة متكاملة لإدارة صالونك باحترافية عالية",
                "description_en": "Full package to run your salon professionally",
                "features_ar": DEFAULT_PLAN_FEATURES_AR, "features_en": DEFAULT_PLAN_FEATURES_EN,
                "active": True, "created_at": now, "updated_at": now,
            },
        ]
        await db.subscription_plans.insert_many(defaults)

    # =====================================================================
    # PLANS
    # =====================================================================
    @router.get("/subscription-plans")
    async def list_subscription_plans(
        country: Optional[str] = None,
        country_code: Optional[str] = None,
        active_only: bool = True,
    ):
        await _seed_default_plans_if_empty()
        query: Dict[str, Any] = {}
        if active_only:
            query["active"] = True
        results: List[Dict] = []
        if country_code:
            results = await db.subscription_plans.find({**query, "country_code": country_code.upper()}, {"_id": 0}).to_list(50)
        if not results and country:
            results = await db.subscription_plans.find({**query, "country": {"$regex": f"^{country}$", "$options": "i"}}, {"_id": 0}).to_list(50)
        if not results and (country or country_code):
            results = await db.subscription_plans.find({**query, "country_code": "GLOBAL"}, {"_id": 0}).to_list(50)
        if not results:
            results = await db.subscription_plans.find(query, {"_id": 0}).sort("country", 1).to_list(200)
        return {"plans": results}

    @router.get("/admin/subscription-plans")
    async def admin_list_subscription_plans(admin: Dict = Depends(require_admin)):
        await _seed_default_plans_if_empty()
        plans = await db.subscription_plans.find({}, {"_id": 0}).sort("country", 1).to_list(500)
        return {"plans": plans}

    @router.post("/admin/subscription-plans")
    async def create_subscription_plan(payload: SubscriptionPlanCreate, admin: Dict = Depends(require_admin)):
        now = datetime.now(timezone.utc).isoformat()
        doc = payload.model_dump()
        doc["id"] = str(uuid.uuid4())
        if doc.get("country_code"):
            doc["country_code"] = doc["country_code"].upper()
        if not doc.get("features_ar"):
            doc["features_ar"] = DEFAULT_PLAN_FEATURES_AR
        if not doc.get("features_en"):
            doc["features_en"] = DEFAULT_PLAN_FEATURES_EN
        doc["created_at"] = now
        doc["updated_at"] = now
        await db.subscription_plans.insert_one(doc)
        doc.pop("_id", None)
        return {"success": True, "plan": doc}

    @router.put("/admin/subscription-plans/{plan_id}")
    async def update_subscription_plan(plan_id: str, payload: SubscriptionPlanUpdate, admin: Dict = Depends(require_admin)):
        updates = {k: v for k, v in payload.model_dump().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        if updates.get("country_code"):
            updates["country_code"] = updates["country_code"].upper()
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = await db.subscription_plans.update_one({"id": plan_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Plan not found")
        plan = await db.subscription_plans.find_one({"id": plan_id}, {"_id": 0})
        return {"success": True, "plan": plan}

    @router.delete("/admin/subscription-plans/{plan_id}")
    async def delete_subscription_plan(plan_id: str, admin: Dict = Depends(require_admin)):
        res = await db.subscription_plans.delete_one({"id": plan_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Plan not found")
        return {"success": True}

    # =====================================================================
    # TRANSFER RECIPIENTS
    # =====================================================================
    @router.get("/transfer-recipients")
    async def get_transfer_recipients():
        doc = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
        if not doc:
            seed = dict(DEFAULT_TRANSFER_RECIPIENTS)
            seed["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.transfer_recipients.insert_one(seed)
            doc = {k: v for k, v in seed.items() if k != "_id"}
        if doc.get("exchanges"):
            doc["exchanges"] = [e for e in doc["exchanges"] if e.get("active", True)]
        return doc

    @router.get("/admin/transfer-recipients")
    async def admin_get_transfer_recipients(admin: Dict = Depends(require_admin)):
        doc = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
        if not doc:
            seed = dict(DEFAULT_TRANSFER_RECIPIENTS)
            seed["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.transfer_recipients.insert_one(seed)
            doc = {k: v for k, v in seed.items() if k != "_id"}
        return doc

    @router.put("/admin/transfer-recipients")
    async def update_transfer_recipients(payload: TransferRecipientsUpdate, admin: Dict = Depends(require_admin)):
        existing = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
        if not existing:
            existing = dict(DEFAULT_TRANSFER_RECIPIENTS)
        updates: Dict[str, Any] = {}
        if payload.syriatel_cash is not None:
            current_sc = existing.get("syriatel_cash") or {}
            sc_update = {k: v for k, v in payload.syriatel_cash.model_dump().items() if v is not None}
            updates["syriatel_cash"] = {**current_sc, **sc_update}
        if payload.exchanges is not None:
            updates["exchanges"] = [e.model_dump() for e in payload.exchanges]
        if payload.general_note_ar is not None:
            updates["general_note_ar"] = payload.general_note_ar
        if payload.general_note_en is not None:
            updates["general_note_en"] = payload.general_note_en
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.transfer_recipients.update_one(
            {"id": "transfer_recipients_singleton"},
            {"$set": updates, "$setOnInsert": {"id": "transfer_recipients_singleton"}},
            upsert=True,
        )
        doc = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
        return {"success": True, "transfer_recipients": doc}

    # =====================================================================
    # SUBSCRIPTION ORDERS
    # =====================================================================
    @router.post("/subscription-orders")
    async def create_subscription_order(
        payload: SubscriptionOrderCreate,
        entity: Dict = Depends(require_auth),
    ):
        # --- Validate receipt image ---
        if not payload.receipt_image or not isinstance(payload.receipt_image, str):
            raise HTTPException(status_code=400, detail="Receipt image is required (base64 data URI)")
        m = re.match(r"^data:image/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$", payload.receipt_image, re.IGNORECASE)
        if not m:
            raise HTTPException(status_code=400, detail="Receipt must be a PNG/JPEG/WEBP data URI")
        try:
            decoded = base64.b64decode(m.group(2), validate=True)
        except Exception:
            raise HTTPException(status_code=400, detail="Receipt image is not valid base64")
        if len(decoded) < 100:
            raise HTTPException(status_code=400, detail="Receipt image is too small or corrupted")
        if len(decoded) > 3 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Receipt image exceeds 3 MB")

        # --- Validate plan ---
        plan = await db.subscription_plans.find_one({"id": payload.plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(status_code=404, detail="Subscription plan not found")

        # --- Validate payment method & billing cycle ---
        if payload.payment_method not in ("syriatel_cash", "exchange"):
            raise HTTPException(status_code=400, detail="payment_method must be 'syriatel_cash' or 'exchange'")
        billing_cycle = (payload.billing_cycle or "monthly").lower()
        if billing_cycle not in ("monthly", "yearly"):
            raise HTTPException(status_code=400, detail="billing_cycle must be 'monthly' or 'yearly'")
        if billing_cycle == "yearly":
            amount = plan.get("yearly_price") or plan.get("monthly_price") or 0
        else:
            amount = plan.get("monthly_price") or 0

        # --- Resolve exchange info if applicable ---
        exchange_info = None
        if payload.payment_method == "exchange":
            if not payload.exchange_id:
                raise HTTPException(status_code=400, detail="exchange_id is required when payment_method is 'exchange'")
            pm = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0}) or {}
            for ex in pm.get("exchanges", []):
                if ex.get("id") == payload.exchange_id:
                    exchange_info = ex
                    break
            if not exchange_info:
                raise HTTPException(status_code=404, detail="Selected exchange not found")

        # --- Salon identification ---
        salon_id = entity.get("id")
        if entity.get("entity_type") == "barbershop":
            salon_name = entity.get("shop_name") or entity.get("name")
        else:
            salon_name = entity.get("name") or entity.get("phone_number")

        now = datetime.now(timezone.utc).isoformat()
        ref_code = _generate_reference_code()
        while await db.subscription_orders.find_one({"reference_code": ref_code}):
            ref_code = _generate_reference_code()

        order_doc = {
            "id": str(uuid.uuid4()),
            "reference_code": ref_code,
            "salon_id": salon_id,
            "salon_name": salon_name,
            "salon_phone": entity.get("phone_number") or entity.get("whatsapp_number") or "",
            "entity_type": entity.get("entity_type"),
            "plan_id": plan.get("id"),
            "plan_title_ar": plan.get("title_ar"),
            "plan_title_en": plan.get("title_en"),
            "country": plan.get("country"),
            "country_code": plan.get("country_code"),
            "currency": plan.get("currency"),
            "currency_symbol": plan.get("currency_symbol"),
            "amount": amount,
            "billing_cycle": billing_cycle,
            "free_trial_months": plan.get("free_trial_months", 0),
            "payment_method": payload.payment_method,
            "exchange_id": payload.exchange_id,
            "exchange_info": exchange_info,
            "reference_number": (payload.reference_number or "").strip(),
            "receipt_image": payload.receipt_image,
            "notes": (payload.notes or "").strip(),
            "status": "pending",
            "admin_notes": None,
            "approved_by": None,
            "approved_at": None,
            "rejected_at": None,
            "activated_until": None,
            "created_at": now,
            "updated_at": now,
        }
        await db.subscription_orders.insert_one(order_doc)

        # WhatsApp admin contact link
        salon_phone = entity.get("phone_number") or entity.get("whatsapp_number") or ""
        wa_digits = _normalize_wa_digits(salon_phone)
        admin_wa_link = _wa_link(
            wa_digits,
            f"مرحباً {salon_name or ''}، وصلنا طلب اشتراك {ref_code} وسنقوم بمراجعته.",
        )

        try:
            await db.admin_notifications.insert_one({
                "id": str(uuid.uuid4()),
                "type": "subscription_order",
                "title": f"طلب اشتراك جديد - {ref_code}",
                "message": f"الصالون {salon_name or '-'} أرسل طلب اشتراك جديد ({plan.get('country') or ''})",
                "entity_id": order_doc["id"],
                "entity_type": "subscription_order",
                "wa_link": admin_wa_link,
                "read": False,
                "created_at": now,
            })
        except Exception:
            pass

        # v3.9.6 — fire web-push to every admin who subscribed to notifications.
        # We DON'T block the request if push fails; silent best-effort.
        try:
            if sec_extras is not None and getattr(sec_extras, "WEBPUSH_OK", False):
                admins = await db.admins.find({}, {"_id": 0, "id": 1}).to_list(50)
                admin_ids = [a["id"] for a in admins if a.get("id")]
                if admin_ids:
                    subs = await db.push_subscriptions.find(
                        {"user_id": {"$in": admin_ids}}, {"_id": 0}
                    ).to_list(200)
                    push_payload = {
                        "title": "💳 BARBER HUB — طلب اشتراك جديد",
                        "body": f"{salon_name or '-'} · {plan.get('country') or ''} · {ref_code}",
                        "icon": "/icons/icon-192.png",
                        "badge": "/icons/badge-72.png",
                        "url": f"/admin?tab=subscription-orders&order={order_doc['id']}",
                        "tag": f"sub-order-{order_doc['id']}",
                    }
                    for s in subs:
                        try:
                            sec_extras.send_web_push(
                                {"endpoint": s.get("endpoint"), "keys": s.get("keys", {})},
                                push_payload,
                            )
                        except Exception as e:
                            if logger is not None:
                                logger.debug(f"push send failed for endpoint {s.get('endpoint','')[:40]}…: {e}")
        except Exception as e:
            if logger is not None:
                logger.debug(f"web-push dispatch skipped: {e}")

        order_doc.pop("_id", None)
        order_doc["admin_wa_link"] = admin_wa_link
        return {"success": True, "order": order_doc, "reference_code": ref_code, "admin_wa_link": admin_wa_link}

    @router.get("/my-subscription-orders")
    async def list_my_subscription_orders(entity: Dict = Depends(require_auth)):
        orders = await db.subscription_orders.find(
            {"salon_id": entity.get("id")}, {"_id": 0, "receipt_image": 0}
        ).sort("created_at", -1).to_list(100)
        return {"orders": orders}

    @router.get("/my-subscription-orders/{order_id}")
    async def get_my_subscription_order(order_id: str, entity: Dict = Depends(require_auth)):
        order = await db.subscription_orders.find_one(
            {"id": order_id, "salon_id": entity.get("id")}, {"_id": 0}
        )
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order

    @router.get("/admin/subscription-orders")
    async def admin_list_subscription_orders(
        admin: Dict = Depends(require_admin),
        status: Optional[str] = Query(None, regex="^(pending|approved|rejected)$"),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
    ):
        query: Dict[str, Any] = {}
        if status:
            query["status"] = status
        orders = await db.subscription_orders.find(
            query, {"_id": 0, "receipt_image": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        for o in orders:
            digits = _normalize_wa_digits(o.get("salon_phone") or "")
            o["admin_wa_link"] = _wa_link(
                digits,
                f"مرحباً {o.get('salon_name') or ''}، بخصوص طلب الاشتراك {o.get('reference_code') or ''}",
            )
        total = await db.subscription_orders.count_documents(query)
        pending_count = await db.subscription_orders.count_documents({"status": "pending"})
        return {"orders": orders, "total": total, "pending_count": pending_count}

    @router.get("/admin/subscription-orders/{order_id}")
    async def admin_get_subscription_order(order_id: str, admin: Dict = Depends(require_admin)):
        order = await db.subscription_orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        digits = _normalize_wa_digits(order.get("salon_phone") or "")
        order["admin_wa_link"] = _wa_link(
            digits,
            f"مرحباً {order.get('salon_name') or ''}، بخصوص طلب الاشتراك {order.get('reference_code') or ''}",
        )
        return order

    @router.post("/admin/subscription-orders/{order_id}/approve")
    async def admin_approve_subscription_order(
        order_id: str,
        payload: SubscriptionOrderAdminAction,
        admin: Dict = Depends(require_admin),
    ):
        order = await db.subscription_orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.get("status") == "approved":
            raise HTTPException(status_code=400, detail="Order is already approved")

        now = datetime.now(timezone.utc)
        cycle = (order.get("billing_cycle") or "monthly").lower()
        default_days = 365 if cycle == "yearly" else 30
        duration_days = payload.duration_days or default_days
        if not payload.duration_days and cycle == "monthly":
            plan = await db.subscription_plans.find_one({"id": order.get("plan_id")}, {"_id": 0}) or {}
            if plan.get("yearly_price") and float(order.get("amount", 0)) >= float(plan["yearly_price"]) * 0.95:
                duration_days = 365

        ft_months = int(order.get("free_trial_months") or 0)
        activated_until = now + timedelta(days=duration_days + (ft_months * 30))

        await db.subscription_orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "approved",
                "admin_notes": payload.admin_notes,
                "approved_by": admin.get("id"),
                "approved_at": now.isoformat(),
                "activated_until": activated_until.isoformat(),
                "updated_at": now.isoformat(),
            }}
        )

        # Activate salon subscription
        salon_id = order.get("salon_id")
        if salon_id and order.get("entity_type") == "barbershop":
            shop = await db.barbershops.find_one({"id": salon_id}, {"_id": 0, "subscription_expiry": 1})
            current_expiry = None
            if shop and shop.get("subscription_expiry"):
                try:
                    current_expiry = datetime.fromisoformat(shop["subscription_expiry"].replace("Z", "+00:00"))
                except Exception:
                    current_expiry = None
            base = current_expiry if current_expiry and current_expiry > now else now
            new_expiry = base + timedelta(days=duration_days + (ft_months * 30))
            await db.barbershops.update_one(
                {"id": salon_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_expiry": new_expiry.isoformat(),
                    "is_verified": True,
                }}
            )
        return {"success": True, "activated_until": activated_until.isoformat()}

    @router.post("/admin/subscription-orders/{order_id}/reject")
    async def admin_reject_subscription_order(
        order_id: str,
        payload: SubscriptionOrderAdminAction,
        admin: Dict = Depends(require_admin),
    ):
        order = await db.subscription_orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        now = datetime.now(timezone.utc).isoformat()
        await db.subscription_orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "rejected",
                "admin_notes": payload.admin_notes or "",
                "approved_by": admin.get("id"),
                "rejected_at": now,
                "updated_at": now,
            }}
        )
        return {"success": True}

    return router
