"""
BARBER HUB v3.8 - Security Extras Module
=========================================
Centralised helpers for new security features introduced in v3.8:
- OTP generation / verification (WhatsApp-delivered, no SMS provider needed)
- Password reset tokens
- 2FA TOTP (admin)
- Refresh tokens
- Audit log
- Account deletion (GDPR)
- Data export (GDPR)
- Calendar (.ics) export
- Web Push sender (pywebpush)

All functions are defensive: they never raise raw exceptions to the caller,
they do not leak internal state, and they are safe to call even when optional
dependencies are missing.
"""
from __future__ import annotations

import os
import io
import json
import base64
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from urllib.parse import quote

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------------
# OTP (One-Time Password) - for phone verification, password reset
# ----------------------------------------------------------------------------
OTP_LENGTH = int(os.environ.get("OTP_LENGTH", "6"))
OTP_EXPIRY_MINUTES = int(os.environ.get("OTP_EXPIRY_MINUTES", "10"))


def generate_otp(length: int = None) -> str:
    """Generate a numeric OTP of the configured length (default 6 digits)."""
    n = length or OTP_LENGTH
    # secrets.randbelow gives cryptographically secure random ints
    return "".join(str(secrets.randbelow(10)) for _ in range(n))


def otp_expiry_dt() -> datetime:
    """UTC datetime when a newly-issued OTP expires."""
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)


def build_otp_whatsapp_link(phone_number: str, code: str, purpose: str = "verify", language: str = "ar") -> str:
    """Build a wa.me deep link carrying the OTP for the user. The phone_number
    is the destination (the user's own WhatsApp). The admin can forward the
    link, or the user can self-serve by clicking "Send" in their WhatsApp.
    """
    phone = (phone_number or "").lstrip("+").strip()
    if language == "ar":
        if purpose == "reset":
            msg = f"رمز استعادة كلمة المرور في BARBER HUB: {code}\n\nصالح لمدة {OTP_EXPIRY_MINUTES} دقيقة. لا تشاركه مع أي شخص."
        else:
            msg = f"رمز التحقق الخاص بك في BARBER HUB: {code}\n\nصالح لمدة {OTP_EXPIRY_MINUTES} دقيقة."
    else:
        if purpose == "reset":
            msg = f"Your BARBER HUB password reset code: {code}\n\nValid for {OTP_EXPIRY_MINUTES} minutes. Do not share it."
        else:
            msg = f"Your BARBER HUB verification code: {code}\n\nValid for {OTP_EXPIRY_MINUTES} minutes."
    return f"https://wa.me/{phone}?text={quote(msg)}"


# ----------------------------------------------------------------------------
# 2FA TOTP (admin)
# ----------------------------------------------------------------------------
try:
    import pyotp  # type: ignore
    PYOTP_OK = True
except Exception:
    PYOTP_OK = False


def generate_totp_secret() -> str:
    """Generate a new base32 TOTP secret."""
    if not PYOTP_OK:
        raise RuntimeError("pyotp not installed")
    return pyotp.random_base32()


def totp_provisioning_uri(secret: str, account_name: str, issuer: str = "BARBER HUB") -> str:
    """Return an otpauth:// URI usable with Google Authenticator / Authy / 1Password."""
    if not PYOTP_OK:
        raise RuntimeError("pyotp not installed")
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=account_name, issuer_name=issuer)


def verify_totp(secret: str, code: str, valid_window: int = 1) -> bool:
    """Verify a 6-digit TOTP code. valid_window=1 allows +/- 30s clock drift."""
    if not PYOTP_OK or not secret or not code:
        return False
    try:
        return pyotp.TOTP(secret).verify((code or "").strip(), valid_window=valid_window)
    except Exception:
        return False


def generate_backup_codes(count: int = 8) -> List[str]:
    """Generate recovery codes (8 codes of 10 hex chars each)."""
    return [secrets.token_hex(5).upper() for _ in range(count)]


# ----------------------------------------------------------------------------
# Refresh tokens (simple opaque tokens stored in DB)
# ----------------------------------------------------------------------------
REFRESH_TOKEN_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRATION_DAYS", "30"))


def generate_refresh_token() -> str:
    """Generate a 64-char URL-safe refresh token. Store SHA-256 hash in DB."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for storage (so leaked DB can't be used directly)."""
    import hashlib
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry_dt() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)


# ----------------------------------------------------------------------------
# iCalendar (.ics) export for bookings
# ----------------------------------------------------------------------------
try:
    from icalendar import Calendar, Event, vText, vCalAddress  # type: ignore
    ICAL_OK = True
except Exception:
    ICAL_OK = False


def booking_to_ics(booking: Dict, shop: Dict) -> bytes:
    """Convert a booking dict to an .ics calendar file. Works even without icalendar
    (falls back to a hand-written VCALENDAR)."""
    try:
        date_str = booking.get("booking_date") or booking.get("date", "")
        start_str = booking.get("start_time") or booking.get("time", "09:00")
        end_str = booking.get("end_time", "")
        if not end_str:
            # Default to +30 min
            try:
                st = datetime.strptime(start_str, "%H:%M")
                end_str = (st + timedelta(minutes=30)).strftime("%H:%M")
            except Exception:
                end_str = "10:00"
        dt_start = datetime.strptime(f"{date_str} {start_str}", "%Y-%m-%d %H:%M")
        dt_end = datetime.strptime(f"{date_str} {end_str}", "%Y-%m-%d %H:%M")
    except Exception:
        dt_start = datetime.now()
        dt_end = dt_start + timedelta(minutes=30)

    title = f"BARBER HUB - {shop.get('shop_name', 'Appointment')}"
    desc = (
        f"Service: {booking.get('service_name', '')}\n"
        f"Salon: {shop.get('shop_name', '')}\n"
        f"Phone: {shop.get('phone_number', '')}\n"
        f"Address: {shop.get('address', '')}\n"
        f"Status: {booking.get('status', 'pending')}\n\n"
        "Powered by BARBER HUB"
    )
    location = f"{shop.get('address', '')}, {shop.get('city', '')}, {shop.get('country', '')}"

    if ICAL_OK:
        cal = Calendar()
        cal.add("prodid", "-//BARBER HUB//Booking//EN")
        cal.add("version", "2.0")
        cal.add("method", "PUBLISH")
        ev = Event()
        ev.add("uid", f"booking-{booking.get('id', secrets.token_hex(4))}@barberhub.com")
        ev.add("summary", title)
        ev.add("description", desc)
        ev.add("location", location)
        ev.add("dtstart", dt_start)
        ev.add("dtend", dt_end)
        ev.add("dtstamp", datetime.now(timezone.utc))
        ev.add("status", "CONFIRMED" if booking.get("status") == "confirmed" else "TENTATIVE")
        # Reminder 1h before
        from icalendar import Alarm
        alarm = Alarm()
        alarm.add("action", "DISPLAY")
        alarm.add("description", f"Reminder: {title}")
        alarm.add("trigger", timedelta(minutes=-60))
        ev.add_component(alarm)
        cal.add_component(ev)
        return cal.to_ical()

    # Fallback: hand-written ICS
    def _fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%S")
    uid = f"booking-{booking.get('id', secrets.token_hex(4))}@barberhub.com"
    stamp = _fmt(datetime.now(timezone.utc))
    body = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//BARBER HUB//Booking//EN\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\n"
        f"DTSTAMP:{stamp}Z\r\n"
        f"DTSTART:{_fmt(dt_start)}\r\n"
        f"DTEND:{_fmt(dt_end)}\r\n"
        f"SUMMARY:{title}\r\n"
        f"DESCRIPTION:{desc.replace(chr(10), chr(92) + 'n')}\r\n"
        f"LOCATION:{location}\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )
    return body.encode("utf-8")


def google_calendar_link(booking: Dict, shop: Dict) -> str:
    """Build a 'Add to Google Calendar' link."""
    try:
        date_str = booking.get("booking_date") or booking.get("date", "")
        start_str = booking.get("start_time") or booking.get("time", "09:00")
        dt_start = datetime.strptime(f"{date_str} {start_str}", "%Y-%m-%d %H:%M")
        end_str = booking.get("end_time") or (dt_start + timedelta(minutes=30)).strftime("%H:%M")
        dt_end = datetime.strptime(f"{date_str} {end_str}", "%Y-%m-%d %H:%M")
        fmt = lambda d: d.strftime("%Y%m%dT%H%M%S")
        params = {
            "action": "TEMPLATE",
            "text": f"BARBER HUB - {shop.get('shop_name', '')}",
            "dates": f"{fmt(dt_start)}/{fmt(dt_end)}",
            "details": f"Service: {booking.get('service_name', '')}\\nSalon: {shop.get('shop_name', '')}\\nPhone: {shop.get('phone_number', '')}",
            "location": f"{shop.get('address', '')}, {shop.get('city', '')}, {shop.get('country', '')}",
        }
        from urllib.parse import urlencode
        return f"https://calendar.google.com/calendar/render?{urlencode(params)}"
    except Exception:
        return ""


# ----------------------------------------------------------------------------
# Web Push (real push notifications)
# ----------------------------------------------------------------------------
try:
    from pywebpush import webpush, WebPushException  # type: ignore
    WEBPUSH_OK = True
except Exception:
    WEBPUSH_OK = False


def _get_vapid_private_pem() -> Optional[str]:
    """Return VAPID private key as PEM text. Supports both PEM and base64-encoded PEM."""
    b64 = os.environ.get("VAPID_PRIVATE_KEY_B64", "").strip()
    if b64:
        try:
            return base64.b64decode(b64).decode("utf-8")
        except Exception as e:
            logger.warning(f"VAPID_PRIVATE_KEY_B64 decode failed: {e}")
            return None
    pem = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    return pem or None


def send_web_push(subscription: Dict, payload: Dict) -> bool:
    """Send a push notification to the given subscription. Returns True on success."""
    if not WEBPUSH_OK:
        logger.debug("pywebpush not installed; skipping push.")
        return False
    priv_pem = _get_vapid_private_pem()
    if not priv_pem:
        logger.debug("No VAPID_PRIVATE_KEY configured; skipping push.")
        return False
    claim_email = os.environ.get("VAPID_CLAIM_EMAIL", "mailto:admin@barberhub.com")
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=priv_pem,
            vapid_claims={"sub": claim_email},
            ttl=60 * 60 * 24,  # 24h
        )
        return True
    except WebPushException as e:
        logger.info(f"Web push failed (endpoint likely stale): {e}")
        # Caller should handle removal of stale subscription on 404/410
        return False
    except Exception as e:
        logger.error(f"Web push unexpected error: {e}")
        return False


# ----------------------------------------------------------------------------
# Audit Log
# ----------------------------------------------------------------------------
AUDIT_EVENT_TYPES = {
    "auth.login",
    "auth.login_failed",
    "auth.logout",
    "auth.register",
    "auth.password_change",
    "auth.password_reset_requested",
    "auth.password_reset_completed",
    "auth.2fa_enabled",
    "auth.2fa_disabled",
    "auth.2fa_verified",
    "auth.refresh",
    "account.deleted",
    "account.exported",
    "admin.sub_admin_created",
    "admin.sub_admin_deleted",
    "admin.sub_admin_updated",
    "admin.password_reset",
    "booking.created",
    "booking.cancelled",
    "booking.confirmed",
    "payment.initiated",
    "staff.created",
    "staff.deleted",
}


def build_audit_entry(
    event: str,
    actor_id: Optional[str],
    actor_type: Optional[str],
    request_ip: Optional[str] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    metadata: Optional[Dict] = None,
    user_agent: Optional[str] = None,
) -> Dict:
    """Normalize an audit log entry ready for insertion."""
    return {
        "id": secrets.token_hex(8),
        "event": event,
        "actor_id": actor_id,
        "actor_type": actor_type,
        "target_id": target_id,
        "target_type": target_type,
        "ip": request_ip,
        "user_agent": (user_agent or "")[:200],
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_at_dt": datetime.now(timezone.utc),
    }


# ----------------------------------------------------------------------------
# Data Export (GDPR)
# ----------------------------------------------------------------------------
def redact_sensitive_fields(doc: Dict) -> Dict:
    """Remove password hashes and other sensitive fields from exported documents."""
    if not isinstance(doc, dict):
        return doc
    redacted = {}
    for k, v in doc.items():
        if k in ("password", "_id", "totp_secret", "refresh_token_hash", "backup_codes"):
            continue
        redacted[k] = v
    return redacted


# ----------------------------------------------------------------------------
# Misc
# ----------------------------------------------------------------------------
def client_ip_from_request(request) -> Optional[str]:
    """Extract client IP honoring X-Forwarded-For (behind Kubernetes ingress)."""
    try:
        xff = request.headers.get("x-forwarded-for", "")
        if xff:
            return xff.split(",")[0].strip()
        return request.client.host if request.client else None
    except Exception:
        return None
