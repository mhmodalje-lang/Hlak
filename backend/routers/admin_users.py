"""
Admin-users + admin-stats router (v3.9.6 split from server.py)

Pattern identical to routers/vacation.py and routers/subscriptions.py:
factory function accepts shared deps and returns an APIRouter.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query


def build_router(db, require_admin) -> APIRouter:
    router = APIRouter(tags=["admin-users"])

    @router.get("/admin/users")
    async def get_admin_users(
        admin: Dict = Depends(require_admin),
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        user_type: Optional[str] = Query(None, regex="^(user|barber|salon)$"),
        search: Optional[str] = None,
    ):
        """Get users (customers + barbershops) for admin dashboard with pagination + filtering."""
        result = []

        user_q: Dict[str, Any] = {}
        shop_q: Dict[str, Any] = {}
        if search:
            safe_search = re.escape(search)
            user_q["$or"] = [
                {"full_name": {"$regex": safe_search, "$options": "i"}},
                {"phone_number": {"$regex": safe_search, "$options": "i"}},
            ]
            shop_q["$or"] = [
                {"shop_name": {"$regex": safe_search, "$options": "i"}},
                {"phone_number": {"$regex": safe_search, "$options": "i"}},
            ]

        if user_type in (None, "user"):
            users = await db.users.find(user_q, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
            for u in users:
                result.append({
                    "id": u["id"],
                    "name": u.get("full_name", ""),
                    "phone": u.get("phone_number", ""),
                    "user_type": "user",
                    "country": u.get("country", ""),
                    "city": u.get("city", ""),
                    "subscription_status": "N/A",
                    "created_at": u.get("created_at", "")
                })

        if user_type in (None, "barber", "salon"):
            if user_type == "barber":
                shop_q["shop_type"] = "male"
            elif user_type == "salon":
                shop_q["shop_type"] = "female"
            shops = await db.barbershops.find(shop_q, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
            for s in shops:
                result.append({
                    "id": s["id"],
                    "name": s.get("shop_name", s.get("owner_name", "")),
                    "phone": s.get("phone_number", ""),
                    "user_type": "barber" if s.get("shop_type") == "male" else "salon",
                    "country": s.get("country", ""),
                    "city": s.get("city", ""),
                    "subscription_status": s.get("subscription_status", "inactive"),
                    "created_at": s.get("created_at", "")
                })

        return result

    @router.get("/admin/stats")
    async def get_admin_stats(admin: Dict = Depends(require_admin)):
        total_users = await db.users.count_documents({})
        total_barbershops = await db.barbershops.count_documents({})
        total_bookings = await db.bookings.count_documents({})
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_bookings = await db.bookings.count_documents({"booking_date": today})
        pending_subs = await db.subscriptions.count_documents({"status": "pending"})
        pending_reports = await db.reports.count_documents({"status": "pending"})
        pending_verification = await db.barbershops.count_documents({"is_verified": False})
        active_subs = await db.barbershops.count_documents({"subscription_status": "active"})

        return {
            "total_users": total_users,
            "total_barbershops": total_barbershops,
            "total_barbers": total_barbershops,
            "total_bookings": total_bookings,
            "today_bookings": today_bookings,
            "pending_subscriptions": pending_subs,
            "pending_reports": pending_reports,
            "pending_verification": pending_verification,
            "active_subscribers": active_subs,
        }

    return router
