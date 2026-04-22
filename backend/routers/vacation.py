"""
Vacation / Temporary-Closed toggle router (v3.9.3)

Extracted from server.py to demonstrate the router-split pattern. All v3.9.x
endpoints will follow this shape. The router is built lazily by a factory
function to avoid circular imports with server.py.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel


class VacationToggle(BaseModel):
    is_on_vacation: bool
    vacation_message_ar: Optional[str] = None
    vacation_message_en: Optional[str] = None
    vacation_until: Optional[str] = None  # ISO date (optional — auto-reopen)


def build_router(db, require_barbershop) -> APIRouter:
    """Factory: returns an APIRouter wired to the caller's db + auth dep.
    This avoids importing from server.py (which would create a cycle).
    """
    router = APIRouter(tags=["vacation"])

    @router.post("/barbershop/me/vacation")
    async def toggle_vacation(
        payload: VacationToggle,
        entity: Dict = Depends(require_barbershop),
    ):
        """Salon toggles temporary-closed / vacation mode."""
        now_iso = datetime.now(timezone.utc).isoformat()
        updates: Dict[str, Any] = {
            "is_on_vacation": bool(payload.is_on_vacation),
            "updated_at": now_iso,
        }
        if payload.vacation_message_ar is not None:
            updates["vacation_message_ar"] = payload.vacation_message_ar
        if payload.vacation_message_en is not None:
            updates["vacation_message_en"] = payload.vacation_message_en
        if payload.vacation_until is not None:
            updates["vacation_until"] = payload.vacation_until

        await db.barbershops.update_one({"id": entity.get("id")}, {"$set": updates})
        return {"success": True, "is_on_vacation": updates["is_on_vacation"]}

    return router
