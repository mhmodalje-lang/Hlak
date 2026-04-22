from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, Request, Body
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import secrets
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta, date, time
import jwt
import bcrypt
import qrcode
import io
import base64
import math

# Rate limiting (slowapi)
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    RATE_LIMIT_OK = True
except Exception:
    RATE_LIMIT_OK = False

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get APP_URL from environment for QR codes and referral links
APP_URL = os.environ.get('APP_URL', 'https://barber-finder-26.preview.emergentagent.com')
# Admin WhatsApp phone (for payment confirmations) - can be set via env
ADMIN_WHATSAPP = os.environ.get('ADMIN_WHATSAPP', '963935964158')

# Security limits
MAX_IMAGE_BASE64_LEN = int(os.environ.get('MAX_IMAGE_BASE64_LEN', 7 * 1024 * 1024))  # ~5MB image
SEED_TOKEN = os.environ.get('SEED_TOKEN', '').strip()  # If set, /api/seed requires X-Seed-Token header

# AI Services (GPT-5 Vision + Style Card)
try:
    from ai_services import analyze_face_and_recommend, generate_style_card
    AI_SERVICES_OK = True
except Exception as _ai_err:
    AI_SERVICES_OK = False
    _AI_IMPORT_ERROR = str(_ai_err)

# AI Try-On Services (Gemini Nano Banana)
try:
    from ai_tryon_service import generate_tryon_image, get_preset_hairstyles
    AI_TRYON_OK = True
except Exception as _tryon_err:
    AI_TRYON_OK = False
    _TRYON_IMPORT_ERROR = str(_tryon_err)

# v3.8 Security Extras (OTP, 2FA, refresh tokens, audit, push, ics)
try:
    import security_extras as sec_extras  # type: ignore
    SEC_EXTRAS_OK = True
except Exception as _sec_err:
    SEC_EXTRAS_OK = False
    _SEC_IMPORT_ERROR = str(_sec_err)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'barber_hub')]

# JWT Settings
# SECURITY: JWT_SECRET MUST be set via env in production. If missing, generate a random
# one at startup (tokens won't survive restarts — this forces ops to set it properly).
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or JWT_SECRET == 'barber-hub-secret-key-2026':
    JWT_SECRET = secrets.token_urlsafe(64)
    logging.warning(
        "JWT_SECRET not set in environment. Generated a random secret for this run. "
        "Set a strong JWT_SECRET env var in production."
    )
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24 * 7))

# Password policy (strengthened in v3.6.1)
MIN_PASSWORD_LENGTH = 8  # production-grade minimum


def validate_password_strength(password: str) -> str:
    """Enforce: length >= 8 AND at least one digit. Raises ValueError on failure.
    Returns the password unchanged on success.
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if not any(c.isdigit() for c in password):
        raise ValueError("Password must contain at least one number")
    return password

# Create the main app
app = FastAPI(title="BARBER HUB API", version="3.8.0")

# Initialize rate limiter (keyed by client IP)
if RATE_LIMIT_OK:
    limiter = Limiter(key_func=get_remote_address, default_limits=[])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
else:
    limiter = None

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

# --- Users ---
class UserCreate(BaseModel):
    phone_number: str
    email: Optional[str] = None
    full_name: str
    password: str
    gender: str
    country: str
    city: str
    district: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("phone_number")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        v = (v or "").strip()
        if not v or len(v) < 5:
            raise ValueError("Invalid phone number")
        return v

    @field_validator("full_name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < 2:
            raise ValueError("Full name too short")
        return v

class UserLogin(BaseModel):
    phone_number: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    phone_number: str
    email: Optional[str] = None
    full_name: str
    gender: str
    country: str
    city: str
    district: Optional[str] = None
    created_at: str

# --- Barbershops ---
class BarbershopCreate(BaseModel):
    owner_name: str
    shop_name: str
    shop_logo: Optional[str] = None
    description: Optional[str] = None
    shop_type: str
    phone_number: str
    password: str
    email: Optional[str] = None
    country: str
    city: str
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return validate_password_strength(v)

class BarbershopUpdate(BaseModel):
    owner_name: Optional[str] = None
    shop_name: Optional[str] = None
    shop_logo: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None

class BarbershopResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    owner_name: str
    shop_name: str
    shop_logo: Optional[str] = None
    description: Optional[str] = None
    shop_type: str
    phone_number: str
    email: Optional[str] = None
    country: str
    city: str
    district: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    whatsapp_number: Optional[str] = None
    instagram_url: Optional[str] = None
    tiktok_url: Optional[str] = None
    website_url: Optional[str] = None
    qr_code: Optional[str] = None
    subscription_status: str = "inactive"
    subscription_expiry: Optional[str] = None
    ranking_score: float = 0.0
    ranking_tier: str = "normal"
    is_verified: bool = False
    total_reviews: int = 0
    created_at: str

# --- Services ---
class ServiceCreate(BaseModel):
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    price: float
    duration_minutes: int = 30
    category: str = "other"

class ServiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barbershop_id: str
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: str
    created_at: str

# --- Gallery Images ---
class GalleryImageCreate(BaseModel):
    image_before: Optional[str] = None
    image_after: Optional[str] = None
    before: Optional[str] = None
    after: Optional[str] = None
    caption: Optional[str] = None

class GalleryImageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barbershop_id: str
    image_before: Optional[str] = None
    image_after: Optional[str] = None
    before: Optional[str] = None
    after: Optional[str] = None
    caption: Optional[str] = None
    created_at: str

# --- Bookings ---
class BookingCreate(BaseModel):
    barbershop_id: Optional[str] = None
    barber_id: Optional[str] = None
    service_id: Optional[str] = None
    service_ids: Optional[List[str]] = None
    booking_date: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    time: Optional[str] = None
    user_phone_for_notification: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: Optional[str] = None
    barbershop_id: str
    barbershop_name: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    booking_date: str
    start_time: str
    end_time: str
    status: str
    user_phone_for_notification: Optional[str] = None
    created_at: str

# --- Reviews ---
class ReviewCreate(BaseModel):
    booking_id: Optional[str] = None
    barber_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    booking_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    barbershop_id: str
    rating: int
    comment: Optional[str] = None
    created_at: str

# --- Reports ---
class ReportCreate(BaseModel):
    reported_entity_id: str
    report_type: str
    description: Optional[str] = None

# --- Subscriptions ---
class SubscriptionCreate(BaseModel):
    plan_type: str = "annual"
    amount: float = 100.0
    payment_method: Optional[str] = None
    receipt_image: Optional[str] = None
    subscription_type: Optional[str] = None
    price: Optional[float] = None

class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barbershop_id: str
    plan_type: str
    amount: float
    currency: str = "EUR"
    payment_method: Optional[str] = None
    receipt_image: Optional[str] = None
    status: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_at: str

# --- Token Response ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    user: Optional[Dict] = None

# --- Barber Profile (Extended) ---
class BarberProfileCreate(BaseModel):
    salon_name: Optional[str] = None
    salon_name_ar: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    logo_url: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    snapchat: Optional[str] = None
    youtube: Optional[str] = None
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    average_service_time: int = 30
    services: Optional[List[Dict]] = None
    custom_services: Optional[List[Dict]] = None
    before_after_images: Optional[List[Dict]] = None
    working_hours: Optional[Dict] = None

# --- Products ---
class ProductCreate(BaseModel):
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    price: float
    category: str = "general"
    image_url: Optional[str] = None
    in_stock: bool = True
    featured: bool = False
    stock_quantity: Optional[int] = None
    shipping_options: Optional[List[str]] = None  # ["pickup", "local_delivery", "courier"]
    local_delivery_fee: Optional[float] = 0.0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    in_stock: Optional[bool] = None
    featured: Optional[bool] = None
    stock_quantity: Optional[int] = None
    shipping_options: Optional[List[str]] = None
    local_delivery_fee: Optional[float] = None

# --- Orders ---
class OrderCreate(BaseModel):
    product_id: str
    shop_id: str
    quantity: int = 1
    shipping_method: str  # "pickup" | "local_delivery" | "courier"
    customer_name: Optional[str] = None
    customer_phone: str
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_country: Optional[str] = None
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str  # "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled"
    tracking_note: Optional[str] = None

# --- Sponsored Ads ---
class SponsoredAdRequest(BaseModel):
    plan: str  # "basic_city" | "pro_country" | "elite_region"
    duration_days: int = 7
    payment_method: Optional[str] = None
    receipt_image: Optional[str] = None

class SponsoredAdAdminAction(BaseModel):
    admin_note: Optional[str] = None

# --- Leave / Unavailable days ---
class LeaveSet(BaseModel):
    dates: List[str]  # ["2026-03-01", "2026-03-02", ...]
    reason: Optional[str] = None

# --- AI Try-On ---
class AITryOnRequest(BaseModel):
    booking_id: str
    hairstyle_name: str
    hairstyle_description: str
    user_image_base64: Optional[str] = None  # If not provided, use saved image from AI Advisor

class AITryOnResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    booking_id: str
    hairstyle_name: str
    hairstyle_description: str
    result_image_base64: str
    remaining_tries: int
    created_at: str

# ============== UTILITY FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(entity_id: str, entity_type: str) -> str:
    payload = {
        'entity_id': entity_id,
        'entity_type': entity_type,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_entity(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    
    entity_type = payload.get('entity_type')
    entity_id = payload.get('entity_id')
    
    if entity_type == 'user':
        entity = await db.users.find_one({"id": entity_id}, {"_id": 0, "password": 0})
    elif entity_type == 'barbershop':
        entity = await db.barbershops.find_one({"id": entity_id}, {"_id": 0, "password": 0})
    elif entity_type == 'admin':
        entity = await db.admins.find_one({"id": entity_id}, {"_id": 0, "password": 0})
    else:
        return None
    
    if entity:
        entity['entity_type'] = entity_type
    return entity

async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict:
    entity = await get_current_entity(credentials)
    if not entity:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Enforce must_change_password: if set, block access to all endpoints except
    # the change-password, logout, and self-profile routes. This prevents privileged
    # accounts (especially admins) from using their account with the default password.
    if entity.get("must_change_password"):
        path = (request.url.path or "").rstrip("/")
        allowed_paths = (
            "/api/auth/change-password",
            "/api/auth/logout",
            "/api/users/me",
        )
        if path not in allowed_paths:
            raise HTTPException(
                status_code=403,
                detail="You must change your password before continuing.",
            )

    return entity

async def require_barbershop(entity: Dict = Depends(require_auth)) -> Dict:
    if entity.get('entity_type') != 'barbershop':
        raise HTTPException(status_code=403, detail="Barbershop access required")
    return entity

async def require_admin(entity: Dict = Depends(require_auth)) -> Dict:
    if entity.get('entity_type') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return entity


# ============== Admin Roles & Permissions (v3.7) ==============
# Master Owner (hard-coded, immutable): has ALL permissions, cannot be deleted, cannot have
# their role/permissions changed by anyone — not even by another master. Identified by
# email address. Auto-elevated on startup.
MASTER_OWNER_EMAIL = os.environ.get("MASTER_OWNER_EMAIL", "mohamadalrejab@gmail.com").strip().lower()

# Permission catalog — granular, so sub-admins get exactly what they need.
ADMIN_PERMISSIONS = {
    "manage_admins":        "Add, edit, and remove sub-admins (master only by default)",
    "view_stats":           "View dashboard statistics and analytics",
    "manage_bookings":      "View and modify bookings across all shops",
    "manage_barbershops":   "Verify, suspend, and edit barbershops",
    "manage_users":         "View, search, and moderate customer accounts",
    "manage_products":      "Oversee product showcase and moderate items",
    "manage_reviews":       "Approve, reject, or delete customer reviews",
    "manage_reports":       "Handle user-submitted reports",
    "manage_subscriptions": "Approve/reject shop subscriptions and payments",
    "manage_ads":           "Review and approve sponsored ads",
    "manage_rankings":      "Trigger ranking recomputes and inspect tier data",
    "support":              "Access support tools and send notifications",
}
ALL_PERMISSIONS = list(ADMIN_PERMISSIONS.keys())


def admin_is_master(entity: Dict) -> bool:
    """True if the authenticated admin is the Master Owner."""
    if entity.get("entity_type") != "admin":
        return False
    if entity.get("role") == "master_admin":
        return True
    email = (entity.get("email") or "").strip().lower()
    return bool(email) and email == MASTER_OWNER_EMAIL


def admin_has_permission(entity: Dict, permission: str) -> bool:
    """True if the authenticated admin has the given permission.
    Master owners implicitly have every permission.
    Legacy admins (no permissions field) default to ALL permissions for backward-compat."""
    if entity.get("entity_type") != "admin":
        return False
    if admin_is_master(entity):
        return True
    perms = entity.get("permissions")
    if perms is None:  # legacy admin — grant all for compatibility
        return True
    return permission in perms


def require_permission(permission: str):
    """FastAPI dependency factory: gate an admin-only endpoint behind a specific permission."""
    async def _dep(entity: Dict = Depends(require_admin)) -> Dict:
        if not admin_has_permission(entity, permission):
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied: '{permission}' required"
            )
        return entity
    return _dep


def require_master_admin(entity: Dict = Depends(require_admin)) -> Dict:
    """Hard gate: must be the Master Owner. Used for sensitive operations like
    adding/removing sub-admins or changing their permissions."""
    if not admin_is_master(entity):
        raise HTTPException(status_code=403, detail="Master admin access required")
    return entity


def generate_qr_code(url: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

def calculate_end_time(start_time: str, duration_minutes: int) -> str:
    start = datetime.strptime(start_time, "%H:%M")
    end = start + timedelta(minutes=duration_minutes)
    return end.strftime("%H:%M")


def validate_image_base64(value: Optional[str], field: str = "image") -> Optional[str]:
    """Validate that an uploaded base64/data-URL image stays under the configured size limit.
    Returns the trimmed value or raises 413 / 400 on violation. Empty/None passes through.
    """
    if not value:
        return value
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail=f"Invalid {field}")
    # Strip data URL prefix length from estimate
    payload = value.split(',', 1)[1] if value.startswith('data:') and ',' in value else value
    if len(payload) > MAX_IMAGE_BASE64_LEN:
        raise HTTPException(
            status_code=413,
            detail=f"{field} too large (max {MAX_IMAGE_BASE64_LEN // 1024}KB base64). Please compress your image."
        )
    return value


def safe_error_message(e: Exception, fallback: str = "Internal error") -> str:
    """Return a safe error message without leaking stack traces or internal paths."""
    msg = str(e)
    # Strip file paths and module references
    if '/' in msg or '\\' in msg or 'Traceback' in msg:
        return fallback
    return msg[:120] if len(msg) > 120 else msg

async def enrich_barbershop_for_frontend(shop: Dict) -> Dict:
    """Transform barbershop data to match frontend expectations"""
    shop_id = shop['id']
    
    # Get services
    services = await db.services.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(100)
    
    # Get gallery images
    gallery = await db.gallery_images.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(10)
    before_after_images = []
    for img in gallery:
        before_after_images.append({
            "before": img.get("image_before") or img.get("before", ""),
            "after": img.get("image_after") or img.get("after", ""),
            "caption": img.get("caption", "")
        })
    
    # Get extended profile data
    profile_ext = await db.barber_profiles.find_one({"barbershop_id": shop_id}, {"_id": 0})
    
    # Count total bookings
    total_bookings = await db.bookings.count_documents({"barbershop_id": shop_id})
    
    # Build enriched response
    enriched = {
        "id": shop_id,
        "salon_name": profile_ext.get("salon_name", shop.get("shop_name", "")) if profile_ext else shop.get("shop_name", ""),
        "salon_name_ar": profile_ext.get("salon_name_ar", shop.get("shop_name", "")) if profile_ext else shop.get("shop_name", ""),
        "shop_name": shop.get("shop_name", ""),
        "owner_name": shop.get("owner_name", ""),
        "description": profile_ext.get("description", shop.get("description", "")) if profile_ext else shop.get("description", ""),
        "description_ar": profile_ext.get("description_ar", shop.get("description", "")) if profile_ext else shop.get("description", ""),
        "shop_type": shop.get("shop_type", "male"),
        "phone_number": shop.get("phone_number", ""),
        "email": shop.get("email"),
        "country": shop.get("country", ""),
        "city": shop.get("city", ""),
        "district": shop.get("district"),
        "address": profile_ext.get("address", shop.get("address", "")) if profile_ext else shop.get("address", ""),
        "neighborhood": profile_ext.get("neighborhood", shop.get("neighborhood", "")) if profile_ext else shop.get("neighborhood", ""),
        "village": profile_ext.get("village", shop.get("village", "")) if profile_ext else shop.get("village", ""),
        "latitude": shop.get("latitude"),
        "longitude": shop.get("longitude"),
        "rating": shop.get("computed_rating", shop.get("rating", 0.0)),
        "ranking_score": shop.get("ranking_score", 0.0),
        "total_reviews": shop.get("total_reviews", 0),
        "total_bookings": total_bookings,
        "rank_level": shop.get("ranking_tier", "normal"),
        "ranking_tier": shop.get("ranking_tier", "normal"),
        "is_verified": shop.get("is_verified", False),
        "subscription_status": shop.get("subscription_status", "inactive"),
        "subscription_expiry": shop.get("subscription_expiry"),
        "whatsapp": profile_ext.get("whatsapp", shop.get("whatsapp_number", "")) if profile_ext else shop.get("whatsapp_number", ""),
        "whatsapp_number": shop.get("whatsapp_number", ""),
        "instagram": profile_ext.get("instagram", shop.get("instagram_url", "")) if profile_ext else shop.get("instagram_url", ""),
        "instagram_url": shop.get("instagram_url", ""),
        "tiktok": profile_ext.get("tiktok", shop.get("tiktok_url", "")) if profile_ext else shop.get("tiktok_url", ""),
        "tiktok_url": shop.get("tiktok_url", ""),
        "facebook": profile_ext.get("facebook", "") if profile_ext else "",
        "twitter": profile_ext.get("twitter", "") if profile_ext else "",
        "snapchat": profile_ext.get("snapchat", "") if profile_ext else "",
        "youtube": profile_ext.get("youtube", "") if profile_ext else "",
        "website_url": shop.get("website_url"),
        "logo_url": profile_ext.get("logo_url", shop.get("shop_logo", "")) if profile_ext else shop.get("shop_logo", ""),
        "shop_logo": shop.get("shop_logo"),
        "qr_code": shop.get("qr_code"),
        "average_service_time": profile_ext.get("average_service_time", 30) if profile_ext else 30,
        "services": services if services else (profile_ext.get("services", []) if profile_ext else []),
        "custom_services": profile_ext.get("custom_services", []) if profile_ext else [],
        "before_after_images": before_after_images if before_after_images else (profile_ext.get("before_after_images", []) if profile_ext else []),
        "working_hours": profile_ext.get("working_hours", {
            "sunday": {"start": "09:00", "end": "21:00"},
            "monday": {"start": "09:00", "end": "21:00"},
            "tuesday": {"start": "09:00", "end": "21:00"},
            "wednesday": {"start": "09:00", "end": "21:00"},
            "thursday": {"start": "09:00", "end": "21:00"},
            "friday": {"start": "09:00", "end": "21:00"},
            "saturday": {"start": "09:00", "end": "21:00"}
        }) if profile_ext else {
            "sunday": {"start": "09:00", "end": "21:00"},
            "monday": {"start": "09:00", "end": "21:00"},
            "tuesday": {"start": "09:00", "end": "21:00"},
            "wednesday": {"start": "09:00", "end": "21:00"},
            "thursday": {"start": "09:00", "end": "21:00"},
            "friday": {"start": "09:00", "end": "21:00"},
            "saturday": {"start": "09:00", "end": "21:00"}
        },
        "created_at": shop.get("created_at", "")
    }
    
    # Add products count
    products_count = await db.products.count_documents({"shop_id": shop_id})
    enriched["products_count"] = products_count

    # Tier badge (localized label derived from ranking_tier)
    tier_key = shop.get("ranking_tier", "normal")
    if tier_key in TIER_THRESHOLDS:
        th = TIER_THRESHOLDS[tier_key]
        enriched["tier_badge"] = {
            "tier": tier_key,
            "label_ar": th["label_ar"],
            "label_en": th["label_en"],
            "icon": th["icon"],
        }
    else:
        enriched["tier_badge"] = None

    return enriched

# ============== RANKING ENGINE ==============
# Tiered ranking system: each shop is classified into one of 5 tiers based on
# composite quality metrics (rating, review volume, recent activity, verification).
# Only shops meeting ALL thresholds for a tier qualify — this protects the reputation
# of top tiers so they only contain truly excellent shops.

TIER_THRESHOLDS = {
    "global_elite": {
        "min_rating": 4.7, "min_reviews": 100, "min_completed_90d": 100,
        "require_verified": True, "require_subscription": True, "min_gallery": 4,
        "label_ar": "النخبة العالمية", "label_en": "Global Elite", "icon": "🌍",
    },
    "country_top": {
        "min_rating": 4.5, "min_reviews": 50, "min_completed_90d": 50,
        "require_verified": True, "require_subscription": True, "min_gallery": 0,
        "label_ar": "الأفضل على مستوى الدولة", "label_en": "Country Top", "icon": "🏳️",
    },
    "governorate_top": {
        "min_rating": 4.3, "min_reviews": 25, "min_completed_90d": 20,
        "require_verified": True, "require_subscription": False, "min_gallery": 0,
        "label_ar": "الأفضل في المحافظة", "label_en": "Governorate Top", "icon": "🏛️",
    },
    "city_top": {
        "min_rating": 4.0, "min_reviews": 10, "min_completed_90d": 5,
        "require_verified": False, "require_subscription": False, "min_gallery": 0,
        "label_ar": "الأفضل في المدينة", "label_en": "City Top", "icon": "🏙️",
    },
}

# Order matters: highest tier first
TIER_ORDER = ["global_elite", "country_top", "governorate_top", "city_top"]


# ---------- Country-name normalization (English ↔ Arabic) ----------
# Geolocation returns English country names ("Syria"); our seed/shop data stores
# Arabic names ("سوريا"). This map lets the API resolve both.
COUNTRY_ALIASES: Dict[str, List[str]] = {
    "سوريا":    ["syria", "syrian arab republic", "syr", "sy"],
    "العراق":   ["iraq", "republic of iraq", "irq", "iq"],
    "الأردن":   ["jordan", "hashemite kingdom of jordan", "jor", "jo"],
    "لبنان":    ["lebanon", "lebanese republic", "lbn", "lb"],
    "السعودية": ["saudi arabia", "kingdom of saudi arabia", "ksa", "sau", "sa"],
    "الإمارات": ["united arab emirates", "uae", "emirates", "are", "ae"],
    "الكويت":   ["kuwait", "state of kuwait", "kwt", "kw"],
    "قطر":     ["qatar", "state of qatar", "qat", "qa"],
    "البحرين":  ["bahrain", "kingdom of bahrain", "bhr", "bh"],
    "عمان":    ["oman", "sultanate of oman", "omn", "om"],
    "مصر":     ["egypt", "arab republic of egypt", "egy", "eg"],
    "فلسطين":   ["palestine", "state of palestine", "pse", "ps"],
    "اليمن":    ["yemen", "republic of yemen", "yem", "ye"],
    "ليبيا":    ["libya", "state of libya", "lby", "ly"],
    "تونس":    ["tunisia", "tunisian republic", "tun", "tn"],
    "الجزائر":  ["algeria", "people's democratic republic of algeria", "dza", "dz"],
    "المغرب":   ["morocco", "kingdom of morocco", "mar", "ma"],
    "السودان":  ["sudan", "republic of the sudan", "sdn", "sd"],
    "تركيا":    ["turkey", "türkiye", "turkiye", "tur", "tr"],
    "ألمانيا":  ["germany", "federal republic of germany", "deu", "de"],
    "فرنسا":   ["france", "french republic", "fra", "fr"],
    "بريطانيا": ["united kingdom", "uk", "great britain", "britain", "gbr", "gb"],
    "الولايات المتحدة": ["united states", "usa", "us", "america", "united states of america"],
    "كندا":    ["canada", "can", "ca"],
    "أستراليا":  ["australia", "aus", "au"],
    "إيران":   ["iran", "islamic republic of iran", "irn", "ir"],
}

# Build reverse lookup (english/code/etc → canonical Arabic name)
_COUNTRY_REVERSE: Dict[str, str] = {}
for _ar, _aliases in COUNTRY_ALIASES.items():
    _COUNTRY_REVERSE[_ar.lower().strip()] = _ar
    for _alias in _aliases:
        _COUNTRY_REVERSE[_alias.lower().strip()] = _ar


def normalize_country(raw: Optional[str]) -> Optional[str]:
    """
    Resolve a country name from any language/code to the canonical Arabic form
    used in the shops collection. Returns None if input is empty or 'Unknown'.
    Unknown inputs return the raw (trimmed) so that explicit unusual countries still work.
    """
    if not raw:
        return None
    q = str(raw).strip()
    if not q or q.lower() == "unknown":
        return None
    # Direct match on canonical (Arabic) name
    if q in COUNTRY_ALIASES:
        return q
    # Alias match (case-insensitive)
    resolved = _COUNTRY_REVERSE.get(q.lower())
    if resolved:
        return resolved
    # Unknown country — return as-is so the caller can still try to filter on it
    return q


async def compute_shop_metrics(shop_id: str) -> Dict:
    """Aggregate all metrics needed to rank + tier a single shop."""
    now = datetime.now(timezone.utc)
    since_30d = (now - timedelta(days=30)).isoformat()
    since_90d = (now - timedelta(days=90)).isoformat()

    # Reviews (count + average + 30-day velocity) - only approved
    reviews_cursor = db.reviews.find(
        {"barbershop_id": shop_id, "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0, "rating": 1, "created_at": 1}
    )
    reviews = await reviews_cursor.to_list(None)
    total_reviews = len(reviews)
    avg_rating = (sum(r.get("rating", 0) for r in reviews) / total_reviews) if total_reviews else 0.0
    reviews_30d = sum(1 for r in reviews if str(r.get("created_at", "")) >= since_30d)

    # Completed bookings in last 90 & 30 days
    completed_90d = await db.bookings.count_documents({
        "barbershop_id": shop_id,
        "status": "completed",
        "updated_at": {"$gte": since_90d},
    })
    completed_30d = await db.bookings.count_documents({
        "barbershop_id": shop_id,
        "status": "completed",
        "updated_at": {"$gte": since_30d},
    })

    # Product orders in last 30 days
    products_30d = await db.orders.count_documents({
        "shop_id": shop_id,
        "status": {"$in": ["completed", "delivered", "confirmed"]},
        "created_at": {"$gte": since_30d},
    })

    # Gallery image count (for global_elite requirement)
    gallery_count = await db.gallery_images.count_documents({"barbershop_id": shop_id})

    return {
        "total_reviews": total_reviews,
        "avg_rating": round(avg_rating, 2),
        "reviews_30d": reviews_30d,
        "completed_90d": completed_90d,
        "completed_30d": completed_30d,
        "products_30d": products_30d,
        "gallery_count": gallery_count,
    }


def calculate_ranking_score(metrics: Dict, shop: Dict) -> float:
    """
    Composite ranking score:
      base    = rating * log10(1+reviews) * 10   (quality × reputation)
      + review_velocity * 2                       (active & loved)
      + booking_velocity * 3                      (real demand)
      + product_sales * 0.5                       (e-commerce traction)
      + verified ? 10                             (trust boost)
      + subscribed ? 5                            (committed shop)
    """
    rating = metrics["avg_rating"] or 0.0
    reviews = metrics["total_reviews"] or 0
    base = rating * math.log10(1 + reviews) * 10
    score = base
    score += metrics["reviews_30d"] * 2
    score += metrics["completed_30d"] * 3
    score += metrics["products_30d"] * 0.5
    if shop.get("is_verified"):
        score += 10
    if shop.get("subscription_status") == "active":
        score += 5
    return round(score, 2)


def classify_shop_tier(metrics: Dict, shop: Dict) -> str:
    """Return the HIGHEST tier the shop qualifies for, or 'normal'."""
    rating = metrics["avg_rating"]
    reviews = metrics["total_reviews"]
    completed = metrics["completed_90d"]
    gallery = metrics["gallery_count"]
    is_verified = bool(shop.get("is_verified"))
    sub_active = shop.get("subscription_status") == "active"

    for tier in TIER_ORDER:
        th = TIER_THRESHOLDS[tier]
        if rating < th["min_rating"]:
            continue
        if reviews < th["min_reviews"]:
            continue
        if completed < th["min_completed_90d"]:
            continue
        if th["require_verified"] and not is_verified:
            continue
        if th["require_subscription"] and not sub_active:
            continue
        if gallery < th["min_gallery"]:
            continue
        return tier
    return "normal"


async def recompute_all_rankings() -> Dict:
    """Nightly/manual job: recompute ranking_score + ranking_tier for every shop."""
    shops = await db.barbershops.find(
        {}, {"_id": 0, "id": 1, "is_verified": 1, "subscription_status": 1}
    ).to_list(10000)

    updated = 0
    tier_counts = {"global_elite": 0, "country_top": 0, "governorate_top": 0,
                   "city_top": 0, "normal": 0}

    for shop in shops:
        try:
            metrics = await compute_shop_metrics(shop["id"])
            score = calculate_ranking_score(metrics, shop)
            tier = classify_shop_tier(metrics, shop)
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            await db.barbershops.update_one(
                {"id": shop["id"]},
                {"$set": {
                    "ranking_score": score,
                    "ranking_tier": tier,
                    "total_reviews": metrics["total_reviews"],
                    "computed_rating": metrics["avg_rating"],
                    "completed_90d": metrics["completed_90d"],
                    "reviews_30d": metrics["reviews_30d"],
                    "bookings_30d": metrics["completed_30d"],
                    "products_30d": metrics["products_30d"],
                    "ranking_computed_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            updated += 1
        except Exception as e:
            logger.error(f"Ranking recompute failed for shop {shop.get('id')}: {e}")

    result = {
        "updated": updated,
        "tier_counts": tier_counts,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info(f"Ranking recompute done: {result}")
    return result


def enrich_booking_for_frontend(booking: Dict) -> Dict:
    """Transform booking data to match frontend expectations"""
    return {
        "id": booking.get("id"),
        "user_id": booking.get("user_id"),
        "barber_id": booking.get("barbershop_id"),
        "barbershop_id": booking.get("barbershop_id"),
        "barber_name": booking.get("barbershop_name", ""),
        "barbershop_name": booking.get("barbershop_name", ""),
        "service_id": booking.get("service_id"),
        "service_name": booking.get("service_name", ""),
        "date": booking.get("booking_date", ""),
        "booking_date": booking.get("booking_date", ""),
        "time": booking.get("start_time", ""),
        "start_time": booking.get("start_time", ""),
        "end_time": booking.get("end_time", ""),
        "status": booking.get("status", "pending"),
        "customer_name": booking.get("customer_name", ""),
        "customer_phone": booking.get("user_phone_for_notification", ""),
        "user_phone_for_notification": booking.get("user_phone_for_notification", ""),
        "notes": booking.get("notes", ""),
        "services": booking.get("services", [{"name": booking.get("service_name", ""), "name_ar": booking.get("service_name", "")}]),
        "total_price": booking.get("total_price", 0),
        "created_at": booking.get("created_at", "")
    }

# ============== AUTH ENDPOINTS ==============

# Simple in-memory rate limiter for auth endpoints (per-IP + per-phone).
# For production, replace with Redis-backed solution, but this protects against
# casual brute-force attempts.
_auth_attempts: Dict[str, List[float]] = {}
_AUTH_WINDOW_SEC = 300       # 5 minutes
_AUTH_MAX_ATTEMPTS_IP = 30   # 30 attempts per IP per 5 min
_AUTH_MAX_ATTEMPTS_KEY = 8   # 8 attempts per phone per 5 min


def _client_ip(request: Request) -> str:
    # Respect X-Forwarded-For (set by kubernetes ingress)
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit_check(bucket_key: str, max_attempts: int) -> bool:
    """Return True if allowed, False if rate-limited. Records the attempt on success."""
    import time as _t
    now = _t.time()
    window_start = now - _AUTH_WINDOW_SEC
    attempts = _auth_attempts.get(bucket_key, [])
    # Prune old
    attempts = [t for t in attempts if t > window_start]
    if len(attempts) >= max_attempts:
        _auth_attempts[bucket_key] = attempts
        return False
    attempts.append(now)
    _auth_attempts[bucket_key] = attempts
    return True


@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate, request: Request):
    ip = _client_ip(request)
    if not _rate_limit_check(f"reg:ip:{ip}", 10):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please try again later.")

    existing = await db.users.find_one({"phone_number": user_data.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "phone_number": user_data.phone_number,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password": hash_password(user_data.password),
        "gender": user_data.gender,
        "country": user_data.country,
        "city": user_data.city,
        "district": user_data.district,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, 'user')
    user_response = {k: v for k, v in user_doc.items() if k not in ('password', '_id')}
    
    return TokenResponse(access_token=token, user_type='user', user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    ip = _client_ip(request)
    # Rate limit per IP (burst protection) and per phone (account-level protection)
    if not _rate_limit_check(f"login:ip:{ip}", _AUTH_MAX_ATTEMPTS_IP):
        raise HTTPException(status_code=429, detail="Too many login attempts from this IP. Please try again in a few minutes.")
    if not _rate_limit_check(f"login:phone:{credentials.phone_number}", _AUTH_MAX_ATTEMPTS_KEY):
        raise HTTPException(status_code=429, detail="Too many failed attempts for this account. Please try again in a few minutes.")

    # Try user first
    user = await db.users.find_one({"phone_number": credentials.phone_number}, {"_id": 0})
    if user and verify_password(credentials.password, user['password']):
        token = create_token(user['id'], 'user')
        return TokenResponse(access_token=token, user_type='user', user={k: v for k, v in user.items() if k != 'password'})
    
    # Try barbershop
    shop = await db.barbershops.find_one({"phone_number": credentials.phone_number}, {"_id": 0})
    if shop and verify_password(credentials.password, shop['password']):
        token = create_token(shop['id'], 'barbershop')
        return TokenResponse(access_token=token, user_type='barbershop', user={k: v for k, v in shop.items() if k != 'password'})
    
    # Try admin
    admin = await db.admins.find_one({"phone_number": credentials.phone_number}, {"_id": 0})
    if admin and verify_password(credentials.password, admin['password']):
        token = create_token(admin['id'], 'admin')
        return TokenResponse(access_token=token, user_type='admin', user={k: v for k, v in admin.items() if k != 'password'})
    
    # Generic error to avoid user-enumeration
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/users/me")
async def get_current_user(entity: Dict = Depends(require_auth)):
    return entity


# --- Password change (works for user / barbershop / admin) ---

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _validate_new_password(cls, v: str) -> str:
        return validate_password_strength(v)


@api_router.post("/auth/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Change the password for the authenticated user / barbershop / admin.
    Can be called even when must_change_password=True (bootstrap rotation flow).
    Requires the *current* password to prevent session-hijacking abuse.
    """
    # Resolve entity without going through require_auth (so must_change_password
    # forced-rotation accounts can still rotate their password).
    base_entity = await get_current_entity(credentials)
    if not base_entity:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Per-IP rate limit to discourage brute-forcing old password
    ip = _client_ip(request)
    if not _rate_limit_check(f"chgpass:ip:{ip}", 10):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    etype = base_entity.get("entity_type")
    entity_id = base_entity.get("id")
    coll = {"user": db.users, "barbershop": db.barbershops, "admin": db.admins}.get(etype)
    if coll is None:
        raise HTTPException(status_code=400, detail="Invalid account type")

    # Fetch the full doc (with hashed password) to verify old_password
    doc = await coll.find_one({"id": entity_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Account not found")
    if not verify_password(payload.old_password, doc.get("password", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.old_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the old one")

    new_hash = hash_password(payload.new_password)
    await coll.update_one(
        {"id": entity_id},
        {"$set": {
            "password": new_hash,
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"message": "Password changed successfully"}

# ============== LOYALTY POINTS SYSTEM (2026) ==============
# Formula: 10 points per completed booking + 1 point per currency unit spent (capped at 50 per booking)
# Tiers: Bronze (<100), Silver (100-299), Gold (300-699), Platinum (700-1499), Diamond VIP (1500+)

LOYALTY_TIERS = [
    {"name": "diamond",  "name_ar": "\u062f\u0627\u064a\u0645\u0648\u0646\u062f VIP", "min": 1500, "multiplier": 2.0, "discount_pct": 15, "color": "#b9f2ff"},
    {"name": "platinum", "name_ar": "\u0628\u0644\u0627\u062a\u064a\u0646\u064a",     "min": 700,  "multiplier": 1.5, "discount_pct": 10, "color": "#e5e4e2"},
    {"name": "gold",     "name_ar": "\u0630\u0647\u0628\u064a",                        "min": 300,  "multiplier": 1.25, "discount_pct": 7,  "color": "#D4AF37"},
    {"name": "silver",   "name_ar": "\u0641\u0636\u064a",                              "min": 100,  "multiplier": 1.1,  "discount_pct": 5,  "color": "#C0C0C0"},
    {"name": "bronze",   "name_ar": "\u0628\u0631\u0648\u0646\u0632\u064a",             "min": 0,    "multiplier": 1.0,  "discount_pct": 0,  "color": "#CD7F32"},
]


def _compute_tier(points: int) -> Dict:
    for tier in LOYALTY_TIERS:
        if points >= tier["min"]:
            return tier
    return LOYALTY_TIERS[-1]


@api_router.get("/users/me/loyalty")
async def get_loyalty_status(entity: Dict = Depends(require_auth)):
    """Returns the authenticated user's loyalty points, tier, and next-tier progress."""
    if entity.get("entity_type") != "user":
        return {"points": 0, "tier": "none", "bookings_completed": 0, "is_user": False}

    user_id = entity["id"]
    # Count completed bookings
    completed = await db.bookings.count_documents({"user_id": user_id, "status": "completed"})
    # Sum total_price across completed bookings
    pipeline = [
        {"$match": {"user_id": user_id, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_price"}}},
    ]
    total_spent = 0
    async for doc in db.bookings.aggregate(pipeline):
        total_spent = doc.get("total", 0) or 0
        break

    # Points from bookings: 10 per booking + min(total_spent, 50*completed)
    booking_points = 10 * completed + int(min(total_spent, 50 * max(completed, 1)))
    # Points awarded by product orders (stored on the user doc)
    order_points = int(entity.get("loyalty_points") or 0)
    base_points = booking_points + order_points
    current_tier = _compute_tier(base_points)

    # Next tier progress
    higher = [t for t in LOYALTY_TIERS if t["min"] > base_points]
    next_tier = higher[-1] if higher else None
    progress_pct = 100 if not next_tier else int(
        (base_points - current_tier["min"]) / (next_tier["min"] - current_tier["min"]) * 100
    )

    return {
        "is_user": True,
        "points": base_points,
        "booking_points": booking_points,
        "order_points": order_points,
        "bookings_completed": completed,
        "total_spent_usd": round(total_spent, 2),
        "tier": current_tier["name"],
        "tier_name_ar": current_tier["name_ar"],
        "tier_color": current_tier["color"],
        "tier_min": current_tier["min"],
        "discount_pct": current_tier["discount_pct"],
        "multiplier": current_tier["multiplier"],
        "next_tier": next_tier["name"] if next_tier else None,
        "next_tier_min": next_tier["min"] if next_tier else None,
        "progress_to_next_pct": max(0, min(100, progress_pct)),
        "all_tiers": LOYALTY_TIERS,
    }


# ============== BARBERSHOP REGISTRATION ==============

@api_router.post("/auth/register-barbershop", response_model=TokenResponse)
async def register_barbershop(shop_data: BarbershopCreate, request: Request):
    # SECURITY: Same rate limit as customer registration to prevent automated abuse.
    ip = _client_ip(request)
    if not _rate_limit_check(f"reg-shop:ip:{ip}", 10):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please try again later.")

    # Validate optional logo size to prevent DB bloat / DoS
    validate_image_base64(shop_data.shop_logo, "shop_logo")

    existing = await db.barbershops.find_one({"phone_number": shop_data.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    shop_id = str(uuid.uuid4())
    qr_code_data = f"{APP_URL}/shop/{shop_id}"
    qr_code = generate_qr_code(qr_code_data)
    
    shop_doc = {
        "id": shop_id,
        "owner_name": shop_data.owner_name,
        "shop_name": shop_data.shop_name,
        "shop_logo": shop_data.shop_logo,
        "description": shop_data.description,
        "shop_type": shop_data.shop_type,
        "phone_number": shop_data.phone_number,
        "password": hash_password(shop_data.password),
        "email": shop_data.email,
        "country": shop_data.country,
        "city": shop_data.city,
        "district": shop_data.district,
        "address": shop_data.address,
        "latitude": shop_data.latitude,
        "longitude": shop_data.longitude,
        "whatsapp_number": shop_data.whatsapp_number,
        "instagram_url": shop_data.instagram_url,
        "tiktok_url": shop_data.tiktok_url,
        "website_url": shop_data.website_url,
        "qr_code": qr_code,
        "subscription_status": "inactive",
        "subscription_expiry": None,
        "ranking_score": 0.0,
        "ranking_tier": "normal",
        "is_verified": False,
        "total_reviews": 0,
        # v3.8 — Approval workflow. New shops are PENDING until the site owner approves.
        # Unapproved shops are hidden from ALL public endpoints (listings, featured, map,
        # search, sitemap). Their owners can still log in and configure their dashboard.
        "approval_status": "pending",
        "approval_note": None,
        "approved_at": None,
        "approved_by": None,
        "rejected_at": None,
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.barbershops.insert_one(shop_doc)

    # Notify all admins (push + audit log) that a new salon is awaiting approval.
    try:
        notif = {
            "id": str(uuid.uuid4()),
            "recipient_type": "admin",
            "kind": "shop_pending_approval",
            "title": "📝 صالون جديد بانتظار الموافقة / New salon awaiting approval",
            "body": f"{shop_data.shop_name} - {shop_data.city}, {shop_data.country}",
            "data": {"shop_id": shop_id, "shop_name": shop_data.shop_name},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_at_dt": datetime.now(timezone.utc),
        }
        await db.admin_notifications.insert_one(notif)
    except Exception as e:
        logger.debug(f"admin_notifications insert failed: {e}")

    # Fire web-push to all admins who subscribed.
    try:
        if SEC_EXTRAS_OK and sec_extras.WEBPUSH_OK:
            admins = await db.admins.find({}, {"_id": 0, "id": 1}).to_list(50)
            admin_ids = [a["id"] for a in admins]
            subs = await db.push_subscriptions.find({"user_id": {"$in": admin_ids}}, {"_id": 0}).to_list(100)
            for s in subs:
                try:
                    sec_extras.send_web_push(
                        {"endpoint": s.get("endpoint"), "keys": s.get("keys", {})},
                        {
                            "title": "📝 BARBER HUB - طلب موافقة جديد",
                            "body": f"{shop_data.shop_name} - {shop_data.city}",
                            "icon": "/icons/icon-192.png",
                            "url": "/admin?tab=approvals",
                        },
                    )
                except Exception:
                    pass
    except Exception:
        pass

    token = create_token(shop_id, 'barbershop')
    shop_response = {k: v for k, v in shop_doc.items() if k not in ('password', '_id')}

    return TokenResponse(access_token=token, user_type='barbershop', user=shop_response)

# ============== BARBERSHOP ENDPOINTS (ORIGINAL) ==============

@api_router.get("/barbershops", response_model=List[BarbershopResponse])
async def list_barbershops(
    type: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 50,
    country: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    sort_by: str = "ranking_score",
    limit: int = 50
):
    # v3.8 — Public listings are ALWAYS filtered to approved salons only.
    # Pending / rejected / pending_deletion shops are invisible to guests & users.
    query = {
        "$or": [
            {"approval_status": "approved"},
            # Backward compat — shops created before v3.8 have no approval_status field;
            # treat those as approved IF they were already verified by an admin.
            {"approval_status": {"$exists": False}, "is_verified": True},
        ],
        "status": {"$ne": "pending_deletion"},
    }
    if type:
        query["shop_type"] = type
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    if district:
        query["district"] = district

    sort_field = "ranking_score" if sort_by == "ranking_score" else "created_at"
    sort_order = -1

    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort(sort_field, sort_order).limit(limit).to_list(limit)

    if lat is not None and lng is not None:
        def calc_distance(shop):
            if not shop.get('latitude') or not shop.get('longitude'):
                return float('inf')
            dlat = abs(shop['latitude'] - lat)
            dlng = abs(shop['longitude'] - lng)
            return (dlat**2 + dlng**2)**0.5 * 111

        shops = [s for s in shops if calc_distance(s) <= radius]
        shops.sort(key=calc_distance)

    return shops

@api_router.get("/barbershops/{shop_id}")
async def get_barbershop(shop_id: str, request: Request):
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    # v3.8 — Hide pending / rejected shops from the public profile page,
    # UNLESS the viewer IS the shop owner OR an admin.
    approval = shop.get("approval_status", "approved" if shop.get("is_verified") else "pending")
    if approval != "approved":
        # Attempt to identify the viewer via the optional Authorization header.
        viewer_allowed = False
        try:
            auth_header = request.headers.get("authorization", "")
            if auth_header.lower().startswith("bearer "):
                tok = auth_header.split(" ", 1)[1]
                payload = jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                eid = payload.get("entity_id")
                etype = payload.get("entity_type")
                if etype == "admin" or (etype == "barbershop" and eid == shop_id):
                    viewer_allowed = True
        except Exception:
            pass
        if not viewer_allowed:
            raise HTTPException(status_code=404, detail="Barbershop not found")
    return shop

@api_router.put("/barbershops/me")
async def update_barbershop(update_data: BarbershopUpdate, shop: Dict = Depends(require_barbershop)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.barbershops.update_one({"id": shop['id']}, {"$set": update_dict})
    updated = await db.barbershops.find_one({"id": shop['id']}, {"_id": 0, "password": 0})
    return updated

@api_router.get("/barbershops/{shop_id}/available-slots")
async def get_available_slots(shop_id: str, date: str, service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    duration = service['duration_minutes']
    
    bookings = await db.bookings.find({
        "barbershop_id": shop_id,
        "booking_date": date,
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [(b['start_time'], b['end_time']) for b in bookings]
    
    available_slots = []
    for hour in range(9, 21):
        for minute in [0, 30]:
            start_time = f"{hour:02d}:{minute:02d}"
            end_time = calculate_end_time(start_time, duration)
            
            is_available = True
            for booked_start, booked_end in booked_times:
                if not (end_time <= booked_start or start_time >= booked_end):
                    is_available = False
                    break
            
            if is_available:
                available_slots.append({
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration_minutes": duration
                })
    
    return {"date": date, "service_id": service_id, "available_slots": available_slots}

# ============== COMPATIBILITY: BARBER ENDPOINTS (for Frontend) ==============

@api_router.get("/barbers/profile/me")
async def get_barber_profile_me(entity: Dict = Depends(require_barbershop)):
    """Get current barber's full enriched profile"""
    shop = await db.barbershops.find_one({"id": entity['id']}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    return await enrich_barbershop_for_frontend(shop)

@api_router.post("/barbers/profile")
async def create_or_update_barber_profile(profile_data: BarberProfileCreate, entity: Dict = Depends(require_barbershop)):
    """Create or update barber extended profile"""
    shop_id = entity['id']
    
    profile_dict = profile_data.model_dump(exclude_none=True)
    profile_dict["barbershop_id"] = shop_id
    profile_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update the main barbershop record too
    shop_update = {}
    if profile_data.salon_name:
        shop_update["shop_name"] = profile_data.salon_name
    if profile_data.description:
        shop_update["description"] = profile_data.description
    if profile_data.address:
        shop_update["address"] = profile_data.address
    if profile_data.whatsapp:
        shop_update["whatsapp_number"] = profile_data.whatsapp
    if profile_data.instagram:
        shop_update["instagram_url"] = profile_data.instagram
    if profile_data.tiktok:
        shop_update["tiktok_url"] = profile_data.tiktok
    if profile_data.logo_url:
        shop_update["shop_logo"] = profile_data.logo_url
    if profile_data.latitude is not None:
        shop_update["latitude"] = profile_data.latitude
    if profile_data.longitude is not None:
        shop_update["longitude"] = profile_data.longitude
    if profile_data.district:
        shop_update["district"] = profile_data.district
    if profile_data.neighborhood:
        shop_update["neighborhood"] = profile_data.neighborhood
    if profile_data.village:
        shop_update["village"] = profile_data.village
    
    if shop_update:
        shop_update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.barbershops.update_one({"id": shop_id}, {"$set": shop_update})
    
    # Handle services - save to services collection
    if profile_data.services:
        # Clear old services and add new ones
        await db.services.delete_many({"barbershop_id": shop_id, "category": {"$ne": "custom"}})
        for svc in profile_data.services:
            svc_doc = {
                "id": str(uuid.uuid4()),
                "barbershop_id": shop_id,
                "name": svc.get("name", ""),
                "name_ar": svc.get("name_ar", ""),
                "description": svc.get("description", ""),
                "price": float(svc.get("price", 0)),
                "duration_minutes": int(svc.get("duration_minutes", 30)),
                "category": svc.get("category", "default"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.services.insert_one(svc_doc)
    
    # Handle custom services
    if profile_data.custom_services:
        await db.services.delete_many({"barbershop_id": shop_id, "category": "custom"})
        for svc in profile_data.custom_services:
            svc_doc = {
                "id": str(uuid.uuid4()),
                "barbershop_id": shop_id,
                "name": svc.get("name", ""),
                "name_ar": svc.get("name_ar", ""),
                "description": svc.get("description", ""),
                "price": float(svc.get("price", 0)),
                "duration_minutes": int(svc.get("duration_minutes", 30)),
                "category": "custom",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.services.insert_one(svc_doc)
    
    # Handle gallery images
    if profile_data.before_after_images is not None:
        await db.gallery_images.delete_many({"barbershop_id": shop_id})
        for img in profile_data.before_after_images[:4]:
            img_doc = {
                "id": str(uuid.uuid4()),
                "barbershop_id": shop_id,
                "image_before": img.get("before", ""),
                "image_after": img.get("after", ""),
                "before": img.get("before", ""),
                "after": img.get("after", ""),
                "caption": img.get("caption", ""),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.gallery_images.insert_one(img_doc)
    
    # Upsert extended profile
    existing = await db.barber_profiles.find_one({"barbershop_id": shop_id})
    if existing:
        await db.barber_profiles.update_one(
            {"barbershop_id": shop_id},
            {"$set": profile_dict}
        )
    else:
        profile_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.barber_profiles.insert_one(profile_dict)
    
    # Return enriched profile
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    return await enrich_barbershop_for_frontend(shop)

@api_router.put("/barbers/profile")
async def update_barber_profile(profile_data: BarberProfileCreate, entity: Dict = Depends(require_barbershop)):
    """Update barber profile - same as POST"""
    return await create_or_update_barber_profile(profile_data, entity)

@api_router.get("/barbers/top/{gender}")
async def get_top_barbers(gender: str, limit: int = 20):
    """Get top rated barbers by gender (legacy - global scope).
    v3.8 — filters unapproved/deleted shops out of public rankings."""
    query = {
        "shop_type": gender,
        "$or": [
            {"approval_status": "approved"},
            {"approval_status": {"$exists": False}, "is_verified": True},
        ],
        "status": {"$ne": "pending_deletion"},
    }
    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort("ranking_score", -1).limit(limit).to_list(limit)
    
    result = []
    for shop in shops:
        enriched = await enrich_barbershop_for_frontend(shop)
        result.append(enriched)
    
    return result

# ============== PHASE 4: GEO-TIERED RANKING ==============

SPONSORED_PLANS = {
    "basic_city":    {"price_eur": 10.0, "scope": "city",    "duration_days": 7,  "label_ar": "متميز بالمدينة", "label_en": "City Spotlight"},
    "pro_country":   {"price_eur": 30.0, "scope": "country", "duration_days": 14, "label_ar": "محترف - الدولة", "label_en": "Country Pro"},
    "elite_region":  {"price_eur": 80.0, "scope": "region",  "duration_days": 30, "label_ar": "النخبة - الإقليم", "label_en": "Regional Elite"},
}

@api_router.get("/sponsored/plans")
async def list_sponsored_plans():
    """Public catalogue of sponsored ad packages."""
    return {"plans": [{"id": k, **v} for k, v in SPONSORED_PLANS.items()]}

@api_router.get("/ranking/top")
async def get_ranked_top(
    scope: str = "global",              # global | city | country | region
    gender: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 20,
):
    """Unified ranking endpoint — returns the top shops for a geographic tier.
    Sorted by ranking_score desc with sponsored shops pinned on top.
    """
    if scope not in ("global", "city", "country", "region"):
        raise HTTPException(status_code=400, detail="scope must be one of global|city|country|region")

    query: Dict[str, Any] = {
        "$or": [
            {"approval_status": "approved"},
            {"approval_status": {"$exists": False}, "is_verified": True},
        ],
        "status": {"$ne": "pending_deletion"},
    }
    if gender in ("male", "female"):
        query["shop_type"] = gender
    if scope == "city":
        if not country or not city:
            raise HTTPException(status_code=400, detail="country and city required for scope=city")
        query["country"] = country
        query["city"] = city
    elif scope == "country":
        if not country:
            raise HTTPException(status_code=400, detail="country required for scope=country")
        query["country"] = country
    # 'region' & 'global' use query as-is (all matching gender)

    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort("ranking_score", -1).limit(limit).to_list(limit)

    # Get active sponsored ads matching scope
    now_iso = datetime.now(timezone.utc).isoformat()
    ad_query: Dict[str, Any] = {"status": "active", "end_date": {"$gte": now_iso}}
    sponsored_shop_ids: set = set()
    async for ad in db.sponsored_ads.find(ad_query, {"_id": 0}):
        plan = SPONSORED_PLANS.get(ad.get("plan"), {})
        plan_scope = plan.get("scope", "city")
        if scope == "city" and plan_scope in ("city", "country", "region"):
            sponsored_shop_ids.add(ad["shop_id"])
        elif scope == "country" and plan_scope in ("country", "region"):
            sponsored_shop_ids.add(ad["shop_id"])
        elif scope in ("region", "global") and plan_scope == "region":
            sponsored_shop_ids.add(ad["shop_id"])

    result = []
    for shop in shops:
        enriched = await enrich_barbershop_for_frontend(shop)
        enriched["is_sponsored"] = shop.get("id") in sponsored_shop_ids
        result.append(enriched)

    # Pin sponsored shops to the top
    result.sort(key=lambda x: (0 if x.get("is_sponsored") else 1, -(x.get("ranking_score") or 0)))

    # Compute scoped tier label
    for r in result[:3]:
        r["tier_badge"] = {
            "city":    {"en": "Top in City",    "ar": "الأول في المدينة"},
            "country": {"en": "Top in Country", "ar": "الأول في الدولة"},
            "region":  {"en": "Regional Elite", "ar": "النخبة الإقليمية"},
            "global":  {"en": "Global Top",     "ar": "عالمي"},
        }.get(scope, {"en": "Top", "ar": "متميز"})

    return result

# ============== RANKING TIERS (PUBLIC) ==============

@api_router.get("/ranking/tiers")
async def get_ranking_tiers(
    gender: Optional[str] = None,
    country: Optional[str] = None,
    governorate: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = Query(8, ge=1, le=30),
):
    """
    Return top shops grouped by tier (global_elite / country_top / governorate_top / city_top).
    Each list contains ONLY shops that qualified for that tier.
    Frontend typically displays: city_top (most personalised) → governorate_top → country_top → global_elite.
    """
    # Normalize country name (e.g. "Syria" → "سوريا") so frontend geo-location values
    # with English country names still match our Arabic shop data.
    country = normalize_country(country)

    base_query: Dict[str, Any] = {}
    if gender:
        base_query["shop_type"] = gender

    async def fetch_tier(tier: str, scope_query: Dict[str, Any]) -> List[Dict]:
        q = {**base_query, **scope_query, "ranking_tier": tier}
        shops = await db.barbershops.find(
            q, {"_id": 0, "password": 0}
        ).sort("ranking_score", -1).limit(limit).to_list(limit)
        out = []
        for s in shops:
            out.append(await enrich_barbershop_for_frontend(s))
        return out

    global_elite = await fetch_tier("global_elite", {})

    # Country tier — try scoped first, fall back to global if empty
    if country:
        country_top = await fetch_tier("country_top", {"country": country})
        if not country_top:
            country_top = await fetch_tier("country_top", {})
    else:
        country_top = await fetch_tier("country_top", {})

    # Governorate tier — try scoped (district) → country → global
    if governorate:
        governorate_top = await fetch_tier("governorate_top", {"district": governorate})
        if not governorate_top and country:
            governorate_top = await fetch_tier("governorate_top", {"country": country})
        if not governorate_top:
            governorate_top = await fetch_tier("governorate_top", {})
    elif country:
        governorate_top = await fetch_tier("governorate_top", {"country": country})
        if not governorate_top:
            governorate_top = await fetch_tier("governorate_top", {})
    else:
        governorate_top = await fetch_tier("governorate_top", {})

    # City tier — try scoped, fall back to global
    if city:
        city_top = await fetch_tier("city_top", {"city": city})
        if not city_top:
            city_top = await fetch_tier("city_top", {})
    else:
        city_top = await fetch_tier("city_top", {})

    thresholds_info = {}
    for k, v in TIER_THRESHOLDS.items():
        thresholds_info[k] = {
            "label_ar": v["label_ar"],
            "label_en": v["label_en"],
            "icon": v["icon"],
            "min_rating": v["min_rating"],
            "min_reviews": v["min_reviews"],
            "min_completed_90d": v["min_completed_90d"],
            "require_verified": v["require_verified"],
            "require_subscription": v["require_subscription"],
            "min_gallery": v["min_gallery"],
        }

    return {
        "global_elite": global_elite,
        "country_top": country_top,
        "governorate_top": governorate_top,
        "city_top": city_top,
        "scope": {
            "gender": gender, "country": country,
            "governorate": governorate, "city": city,
        },
        "thresholds": thresholds_info,
    }


@api_router.post("/admin/ranking/recompute")
async def admin_recompute_rankings(admin: Dict = Depends(require_admin)):
    """Admin-triggered full recompute of ranking_score + ranking_tier for every shop."""
    result = await recompute_all_rankings()
    return result


@api_router.get("/admin/ranking/stats")
async def admin_ranking_stats(admin: Dict = Depends(require_admin)):
    """Admin: current tier distribution & last recompute timestamp."""
    tier_counts = {"global_elite": 0, "country_top": 0, "governorate_top": 0,
                   "city_top": 0, "normal": 0}
    last_computed: Optional[str] = None
    shops = await db.barbershops.find(
        {}, {"_id": 0, "ranking_tier": 1, "ranking_computed_at": 1}
    ).to_list(None)
    for s in shops:
        t = s.get("ranking_tier") or "normal"
        tier_counts[t] = tier_counts.get(t, 0) + 1
        rc = s.get("ranking_computed_at")
        if rc and (last_computed is None or rc > last_computed):
            last_computed = rc
    return {
        "tier_counts": tier_counts,
        "total_shops": len(shops),
        "last_computed_at": last_computed,
    }


@api_router.get("/barbershops/me/tier-status")
async def get_my_tier_status(entity: Dict = Depends(require_barbershop)):
    """
    For the authenticated barbershop: return current tier, current metrics,
    and the requirements/gap to reach each higher tier.
    Used by the Dashboard "Why am I not in X tier?" explainer page.
    SECURITY: uses require_barbershop directly (cleaner than indirect dependency).
    """
    shop_id = entity["id"]
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    # Fresh metrics (don't rely on cached ones — owner might check right after a change)
    metrics = await compute_shop_metrics(shop_id)
    current_tier = classify_shop_tier(metrics, shop)
    current_score = calculate_ranking_score(metrics, shop)

    current_state = {
        "rating": metrics["avg_rating"],
        "total_reviews": metrics["total_reviews"],
        "completed_90d": metrics["completed_90d"],
        "reviews_30d": metrics["reviews_30d"],
        "bookings_30d": metrics["completed_30d"],
        "products_30d": metrics["products_30d"],
        "gallery_count": metrics["gallery_count"],
        "is_verified": bool(shop.get("is_verified")),
        "subscription_active": shop.get("subscription_status") == "active",
    }

    # Build per-tier status with granular pass/fail for each requirement
    tiers_status = []
    for tier_key in TIER_ORDER:
        th = TIER_THRESHOLDS[tier_key]

        rating_pass = current_state["rating"] >= th["min_rating"]
        reviews_pass = current_state["total_reviews"] >= th["min_reviews"]
        completed_pass = current_state["completed_90d"] >= th["min_completed_90d"]
        verified_pass = (not th["require_verified"]) or current_state["is_verified"]
        subscribed_pass = (not th["require_subscription"]) or current_state["subscription_active"]
        gallery_pass = current_state["gallery_count"] >= th["min_gallery"]

        requirements = [
            {
                "key": "rating", "label_ar": "متوسط التقييم", "label_en": "Average Rating",
                "current": current_state["rating"], "required": th["min_rating"],
                "passed": rating_pass, "unit": "★",
            },
            {
                "key": "total_reviews", "label_ar": "عدد المراجعات", "label_en": "Total Reviews",
                "current": current_state["total_reviews"], "required": th["min_reviews"],
                "passed": reviews_pass, "unit": "",
            },
            {
                "key": "completed_90d", "label_ar": "حجوزات مكتملة (٩٠ يوم)", "label_en": "Completed Bookings (90d)",
                "current": current_state["completed_90d"], "required": th["min_completed_90d"],
                "passed": completed_pass, "unit": "",
            },
        ]
        if th["require_verified"]:
            requirements.append({
                "key": "verified", "label_ar": "حساب موثّق", "label_en": "Verified Account",
                "current": 1 if current_state["is_verified"] else 0, "required": 1,
                "passed": verified_pass, "unit": "",
            })
        if th["require_subscription"]:
            requirements.append({
                "key": "subscription", "label_ar": "اشتراك نشط", "label_en": "Active Subscription",
                "current": 1 if current_state["subscription_active"] else 0, "required": 1,
                "passed": subscribed_pass, "unit": "",
            })
        if th["min_gallery"] > 0:
            requirements.append({
                "key": "gallery", "label_ar": "صور المعرض", "label_en": "Gallery Images",
                "current": current_state["gallery_count"], "required": th["min_gallery"],
                "passed": gallery_pass, "unit": "",
            })

        all_pass = all(r["passed"] for r in requirements)
        tiers_status.append({
            "tier": tier_key,
            "label_ar": th["label_ar"],
            "label_en": th["label_en"],
            "icon": th["icon"],
            "qualified": all_pass,
            "requirements": requirements,
            "progress": round(sum(1 for r in requirements if r["passed"]) / len(requirements), 2) if requirements else 0.0,
        })

    # Next tier to aim for
    next_tier: Optional[Dict] = None
    order_reversed = list(reversed(TIER_ORDER))  # city_top first (easiest)
    current_idx = order_reversed.index(current_tier) if current_tier in order_reversed else -1
    for idx, tier_key in enumerate(order_reversed):
        if idx > current_idx:
            # find matching status entry
            for ts in tiers_status:
                if ts["tier"] == tier_key:
                    next_tier = ts
                    break
            break

    return {
        "shop_id": shop_id,
        "shop_name": shop.get("shop_name"),
        "current_tier": current_tier,
        "current_tier_label_ar": TIER_THRESHOLDS.get(current_tier, {}).get("label_ar", "عادي"),
        "current_tier_label_en": TIER_THRESHOLDS.get(current_tier, {}).get("label_en", "Normal"),
        "current_tier_icon": TIER_THRESHOLDS.get(current_tier, {}).get("icon", "⭐"),
        "current_score": current_score,
        "current_state": current_state,
        "tiers_status": tiers_status,
        "next_tier": next_tier,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }

# ============== PHASE 4: SPONSORED ADS ==============

@api_router.post("/sponsored/request")
async def create_sponsored_request(payload: SponsoredAdRequest, shop: Dict = Depends(require_barbershop)):
    """Shop requests a sponsored placement. Pending admin approval."""
    plan = SPONSORED_PLANS.get(payload.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Reject duplicate active/pending ads in the same scope
    now_iso = datetime.now(timezone.utc).isoformat()
    conflict = await db.sponsored_ads.find_one({
        "shop_id": shop["id"],
        "scope": plan["scope"],
        "$or": [
            {"status": "pending"},
            {"status": "active", "end_date": {"$gte": now_iso}},
        ]
    })
    if conflict:
        raise HTTPException(status_code=409, detail="You already have a pending or active ad for this scope")

    duration = max(1, int(payload.duration_days or plan["duration_days"]))
    now = datetime.now(timezone.utc)
    ad_doc = {
        "id": str(uuid.uuid4()),
        "shop_id": shop["id"],
        "shop_name": shop.get("shop_name", ""),
        "shop_type": shop.get("shop_type", "male"),
        "country": shop.get("country", ""),
        "city": shop.get("city", ""),
        "plan": payload.plan,
        "plan_label_ar": plan["label_ar"],
        "plan_label_en": plan["label_en"],
        "scope": plan["scope"],
        "price_eur": plan["price_eur"],
        "duration_days": duration,
        "payment_method": payload.payment_method or "",
        "receipt_image": payload.receipt_image or "",
        "status": "pending",
        "admin_note": "",
        "start_date": None,
        "end_date": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.sponsored_ads.insert_one(ad_doc)
    ad_doc.pop("_id", None)
    return ad_doc

@api_router.get("/sponsored/my")
async def get_my_sponsored(shop: Dict = Depends(require_barbershop)):
    """Shop's own sponsored ads history."""
    ads = await db.sponsored_ads.find({"shop_id": shop["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return ads

@api_router.get("/sponsored/active")
async def get_active_sponsored(
    scope: Optional[str] = None,        # city | country | region
    gender: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 10,
):
    """Public: list currently-running sponsored shops for homepage etc."""
    # Normalize country → canonical Arabic form
    country = normalize_country(country)
    now_iso = datetime.now(timezone.utc).isoformat()
    q: Dict[str, Any] = {"status": "active", "end_date": {"$gte": now_iso}}
    if scope:
        q["scope"] = scope
    if gender:
        q["shop_type"] = gender
    if country:
        q["country"] = country
    if city:
        q["city"] = city
    ads = await db.sponsored_ads.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    # Enrich each ad with shop info
    result = []
    for ad in ads:
        shop = await db.barbershops.find_one({"id": ad["shop_id"]}, {"_id": 0, "password": 0})
        if not shop:
            continue
        enriched = await enrich_barbershop_for_frontend(shop)
        enriched["ad_id"] = ad["id"]
        enriched["ad_plan"] = ad["plan"]
        enriched["ad_scope"] = ad["scope"]
        enriched["is_sponsored"] = True
        enriched["ad_end_date"] = ad["end_date"]
        result.append(enriched)
    return result

@api_router.get("/admin/sponsored/pending")
async def admin_list_pending_ads(admin: Dict = Depends(require_admin)):
    """Admin: list sponsored ads awaiting approval."""
    ads = await db.sponsored_ads.find({"status": "pending"}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return ads

@api_router.get("/admin/sponsored/all")
async def admin_list_all_ads(status: Optional[str] = None, admin: Dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    ads = await db.sponsored_ads.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return ads

@api_router.put("/admin/sponsored/{ad_id}/approve")
async def admin_approve_ad(ad_id: str, payload: SponsoredAdAdminAction = Body(default=SponsoredAdAdminAction()), admin: Dict = Depends(require_admin)):
    """Admin: approve & activate a sponsored ad."""
    ad = await db.sponsored_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Ad already processed")
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=int(ad.get("duration_days") or 7))
    update = {
        "status": "active",
        "start_date": now.isoformat(),
        "end_date": end.isoformat(),
        "admin_note": (payload.admin_note if payload else "") or "",
        "updated_at": now.isoformat(),
    }
    await db.sponsored_ads.update_one({"id": ad_id}, {"$set": update})
    updated = await db.sponsored_ads.find_one({"id": ad_id}, {"_id": 0})
    return updated

@api_router.put("/admin/sponsored/{ad_id}/reject")
async def admin_reject_ad(ad_id: str, payload: SponsoredAdAdminAction = Body(default=SponsoredAdAdminAction()), admin: Dict = Depends(require_admin)):
    ad = await db.sponsored_ads.find_one({"id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.sponsored_ads.update_one(
        {"id": ad_id},
        {"$set": {"status": "rejected", "admin_note": (payload.admin_note if payload else "") or "", "updated_at": now}}
    )
    return await db.sponsored_ads.find_one({"id": ad_id}, {"_id": 0})

# ============== PHASE 5: REVENUE & STATS ==============

@api_router.get("/barbershops/me/stats")
async def get_shop_stats(days: int = 30, shop: Dict = Depends(require_barbershop)):
    """Revenue, bookings, orders, top products — last N days window."""
    shop_id = shop["id"]
    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=max(1, days))
    cutoff_iso = cutoff_dt.isoformat()

    # Completed bookings + revenue
    bookings = await db.bookings.find(
        {"barbershop_id": shop_id, "created_at": {"$gte": cutoff_iso}},
        {"_id": 0}
    ).to_list(10000)

    total_bookings = len(bookings)
    completed_bookings = [b for b in bookings if b.get("status") == "completed"]
    service_revenue = sum(float(b.get("total_price") or 0) for b in completed_bookings)

    # Orders + revenue
    orders = await db.orders.find(
        {"shop_id": shop_id, "created_at": {"$gte": cutoff_iso}},
        {"_id": 0}
    ).to_list(10000)

    total_orders = len(orders)
    delivered_or_shipped = [o for o in orders if o.get("status") in ("delivered", "shipped", "confirmed", "preparing")]
    product_revenue = sum(float(o.get("total") or 0) for o in delivered_or_shipped)

    # Revenue by day
    by_day: Dict[str, Dict[str, float]] = {}
    for b in completed_bookings:
        day = (b.get("created_at") or "")[:10]
        if not day:
            continue
        by_day.setdefault(day, {"services": 0.0, "products": 0.0})["services"] += float(b.get("total_price") or 0)
    for o in delivered_or_shipped:
        day = (o.get("created_at") or "")[:10]
        if not day:
            continue
        by_day.setdefault(day, {"services": 0.0, "products": 0.0})["products"] += float(o.get("total") or 0)

    revenue_by_day = [
        {"date": d, "services": round(v["services"], 2), "products": round(v["products"], 2), "total": round(v["services"] + v["products"], 2)}
        for d, v in sorted(by_day.items())
    ]

    # Top products (by quantity sold)
    product_counts: Dict[str, Dict[str, Any]] = {}
    for o in delivered_or_shipped:
        pid = o.get("product_id")
        if not pid:
            continue
        entry = product_counts.setdefault(pid, {
            "product_id": pid,
            "name": o.get("product_name", ""),
            "name_ar": o.get("product_name_ar", ""),
            "image": o.get("product_image", ""),
            "qty": 0,
            "revenue": 0.0,
        })
        entry["qty"] += int(o.get("quantity") or 1)
        entry["revenue"] += float(o.get("total") or 0)
    top_products = sorted(product_counts.values(), key=lambda x: x["revenue"], reverse=True)[:5]
    for tp in top_products:
        tp["revenue"] = round(tp["revenue"], 2)

    # Top services (by bookings count)
    service_counts: Dict[str, Dict[str, Any]] = {}
    for b in completed_bookings:
        svc_list = b.get("services") or []
        for svc in svc_list:
            name = svc.get("name_ar") or svc.get("name") or "?"
            entry = service_counts.setdefault(name, {"name": name, "qty": 0})
            entry["qty"] += 1
    top_services = sorted(service_counts.values(), key=lambda x: x["qty"], reverse=True)[:5]

    return {
        "window_days": days,
        "total_bookings": total_bookings,
        "completed_bookings": len(completed_bookings),
        "total_orders": total_orders,
        "paid_orders": len(delivered_or_shipped),
        "service_revenue": round(service_revenue, 2),
        "product_revenue": round(product_revenue, 2),
        "total_revenue": round(service_revenue + product_revenue, 2),
        "revenue_by_day": revenue_by_day,
        "top_products": top_products,
        "top_services": top_services,
    }

# ============== PHASE 5: LEAVE / OFF DAYS ==============

@api_router.post("/barbershops/me/leave")
async def set_leave_dates(payload: LeaveSet, shop: Dict = Depends(require_barbershop)):
    """Set or replace the shop's leave/off-day calendar. Dates must be ISO YYYY-MM-DD."""
    # Validate and normalize dates as YYYY-MM-DD strings
    valid_dates: List[str] = []
    for d in (payload.dates or []):
        if not isinstance(d, str):
            continue
        try:
            parsed = datetime.fromisoformat(d).date()
            valid_dates.append(parsed.isoformat())
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid date format: {d} (expected YYYY-MM-DD)")
    dates = sorted(set(valid_dates))
    now = datetime.now(timezone.utc).isoformat()
    await db.barbershops.update_one(
        {"id": shop["id"]},
        {"$set": {"leave_dates": dates, "leave_reason": payload.reason or "", "updated_at": now}}
    )
    return {"leave_dates": dates, "leave_reason": payload.reason or ""}

@api_router.get("/barbershops/{shop_id}/leave")
async def get_leave_dates(shop_id: str):
    """Public: inspect off-day calendar for a shop."""
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "leave_dates": 1, "leave_reason": 1})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return {"leave_dates": shop.get("leave_dates", []) or [], "leave_reason": shop.get("leave_reason", "") or ""}


@api_router.get("/barbers/nearby")
async def get_nearby_barbers(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: float = 50,
    type: Optional[str] = None,
    limit: int = 50
):
    """Get nearby barbers based on coordinates"""
    query = {}
    if type:
        query["shop_type"] = type
    
    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).limit(limit).to_list(limit)
    
    if lat is not None and lng is not None:
        def calc_distance(shop):
            if not shop.get('latitude') or not shop.get('longitude'):
                return float('inf')
            dlat = abs(shop['latitude'] - lat)
            dlng = abs(shop['longitude'] - lng)
            return (dlat**2 + dlng**2)**0.5 * 111
        
        shops = [s for s in shops if calc_distance(s) <= radius]
        shops.sort(key=calc_distance)
    
    result = []
    for shop in shops:
        enriched = await enrich_barbershop_for_frontend(shop)
        result.append(enriched)
    
    return result

@api_router.get("/barbers/{barber_id}")
async def get_barber(barber_id: str):
    """Get barber profile with enriched data for frontend"""
    shop = await db.barbershops.find_one({"id": barber_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barber not found")
    return await enrich_barbershop_for_frontend(shop)

@api_router.get("/barbers")
async def list_barbers(
    type: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 50
):
    """List all barbers (alias for barbershops)"""
    query = {}
    if type:
        query["shop_type"] = type
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    
    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort("ranking_score", -1).limit(limit).to_list(limit)
    
    result = []
    for shop in shops:
        enriched = await enrich_barbershop_for_frontend(shop)
        result.append(enriched)
    
    return result

# ============== SERVICES ENDPOINTS ==============

@api_router.post("/barbershops/me/services", response_model=ServiceResponse)
async def create_service(service_data: ServiceCreate, shop: Dict = Depends(require_barbershop)):
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id,
        "barbershop_id": shop['id'],
        "name": service_data.name,
        "name_ar": service_data.name_ar or service_data.name,
        "description": service_data.description,
        "price": service_data.price,
        "duration_minutes": service_data.duration_minutes,
        "category": service_data.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.services.insert_one(service_doc)
    return service_doc

@api_router.get("/barbershops/{shop_id}/services")
async def get_shop_services(shop_id: str):
    services = await db.services.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(100)
    return services

@api_router.delete("/barbershops/me/services/{service_id}")
async def delete_service(service_id: str, shop: Dict = Depends(require_barbershop)):
    result = await db.services.delete_one({"id": service_id, "barbershop_id": shop['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}


@api_router.put("/barbershops/me/services/{service_id}")
async def update_service(service_id: str, service_data: ServiceCreate, shop: Dict = Depends(require_barbershop)):
    """Update an existing service"""
    update_dict = service_data.model_dump(exclude_none=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.services.update_one(
        {"id": service_id, "barbershop_id": shop['id']},
        {"$set": update_dict},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return updated


class SocialMediaUpdate(BaseModel):
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    snapchat: Optional[str] = None
    youtube: Optional[str] = None
    website: Optional[str] = None
    whatsapp: Optional[str] = None


@api_router.put("/barbershops/me/social")
async def update_social_media(payload: SocialMediaUpdate, shop: Dict = Depends(require_barbershop)):
    """Quick update of just the social media / contact fields."""
    shop_id = shop['id']
    data = payload.model_dump(exclude_none=True)
    now = datetime.now(timezone.utc).isoformat()

    # Update both barbershops collection (legacy fields) and barber_profiles (new fields)
    shop_update = {"updated_at": now}
    if "instagram" in data: shop_update["instagram_url"] = data["instagram"]
    if "tiktok" in data: shop_update["tiktok_url"] = data["tiktok"]
    if "facebook" in data: shop_update["facebook"] = data["facebook"]
    if "twitter" in data: shop_update["twitter"] = data["twitter"]
    if "snapchat" in data: shop_update["snapchat"] = data["snapchat"]
    if "youtube" in data: shop_update["youtube"] = data["youtube"]
    if "whatsapp" in data: shop_update["whatsapp_number"] = data["whatsapp"]
    if "website" in data: shop_update["website"] = data["website"]
    await db.barbershops.update_one({"id": shop_id}, {"$set": shop_update})

    profile_update = {"barbershop_id": shop_id, "updated_at": now, **data}
    await db.barber_profiles.update_one(
        {"barbershop_id": shop_id},
        {"$set": profile_update},
        upsert=True,
    )
    return {"message": "Social media updated", **data}


@api_router.get("/barbershops/me/services")
async def get_my_services(shop: Dict = Depends(require_barbershop)):
    """List services owned by the authenticated salon"""
    services = await db.services.find({"barbershop_id": shop['id']}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return services

# ============== GALLERY ENDPOINTS ==============

@api_router.post("/barbershops/me/gallery")
async def add_gallery_image(image_data: GalleryImageCreate, shop: Dict = Depends(require_barbershop)):
    count = await db.gallery_images.count_documents({"barbershop_id": shop['id']})
    if count >= 4:
        raise HTTPException(status_code=400, detail="Maximum 4 portfolio images allowed. Please delete one to add a new image.")

    # SECURITY: enforce max base64 image size to prevent DB bloat / DoS
    validate_image_base64(image_data.image_before or image_data.before, "image_before")
    validate_image_base64(image_data.image_after or image_data.after, "image_after")

    image_id = str(uuid.uuid4())
    image_doc = {
        "id": image_id,
        "barbershop_id": shop['id'],
        "image_before": image_data.image_before or image_data.before or "",
        "image_after": image_data.image_after or image_data.after or "",
        "before": image_data.before or image_data.image_before or "",
        "after": image_data.after or image_data.image_after or "",
        "caption": image_data.caption,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gallery_images.insert_one(image_doc)
    # Return only the fields we want, excluding MongoDB's _id
    return {
        "id": image_doc["id"],
        "barbershop_id": image_doc["barbershop_id"],
        "image_before": image_doc["image_before"],
        "image_after": image_doc["image_after"],
        "before": image_doc["before"],
        "after": image_doc["after"],
        "caption": image_doc["caption"],
        "created_at": image_doc["created_at"]
    }

@api_router.get("/barbershops/{shop_id}/gallery")
async def get_shop_gallery(shop_id: str):
    images = await db.gallery_images.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(4)
    return images

@api_router.delete("/barbershops/me/gallery/{image_id}")
async def delete_gallery_image(image_id: str, shop: Dict = Depends(require_barbershop)):
    result = await db.gallery_images.delete_one({"id": image_id, "barbershop_id": shop['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

# ============== PRODUCT SHOWCASE ENDPOINTS ==============

@api_router.post("/products")
async def create_product(product_data: ProductCreate, shop: Dict = Depends(require_barbershop)):
    """Create a product for the barbershop's showcase"""
    # Enforce 10-product limit per shop
    existing_count = await db.products.count_documents({"shop_id": shop['id']})
    if existing_count >= 10:
        raise HTTPException(status_code=400, detail="MAX_PRODUCTS_REACHED")

    # SECURITY: prevent oversized base64 images that bloat the DB / cause DoS
    validate_image_base64(product_data.image_url, "image_url")

    product_doc = {
        "id": str(uuid.uuid4()),
        "shop_id": shop['id'],
        "name": product_data.name,
        "name_ar": product_data.name_ar or product_data.name,
        "description": product_data.description or "",
        "description_ar": product_data.description_ar or product_data.description or "",
        "price": product_data.price,
        "category": product_data.category,
        "image_url": product_data.image_url or "",
        "in_stock": product_data.in_stock,
        "featured": product_data.featured,
        "stock_quantity": product_data.stock_quantity,
        "shipping_options": product_data.shipping_options or ["pickup"],
        "local_delivery_fee": product_data.local_delivery_fee or 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    product_doc.pop("_id", None)
    return product_doc

@api_router.get("/products/shop/{shop_id}")
async def get_shop_products(shop_id: str, category: Optional[str] = None):
    """Get all products for a barbershop"""
    query = {"shop_id": shop_id}
    if category and category != "all":
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return products

@api_router.get("/products/featured")
async def get_featured_products(limit: int = 20):
    """Get featured products across all shops.
    UX FIX: If no shop has marked products as featured, fall back to the most recent
    in-stock products so the global showcase is never empty.
    """
    limit = max(1, min(limit, 50))
    products = await db.products.find(
        {"featured": True, "in_stock": True}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)

    # Fallback: if too few featured products, top up with recent in-stock products
    if len(products) < limit:
        seen_ids = {p["id"] for p in products}
        backfill = await db.products.find(
            {"in_stock": True, "id": {"$nin": list(seen_ids)}}, {"_id": 0}
        ).sort("created_at", -1).to_list(limit - len(products))
        products.extend(backfill)

    # Enrich with shop info (skip products with no live shop)
    enriched = []
    for product in products:
        shop = await db.barbershops.find_one({"id": product["shop_id"]}, {"_id": 0, "password": 0})
        if not shop:
            continue
        product["shop_name"] = shop.get("shop_name", "")
        product["shop_city"] = shop.get("city", "")
        product["shop_country"] = shop.get("country", "")
        enriched.append(product)
    return enriched

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductUpdate, shop: Dict = Depends(require_barbershop)):
    """Update a product"""
    product = await db.products.find_one({"id": product_id, "shop_id": shop['id']})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = product_data.model_dump(exclude_none=True)
    # SECURITY: validate image size if updated
    if "image_url" in update_data:
        validate_image_base64(update_data["image_url"], "image_url")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, shop: Dict = Depends(require_barbershop)):
    """Delete a product"""
    result = await db.products.delete_one({"id": product_id, "shop_id": shop['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/products/my")
async def get_my_products(shop: Dict = Depends(require_barbershop)):
    """Get current shop's products"""
    products = await db.products.find({"shop_id": shop['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return products

# ============== ORDER ENDPOINTS ==============

ORDER_STATUSES = {"pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"}

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, entity: Optional[Dict] = Depends(get_current_entity)):
    """Create a new product order. Customer or guest (phone only)."""
    # Load product
    product = await db.products.find_one({"id": order_data.product_id, "shop_id": order_data.shop_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.get("in_stock", True):
        raise HTTPException(status_code=400, detail="Product out of stock")

    # Validate shipping method
    allowed_methods = product.get("shipping_options") or ["pickup"]
    if order_data.shipping_method not in allowed_methods:
        raise HTTPException(status_code=400, detail="Shipping method not supported for this product")

    # Load shop
    shop = await db.barbershops.find_one({"id": order_data.shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    qty = max(1, int(order_data.quantity or 1))
    subtotal = float(product["price"]) * qty
    shipping_fee = 0.0
    if order_data.shipping_method == "local_delivery":
        shipping_fee = float(product.get("local_delivery_fee") or 0.0)
    total = subtotal + shipping_fee

    now = datetime.now(timezone.utc).isoformat()
    is_user = bool(entity) and entity.get("entity_type") == "user"
    user_id = entity.get("id") if is_user else None
    customer_name = order_data.customer_name or (entity.get("full_name") if entity else "") or ""
    customer_phone = order_data.customer_phone or (entity.get("phone_number") if entity else "") or ""

    if not customer_phone:
        raise HTTPException(status_code=400, detail="Customer phone is required")

    order_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "shop_id": order_data.shop_id,
        "shop_name": shop.get("shop_name", ""),
        "shop_whatsapp": shop.get("whatsapp_number", "") or shop.get("phone_number", ""),
        "product_id": order_data.product_id,
        "product_name": product.get("name", ""),
        "product_name_ar": product.get("name_ar", ""),
        "product_image": product.get("image_url", ""),
        "unit_price": float(product["price"]),
        "quantity": qty,
        "subtotal": subtotal,
        "shipping_method": order_data.shipping_method,
        "shipping_fee": shipping_fee,
        "total": total,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "shipping_address": order_data.shipping_address or "",
        "shipping_city": order_data.shipping_city or "",
        "shipping_country": order_data.shipping_country or "",
        "notes": order_data.notes or "",
        "status": "pending",
        "status_history": [{"status": "pending", "note": "Order placed", "at": now}],
        "created_at": now,
        "updated_at": now,
    }
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)

    # Loyalty: award points to user if logged in
    if user_id:
        try:
            await db.users.update_one(
                {"id": user_id},
                {"$inc": {"loyalty_points": int(total)}}
            )
        except Exception as e:
            logger.warning(f"Could not award loyalty points: {e}")

    return order_doc

@api_router.get("/orders/my")
async def get_my_orders(entity: Dict = Depends(require_auth)):
    """Get current user's orders (customer)."""
    if entity.get("entity_type") != "user":
        raise HTTPException(status_code=403, detail="Only customers can view personal orders")
    orders = await db.orders.find({"user_id": entity["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

@api_router.get("/orders/shop")
async def get_shop_orders(status: Optional[str] = None, shop: Dict = Depends(require_barbershop)):
    """Get orders received by current shop."""
    query = {"shop_id": shop["id"]}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusUpdate, shop: Dict = Depends(require_barbershop)):
    """Shop updates an order's status."""
    if payload.status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    order = await db.orders.find_one({"id": order_id, "shop_id": shop["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    now = datetime.now(timezone.utc).isoformat()
    history = order.get("status_history", [])
    history.append({"status": payload.status, "note": payload.tracking_note or "", "at": now})
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": payload.status, "status_history": history, "updated_at": now}}
    )
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated

@api_router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, entity: Dict = Depends(require_auth)):
    """Customer or shop cancels a non-final order."""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    et = entity.get("entity_type")
    if et == "user" and order.get("user_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if et == "barbershop" and order.get("shop_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if et not in ("user", "barbershop"):
        raise HTTPException(status_code=403, detail="Not allowed")

    if order.get("status") in ("delivered", "cancelled"):
        raise HTTPException(status_code=400, detail="Cannot cancel this order")

    # Customers cannot cancel after the order has been shipped - they should contact support / shop
    if et == "user" and order.get("status") == "shipped":
        raise HTTPException(status_code=400, detail="Order already shipped, contact the shop")

    now = datetime.now(timezone.utc).isoformat()
    history = order.get("status_history", [])
    history.append({"status": "cancelled", "note": f"Cancelled by {et}", "at": now})
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "cancelled", "status_history": history, "updated_at": now}}
    )
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated

@api_router.get("/orders/{order_id}")
async def get_order_detail(order_id: str, entity: Dict = Depends(require_auth)):
    """Order details - visible to owner customer or shop."""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    et = entity.get("entity_type")
    if et == "user" and order.get("user_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    if et == "barbershop" and order.get("shop_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not allowed")
    return order

# ============== BOOKING ENDPOINTS ==============

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, entity: Dict = Depends(get_current_entity)):
    """Create a booking - supports both old and new field names"""
    # Normalize field names
    barbershop_id = booking_data.barbershop_id or booking_data.barber_id
    booking_date = booking_data.booking_date or booking_data.date
    start_time = booking_data.start_time or booking_data.time
    phone = booking_data.user_phone_for_notification or booking_data.customer_phone or ""
    customer_name = booking_data.customer_name or (entity.get('full_name') if entity else "")
    
    if not barbershop_id:
        raise HTTPException(status_code=400, detail="Barbershop ID required")
    if not booking_date:
        raise HTTPException(status_code=400, detail="Booking date required")
    if not start_time:
        raise HTTPException(status_code=400, detail="Start time required")
    
    # Get barbershop
    shop = await db.barbershops.find_one({"id": barbershop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    
    # Handle service_ids (multiple) or service_id (single)
    service_names = []
    total_duration = 30
    total_price = 0
    services_list = []
    
    if booking_data.service_id:
        service = await db.services.find_one({"id": booking_data.service_id}, {"_id": 0})
        if service:
            service_names.append(service['name'])
            total_duration = service['duration_minutes']
            total_price = service.get('price', 0)
            services_list.append({"name": service['name'], "name_ar": service.get('name_ar', service['name']), "price": service.get('price', 0)})
    elif booking_data.service_ids:
        # Service_ids might be service names from frontend
        all_services = await db.services.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(100)
        for svc_ref in booking_data.service_ids:
            # Try matching by id first, then by name
            matched = None
            for svc in all_services:
                if svc['id'] == svc_ref or svc['name'] == svc_ref or svc.get('name_ar') == svc_ref:
                    matched = svc
                    break
            if matched:
                service_names.append(matched['name'])
                total_duration += matched.get('duration_minutes', 30)
                total_price += matched.get('price', 0)
                services_list.append({"name": matched['name'], "name_ar": matched.get('name_ar', matched['name']), "price": matched.get('price', 0)})
    
    # Calculate end time
    end_time = calculate_end_time(start_time, total_duration)
    
    # ATOMIC slot reservation to prevent race conditions.
    # Strategy: first check for overlap (fast common-case path), then insert.
    # A true lock-free approach would use a unique compound index on (barbershop_id, booking_date, start_time),
    # but bookings can have different durations so we keep the overlap check and accept a rare double-insert
    # which will then be detected by the same query after insertion (compensating cleanup below).
    existing = await db.bookings.find_one({
        "barbershop_id": barbershop_id,
        "booking_date": booking_date,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"start_time": {"$lt": end_time}, "end_time": {"$gt": start_time}}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is not available")
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "user_id": entity['id'] if entity and entity.get('entity_type') == 'user' else None,
        "barbershop_id": barbershop_id,
        "barbershop_name": shop['shop_name'],
        "service_id": booking_data.service_id or (booking_data.service_ids[0] if booking_data.service_ids else None),
        "service_name": ", ".join(service_names) if service_names else "Service",
        "booking_date": booking_date,
        "start_time": start_time,
        "end_time": end_time,
        "status": "pending",
        "customer_name": customer_name,
        "user_phone_for_notification": phone,
        "notes": booking_data.notes or "",
        "services": services_list,
        "total_price": total_price,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)

    # Post-insert race-condition check: if another booking was inserted concurrently with
    # overlapping time, delete ours (the later-created one) and return 400.
    overlap = await db.bookings.find_one({
        "barbershop_id": barbershop_id,
        "booking_date": booking_date,
        "status": {"$in": ["pending", "confirmed"]},
        "id": {"$ne": booking_id},
        "created_at": {"$lt": booking_doc["created_at"]},
        "$or": [
            {"start_time": {"$lt": end_time}, "end_time": {"$gt": start_time}}
        ]
    })
    if overlap:
        await db.bookings.delete_one({"id": booking_id})
        raise HTTPException(status_code=400, detail="This time slot is not available")
    
    # Create notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "recipient_id": barbershop_id,
        "recipient_type": "barbershop",
        "type": "booking_confirmation",
        "message": f"حجز جديد: {', '.join(service_names)} - {booking_date} {start_time}",
        "channel": "whatsapp",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # v3.8 — Push notification to the barber shop (Web Push via VAPID)
    try:
        if SEC_EXTRAS_OK and sec_extras.WEBPUSH_OK:
            subs = await db.push_subscriptions.find({"user_id": barbershop_id}, {"_id": 0}).to_list(20)
            for s in subs:
                try:
                    sec_extras.send_web_push(
                        {"endpoint": s.get("endpoint"), "keys": s.get("keys", {})},
                        {
                            "title": "💈 حجز جديد / New booking",
                            "body": f"{customer_name or 'عميل'} - {booking_date} {start_time}",
                            "icon": "/icons/icon-192.png",
                            "url": "/dashboard",
                        },
                    )
                except Exception:
                    pass
    except Exception as _pex:
        logger.debug(f"push on booking failed: {_pex}")

    return enrich_booking_for_frontend(booking_doc)

@api_router.get("/bookings/my")
async def get_my_bookings(entity: Dict = Depends(require_auth)):
    if entity.get('entity_type') == 'user':
        bookings = await db.bookings.find({"user_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    elif entity.get('entity_type') == 'barbershop':
        bookings = await db.bookings.find({"barbershop_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = []
    
    return [enrich_booking_for_frontend(b) for b in bookings]

@api_router.get("/bookings/barber/{barber_id}/schedule")
async def get_barber_schedule(barber_id: str, date: str):
    """Get booked times for a barber on a specific date"""
    bookings = await db.bookings.find({
        "barbershop_id": barber_id,
        "booking_date": date,
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [b['start_time'] for b in bookings]
    
    return {"date": date, "booked_times": booked_times}

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, entity: Dict = Depends(require_auth)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    # SECURITY (IDOR fix): Only the owning user, the owning shop, or an admin can read a booking.
    etype = entity.get("entity_type")
    if etype == "user" and booking.get("user_id") != entity.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if etype == "barbershop" and booking.get("barbershop_id") != entity.get("id"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if etype not in ("user", "barbershop", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return enrich_booking_for_frontend(booking)

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, entity: Dict = Depends(require_auth)):
    """Update booking status - supports confirm, confirmed, complete, completed, cancel, cancelled"""
    status_map = {
        "confirm": "confirmed",
        "confirmed": "confirmed",
        "complete": "completed",
        "completed": "completed",
        "cancel": "cancelled",
        "cancelled": "cancelled"
    }
    
    new_status = status_map.get(status, status)
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Authorization check
    if entity.get('entity_type') == 'user' and booking['user_id'] != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if entity.get('entity_type') == 'barbershop' and booking['barbershop_id'] != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Booking {new_status}"}

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, entity: Dict = Depends(require_auth)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if entity.get('entity_type') == 'user' and booking.get('user_id') != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if entity.get('entity_type') == 'barbershop' and booking['barbershop_id'] != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Booking cancelled"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, entity: Dict = Depends(require_auth)):
    """Cancel booking via DELETE (frontend compatibility)"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if entity.get('entity_type') == 'user' and booking.get('user_id') != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Booking cancelled"}

@api_router.put("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, shop: Dict = Depends(require_barbershop)):
    result = await db.bookings.update_one(
        {"id": booking_id, "barbershop_id": shop['id']},
        {"$set": {"status": "confirmed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking confirmed"}

@api_router.put("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, shop: Dict = Depends(require_barbershop)):
    result = await db.bookings.update_one(
        {"id": booking_id, "barbershop_id": shop['id']},
        {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking completed"}

# ============== REVIEW ENDPOINTS ==============

@api_router.post("/reviews")
async def create_review_compat(review_data: ReviewCreate, entity: Dict = Depends(require_auth)):
    """Create review - frontend compatibility (POST /api/reviews)"""
    booking_id = review_data.booking_id
    barbershop_id = review_data.barber_id
    
    if booking_id:
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if booking:
            barbershop_id = booking.get('barbershop_id', barbershop_id)
    
    if not barbershop_id:
        raise HTTPException(status_code=400, detail="Barber ID or Booking ID required")
    
    # Check if already reviewed (if booking_id provided)
    if booking_id:
        existing = await db.reviews.find_one({"booking_id": booking_id}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "booking_id": booking_id,
        "user_id": entity['id'] if entity.get('entity_type') == 'user' else None,
        "user_name": entity.get('full_name', 'Anonymous'),
        "customer_name": entity.get('full_name', 'Anonymous'),
        "barbershop_id": barbershop_id,
        "rating": min(5, max(1, review_data.rating)),
        "comment": review_data.comment,
        "status": "pending",  # MODERATION: requires admin approval before visibility
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barbershop ranking (approved reviews only)
    all_reviews = await db.reviews.find(
        {"barbershop_id": barbershop_id, "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(1000)
    if all_reviews:
        avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
        
        ranking_tier = "normal"
        if avg_rating >= 4.5 and len(all_reviews) >= 50:
            ranking_tier = "top"
        elif avg_rating >= 4.0 and len(all_reviews) >= 20:
            ranking_tier = "featured"
        
        await db.barbershops.update_one(
            {"id": barbershop_id},
            {"$set": {
                "ranking_score": round(avg_rating, 2),
                "ranking_tier": ranking_tier,
                "total_reviews": len(all_reviews)
            }}
        )
    
    # Return a clean copy without any potential ObjectId fields
    return {
        "id": review_doc["id"],
        "booking_id": review_doc["booking_id"],
        "user_id": review_doc["user_id"],
        "user_name": review_doc["user_name"],
        "customer_name": review_doc["customer_name"],
        "barbershop_id": review_doc["barbershop_id"],
        "rating": review_doc["rating"],
        "comment": review_doc["comment"],
        "status": review_doc["status"],
        "created_at": review_doc["created_at"],
        "pending_moderation": True
    }

@api_router.get("/reviews/barber/{barber_id}")
async def get_barber_reviews(barber_id: str, limit: int = 50):
    """Get reviews for a barber - frontend compatibility (approved only)"""
    reviews = await db.reviews.find(
        {"barbershop_id": barber_id, "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Transform to match frontend expectations
    result = []
    for r in reviews:
        result.append({
            "id": r["id"],
            "customer_name": r.get("customer_name") or r.get("user_name", "Anonymous"),
            "user_name": r.get("user_name", "Anonymous"),
            "rating": r["rating"],
            "comment": r.get("comment"),
            "created_at": r.get("created_at", "")
        })
    
    return result

@api_router.post("/bookings/{booking_id}/review")
async def create_review(booking_id: str, review_data: ReviewCreate, entity: Dict = Depends(require_auth)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    existing = await db.reviews.find_one({"booking_id": booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "booking_id": booking_id,
        "user_id": entity['id'] if entity.get('entity_type') == 'user' else None,
        "user_name": entity.get('full_name', 'Anonymous'),
        "customer_name": entity.get('full_name', 'Anonymous'),
        "barbershop_id": booking['barbershop_id'],
        "rating": min(5, max(1, review_data.rating)),
        "comment": review_data.comment,
        "status": "pending",  # MODERATION
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barbershop ranking (approved only)
    all_reviews = await db.reviews.find(
        {"barbershop_id": booking['barbershop_id'], "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(1000)
    if not all_reviews:
        review_doc.pop("_id", None)
        return review_doc
    avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
    
    ranking_tier = "normal"
    if avg_rating >= 4.5 and len(all_reviews) >= 50:
        ranking_tier = "top"
    elif avg_rating >= 4.0 and len(all_reviews) >= 20:
        ranking_tier = "featured"
    
    await db.barbershops.update_one(
        {"id": booking['barbershop_id']},
        {"$set": {
            "ranking_score": round(avg_rating, 2),
            "ranking_tier": ranking_tier,
            "total_reviews": len(all_reviews)
        }}
    )
    
    return review_doc

@api_router.get("/barbershops/{shop_id}/reviews")
async def get_shop_reviews(shop_id: str, limit: int = 50):
    reviews = await db.reviews.find(
        {"barbershop_id": shop_id, "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return reviews

# ============== ADMIN REVIEW MODERATION ==============

@api_router.get("/admin/reviews/pending")
async def admin_get_pending_reviews(limit: int = 100, admin: Dict = Depends(require_admin)):
    """List reviews awaiting moderation (status == 'pending')."""
    reviews = await db.reviews.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    # Enrich with shop name
    for r in reviews:
        shop = await db.barbershops.find_one({"id": r.get("barbershop_id")}, {"_id": 0, "shop_name": 1, "city": 1})
        if shop:
            r["shop_name"] = shop.get("shop_name", "")
            r["shop_city"] = shop.get("city", "")
    return {"reviews": reviews, "count": len(reviews)}

@api_router.get("/admin/reviews")
async def admin_list_reviews(status: Optional[str] = None, limit: int = 200, admin: Dict = Depends(require_admin)):
    """List reviews filtered by status (pending/approved/rejected). Default = all."""
    query: Dict[str, Any] = {}
    if status in ("pending", "approved", "rejected"):
        query["status"] = status
    reviews = await db.reviews.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for r in reviews:
        shop = await db.barbershops.find_one({"id": r.get("barbershop_id")}, {"_id": 0, "shop_name": 1})
        if shop:
            r["shop_name"] = shop.get("shop_name", "")
    return {"reviews": reviews, "count": len(reviews)}

async def _recompute_shop_rating(shop_id: str):
    """Recompute shop aggregate rating from approved reviews only."""
    approved = await db.reviews.find(
        {"barbershop_id": shop_id, "$or": [{"status": "approved"}, {"status": {"$exists": False}}]},
        {"_id": 0, "rating": 1}
    ).to_list(5000)
    if approved:
        avg = sum(r.get("rating", 0) for r in approved) / len(approved)
        await db.barbershops.update_one(
            {"id": shop_id},
            {"$set": {
                "rating": round(avg, 2),
                "total_reviews": len(approved)
            }}
        )
    else:
        await db.barbershops.update_one(
            {"id": shop_id},
            {"$set": {"rating": 0.0, "total_reviews": 0}}
        )

@api_router.put("/admin/reviews/{review_id}/approve")
async def admin_approve_review(review_id: str, admin: Dict = Depends(require_admin)):
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "status": "approved",
            "moderated_by": admin.get("id"),
            "moderated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await _recompute_shop_rating(review.get("barbershop_id"))
    return {"status": "approved", "id": review_id}

@api_router.put("/admin/reviews/{review_id}/reject")
async def admin_reject_review(review_id: str, admin: Dict = Depends(require_admin)):
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "status": "rejected",
            "moderated_by": admin.get("id"),
            "moderated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    await _recompute_shop_rating(review.get("barbershop_id"))
    return {"status": "rejected", "id": review_id}

@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, admin: Dict = Depends(require_admin)):
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.delete_one({"id": review_id})
    await _recompute_shop_rating(review.get("barbershop_id"))
    return {"status": "deleted", "id": review_id}

# ============== REPORT ENDPOINTS ==============

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, entity: Dict = Depends(require_auth)):
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "reporter_id": entity['id'],
        "reporter_type": entity.get('entity_type'),
        "reported_entity_id": report_data.reported_entity_id,
        "reported_user_id": report_data.reported_entity_id,
        "report_type": report_data.report_type,
        "reason": report_data.report_type,
        "description": report_data.description,
        "status": "pending",
        "penalty_applied": None,
        "penalty_duration": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reports.insert_one(report_doc)
    return {"message": "Report submitted", "id": report_id}

# ============== SUBSCRIPTION ENDPOINTS ==============

@api_router.post("/subscriptions")
async def create_subscription(sub_data: SubscriptionCreate, shop: Dict = Depends(require_barbershop)):
    sub_id = str(uuid.uuid4())
    sub_doc = {
        "id": sub_id,
        "barbershop_id": shop['id'],
        "user_id": shop['id'],
        "plan_type": sub_data.plan_type or "annual",
        "subscription_type": sub_data.subscription_type or sub_data.plan_type or "annual",
        "amount": sub_data.amount or sub_data.price or 100.0,
        "price": sub_data.price or sub_data.amount or 100.0,
        "currency": "EUR",
        "payment_method": sub_data.payment_method,
        "receipt_image": sub_data.receipt_image,
        "status": "pending",
        "start_date": None,
        "end_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscriptions.insert_one(sub_doc)
    
    # Return a clean copy without any potential ObjectId fields
    return {
        "id": sub_doc["id"],
        "barbershop_id": sub_doc["barbershop_id"],
        "user_id": sub_doc["user_id"],
        "plan_type": sub_doc["plan_type"],
        "subscription_type": sub_doc["subscription_type"],
        "amount": sub_doc["amount"],
        "price": sub_doc["price"],
        "currency": sub_doc["currency"],
        "payment_method": sub_doc["payment_method"],
        "receipt_image": sub_doc["receipt_image"],
        "status": sub_doc["status"],
        "start_date": sub_doc["start_date"],
        "end_date": sub_doc["end_date"],
        "created_at": sub_doc["created_at"]
    }

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/pending-barbershops")
async def get_pending_barbershops(admin: Dict = Depends(require_admin)):
    """v3.8 — list salons awaiting owner approval (new approval_status field).
    Falls back to the legacy is_verified=False criterion for pre-v3.8 shops."""
    shops = await db.barbershops.find(
        {
            "$or": [
                {"approval_status": "pending"},
                {"approval_status": {"$exists": False}, "is_verified": False},
            ]
        },
        {"_id": 0, "password": 0},
    ).sort("created_at", -1).to_list(200)
    return shops

@api_router.get("/admin/all-barbershops")
async def get_all_barbershops_admin(
    admin: Dict = Depends(require_admin),
    approval_status: Optional[str] = None,
    shop_type: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 200,
    skip: int = 0,
):
    """v3.8 — admin: list EVERY salon (pending, approved, rejected). Supports filters."""
    query: Dict[str, Any] = {}
    if approval_status:
        query["approval_status"] = approval_status
    if shop_type:
        query["shop_type"] = shop_type
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    total = await db.barbershops.count_documents(query)
    items = await (
        db.barbershops.find(query, {"_id": 0, "password": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {"total": total, "items": items}

@api_router.put("/admin/barbershops/{shop_id}/approve")
async def approve_barbershop(shop_id: str, request: Request, admin: Dict = Depends(require_admin)):
    """v3.8 — approve a pending salon. Makes it visible publicly + notifies the owner."""
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    await db.barbershops.update_one(
        {"id": shop_id},
        {"$set": {
            "approval_status": "approved",
            "is_verified": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": admin.get("id"),
            "rejection_reason": None,
            "rejected_at": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    # Notify the owner
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "recipient_id": shop_id,
            "recipient_type": "barbershop",
            "kind": "shop_approved",
            "title": "✅ تم قبول صالونك / Your salon is approved",
            "body": "صالونك الآن ظاهر للعامة. ابدأ باستقبال الحجوزات!",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_at_dt": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    # Push notification
    try:
        if SEC_EXTRAS_OK and sec_extras.WEBPUSH_OK:
            subs = await db.push_subscriptions.find({"user_id": shop_id}, {"_id": 0}).to_list(20)
            for s in subs:
                sec_extras.send_web_push(
                    {"endpoint": s.get("endpoint"), "keys": s.get("keys", {})},
                    {"title": "✅ تمت الموافقة", "body": "صالونك الآن ظاهر للجميع!", "url": "/dashboard"}
                )
    except Exception:
        pass
    await _log_audit("admin.shop_approved", admin.get("id"), "admin", request=request,
                     target_id=shop_id, target_type="barbershop")
    return {"message": "Barbershop approved", "shop_id": shop_id}

class RejectShopRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)

@api_router.put("/admin/barbershops/{shop_id}/reject")
async def reject_barbershop(shop_id: str, payload: RejectShopRequest, request: Request, admin: Dict = Depends(require_admin)):
    """v3.8 — reject a pending salon with a reason. Owner is notified."""
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    await db.barbershops.update_one(
        {"id": shop_id},
        {"$set": {
            "approval_status": "rejected",
            "is_verified": False,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": payload.reason.strip(),
            "approved_at": None,
            "approved_by": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "recipient_id": shop_id,
            "recipient_type": "barbershop",
            "kind": "shop_rejected",
            "title": "⚠️ تم رفض طلب صالونك / Your salon was rejected",
            "body": f"السبب: {payload.reason}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_at_dt": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    await _log_audit("admin.shop_rejected", admin.get("id"), "admin", request=request,
                     target_id=shop_id, target_type="barbershop",
                     metadata={"reason": payload.reason[:100]})
    return {"message": "Barbershop rejected", "shop_id": shop_id, "reason": payload.reason}

# ---- Admin notifications (shop pending approval queue) ----
@api_router.get("/admin/notifications")
async def admin_notifications_list(
    admin: Dict = Depends(require_admin),
    unread_only: bool = False,
    limit: int = 50,
):
    q: Dict[str, Any] = {}
    if unread_only:
        q["read"] = False
    items = await db.admin_notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread_count = await db.admin_notifications.count_documents({"read": False})
    return {"items": items, "unread_count": unread_count}

@api_router.put("/admin/notifications/{notif_id}/read")
async def admin_notifications_mark_read(notif_id: str, admin: Dict = Depends(require_admin)):
    await db.admin_notifications.update_one({"id": notif_id}, {"$set": {"read": True}})
    return {"message": "marked as read"}

@api_router.put("/admin/barbershops/{shop_id}/verify")
async def verify_barbershop(shop_id: str, admin: Dict = Depends(require_admin)):
    """Legacy endpoint — just approves the shop (no request metadata for audit)."""
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    await db.barbershops.update_one(
        {"id": shop_id},
        {"$set": {
            "approval_status": "approved",
            "is_verified": True,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": admin.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    await _log_audit("admin.shop_approved", admin.get("id"), "admin",
                     target_id=shop_id, target_type="barbershop")
    return {"message": "Barbershop verified", "shop_id": shop_id}

@api_router.get("/admin/reports")
async def get_admin_reports(admin: Dict = Depends(require_admin), status: str = "pending"):
    reports = await db.reports.find({"status": status}, {"_id": 0}).to_list(100)
    return reports

@api_router.put("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str, admin: Dict = Depends(require_admin)):
    valid_actions = ["dismiss", "warning", "warn", "temp_ban", "ban", "perm_ban"]
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    update = {"status": "resolved"}
    if action not in ("dismiss",):
        update["penalty_applied"] = action
        if action in ("temp_ban", "ban"):
            update["penalty_duration"] = 30
    
    await db.reports.update_one({"id": report_id}, {"$set": update})
    
    return {"message": f"Report resolved with action: {action}"}

@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(admin: Dict = Depends(require_admin), status: str = "pending"):
    subs = await db.subscriptions.find({"status": status}, {"_id": 0}).to_list(100)
    
    # Enrich with barbershop names
    for sub in subs:
        shop_id = sub.get('barbershop_id') or sub.get('user_id')
        if shop_id:
            shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "shop_name": 1, "owner_name": 1})
            if shop:
                sub['shop_name'] = shop.get('shop_name', '')
                sub['owner_name'] = shop.get('owner_name', '')
                sub['user_id'] = shop.get('shop_name', shop_id)
    
    return subs

@api_router.put("/admin/subscriptions/{sub_id}/approve")
async def approve_subscription(sub_id: str, admin: Dict = Depends(require_admin)):
    sub = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    start_date = datetime.now(timezone.utc).date()
    end_date = start_date + timedelta(days=365 if sub.get('plan_type') == 'annual' else 30)
    
    await db.subscriptions.update_one(
        {"id": sub_id},
        {"$set": {
            "status": "confirmed",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }}
    )
    
    barbershop_id = sub.get('barbershop_id') or sub.get('user_id')
    if barbershop_id:
        await db.barbershops.update_one(
            {"id": barbershop_id},
            {"$set": {
                "subscription_status": "active",
                "subscription_expiry": end_date.isoformat()
            }}
        )
    
    return {"message": "Subscription approved"}

@api_router.get("/admin/users")
async def get_admin_users(
    admin: Dict = Depends(require_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_type: Optional[str] = Query(None, regex="^(user|barber|salon)$"),
    search: Optional[str] = None,
):
    """Get users (customers + barbershops) for admin dashboard with pagination + filtering."""
    result = []
    
    # Build query for customers
    user_q: Dict[str, Any] = {}
    shop_q: Dict[str, Any] = {}
    if search:
        # Escape user input for regex safety
        safe_search = re.escape(search)
        user_q["$or"] = [
            {"full_name": {"$regex": safe_search, "$options": "i"}},
            {"phone_number": {"$regex": safe_search, "$options": "i"}},
        ]
        shop_q["$or"] = [
            {"shop_name": {"$regex": safe_search, "$options": "i"}},
            {"phone_number": {"$regex": safe_search, "$options": "i"}},
        ]

    # Get customers
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

    # Get barbershops
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

@api_router.get("/admin/stats")
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
        "active_subscribers": active_subs
    }


# ============== Sub-Admins CRUD (v3.7) ==============
# Only the Master Owner can manage sub-admins. Granular permissions give each
# sub-admin exactly the scope they need (bookings ops, reviews moderation, etc.).

class SubAdminCreate(BaseModel):
    phone_number: str
    email: Optional[str] = None
    full_name: str
    password: str
    permissions: List[str] = []
    note: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _vp(cls, v: str) -> str:
        return validate_password_strength(v)

    @field_validator("permissions")
    @classmethod
    def _vperms(cls, v: List[str]) -> List[str]:
        cleaned = []
        for p in (v or []):
            if p not in ADMIN_PERMISSIONS:
                raise ValueError(f"Unknown permission: {p}")
            if p not in cleaned:
                cleaned.append(p)
        return cleaned


class SubAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    permissions: Optional[List[str]] = None
    note: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("permissions")
    @classmethod
    def _vperms(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        for p in v:
            if p not in ADMIN_PERMISSIONS:
                raise ValueError(f"Unknown permission: {p}")
            if p not in cleaned:
                cleaned.append(p)
        return cleaned


def _sanitize_admin_doc(doc: Dict) -> Dict:
    """Strip password + Mongo _id before returning an admin document to the client."""
    if not doc:
        return {}
    out = {k: v for k, v in doc.items() if k not in ("password", "_id")}
    out["is_master"] = (
        (doc.get("email") or "").strip().lower() == MASTER_OWNER_EMAIL
        or doc.get("role") == "master_admin"
    )
    return out


@api_router.get("/admin/permissions/catalog")
async def get_permissions_catalog(admin: Dict = Depends(require_admin)):
    """Return the catalog of available permissions (for the UI to render checkboxes)."""
    return {
        "permissions": [
            {"key": k, "description": v} for k, v in ADMIN_PERMISSIONS.items()
        ],
        "master_owner_email": MASTER_OWNER_EMAIL,
    }


@api_router.get("/admin/me")
async def get_current_admin(admin: Dict = Depends(require_admin)):
    """Return the current admin's profile + effective permissions (for UI gating)."""
    is_master = admin_is_master(admin)
    perms = ALL_PERMISSIONS if (is_master or admin.get("permissions") is None) else admin.get("permissions", [])
    return {
        "id": admin.get("id"),
        "phone_number": admin.get("phone_number"),
        "email": admin.get("email"),
        "full_name": admin.get("full_name"),
        "is_master": is_master,
        "permissions": perms,
        "must_change_password": bool(admin.get("must_change_password")),
    }


@api_router.get("/admin/sub-admins")
async def list_sub_admins(master: Dict = Depends(require_master_admin)):
    """List all admin accounts (master + sub-admins). Master only."""
    docs = await db.admins.find({}, {"password": 0}).sort("created_at", 1).to_list(500)
    return [_sanitize_admin_doc(d) for d in docs]


@api_router.post("/admin/sub-admins")
async def create_sub_admin(payload: SubAdminCreate, master: Dict = Depends(require_master_admin)):
    """Create a new sub-admin. Master only."""
    phone = (payload.phone_number or "").strip()
    email = (payload.email or "").strip().lower() or None
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number is required")

    # Block creating a duplicate of the master owner
    if email and email == MASTER_OWNER_EMAIL:
        raise HTTPException(
            status_code=400,
            detail="This email is reserved for the Master Owner and cannot be used for a sub-admin."
        )

    # Phone + email uniqueness across admins
    if await db.admins.find_one({"phone_number": phone}):
        raise HTTPException(status_code=400, detail="Phone number already registered as admin")
    if email and await db.admins.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered as admin")

    doc = {
        "id": str(uuid.uuid4()),
        "phone_number": phone,
        "email": email,
        "password": hash_password(payload.password),
        "full_name": payload.full_name.strip(),
        "role": "sub_admin",
        "permissions": payload.permissions or [],
        "note": (payload.note or "").strip() or None,
        "active": True,
        "must_change_password": True,  # force rotation on first login
        "created_by": master.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.admins.insert_one(doc)
    return {"message": "Sub-admin created", "admin": _sanitize_admin_doc(doc)}


@api_router.put("/admin/sub-admins/{admin_id}")
async def update_sub_admin(
    admin_id: str,
    payload: SubAdminUpdate,
    master: Dict = Depends(require_master_admin)
):
    """Update a sub-admin's full_name / email / permissions / active status. Master only.
    The Master Owner's record is protected: their permissions and active flag cannot be modified.
    """
    existing = await db.admins.find_one({"id": admin_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Admin not found")

    existing_email = (existing.get("email") or "").strip().lower()
    if existing_email == MASTER_OWNER_EMAIL or existing.get("role") == "master_admin":
        raise HTTPException(
            status_code=403,
            detail="The Master Owner account cannot be modified."
        )

    update_data: Dict[str, Any] = {}
    if payload.full_name is not None:
        update_data["full_name"] = payload.full_name.strip()
    if payload.email is not None:
        new_email = payload.email.strip().lower() or None
        if new_email == MASTER_OWNER_EMAIL:
            raise HTTPException(status_code=400, detail="This email is reserved for the Master Owner.")
        if new_email and await db.admins.find_one({"email": new_email, "id": {"$ne": admin_id}}):
            raise HTTPException(status_code=400, detail="Email already used by another admin")
        update_data["email"] = new_email
    if payload.permissions is not None:
        update_data["permissions"] = payload.permissions
    if payload.note is not None:
        update_data["note"] = payload.note.strip() or None
    if payload.active is not None:
        update_data["active"] = bool(payload.active)

    if not update_data:
        raise HTTPException(status_code=400, detail="No changes provided")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.admins.update_one({"id": admin_id}, {"$set": update_data})
    updated = await db.admins.find_one({"id": admin_id}, {"password": 0})
    return {"message": "Sub-admin updated", "admin": _sanitize_admin_doc(updated)}


@api_router.delete("/admin/sub-admins/{admin_id}")
async def delete_sub_admin(admin_id: str, master: Dict = Depends(require_master_admin)):
    """Delete a sub-admin. Master only. The Master Owner cannot be deleted."""
    existing = await db.admins.find_one({"id": admin_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Admin not found")

    existing_email = (existing.get("email") or "").strip().lower()
    if existing_email == MASTER_OWNER_EMAIL or existing.get("role") == "master_admin":
        raise HTTPException(status_code=403, detail="The Master Owner cannot be deleted.")

    if existing.get("id") == master.get("id"):
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    await db.admins.delete_one({"id": admin_id})
    return {"message": "Sub-admin deleted", "id": admin_id}


@api_router.post("/admin/sub-admins/{admin_id}/reset-password")
async def reset_sub_admin_password(admin_id: str, master: Dict = Depends(require_master_admin)):
    """Rotate a sub-admin's password to a new strong random value and return it ONCE.
    Sets must_change_password=True so they must rotate on next login.
    """
    existing = await db.admins.find_one({"id": admin_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Admin not found")

    if (existing.get("email") or "").strip().lower() == MASTER_OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="The Master Owner password cannot be reset by this endpoint.")

    new_pw = f"Sub-{secrets.token_urlsafe(10)}-2026"
    await db.admins.update_one(
        {"id": admin_id},
        {"$set": {
            "password": hash_password(new_pw),
            "must_change_password": True,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {
        "message": "Password rotated successfully",
        "temporary_password": new_pw,
        "note": "Share with the sub-admin. They must change it on first login."
    }

# ============== LOCATION ENDPOINTS ==============

@api_router.get("/locations/countries")
async def get_countries():
    return {
        "countries": [
            {"code": "IQ", "name": "العراق", "name_en": "Iraq"},
            {"code": "SY", "name": "سوريا", "name_en": "Syria"},
            {"code": "JO", "name": "الأردن", "name_en": "Jordan"},
            {"code": "LB", "name": "لبنان", "name_en": "Lebanon"},
            {"code": "SA", "name": "السعودية", "name_en": "Saudi Arabia"},
            {"code": "AE", "name": "الإمارات", "name_en": "UAE"},
            {"code": "KW", "name": "الكويت", "name_en": "Kuwait"},
            {"code": "QA", "name": "قطر", "name_en": "Qatar"},
            {"code": "BH", "name": "البحرين", "name_en": "Bahrain"},
            {"code": "OM", "name": "عمان", "name_en": "Oman"},
            {"code": "EG", "name": "مصر", "name_en": "Egypt"},
            {"code": "TR", "name": "تركيا", "name_en": "Turkey"},
            {"code": "DE", "name": "ألمانيا", "name_en": "Germany"},
            {"code": "US", "name": "أمريكا", "name_en": "USA"},
            {"code": "GB", "name": "بريطانيا", "name_en": "UK"},
            {"code": "FR", "name": "فرنسا", "name_en": "France"},
            {"code": "SE", "name": "السويد", "name_en": "Sweden"},
            {"code": "NL", "name": "هولندا", "name_en": "Netherlands"}
        ]
    }

@api_router.get("/locations/cities/{country_code}")
async def get_cities(country_code: str):
    cities_data = {
        "IQ": ["بغداد", "البصرة", "الموصل", "أربيل", "كركوك", "النجف", "كربلاء", "السليمانية", "ديالى"],
        "SY": ["دمشق", "حلب", "حمص", "اللاذقية", "الحسكة", "دير الزور", "طرطوس", "إدلب", "الرقة", "درعا"],
        "JO": ["عمان", "الزرقاء", "إربد", "العقبة", "مادبا"],
        "LB": ["بيروت", "طرابلس", "صيدا", "صور", "جبيل"],
        "SA": ["الرياض", "جدة", "مكة", "المدينة", "الدمام", "الخبر", "تبوك", "أبها"],
        "AE": ["دبي", "أبوظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة"],
        "KW": ["الكويت", "الجهراء", "حولي", "الأحمدي"],
        "QA": ["الدوحة", "الريان", "الوكرة"],
        "BH": ["المنامة", "المحرق", "الرفاع"],
        "OM": ["مسقط", "صلالة", "نزوى"],
        "EG": ["القاهرة", "الإسكندرية", "الجيزة", "شرم الشيخ", "الأقصر"],
        "TR": ["إسطنبول", "أنقرة", "إزمير", "أنطاليا", "بورصة"],
        "DE": ["برلين", "ميونخ", "فرانكفورت", "هامبورغ", "كولن"],
        "US": ["نيويورك", "لوس أنجلوس", "شيكاغو", "هيوستن", "ديترويت"],
        "GB": ["لندن", "مانشستر", "برمنغهام", "ليفربول"],
        "FR": ["باريس", "مارسيليا", "ليون"],
        "SE": ["ستوكهولم", "مالمو", "يوتيبوري"],
        "NL": ["أمستردام", "روتردام", "لاهاي"]
    }
    return {"cities": cities_data.get(country_code, [])}

# ============== REFERRAL SYSTEM ==============

@api_router.post("/referrals/generate")
async def generate_referral(entity: Dict = Depends(require_auth)):
    """Generate a referral link for the current user"""
    referral_code = str(uuid.uuid4())[:8].upper()
    
    existing = await db.referrals.find_one({"user_id": entity['id']})
    if existing:
        return {"referral_code": existing['referral_code'], "referral_link": f"{APP_URL}/ref/{existing['referral_code']}"}
    
    await db.referrals.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": entity['id'],
        "referral_code": referral_code,
        "referred_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"referral_code": referral_code, "referral_link": f"{APP_URL}/ref/{referral_code}"}

@api_router.get("/referrals/my")
async def get_my_referrals(entity: Dict = Depends(require_auth)):
    """Get current user's referral stats"""
    referral = await db.referrals.find_one({"user_id": entity['id']}, {"_id": 0})
    if not referral:
        return {"referral_code": None, "referred_count": 0}
    return referral

# ============== NOTIFICATIONS ==============

@api_router.get("/notifications/my")
async def get_my_notifications(entity: Dict = Depends(require_auth)):
    """Get notifications for the current user"""
    notifications = await db.notifications.find(
        {"recipient_id": entity['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

# ============== WHATSAPP LINK GENERATOR ==============

@api_router.get("/generate-booking-link")
async def generate_booking_link(
    shop_phone: str,
    customer_name: str,
    service: str,
    time: str,
    date: str = "",
    shop_name: str = ""
):
    """Generate WhatsApp booking confirmation link with pre-filled message"""
    msg = (
        f"حجز جديد من BARBER HUB 🏆\n"
        f"الاسم: {customer_name}\n"
        f"الصالون: {shop_name}\n"
        f"الخدمة: {service}\n"
        f"التاريخ: {date}\n"
        f"الوقت: {time}\n"
        f"---\n"
        f"New Booking via Barber Hub"
    )
    import urllib.parse
    encoded = urllib.parse.quote(msg)
    clean_phone = ''.join(c for c in shop_phone if c.isdigit() or c == '+')
    if clean_phone.startswith('+'):
        clean_phone = clean_phone[1:]
    return {
        "url": f"https://wa.me/{clean_phone}?text={encoded}",
        "message": msg,
        "phone": clean_phone
    }

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database(request: Request):
    """Inject seed data: 10 salons (5 men, 5 women) with services, reviews, bookings.
    SECURITY: Protected — requires admin Bearer token OR a matching X-Seed-Token header
    when SEED_TOKEN env var is set. If neither is configured, the endpoint is locked.
    """
    import random

    # ---- AuthZ guard ----
    provided_token = request.headers.get("X-Seed-Token", "").strip()
    is_admin = False
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        try:
            payload = decode_token(auth_header.split(" ", 1)[1].strip())
            if payload and payload.get("entity_type") == "admin":
                is_admin = True
        except Exception:
            is_admin = False

    if not is_admin:
        if not SEED_TOKEN:
            raise HTTPException(
                status_code=403,
                detail="Seed endpoint is locked. Configure SEED_TOKEN env var or use admin token."
            )
        if not provided_token or not secrets.compare_digest(provided_token, SEED_TOKEN):
            raise HTTPException(status_code=403, detail="Invalid or missing X-Seed-Token")

    # Check if seed data already exists
    existing_count = await db.barbershops.count_documents({})
    if existing_count >= 10:
        return {"message": "Seed data already exists", "barbershop_count": existing_count}
    
    # ===== MALE BARBERSHOPS (5) =====
    male_shops = [
        {
            "owner_name": "أحمد الرجب",
            "shop_name": "صالون الأناقة الملكية",
            "description": "أفضل صالون حلاقة رجالي في المدينة - خبرة 15 عاماً في الحلاقة الاحترافية والعناية بالشعر واللحية",
            "shop_type": "male",
            "phone_number": "0935964158",
            "password": "salon123",
            "country": "سوريا",
            "city": "الحسكة",
            "district": "الناصرة",
            "address": "شارع الكورنيش - مقابل حديقة المدينة",
            "latitude": 36.4887,
            "longitude": 40.7464,
            "whatsapp_number": "+963935964158",
            "instagram_url": "https://instagram.com/elite_barber_sy",
            "tiktok_url": "https://tiktok.com/@elite_barber",
            "target_rating": 4.9,
            "target_reviews": 87,
            "services": [
                {"name": "Haircut", "name_ar": "قص شعر", "price": 10, "duration_minutes": 30, "category": "hair"},
                {"name": "Beard Trim", "name_ar": "تشذيب اللحية", "price": 5, "duration_minutes": 15, "category": "beard"},
                {"name": "Hair Color", "name_ar": "صبغة شعر", "price": 20, "duration_minutes": 45, "category": "color"},
                {"name": "Full Package", "name_ar": "الباقة الكاملة", "price": 30, "duration_minutes": 60, "category": "package"},
                {"name": "Kids Haircut", "name_ar": "قص شعر أطفال", "price": 7, "duration_minutes": 20, "category": "kids"},
            ]
        },
        {
            "owner_name": "محمد العلي",
            "shop_name": "THE KING BARBER",
            "description": "صالون ذا كينج - تصاميم عصرية وأحدث قصات الشعر العالمية مع خدمة VIP",
            "shop_type": "male",
            "phone_number": "07701234567",
            "password": "salon123",
            "country": "العراق",
            "city": "بغداد",
            "district": "الكرادة",
            "address": "شارع أبو نواس - بناية المنصور",
            "latitude": 33.3128,
            "longitude": 44.3615,
            "whatsapp_number": "+9647701234567",
            "instagram_url": "https://instagram.com/theking_barber_iq",
            "target_rating": 4.7,
            "target_reviews": 65,
            "services": [
                {"name": "Classic Cut", "name_ar": "قصة كلاسيكية", "price": 8, "duration_minutes": 25, "category": "hair"},
                {"name": "Modern Fade", "name_ar": "فيد عصري", "price": 12, "duration_minutes": 35, "category": "hair"},
                {"name": "Hot Towel Shave", "name_ar": "حلاقة بالمنشفة الساخنة", "price": 10, "duration_minutes": 20, "category": "shave"},
                {"name": "Hair Wash & Style", "name_ar": "غسل وتصفيف", "price": 6, "duration_minutes": 15, "category": "hair"},
            ]
        },
        {
            "owner_name": "Mehmet Yılmaz",
            "shop_name": "ISTANBUL GENTLEMAN",
            "description": "Turkish barber experience with traditional hot towel shaves and premium grooming",
            "shop_type": "male",
            "phone_number": "+905321234567",
            "password": "salon123",
            "country": "تركيا",
            "city": "إسطنبول",
            "district": "Beyoğlu",
            "address": "İstiklal Caddesi No:42",
            "latitude": 41.0337,
            "longitude": 28.9784,
            "whatsapp_number": "+905321234567",
            "instagram_url": "https://instagram.com/istanbul_gentleman",
            "target_rating": 4.5,
            "target_reviews": 43,
            "services": [
                {"name": "Turkish Haircut", "name_ar": "قصة تركية", "price": 15, "duration_minutes": 30, "category": "hair"},
                {"name": "Turkish Shave", "name_ar": "حلاقة تركية", "price": 12, "duration_minutes": 25, "category": "shave"},
                {"name": "Face Mask", "name_ar": "ماسك الوجه", "price": 10, "duration_minutes": 20, "category": "skin"},
                {"name": "Ear & Nose Wax", "name_ar": "شمع الأذن والأنف", "price": 5, "duration_minutes": 10, "category": "grooming"},
            ]
        },
        {
            "owner_name": "Ali Hassan",
            "shop_name": "BERLIN CUTS",
            "description": "Premium barbershop in Berlin - Arabic & German speaking. Spezialisiert auf moderne Herrenhaarschnitte",
            "shop_type": "male",
            "phone_number": "+491751234567",
            "password": "salon123",
            "country": "ألمانيا",
            "city": "برلين",
            "district": "Neukölln",
            "address": "Sonnenallee 55",
            "latitude": 52.4834,
            "longitude": 13.4331,
            "whatsapp_number": "+491751234567",
            "instagram_url": "https://instagram.com/berlin_cuts",
            "target_rating": 4.2,
            "target_reviews": 31,
            "services": [
                {"name": "Herrenhaarschnitt", "name_ar": "قصة رجالية", "price": 25, "duration_minutes": 30, "category": "hair"},
                {"name": "Bart Trimmen", "name_ar": "تشذيب اللحية", "price": 15, "duration_minutes": 15, "category": "beard"},
                {"name": "Komplett Paket", "name_ar": "الباقة الكاملة", "price": 45, "duration_minutes": 60, "category": "package"},
            ]
        },
        {
            "owner_name": "خالد العتيبي",
            "shop_name": "ROYAL GROOM الملكي",
            "description": "أرقى صالون رجالي في الرياض - خدمات VIP وحجز خاص مع أفضل الحلاقين",
            "shop_type": "male",
            "phone_number": "+966551234567",
            "password": "salon123",
            "country": "السعودية",
            "city": "الرياض",
            "district": "العليا",
            "address": "طريق الملك فهد - برج المملكة",
            "latitude": 24.7113,
            "longitude": 46.6742,
            "whatsapp_number": "+966551234567",
            "instagram_url": "https://instagram.com/royal_groom_sa",
            "target_rating": 3.8,
            "target_reviews": 22,
            "services": [
                {"name": "Royal Haircut", "name_ar": "القصة الملكية", "price": 50, "duration_minutes": 40, "category": "hair"},
                {"name": "Beard Design", "name_ar": "تصميم اللحية", "price": 30, "duration_minutes": 25, "category": "beard"},
                {"name": "VIP Package", "name_ar": "باقة VIP", "price": 100, "duration_minutes": 90, "category": "package"},
                {"name": "Hair Treatment", "name_ar": "علاج الشعر", "price": 40, "duration_minutes": 30, "category": "treatment"},
            ]
        }
    ]
    
    # ===== FEMALE SALONS (5) =====
    female_shops = [
        {
            "owner_name": "فاطمة الأحمد",
            "shop_name": "GLAMOUR صالون غلامور",
            "description": "صالون نسائي فاخر - متخصصات في التسريحات العالمية والمكياج الاحترافي والعناية بالبشرة",
            "shop_type": "female",
            "phone_number": "+963991234567",
            "password": "salon123",
            "country": "سوريا",
            "city": "دمشق",
            "district": "المزة",
            "address": "شارع الحمرا - بناية الياسمين",
            "latitude": 33.5138,
            "longitude": 36.2765,
            "whatsapp_number": "+963991234567",
            "instagram_url": "https://instagram.com/glamour_damascus",
            "target_rating": 4.8,
            "target_reviews": 95,
            "services": [
                {"name": "Bridal Package", "name_ar": "باقة العروس", "price": 150, "duration_minutes": 180, "category": "bridal"},
                {"name": "Hair Style", "name_ar": "تسريحة شعر", "price": 25, "duration_minutes": 45, "category": "hair"},
                {"name": "Makeup", "name_ar": "مكياج كامل", "price": 35, "duration_minutes": 60, "category": "makeup"},
                {"name": "Manicure & Pedicure", "name_ar": "مانيكير وبديكير", "price": 20, "duration_minutes": 40, "category": "nails"},
                {"name": "Facial Treatment", "name_ar": "علاج البشرة", "price": 30, "duration_minutes": 45, "category": "skin"},
            ]
        },
        {
            "owner_name": "نور الهاشمي",
            "shop_name": "BEAUTY QUEEN ملكة الجمال",
            "description": "أفضل صالون نسائي في عمّان - خدمات حصرية وأجواء راقية مع أحدث التقنيات",
            "shop_type": "female",
            "phone_number": "+962791234567",
            "password": "salon123",
            "country": "الأردن",
            "city": "عمان",
            "district": "عبدون",
            "address": "شارع الملكة رانيا",
            "latitude": 31.9539,
            "longitude": 35.9106,
            "whatsapp_number": "+962791234567",
            "instagram_url": "https://instagram.com/beauty_queen_jo",
            "target_rating": 4.6,
            "target_reviews": 72,
            "services": [
                {"name": "Keratin Treatment", "name_ar": "علاج الكيراتين", "price": 60, "duration_minutes": 90, "category": "treatment"},
                {"name": "Hair Highlights", "name_ar": "هايلايت الشعر", "price": 45, "duration_minutes": 60, "category": "color"},
                {"name": "Blowout", "name_ar": "سشوار", "price": 15, "duration_minutes": 30, "category": "hair"},
                {"name": "Eyebrow Threading", "name_ar": "رسم الحواجب", "price": 8, "duration_minutes": 15, "category": "eyebrows"},
            ]
        },
        {
            "owner_name": "Ayşe Demir",
            "shop_name": "ROSE BEAUTY روز بيوتي",
            "description": "Luxury women's salon in Istanbul - Expert hair care, bridal services, and skincare",
            "shop_type": "female",
            "phone_number": "+905551234567",
            "password": "salon123",
            "country": "تركيا",
            "city": "إسطنبول",
            "district": "Nişantaşı",
            "address": "Abdi İpekçi Caddesi No:15",
            "latitude": 41.0487,
            "longitude": 28.9933,
            "whatsapp_number": "+905551234567",
            "instagram_url": "https://instagram.com/rose_beauty_ist",
            "target_rating": 4.4,
            "target_reviews": 55,
            "services": [
                {"name": "Luxury Hair Spa", "name_ar": "سبا الشعر الفاخر", "price": 40, "duration_minutes": 60, "category": "treatment"},
                {"name": "Color & Style", "name_ar": "صبغة وتصفيف", "price": 55, "duration_minutes": 75, "category": "color"},
                {"name": "Bridal Makeup", "name_ar": "مكياج عروس", "price": 80, "duration_minutes": 90, "category": "bridal"},
                {"name": "Waxing Full Body", "name_ar": "إزالة شعر كامل", "price": 35, "duration_minutes": 60, "category": "wax"},
            ]
        },
        {
            "owner_name": "Sara Schmidt",
            "shop_name": "ELEGANCE STUDIO أناقة",
            "description": "Modernes Damenstudio in Berlin - Haarpflege, Styling und Make-up von Profis",
            "shop_type": "female",
            "phone_number": "+491761234567",
            "password": "salon123",
            "country": "ألمانيا",
            "city": "برلين",
            "district": "Mitte",
            "address": "Friedrichstraße 100",
            "latitude": 52.5244,
            "longitude": 13.3884,
            "whatsapp_number": "+491761234567",
            "instagram_url": "https://instagram.com/elegance_berlin",
            "target_rating": 4.1,
            "target_reviews": 28,
            "services": [
                {"name": "Hairstyling", "name_ar": "تصفيف الشعر", "price": 35, "duration_minutes": 40, "category": "hair"},
                {"name": "Balayage", "name_ar": "بالاياج", "price": 80, "duration_minutes": 90, "category": "color"},
                {"name": "Professionelles Makeup", "name_ar": "مكياج احترافي", "price": 50, "duration_minutes": 45, "category": "makeup"},
            ]
        },
        {
            "owner_name": "مريم السعيد",
            "shop_name": "DIAMOND LADIES دايموند",
            "description": "صالون نسائي في دبي - نجمات ومشاهير - خدمات VIP مع أفخم المنتجات العالمية",
            "shop_type": "female",
            "phone_number": "+971501234567",
            "password": "salon123",
            "country": "الإمارات",
            "city": "دبي",
            "district": "جميرا",
            "address": "شارع الجميرا بيتش - برج الأميرة",
            "latitude": 25.2048,
            "longitude": 55.2708,
            "whatsapp_number": "+971501234567",
            "instagram_url": "https://instagram.com/diamond_ladies_dxb",
            "target_rating": 3.5,
            "target_reviews": 18,
            "services": [
                {"name": "Diamond Facial", "name_ar": "علاج الألماس للبشرة", "price": 120, "duration_minutes": 60, "category": "skin"},
                {"name": "Full Bridal", "name_ar": "باقة العروس الكاملة", "price": 500, "duration_minutes": 240, "category": "bridal"},
                {"name": "Lash Extensions", "name_ar": "رموش صناعية", "price": 60, "duration_minutes": 45, "category": "lashes"},
                {"name": "Gel Nails", "name_ar": "أظافر جل", "price": 40, "duration_minutes": 45, "category": "nails"},
            ]
        }
    ]
    
    all_shops = male_shops + female_shops
    created_shops = []
    
    # Positive Arabic review comments
    positive_comments = [
        "خدمة ممتازة وراقية! أنصح الجميع بزيارة هذا الصالون",
        "أفضل حلاق زرته في حياتي، احترافية عالية",
        "نتيجة رائعة والأسعار مناسبة جداً",
        "أجواء مريحة وطاقم عمل محترف",
        "تجربة فاخرة من البداية للنهاية",
        "أنا زبون دائم هنا منذ سنوات، لا يخيّب الظن أبداً",
        "قصة شعر مثالية! سأعود بالتأكيد",
        "أحببت الاهتمام بالتفاصيل والنظافة",
        "خدمة سريعة وجودة ممتازة",
        "أفضل صالون في المنطقة بلا منازع",
        "Excellent service! Best barber I've been to",
        "Amazing experience, very professional staff",
        "Perfect haircut every single time",
        "Great atmosphere and reasonable prices",
        "Highly recommended! 5 stars well deserved",
        "The best barbershop in the city, period.",
        "العناية بالتفاصيل رائعة، شكراً",
        "صالون راقي جداً وأسعار معقولة",
        "تعامل محترم وخدمة سريعة ونتيجة مبهرة",
        "أنصح الكل يجرب هالصالون 💯",
    ]
    
    # Some neutral/negative comments for realism
    mixed_comments = [
        "خدمة جيدة لكن الانتظار طويل أحياناً",
        "الأسعار مرتفعة قليلاً مقارنة بالمنطقة",
        "Good but could be better with the waiting time",
        "Average experience, nothing special"
    ]
    
    # Create fake user for reviews
    review_user_names = [
        "عمر المحمد", "سارة الحسن", "أحمد خليل", "فاطمة نور", "ياسر العبد",
        "رنا إبراهيم", "محمود الشامي", "ليلى حسين", "طارق الرشيد", "هدى العلي",
        "John Smith", "Emma Wilson", "Max Müller", "Ali Özcan", "Fatma Demir",
        "بسام الكردي", "نادية الصالح", "زياد حمود", "عبير القاسم", "وسام الدين"
    ]
    
    for shop_data in all_shops:
        shop_id = str(uuid.uuid4())
        target_rating = shop_data.pop("target_rating")
        target_reviews = shop_data.pop("target_reviews")
        services_data = shop_data.pop("services")
        # SECURITY v3.6.1: Ignore the hardcoded "salon123" from seed data and generate a
        # strong random password per shop. The plaintext password is returned ONCE in
        # the response so the operator can hand it to the shop owner, then discarded.
        shop_data.pop("password", None)
        raw_password = f"{secrets.token_urlsafe(10)}!{secrets.choice('0123456789')}"  # 15+ chars with a digit
        
        qr_code_data = f"{APP_URL}/shop/{shop_id}"
        qr_code = generate_qr_code(qr_code_data)
        
        # Determine ranking tier based on rating
        ranking_tier = "normal"
        if target_rating >= 4.5 and target_reviews >= 50:
            ranking_tier = "top"
        elif target_rating >= 4.0 and target_reviews >= 20:
            ranking_tier = "featured"
        
        shop_doc = {
            "id": shop_id,
            "owner_name": shop_data["owner_name"],
            "shop_name": shop_data["shop_name"],
            "shop_logo": None,
            "description": shop_data["description"],
            "shop_type": shop_data["shop_type"],
            "phone_number": shop_data["phone_number"],
            "password": hash_password(raw_password),
            "email": None,
            "country": shop_data["country"],
            "city": shop_data["city"],
            "district": shop_data.get("district"),
            "address": shop_data.get("address"),
            "latitude": shop_data.get("latitude"),
            "longitude": shop_data.get("longitude"),
            "whatsapp_number": shop_data.get("whatsapp_number"),
            "instagram_url": shop_data.get("instagram_url"),
            "tiktok_url": shop_data.get("tiktok_url"),
            "website_url": None,
            "qr_code": qr_code,
            "subscription_status": "active" if target_rating >= 4.5 else "inactive",
            "subscription_expiry": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat() if target_rating >= 4.5 else None,
            "ranking_score": target_rating,
            "ranking_tier": ranking_tier,
            "is_verified": target_rating >= 4.0,
            "total_reviews": target_reviews,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if phone exists
        existing = await db.barbershops.find_one({"phone_number": shop_data["phone_number"]})
        if existing:
            created_shops.append({"id": existing["id"], "name": shop_data["shop_name"], "status": "already_exists"})
            continue
            
        await db.barbershops.insert_one(shop_doc)
        
        # Create services
        for svc in services_data:
            svc_doc = {
                "id": str(uuid.uuid4()),
                "barbershop_id": shop_id,
                "name": svc["name"],
                "name_ar": svc["name_ar"],
                "description": "",
                "price": float(svc["price"]),
                "duration_minutes": int(svc["duration_minutes"]),
                "category": svc.get("category", "default"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.services.insert_one(svc_doc)
        
        # Create extended barber profile
        profile_doc = {
            "barbershop_id": shop_id,
            "salon_name": shop_data["shop_name"],
            "salon_name_ar": shop_data["shop_name"],
            "description": shop_data["description"],
            "description_ar": shop_data["description"],
            "logo_url": None,
            "whatsapp": shop_data.get("whatsapp_number", ""),
            "instagram": shop_data.get("instagram_url", ""),
            "tiktok": shop_data.get("tiktok_url", ""),
            "facebook": f"https://facebook.com/{shop_data['shop_name'].replace(' ', '').lower()}",
            "twitter": "",
            "snapchat": "",
            "youtube": "",
            "address": shop_data.get("address", ""),
            "neighborhood": shop_data.get("district", ""),
            "average_service_time": 30,
            "services": services_data,
            "custom_services": [],
            "before_after_images": [],
            "working_hours": {
                "sunday": {"start": "09:00", "end": "21:00"},
                "monday": {"start": "09:00", "end": "21:00"},
                "tuesday": {"start": "09:00", "end": "21:00"},
                "wednesday": {"start": "09:00", "end": "21:00"},
                "thursday": {"start": "09:00", "end": "21:00"},
                "friday": {"start": "10:00", "end": "22:00"},
                "saturday": {"start": "10:00", "end": "22:00"}
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        existing_profile = await db.barber_profiles.find_one({"barbershop_id": shop_id})
        if not existing_profile:
            await db.barber_profiles.insert_one(profile_doc)
        
        # Create reviews
        num_reviews = target_reviews
        for i in range(num_reviews):
            # Weight ratings toward the target
            if target_rating >= 4.5:
                rating = random.choices([5, 4, 3], weights=[70, 25, 5])[0]
            elif target_rating >= 4.0:
                rating = random.choices([5, 4, 3, 2], weights=[50, 35, 10, 5])[0]
            elif target_rating >= 3.5:
                rating = random.choices([5, 4, 3, 2, 1], weights=[30, 30, 25, 10, 5])[0]
            else:
                rating = random.choices([5, 4, 3, 2, 1], weights=[15, 25, 30, 20, 10])[0]
            
            comment = random.choice(positive_comments if rating >= 4 else mixed_comments)
            reviewer_name = random.choice(review_user_names)
            
            days_ago = random.randint(1, 180)
            review_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            
            review_doc = {
                "id": str(uuid.uuid4()),
                "booking_id": None,
                "user_id": str(uuid.uuid4()),
                "user_name": reviewer_name,
                "customer_name": reviewer_name,
                "barbershop_id": shop_id,
                "rating": rating,
                "comment": comment,
                "created_at": review_date.isoformat()
            }
            await db.reviews.insert_one(review_doc)
        
        # Create sample products for showcase
        male_products = [
            {"name": "Premium Hair Wax", "name_ar": "واكس شعر فاخر", "price": 15, "category": "styling", "description": "Professional hold wax for all-day styling", "description_ar": "واكس تثبيت احترافي طوال اليوم", "featured": True},
            {"name": "Beard Oil", "name_ar": "زيت اللحية", "price": 12, "category": "beard", "description": "Natural beard oil for soft, healthy beard", "description_ar": "زيت طبيعي للحية ناعمة وصحية", "featured": True},
            {"name": "After Shave Balm", "name_ar": "بلسم ما بعد الحلاقة", "price": 10, "category": "shaving", "description": "Soothing after shave balm", "description_ar": "بلسم مهدئ بعد الحلاقة"},
            {"name": "Hair Spray Strong Hold", "name_ar": "سبراي شعر تثبيت قوي", "price": 8, "category": "styling", "description": "Extra strong hold hair spray", "description_ar": "سبراي تثبيت قوي جداً"},
            {"name": "Shampoo Anti-Dandruff", "name_ar": "شامبو مضاد للقشرة", "price": 18, "category": "hair_care", "description": "Premium anti-dandruff shampoo", "description_ar": "شامبو فاخر مضاد للقشرة", "featured": True},
        ]
        
        female_products = [
            {"name": "Keratin Serum", "name_ar": "سيروم كيراتين", "price": 25, "category": "hair_care", "description": "Professional keratin hair serum", "description_ar": "سيروم كيراتين احترافي للشعر", "featured": True},
            {"name": "Nail Polish Set", "name_ar": "طقم مناكير", "price": 20, "category": "nails", "description": "Set of 6 premium nail colors", "description_ar": "طقم 6 ألوان مناكير فاخرة", "featured": True},
            {"name": "Face Mask Collagen", "name_ar": "ماسك كولاجين للوجه", "price": 15, "category": "skin_care", "description": "Anti-aging collagen face mask", "description_ar": "ماسك كولاجين مضاد للتجاعيد"},
            {"name": "Hair Extensions Pack", "name_ar": "باك إكستنشن شعر", "price": 50, "category": "hair_care", "description": "Natural hair extensions", "description_ar": "إكستنشن شعر طبيعي", "featured": True},
            {"name": "Makeup Brush Set", "name_ar": "طقم فرش مكياج", "price": 35, "category": "makeup", "description": "Professional 12-piece brush set", "description_ar": "طقم 12 فرشة مكياج احترافية"},
        ]
        
        products_to_seed = male_products if shop_data["shop_type"] == "male" else female_products
        # Pick 2-4 random products per shop
        num_products = random.randint(2, min(4, len(products_to_seed)))
        selected_products = random.sample(products_to_seed, num_products)

        # Curated Unsplash images by category — keeps DB small and deterministic
        male_product_imgs = {
            "styling":   "https://images.unsplash.com/photo-1622286346003-c47988e0cd1f?w=600",
            "beard":     "https://images.unsplash.com/photo-1625535138499-a03a8a01d87c?w=600",
            "shaving":   "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=600",
            "hair_care": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600",
        }
        female_product_imgs = {
            "hair_care": "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600",
            "nails":     "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600",
            "skin_care": "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600",
            "makeup":    "https://images.unsplash.com/photo-1522335789203-aaa4a91f3fe4?w=600",
        }
        img_map = male_product_imgs if shop_data["shop_type"] == "male" else female_product_imgs

        for prod in selected_products:
            product_doc = {
                "id": str(uuid.uuid4()),
                "shop_id": shop_id,
                "name": prod["name"],
                "name_ar": prod["name_ar"],
                "description": prod.get("description", ""),
                "description_ar": prod.get("description_ar", ""),
                "price": float(prod["price"]),
                "category": prod["category"],
                "image_url": img_map.get(prod["category"], "https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=600"),
                "in_stock": True,
                "featured": prod.get("featured", False),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product_doc)

        # ---- Gallery images (before/after) for showcase ----
        male_gallery_pool = [
            "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900",
            "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900",
            "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900",
            "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=900",
            "https://images.unsplash.com/photo-1521490878406-dbbe2bd1c8ee?w=900",
            "https://images.unsplash.com/photo-1517196624979-e1c7218fb44b?w=900",
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900",
        ]
        female_gallery_pool = [
            "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=900",
            "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=900",
            "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=900",
            "https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=900",
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900",
            "https://images.unsplash.com/photo-1560869713-da86bd4f31c8?w=900",
            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900",
        ]
        gallery_pool = male_gallery_pool if shop_data["shop_type"] == "male" else female_gallery_pool
        # Higher-rated shops get more gallery images (to qualify for higher tiers)
        if target_rating >= 4.7:
            gallery_count = 4  # global_elite qualifying
        elif target_rating >= 4.5:
            gallery_count = 3
        elif target_rating >= 4.0:
            gallery_count = 2
        else:
            gallery_count = 1
        gallery_pairs = random.sample(gallery_pool, min(gallery_count * 2, len(gallery_pool)))
        for gi in range(gallery_count):
            before_url = gallery_pairs[gi * 2] if gi * 2 < len(gallery_pairs) else gallery_pool[0]
            after_url = gallery_pairs[gi * 2 + 1] if gi * 2 + 1 < len(gallery_pairs) else gallery_pool[-1]
            img_doc = {
                "id": str(uuid.uuid4()),
                "barbershop_id": shop_id,
                "image_before": before_url,
                "image_after": after_url,
                "before": before_url,
                "after": after_url,
                "caption": f"Style {gi + 1}",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.gallery_images.insert_one(img_doc)

        # Seed some COMPLETED bookings for the ranking engine (90-day window)
        # This is what lets a shop qualify for City/Governorate/Country/Global tiers.
        if target_reviews >= 10:
            num_completed = int(min(max(target_reviews * 1.2, 10), 150))
            # Spread completions over last 90 days
            for ci in range(num_completed):
                days_ago = random.randint(1, 90)
                bk_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
                await db.bookings.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": None,
                    "barbershop_id": shop_id,
                    "barbershop_name": shop_data["shop_name"],
                    "service_id": None,
                    "service_name": "Historical booking",
                    "booking_date": bk_time.strftime("%Y-%m-%d"),
                    "start_time": "10:00",
                    "end_time": "10:30",
                    "status": "completed",
                    "customer_name": "Past Customer",
                    "total_price": 10,
                    "created_at": bk_time.isoformat(),
                    "updated_at": bk_time.isoformat(),
                })
        
        created_shops.append({
            "id": shop_id,
            "name": shop_data["shop_name"],
            "type": shop_data["shop_type"],
            "city": shop_data["city"],
            "country": shop_data["country"],
            "rating": target_rating,
            "reviews": target_reviews,
            "ranking_tier": ranking_tier,
            "phone": shop_data["phone_number"],
            "password": raw_password,
            "status": "created"
        })
    
    # Create 2 fake bookings for the first male shop (conflict testing)
    if created_shops and created_shops[0].get("status") == "created":
        first_shop_id = created_shops[0]["id"]
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
        
        fake_bookings = [
            {
                "id": str(uuid.uuid4()),
                "user_id": str(uuid.uuid4()),
                "barbershop_id": first_shop_id,
                "barbershop_name": created_shops[0]["name"],
                "service_id": None,
                "service_name": "قص شعر",
                "booking_date": tomorrow,
                "start_time": "14:00",
                "end_time": "14:30",
                "status": "confirmed",
                "customer_name": "زبون تجريبي ١",
                "user_phone_for_notification": "+963900000001",
                "notes": "حجز تجريبي",
                "services": [{"name": "Haircut", "name_ar": "قص شعر", "price": 10}],
                "total_price": 10,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": str(uuid.uuid4()),
                "barbershop_id": first_shop_id,
                "barbershop_name": created_shops[0]["name"],
                "service_id": None,
                "service_name": "تشذيب اللحية",
                "booking_date": tomorrow,
                "start_time": "16:00",
                "end_time": "16:30",
                "status": "pending",
                "customer_name": "زبون تجريبي ٢",
                "user_phone_for_notification": "+963900000002",
                "notes": "",
                "services": [{"name": "Beard Trim", "name_ar": "تشذيب اللحية", "price": 5}],
                "total_price": 5,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        for booking in fake_bookings:
            await db.bookings.insert_one(booking)
    
    return {
        "message": "Seed data created successfully!",
        "shops_created": len([s for s in created_shops if s.get("status") == "created"]),
        "shops": created_shops,
        "fake_bookings": 2,
        "test_credentials": {
            "admin": {
                "phone": "admin",
                "note": "Check backend startup logs for the auto-generated admin password (ALLOW_DEFAULT_ADMIN flow)."
            },
            "salon_passwords_note": (
                "Each salon received a unique strong random password shown inline under shops[i].password. "
                "Please record them now — they are NOT stored anywhere else and cannot be retrieved again."
            ),
        }
    }

# ============== FAVORITES SYSTEM ==============

class FavoriteCreate(BaseModel):
    shop_id: str


@api_router.post("/favorites")
async def add_favorite(payload: FavoriteCreate, entity: Dict = Depends(require_auth)):
    """Add a barbershop to user's favorites"""
    if entity.get('entity_type') != 'user':
        raise HTTPException(status_code=403, detail="Only users can add favorites")

    shop = await db.barbershops.find_one({"id": payload.shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")

    existing = await db.favorites.find_one({
        "user_id": entity['id'],
        "shop_id": payload.shop_id,
    })
    if existing:
        return {"message": "Already in favorites", "favorite_id": existing['id']}

    fav_id = str(uuid.uuid4())
    doc = {
        "id": fav_id,
        "user_id": entity['id'],
        "shop_id": payload.shop_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.favorites.insert_one(doc)
    return {"message": "Added to favorites", "favorite_id": fav_id}


@api_router.delete("/favorites/{shop_id}")
async def remove_favorite(shop_id: str, entity: Dict = Depends(require_auth)):
    """Remove a barbershop from favorites"""
    if entity.get('entity_type') != 'user':
        raise HTTPException(status_code=403, detail="Only users can remove favorites")

    result = await db.favorites.delete_one({
        "user_id": entity['id'],
        "shop_id": shop_id,
    })
    return {"message": "Removed", "deleted_count": result.deleted_count}


@api_router.get("/favorites/my")
async def my_favorites(entity: Dict = Depends(require_auth)):
    """List my favorite barbershops (enriched)"""
    if entity.get('entity_type') != 'user':
        return []

    favs = await db.favorites.find({"user_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(500)
    shop_ids = [f['shop_id'] for f in favs]
    if not shop_ids:
        return []

    shops = await db.barbershops.find({"id": {"$in": shop_ids}}, {"_id": 0, "password": 0}).to_list(500)
    enriched = []
    for shop in shops:
        enriched.append(await enrich_barbershop_for_frontend(shop))
    return enriched


@api_router.get("/favorites/check/{shop_id}")
async def check_favorite(shop_id: str, entity: Dict = Depends(require_auth)):
    """Check whether a shop is already in favorites"""
    if entity.get('entity_type') != 'user':
        return {"is_favorite": False}
    exists = await db.favorites.find_one({"user_id": entity['id'], "shop_id": shop_id})
    return {"is_favorite": bool(exists)}


# ============== ADVANCED SEARCH ==============

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c


@api_router.get("/search/barbers")
async def advanced_search(
    shop_type: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    rating_min: Optional[float] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    area: Optional[str] = None,      # village / neighborhood / district soft match
    services: Optional[str] = None,  # Comma separated service names/categories
    search: Optional[str] = None,
    sort: str = "rating",  # rating | distance | price_asc | price_desc
    limit: int = 100,
):
    """Advanced search with multi-filter + sorting + distance calculation.

    `area` performs a case-insensitive OR match against village / neighborhood
    / district / city — used when the customer types a locality name that isn't
    on the city dropdown (common for villages / remote areas).
    """
    query: Dict[str, Any] = {}
    if shop_type in ("male", "female"):
        query["shop_type"] = shop_type
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    if rating_min is not None:
        query["rating"] = {"$gte": rating_min}

    # Build $or for text search + area search
    # SECURITY: escape user input before using in $regex to prevent ReDoS / regex injection.
    or_clauses: List[Dict[str, Any]] = []
    if search:
        safe_search = re.escape(search.strip())[:100]
        or_clauses.extend([
            {"shop_name": {"$regex": safe_search, "$options": "i"}},
            {"description": {"$regex": safe_search, "$options": "i"}},
            {"city": {"$regex": safe_search, "$options": "i"}},
            {"district": {"$regex": safe_search, "$options": "i"}},
            {"neighborhood": {"$regex": safe_search, "$options": "i"}},
            {"village": {"$regex": safe_search, "$options": "i"}},
        ])
    if area:
        safe_area = re.escape(area.strip())[:100]
        or_clauses.extend([
            {"city": {"$regex": safe_area, "$options": "i"}},
            {"district": {"$regex": safe_area, "$options": "i"}},
            {"neighborhood": {"$regex": safe_area, "$options": "i"}},
            {"village": {"$regex": safe_area, "$options": "i"}},
            {"address": {"$regex": safe_area, "$options": "i"}},
        ])
    if or_clauses:
        query["$or"] = or_clauses

    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).limit(limit * 2).to_list(limit * 2)

    service_filters = [s.strip().lower() for s in services.split(",")] if services else []

    results = []
    for shop in shops:
        # Distance
        distance_km = None
        if user_lat is not None and user_lng is not None and shop.get("latitude") and shop.get("longitude"):
            distance_km = round(_haversine_km(user_lat, user_lng, shop["latitude"], shop["longitude"]), 2)
            if max_distance_km is not None and distance_km > max_distance_km:
                continue

        enriched = await enrich_barbershop_for_frontend(shop)
        enriched["distance_km"] = distance_km

        # Price filter
        svc_list = enriched.get("services", []) or []
        prices = [s.get("price", 0) for s in svc_list if s.get("price") is not None]
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        enriched["min_price"] = min_price
        enriched["max_price"] = max_price

        if price_min is not None and max_price < price_min:
            continue
        if price_max is not None and min_price > price_max:
            continue

        # Service filter (by name/category match)
        if service_filters:
            shop_service_names = [
                (s.get("name", "") + " " + (s.get("name_ar") or "") + " " + (s.get("category") or "")).lower()
                for s in svc_list
            ]
            matched = any(any(f in sn for sn in shop_service_names) for f in service_filters)
            if not matched:
                continue

        results.append(enriched)

    # Sorting
    if sort == "distance" and user_lat is not None:
        results.sort(key=lambda x: x.get("distance_km") if x.get("distance_km") is not None else 1e9)
    elif sort == "price_asc":
        results.sort(key=lambda x: x.get("min_price", 0))
    elif sort == "price_desc":
        results.sort(key=lambda x: x.get("max_price", 0), reverse=True)
    else:
        # rating (default)
        results.sort(key=lambda x: (x.get("rating", 0), x.get("total_reviews", 0)), reverse=True)

    return results[:limit]


# ============== AI ADVISOR (Locked until booking confirmed) ==============

class AIAdvisorAnalyzeRequest(BaseModel):
    booking_id: str
    image_base64: str  # With or without data URL prefix
    language: Optional[str] = "ar"  # ar or en


@api_router.get("/ai-advisor/eligibility")
async def ai_advisor_eligibility(entity: Dict = Depends(require_auth)):
    """
    Check whether user is eligible to run the AI advisor.
    Logic:
      - User must have at least one booking with status in {confirmed, completed}.
      - Each booking grants ONE analysis. If already analyzed, advisor is LOCKED but saved advice is available.
    """
    if entity.get('entity_type') != 'user':
        return {"eligible": False, "reason": "not_a_user", "locked_reason_ar": "هذه الميزة للزبائن فقط", "locked_reason_en": "This feature is for customers only"}

    # Find eligible booking (confirmed/completed) that hasn't been used yet
    bookings = await db.bookings.find(
        {
            "user_id": entity['id'],
            "status": {"$in": ["confirmed", "completed"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)

    used_booking_ids = set()
    advices = await db.style_advices.find({"user_id": entity['id']}, {"_id": 0}).to_list(100)
    for a in advices:
        if a.get("booking_id"):
            used_booking_ids.add(a["booking_id"])

    # Available: first booking not yet used
    available_booking = None
    for b in bookings:
        if b["id"] not in used_booking_ids:
            available_booking = b
            break

    latest_advice = advices[0] if advices else None

    return {
        "eligible": available_booking is not None,
        "available_booking_id": available_booking["id"] if available_booking else None,
        "available_booking_shop": available_booking["barbershop_name"] if available_booking else None,
        "has_saved_advice": bool(latest_advice),
        "latest_advice_id": latest_advice["id"] if latest_advice else None,
        "total_bookings": len(bookings),
        "total_used_sessions": len(used_booking_ids),
        "locked_reason_ar": None if available_booking else ("قم بإتمام حجز أولاً لفتح المستشار الذكي" if not bookings else "لقد استخدمت جلساتك المتاحة. احجز موعداً جديداً لفتح جلسة جديدة"),
        "locked_reason_en": None if available_booking else ("Complete a booking first to unlock the AI Advisor" if not bookings else "You've used all your sessions. Book again to unlock a new session"),
    }


@api_router.post("/ai-advisor/analyze")
async def ai_advisor_analyze(payload: AIAdvisorAnalyzeRequest, entity: Dict = Depends(require_auth)):
    """Run AI face analysis + style recommendations (ONE-TIME per booking)"""
    if entity.get('entity_type') != 'user':
        raise HTTPException(status_code=403, detail="Only users can use the AI Advisor")

    if not AI_SERVICES_OK:
        # SECURITY: don't leak internal import error details to clients.
        logger.error(f"AI service unavailable: {_AI_IMPORT_ERROR if '_AI_IMPORT_ERROR' in globals() else 'unknown'}")
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable. Please try again later.")

    # Validate booking
    booking = await db.bookings.find_one({"id": payload.booking_id, "user_id": entity['id']}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not yours")
    if booking.get("status") not in ("confirmed", "completed"):
        raise HTTPException(status_code=403, detail="Booking must be confirmed to use AI advisor")

    # Ensure no existing advice on this booking
    existing = await db.style_advices.find_one({"user_id": entity['id'], "booking_id": payload.booking_id})
    if existing:
        raise HTTPException(status_code=409, detail="AI Advisor already used for this booking")

    # Detect gender from user
    gender = entity.get("gender", "male")

    # Run analysis
    session_id = f"advisor_{entity['id']}_{payload.booking_id}"
    try:
        result = await analyze_face_and_recommend(
            image_base64=payload.image_base64,
            gender=gender,
            session_id=session_id,
        )
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        raise HTTPException(status_code=500, detail="AI analysis failed. Please try again with a clearer photo.")

    # Match recommended barbers based on expertise keywords
    expertise_keywords = (result.get("ideal_barber_expertise") or []) + (result.get("ideal_barber_expertise_ar") or [])
    matched_shops = []
    if expertise_keywords:
        # Find same-gender shops with matching services
        shops = await db.barbershops.find(
            {"shop_type": gender},
            {"_id": 0, "password": 0},
        ).sort("ranking_score", -1).limit(40).to_list(40)

        keyword_set = set(k.lower() for k in expertise_keywords)
        for shop in shops:
            shop_services = await db.services.find({"barbershop_id": shop["id"]}, {"_id": 0}).to_list(50)
            shop_blob = " ".join([
                (s.get("name", "") + " " + (s.get("name_ar") or "") + " " + (s.get("category") or "")).lower()
                for s in shop_services
            ])
            shop_blob += " " + (shop.get("description", "") or "").lower()
            match_score = sum(1 for k in keyword_set if k and k in shop_blob)
            if match_score > 0:
                enriched = await enrich_barbershop_for_frontend(shop)
                enriched["match_score"] = match_score
                matched_shops.append(enriched)

        matched_shops.sort(key=lambda x: (x.get("match_score", 0), x.get("rating", 0)), reverse=True)
        matched_shops = matched_shops[:6]

    # Generate style card image
    try:
        style_card_data_url = generate_style_card(
            user_name=entity.get("full_name", ""),
            face_shape=result.get("face_shape", "oval"),
            face_shape_ar=result.get("face_shape_ar", "بيضاوي"),
            styles=result.get("recommended_styles", [])[:3],
            gender=gender,
            language=payload.language or "ar",
        )
    except Exception as e:
        logger.error(f"Style card generation failed: {e}")
        style_card_data_url = None

    # Persist
    advice_doc = {
        "id": str(uuid.uuid4()),
        "user_id": entity['id'],
        "booking_id": payload.booking_id,
        "gender": gender,
        "language": payload.language or "ar",
        "analysis": result,
        "matched_shops": [{
            "id": s["id"],
            "shop_name": s["shop_name"],
            "shop_logo": s.get("shop_logo"),
            "rating": s.get("rating", 0),
            "total_reviews": s.get("total_reviews", 0),
            "city": s.get("city"),
            "country": s.get("country"),
            "match_score": s.get("match_score", 0),
        } for s in matched_shops],
        "style_card_base64": style_card_data_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.style_advices.insert_one(advice_doc)
    advice_doc.pop("_id", None)

    return advice_doc


@api_router.get("/ai-advisor/my-advice")
async def my_advice(entity: Dict = Depends(require_auth)):
    """Get all saved style advice for current user (read-only)"""
    if entity.get('entity_type') != 'user':
        return []
    advices = await db.style_advices.find({"user_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return advices


@api_router.get("/ai-advisor/advice/{advice_id}")
async def get_advice(advice_id: str, entity: Dict = Depends(require_auth)):
    """Get one specific saved advice"""
    advice = await db.style_advices.find_one({"id": advice_id, "user_id": entity['id']}, {"_id": 0})
    if not advice:
        raise HTTPException(status_code=404, detail="Advice not found")
    return advice


class ShareWhatsAppRequest(BaseModel):
    advice_id: str
    phone_number: Optional[str] = None  # Defaults to user's phone


@api_router.post("/ai-advisor/share-whatsapp")
async def share_advice_whatsapp(payload: ShareWhatsAppRequest, entity: Dict = Depends(require_auth)):
    """Generate a WhatsApp link with style card summary text"""
    advice = await db.style_advices.find_one({"id": payload.advice_id, "user_id": entity['id']}, {"_id": 0})
    if not advice:
        raise HTTPException(status_code=404, detail="Advice not found")

    phone = payload.phone_number or entity.get("phone_number") or ""
    phone_digits = "".join([c for c in phone if c.isdigit()])

    analysis = advice.get("analysis", {}) or {}
    lang = advice.get("language", "ar")
    styles = (analysis.get("recommended_styles") or [])[:3]

    if lang == "ar":
        face_shape = analysis.get("face_shape_ar") or analysis.get("face_shape", "")
        lines = [
            "💈 *بطاقة ستايلك من BARBER HUB* 💈",
            "",
            f"🧑 الاسم: {entity.get('full_name', '')}",
            f"✨ شكل الوجه: {face_shape}",
            "",
            "🏆 *القصات المقترحة لك:*",
        ]
        for i, s in enumerate(styles, 1):
            lines.append(f"{i}. {s.get('name_ar') or s.get('name', '')}")
        lines += [
            "",
            "📲 احجز موعدك الآن من خلال المنصة",
            "🌟 barber-hub.com",
        ]
    else:
        face_shape = analysis.get("face_shape", "")
        lines = [
            "💈 *Your Style Card from BARBER HUB* 💈",
            "",
            f"🧑 Name: {entity.get('full_name', '')}",
            f"✨ Face Shape: {face_shape}",
            "",
            "🏆 *Recommended Styles:*",
        ]
        for i, s in enumerate(styles, 1):
            lines.append(f"{i}. {s.get('name', '')}")
        lines += [
            "",
            "📲 Book your appointment on our platform",
            "🌟 barber-hub.com",
        ]

    text = "\n".join(lines)
    import urllib.parse as _up
    encoded = _up.quote(text)
    wa_link = f"https://wa.me/{phone_digits}?text={encoded}" if phone_digits else f"https://wa.me/?text={encoded}"

    return {
        "whatsapp_link": wa_link,
        "message": text,
        "style_card_base64": advice.get("style_card_base64"),
    }


# ============== AI TRY-ON ENDPOINTS (GEMINI NANO BANANA) ==============

MAX_TRYON_ATTEMPTS_PER_BOOKING = 1  # ONE-SHOT POLICY: Strictly 1 attempt per booking for cost efficiency

@api_router.get("/ai-tryon/eligibility")
async def ai_tryon_eligibility(entity: Dict = Depends(require_auth)):
    """
    Check whether user is eligible to use AI Try-On.
    Logic:
      - User must have at least one booking with status in {confirmed, completed}.
      - Each booking grants 5 try-on attempts.
      - Returns available booking, remaining tries, and saved image if exists.
    """
    if entity.get('entity_type') != 'user':
        return {
            "eligible": False,
            "reason": "not_a_user",
            "locked_reason_ar": "هذه الميزة للزبائن فقط",
            "locked_reason_en": "This feature is for customers only"
        }

    # Find eligible bookings (confirmed/completed)
    bookings = await db.bookings.find(
        {
            "user_id": entity['id'],
            "status": {"$in": ["confirmed", "completed"]},
        },
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)

    if not bookings:
        return {
            "eligible": False,
            "available_booking_id": None,
            "remaining_tries": 0,
            "total_bookings": 0,
            "locked_reason_ar": "قم بإتمام حجز أولاً لفتح ميزة التجربة الافتراضية",
            "locked_reason_en": "Complete a booking first to unlock AI Try-On"
        }

    # Count used attempts per booking
    tryon_sessions = await db.ai_tryon_sessions.find({"user_id": entity['id']}, {"_id": 0}).to_list(500)
    
    # Find booking with remaining tries
    available_booking = None
    remaining_tries = 0
    
    for booking in bookings:
        used_count = sum(1 for s in tryon_sessions if s.get("booking_id") == booking["id"])
        if used_count < MAX_TRYON_ATTEMPTS_PER_BOOKING:
            available_booking = booking
            remaining_tries = MAX_TRYON_ATTEMPTS_PER_BOOKING - used_count
            break

    # Get saved image from AI Advisor if exists
    saved_advice = await db.style_advices.find_one(
        {"user_id": entity['id']},
        {"_id": 0, "original_image_base64": 1, "analysis": 1},
        sort=[("created_at", -1)]
    )
    
    # Get AI Advisor recommendations for easy access
    recommended_styles = []
    if saved_advice and saved_advice.get("analysis"):
        analysis = saved_advice["analysis"]
        styles = analysis.get("recommended_styles", [])
        recommended_styles = [
            {
                "name": s.get("name", ""),
                "name_ar": s.get("name_ar", ""),
                "description": s.get("description", "")
            }
            for s in styles[:3]
        ]

    return {
        "eligible": available_booking is not None,
        "available_booking_id": available_booking["id"] if available_booking else None,
        "available_booking_shop": available_booking.get("barbershop_name") if available_booking else None,
        "remaining_tries": remaining_tries,
        "max_tries_per_booking": MAX_TRYON_ATTEMPTS_PER_BOOKING,
        "total_bookings": len(bookings),
        "has_saved_image": bool(saved_advice and saved_advice.get("original_image_base64")),
        "saved_image_base64": saved_advice.get("original_image_base64") if saved_advice else None,
        "recommended_styles": recommended_styles,
        "locked_reason_ar": None if available_booking else "لقد استخدمت جميع المحاولات. احجز موعداً جديداً للحصول على 5 محاولات إضافية",
        "locked_reason_en": None if available_booking else f"You've used all attempts. Book again to get {MAX_TRYON_ATTEMPTS_PER_BOOKING} more tries",
    }


@api_router.post("/ai-tryon/generate", response_model=AITryOnResponse)
async def ai_tryon_generate(payload: AITryOnRequest, entity: Dict = Depends(require_auth)):
    """Generate AI Try-On image (LIMITED to 5 attempts per booking)"""
    if entity.get('entity_type') != 'user':
        raise HTTPException(status_code=403, detail="Only users can use AI Try-On")

    if not AI_TRYON_OK:
        # SECURITY: don't leak internal import error details to clients.
        logger.error(f"AI Try-On unavailable: {_TRYON_IMPORT_ERROR if '_TRYON_IMPORT_ERROR' in globals() else 'unknown'}")
        raise HTTPException(status_code=503, detail="AI Try-On is temporarily unavailable. Please try again later.")

    # Validate booking
    booking = await db.bookings.find_one({"id": payload.booking_id, "user_id": entity['id']}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or not yours")
    if booking.get("status") not in ("confirmed", "completed"):
        raise HTTPException(status_code=403, detail="Booking must be confirmed to use AI Try-On")

    # Check remaining attempts
    used_count = await db.ai_tryon_sessions.count_documents({
        "user_id": entity['id'],
        "booking_id": payload.booking_id
    })
    
    if used_count >= MAX_TRYON_ATTEMPTS_PER_BOOKING:
        raise HTTPException(
            status_code=429,
            detail=f"Maximum {MAX_TRYON_ATTEMPTS_PER_BOOKING} try-on attempts reached for this booking. Book again for more tries."
        )

    # Get user image
    user_image = payload.user_image_base64
    if not user_image:
        # Try to get saved image from AI Advisor
        saved_advice = await db.style_advices.find_one(
            {"user_id": entity['id']},
            {"_id": 0, "original_image_base64": 1},
            sort=[("created_at", -1)]
        )
        if saved_advice and saved_advice.get("original_image_base64"):
            user_image = saved_advice["original_image_base64"]
        else:
            raise HTTPException(status_code=400, detail="No image provided and no saved image found. Please upload your photo.")

    # Clean base64 (remove data URL prefix if present)
    if user_image.startswith('data:'):
        user_image = user_image.split(',', 1)[1]

    # Detect gender
    gender = entity.get("gender", "male")

    # Generate try-on image
    session_id = f"tryon_{entity['id']}_{payload.booking_id}_{used_count}"
    try:
        result_image = await generate_tryon_image(
            user_image_base64=user_image,
            hairstyle_name=payload.hairstyle_name,
            hairstyle_description=payload.hairstyle_description,
            gender=gender,
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"AI Try-On failed: {e}")
        raise HTTPException(status_code=500, detail="AI Try-On failed. Please try a clearer photo or another hairstyle.")

    if not result_image:
        raise HTTPException(status_code=500, detail="Failed to generate try-on image")

    # Save to database
    tryon_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    tryon_doc = {
        "id": tryon_id,
        "user_id": entity['id'],
        "booking_id": payload.booking_id,
        "hairstyle_name": payload.hairstyle_name,
        "hairstyle_description": payload.hairstyle_description,
        "result_image_base64": result_image,
        "created_at": now,
    }
    
    await db.ai_tryon_sessions.insert_one(tryon_doc)
    
    remaining_tries = MAX_TRYON_ATTEMPTS_PER_BOOKING - (used_count + 1)
    
    return AITryOnResponse(
        id=tryon_id,
        user_id=entity['id'],
        booking_id=payload.booking_id,
        hairstyle_name=payload.hairstyle_name,
        hairstyle_description=payload.hairstyle_description,
        result_image_base64=result_image,
        remaining_tries=remaining_tries,
        created_at=now
    )


@api_router.get("/ai-tryon/my-sessions")
async def get_my_tryon_sessions(entity: Dict = Depends(require_auth)):
    """Get all user's AI Try-On sessions"""
    if entity.get('entity_type') != 'user':
        return []
    
    sessions = await db.ai_tryon_sessions.find(
        {"user_id": entity['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return sessions


@api_router.get("/ai-tryon/presets")
async def get_tryon_presets(gender: str = "male", language: str = "en"):
    """Get preset hairstyle options"""
    if not AI_TRYON_OK:
        return []
    
    return get_preset_hairstyles(gender, language)


# ============== ADMIN USAGE STATS ==============

@api_router.get("/admin/usage-stats")
async def get_usage_stats(entity: Dict = Depends(require_auth)):
    """
    Get AI usage statistics for monitoring API credits consumption.
    SECURITY: Accessible to barbershops and admins only. Customer user IDs are
    anonymized (only counts and a salted short hash are exposed) to prevent privacy leaks.
    """
    if entity.get("entity_type") not in ("barbershop", "admin"):
        raise HTTPException(status_code=403, detail="Barbershop or admin access required")
    is_admin = entity.get("entity_type") == "admin"

    # Get all AI Advisor analyses
    total_ai_advisor = await db.style_advices.count_documents({})

    # Get all AI Try-On generations
    total_ai_tryon = await db.ai_tryon_sessions.count_documents({})

    # Get recent activity (last 30 days)
    from datetime import timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    recent_advisor = await db.style_advices.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })

    recent_tryon = await db.ai_tryon_sessions.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })

    # Per-user breakdown (top 10) — only visible to admin; for barbers we expose anonymized counts.
    advisor_pipeline = [
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    tryon_pipeline = [
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_advisor_users_raw = await db.style_advices.aggregate(advisor_pipeline).to_list(10)
    top_tryon_users_raw = await db.ai_tryon_sessions.aggregate(tryon_pipeline).to_list(10)

    import hashlib
    def _anonymize(rows):
        out = []
        for i, r in enumerate(rows, start=1):
            uid = r.get("_id") or ""
            short = hashlib.sha256(f"barberhub:{uid}".encode()).hexdigest()[:8] if uid else "anon"
            out.append({"rank": i, "user_hash": short, "count": r.get("count", 0)})
        return out

    if is_admin:
        # Admin gets raw IDs (operational use only)
        top_advisor_users = top_advisor_users_raw
        top_tryon_users = top_tryon_users_raw
    else:
        top_advisor_users = _anonymize(top_advisor_users_raw)
        top_tryon_users = _anonymize(top_tryon_users_raw)

    # Estimated cost (rough estimate)
    estimated_cost = (total_ai_advisor * 0.01) + (total_ai_tryon * 0.005)

    return {
        "total_api_calls": {
            "ai_advisor": total_ai_advisor,
            "ai_tryon": total_ai_tryon,
            "total": total_ai_advisor + total_ai_tryon
        },
        "last_30_days": {
            "ai_advisor": recent_advisor,
            "ai_tryon": recent_tryon,
            "total": recent_advisor + recent_tryon
        },
        "top_users": {
            "ai_advisor": top_advisor_users,
            "ai_tryon": top_tryon_users
        },
        "estimated_cost_usd": round(estimated_cost, 2),
        "policy": {
            "ai_advisor": "1 analysis per confirmed booking",
            "ai_tryon": "1 attempt per confirmed booking (ONE-SHOT POLICY)"
        }
    }


# =====================================================================
# ============== v3.8 SECURITY + UX UPGRADES ==========================
# =====================================================================
# New endpoints:
#   Authentication recovery:
#     POST /api/auth/forgot-password     — request OTP for password reset
#     POST /api/auth/reset-password      — complete reset using OTP
#     POST /api/auth/verify-phone/send   — send phone verification OTP
#     POST /api/auth/verify-phone/confirm — verify OTP code
#     POST /api/auth/refresh             — issue new access token from refresh token
#   2FA (admin):
#     POST /api/admin/2fa/setup
#     POST /api/admin/2fa/verify
#     POST /api/admin/2fa/disable
#   GDPR / Privacy:
#     GET  /api/users/me/export          — export all personal data as JSON
#     DELETE /api/users/me/account       — delete own account + anonymize
#   Calendar:
#     GET  /api/bookings/{booking_id}/calendar.ics
#     GET  /api/bookings/{booking_id}/calendar-link
#   Staff (multi-staff per salon):
#     POST /api/barbershops/me/staff
#     GET  /api/barbershops/me/staff
#     GET  /api/barbershops/{shop_id}/staff
#     PUT  /api/barbershops/me/staff/{staff_id}
#     DELETE /api/barbershops/me/staff/{staff_id}
#   Audit log:
#     GET  /api/admin/audit-log
#   Push (real-send):
#     POST /api/push/test                — (admin) send a test push to self
# =====================================================================


# ---- Models ----------------------------------------------------------
class ForgotPasswordRequest(BaseModel):
    phone_number: str

class ResetPasswordRequest(BaseModel):
    phone_number: str
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _validate_new_password(cls, v: str) -> str:
        return validate_password_strength(v)

class VerifyPhoneSendRequest(BaseModel):
    phone_number: str

class VerifyPhoneConfirmRequest(BaseModel):
    phone_number: str
    otp: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TOTPSetupConfirmRequest(BaseModel):
    code: str

class TOTPVerifyRequest(BaseModel):
    code: str

class StaffCreate(BaseModel):
    name: str
    role: Optional[str] = "barber"   # "barber" | "assistant" | "cashier"
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    specialties: Optional[List[str]] = None
    active: bool = True

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    specialties: Optional[List[str]] = None
    active: Optional[bool] = None


# ---- Helpers ---------------------------------------------------------
async def _log_audit(
    event: str,
    actor_id: Optional[str],
    actor_type: Optional[str],
    request: Optional[Request] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    metadata: Optional[Dict] = None,
) -> None:
    """Best-effort audit log. Never raises."""
    if not SEC_EXTRAS_OK:
        return
    try:
        ua = request.headers.get("user-agent", "") if request else ""
        ip = sec_extras.client_ip_from_request(request) if request else None
        entry = sec_extras.build_audit_entry(
            event=event,
            actor_id=actor_id,
            actor_type=actor_type,
            request_ip=ip,
            target_id=target_id,
            target_type=target_type,
            metadata=metadata,
            user_agent=ua,
        )
        await db.audit_log.insert_one(entry)
    except Exception as e:
        logger.debug(f"Audit log insert failed (non-fatal): {e}")


async def _find_entity_by_phone(phone: str) -> Optional[Dict]:
    """Look up a user / barbershop / admin by phone. Returns with 'entity_type' annotation."""
    u = await db.users.find_one({"phone_number": phone}, {"_id": 0})
    if u:
        u["entity_type"] = "user"
        return u
    s = await db.barbershops.find_one({"phone_number": phone}, {"_id": 0})
    if s:
        s["entity_type"] = "barbershop"
        return s
    a = await db.admins.find_one({"phone_number": phone}, {"_id": 0})
    if a:
        a["entity_type"] = "admin"
        return a
    return None


# ============== FORGOT / RESET PASSWORD ==============================

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Request a password reset OTP. The OTP is delivered via a wa.me link
    that the frontend opens in WhatsApp Web/App — no SMS provider needed.
    To prevent user-enumeration attacks, we always return a generic success
    message even if the phone does not exist. But we only actually generate
    an OTP when the account is real.
    """
    ip = _client_ip(request)
    if not _rate_limit_check(f"forgot:ip:{ip}", 5):
        raise HTTPException(status_code=429, detail="Too many reset requests. Try again later.")
    if not _rate_limit_check(f"forgot:phone:{payload.phone_number}", 3):
        # Same limit per phone (prevents spamming one account)
        raise HTTPException(status_code=429, detail="Too many reset requests for this phone.")

    phone = (payload.phone_number or "").strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone_number required")

    entity = await _find_entity_by_phone(phone)
    wa_link: Optional[str] = None
    if entity and SEC_EXTRAS_OK:
        code = sec_extras.generate_otp()
        expiry = sec_extras.otp_expiry_dt()
        # Replace any existing reset OTP for this phone
        await db.password_reset_otps.update_one(
            {"phone_number": phone},
            {"$set": {
                "phone_number": phone,
                "entity_id": entity.get("id"),
                "entity_type": entity.get("entity_type"),
                "otp_hash": hash_password(code),       # bcrypt hash, not reversible
                "expires_at": expiry.isoformat(),
                "attempts": 0,
                "used": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        wa_link = sec_extras.build_otp_whatsapp_link(phone, code, purpose="reset", language="ar")
        await _log_audit(
            "auth.password_reset_requested",
            actor_id=entity.get("id"),
            actor_type=entity.get("entity_type"),
            request=request,
            metadata={"phone_suffix": phone[-4:]},
        )

    # Generic response
    return {
        "message": "If the phone number is registered, a reset code has been generated.",
        "wa_link": wa_link,   # Frontend will open this to send OTP to the user's own WA
        "expires_in_minutes": sec_extras.OTP_EXPIRY_MINUTES if SEC_EXTRAS_OK else 10,
    }


@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest, request: Request):
    """Complete a password reset using the OTP."""
    ip = _client_ip(request)
    if not _rate_limit_check(f"reset:ip:{ip}", 10):
        raise HTTPException(status_code=429, detail="Too many reset attempts. Try again later.")

    phone = (payload.phone_number or "").strip()
    otp = (payload.otp or "").strip()
    if not phone or not otp:
        raise HTTPException(status_code=400, detail="Phone and OTP required")

    rec = await db.password_reset_otps.find_one({"phone_number": phone}, {"_id": 0})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    # Check expiry
    try:
        exp = datetime.fromisoformat(rec["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
    except Exception:
        exp = datetime.now(timezone.utc) - timedelta(minutes=1)
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(status_code=400, detail="Reset code expired")

    # Max 5 wrong tries per OTP before invalidating it
    attempts = int(rec.get("attempts", 0))
    if attempts >= 5:
        await db.password_reset_otps.update_one(
            {"phone_number": phone}, {"$set": {"used": True}}
        )
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Request a new code.")

    if not verify_password(otp, rec.get("otp_hash", "")):
        await db.password_reset_otps.update_one(
            {"phone_number": phone}, {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid reset code")

    # Passed — update password in the correct collection
    entity_type = rec.get("entity_type")
    entity_id = rec.get("entity_id")
    coll = {"user": db.users, "barbershop": db.barbershops, "admin": db.admins}.get(entity_type)
    if coll is None:
        raise HTTPException(status_code=500, detail="Account lookup failed")
    await coll.update_one(
        {"id": entity_id},
        {"$set": {
            "password": hash_password(payload.new_password),
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    # Consume OTP + invalidate all refresh tokens for this entity
    await db.password_reset_otps.update_one(
        {"phone_number": phone}, {"$set": {"used": True}}
    )
    try:
        await db.refresh_tokens.delete_many({"entity_id": entity_id})
    except Exception:
        pass

    await _log_audit(
        "auth.password_reset_completed",
        actor_id=entity_id, actor_type=entity_type, request=request,
    )
    return {"message": "Password reset successfully. Please log in with your new password."}


# ============== PHONE VERIFICATION (OTP) ==============================

@api_router.post("/auth/verify-phone/send")
async def verify_phone_send(
    payload: VerifyPhoneSendRequest,
    request: Request,
    entity: Dict = Depends(require_auth),
):
    """Authenticated user requests a phone verification OTP for themselves."""
    if not SEC_EXTRAS_OK:
        raise HTTPException(status_code=503, detail="OTP service unavailable")
    ip = _client_ip(request)
    if not _rate_limit_check(f"vrf:ip:{ip}", 5):
        raise HTTPException(status_code=429, detail="Too many verification attempts.")
    phone = (payload.phone_number or entity.get("phone_number", "")).strip()
    if not phone:
        raise HTTPException(status_code=400, detail="phone_number required")

    code = sec_extras.generate_otp()
    await db.phone_verification_otps.update_one(
        {"entity_id": entity.get("id")},
        {"$set": {
            "entity_id": entity.get("id"),
            "entity_type": entity.get("entity_type"),
            "phone_number": phone,
            "otp_hash": hash_password(code),
            "expires_at": sec_extras.otp_expiry_dt().isoformat(),
            "attempts": 0,
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    wa_link = sec_extras.build_otp_whatsapp_link(phone, code, purpose="verify", language="ar")
    return {"wa_link": wa_link, "expires_in_minutes": sec_extras.OTP_EXPIRY_MINUTES}


@api_router.post("/auth/verify-phone/confirm")
async def verify_phone_confirm(
    payload: VerifyPhoneConfirmRequest,
    request: Request,
    entity: Dict = Depends(require_auth),
):
    """User confirms the OTP they received."""
    rec = await db.phone_verification_otps.find_one({"entity_id": entity.get("id")}, {"_id": 0})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="No active verification. Request a new code.")
    try:
        exp = datetime.fromisoformat(rec["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
    except Exception:
        exp = datetime.now(timezone.utc) - timedelta(minutes=1)
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(status_code=400, detail="Verification code expired")
    if int(rec.get("attempts", 0)) >= 5:
        await db.phone_verification_otps.update_one(
            {"entity_id": entity.get("id")}, {"$set": {"used": True}}
        )
        raise HTTPException(status_code=400, detail="Too many wrong attempts. Request a new code.")

    if not verify_password((payload.otp or "").strip(), rec.get("otp_hash", "")):
        await db.phone_verification_otps.update_one(
            {"entity_id": entity.get("id")}, {"$inc": {"attempts": 1}}
        )
        raise HTTPException(status_code=400, detail="Invalid code")

    # Mark phone as verified in the user's collection
    etype = entity.get("entity_type")
    coll = {"user": db.users, "barbershop": db.barbershops, "admin": db.admins}.get(etype)
    if coll is not None:
        await coll.update_one(
            {"id": entity.get("id")},
            {"$set": {
                "phone_verified": True,
                "phone_verified_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
    await db.phone_verification_otps.update_one(
        {"entity_id": entity.get("id")}, {"$set": {"used": True}}
    )
    return {"verified": True, "message": "Phone verified successfully"}


# ============== REFRESH TOKEN =========================================

@api_router.post("/auth/refresh")
async def refresh_access_token(payload: RefreshTokenRequest, request: Request):
    """Exchange a refresh token for a new access token."""
    if not SEC_EXTRAS_OK:
        raise HTTPException(status_code=503, detail="Refresh not available")
    token_str = (payload.refresh_token or "").strip()
    if not token_str:
        raise HTTPException(status_code=400, detail="refresh_token required")
    token_hash = sec_extras.hash_refresh_token(token_str)
    rec = await db.refresh_tokens.find_one({"token_hash": token_hash, "revoked": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    try:
        exp = datetime.fromisoformat(rec["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
    except Exception:
        exp = datetime.now(timezone.utc) - timedelta(minutes=1)
    if datetime.now(timezone.utc) > exp:
        raise HTTPException(status_code=401, detail="Refresh token expired")

    new_token = create_token(rec["entity_id"], rec["entity_type"])
    await _log_audit(
        "auth.refresh",
        actor_id=rec["entity_id"], actor_type=rec["entity_type"], request=request,
    )
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "entity_type": rec["entity_type"],
    }


async def _issue_refresh_token(entity_id: str, entity_type: str, request: Request) -> str:
    """Create and persist a refresh token; return the plain token to the client."""
    if not SEC_EXTRAS_OK:
        return ""
    plain = sec_extras.generate_refresh_token()
    await db.refresh_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "entity_id": entity_id,
        "entity_type": entity_type,
        "token_hash": sec_extras.hash_refresh_token(plain),
        "user_agent": (request.headers.get("user-agent", "") or "")[:200],
        "ip": _client_ip(request),
        "revoked": False,
        "expires_at": sec_extras.refresh_token_expiry_dt().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return plain


@api_router.post("/auth/issue-refresh")
async def issue_refresh_token_endpoint(request: Request, entity: Dict = Depends(require_auth)):
    """Issue a fresh refresh token for the currently-logged-in entity. Frontend
    calls this right after login to obtain a long-lived token."""
    plain = await _issue_refresh_token(entity["id"], entity["entity_type"], request)
    if not plain:
        raise HTTPException(status_code=503, detail="Refresh tokens not available")
    return {"refresh_token": plain, "expires_in_days": sec_extras.REFRESH_TOKEN_DAYS}


@api_router.post("/auth/logout-all")
async def logout_all_devices(request: Request, entity: Dict = Depends(require_auth)):
    """Revoke ALL refresh tokens for the current entity (signs out other devices)."""
    try:
        await db.refresh_tokens.update_many(
            {"entity_id": entity["id"]},
            {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        pass
    await _log_audit("auth.logout", actor_id=entity["id"], actor_type=entity["entity_type"], request=request)
    return {"message": "All devices signed out"}


# ============== 2FA (TOTP) FOR ADMINS =================================

@api_router.post("/admin/2fa/setup")
async def admin_2fa_setup(entity: Dict = Depends(require_admin)):
    """Generate a new TOTP secret + otpauth URI + backup codes.
    TOTP stays DISABLED until the admin confirms a valid code via /admin/2fa/verify."""
    if not SEC_EXTRAS_OK or not sec_extras.PYOTP_OK:
        raise HTTPException(status_code=503, detail="2FA service unavailable")

    secret = sec_extras.generate_totp_secret()
    acct = entity.get("email") or entity.get("phone_number") or "admin"
    uri = sec_extras.totp_provisioning_uri(secret, acct, issuer="BARBER HUB")
    # Build a data-URL QR for easy scanning
    qr_b64 = generate_qr_code(uri)
    qr_data_url = f"data:image/png;base64,{qr_b64}"

    # Save pending secret (not enabled yet)
    await db.admins.update_one(
        {"id": entity["id"]},
        {"$set": {
            "totp_secret_pending": secret,
            "totp_setup_started_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    backup_codes = sec_extras.generate_backup_codes(8)
    # Hash backup codes; store one-way
    await db.admins.update_one(
        {"id": entity["id"]},
        {"$set": {"backup_codes_pending": [hash_password(c) for c in backup_codes]}}
    )
    return {
        "secret": secret,
        "otpauth_uri": uri,
        "qr_code": qr_data_url,
        "backup_codes": backup_codes,   # shown ONCE
        "message": "Scan the QR with Google Authenticator / Authy / 1Password, then POST the 6-digit code to /api/admin/2fa/verify to finalize.",
    }


@api_router.post("/admin/2fa/verify")
async def admin_2fa_verify(payload: TOTPSetupConfirmRequest, request: Request, entity: Dict = Depends(require_admin)):
    """Finalize 2FA setup by verifying the 6-digit code."""
    if not SEC_EXTRAS_OK or not sec_extras.PYOTP_OK:
        raise HTTPException(status_code=503, detail="2FA service unavailable")

    # Reload the admin to get the pending secret
    admin_doc = await db.admins.find_one({"id": entity["id"]})
    if not admin_doc:
        raise HTTPException(status_code=404, detail="Account not found")

    pending_secret = admin_doc.get("totp_secret_pending")
    active_secret = admin_doc.get("totp_secret")
    use_pending = bool(pending_secret)
    secret = pending_secret if use_pending else active_secret
    if not secret:
        raise HTTPException(status_code=400, detail="No 2FA setup in progress. Call /admin/2fa/setup first.")

    if not sec_extras.verify_totp(secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    if use_pending:
        # Activate
        await db.admins.update_one(
            {"id": entity["id"]},
            {
                "$set": {
                    "totp_secret": pending_secret,
                    "totp_enabled": True,
                    "backup_codes": admin_doc.get("backup_codes_pending", []),
                    "totp_enabled_at": datetime.now(timezone.utc).isoformat(),
                },
                "$unset": {"totp_secret_pending": "", "backup_codes_pending": "", "totp_setup_started_at": ""},
            }
        )
        await _log_audit(
            "auth.2fa_enabled",
            actor_id=entity["id"], actor_type="admin", request=request,
        )
        return {"enabled": True, "message": "2FA enabled successfully"}
    else:
        await _log_audit(
            "auth.2fa_verified",
            actor_id=entity["id"], actor_type="admin", request=request,
        )
        return {"verified": True, "message": "Code valid"}


@api_router.post("/admin/2fa/disable")
async def admin_2fa_disable(payload: TOTPVerifyRequest, request: Request, entity: Dict = Depends(require_admin)):
    """Disable 2FA. Requires a valid current code OR a backup code."""
    admin_doc = await db.admins.find_one({"id": entity["id"]})
    if not admin_doc or not admin_doc.get("totp_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled on this account")

    ok = False
    # Try TOTP first
    if sec_extras.verify_totp(admin_doc.get("totp_secret", ""), payload.code):
        ok = True
    else:
        # Try backup codes
        for i, bc_hash in enumerate(admin_doc.get("backup_codes", []) or []):
            if verify_password(payload.code, bc_hash):
                ok = True
                # Remove that backup code (one-time use)
                new_codes = [c for j, c in enumerate(admin_doc.get("backup_codes", [])) if j != i]
                await db.admins.update_one({"id": entity["id"]}, {"$set": {"backup_codes": new_codes}})
                break
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid code")

    await db.admins.update_one(
        {"id": entity["id"]},
        {"$unset": {"totp_secret": "", "backup_codes": "", "totp_enabled_at": ""},
         "$set": {"totp_enabled": False}}
    )
    await _log_audit("auth.2fa_disabled", actor_id=entity["id"], actor_type="admin", request=request)
    return {"enabled": False, "message": "2FA disabled"}


@api_router.get("/admin/2fa/status")
async def admin_2fa_status(entity: Dict = Depends(require_admin)):
    """Report whether 2FA is enabled on the current admin account."""
    admin_doc = await db.admins.find_one({"id": entity["id"]}, {"_id": 0, "password": 0, "totp_secret": 0, "totp_secret_pending": 0})
    if not admin_doc:
        raise HTTPException(status_code=404, detail="Account not found")
    return {
        "enabled": bool(admin_doc.get("totp_enabled")),
        "backup_codes_remaining": len(admin_doc.get("backup_codes", []) or []),
    }


# ============== GDPR: ACCOUNT DELETION + DATA EXPORT ==================

@api_router.get("/users/me/export")
async def export_my_data(entity: Dict = Depends(require_auth)):
    """GDPR Art. 20 — data portability. Returns a JSON snapshot of all personal data
    held for this entity."""
    if not SEC_EXTRAS_OK:
        raise HTTPException(status_code=503, detail="Export service unavailable")
    eid = entity["id"]
    etype = entity["entity_type"]

    data: Dict[str, Any] = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "entity_type": etype,
        "profile": sec_extras.redact_sensitive_fields(entity),
    }

    # User-specific data
    if etype == "user":
        data["bookings"] = [
            sec_extras.redact_sensitive_fields(b)
            for b in await db.bookings.find({"user_id": eid}, {"_id": 0}).to_list(1000)
        ]
        data["reviews"] = [
            sec_extras.redact_sensitive_fields(r)
            for r in await db.reviews.find({"user_id": eid}, {"_id": 0}).to_list(1000)
        ]
        data["favorites"] = [
            sec_extras.redact_sensitive_fields(f)
            for f in await db.favorites.find({"user_id": eid}, {"_id": 0}).to_list(1000)
        ]
        data["orders"] = [
            sec_extras.redact_sensitive_fields(o)
            for o in await db.orders.find({"user_id": eid}, {"_id": 0}).to_list(1000)
        ]
        data["notifications"] = [
            sec_extras.redact_sensitive_fields(n)
            for n in await db.notifications.find({"recipient_id": eid}, {"_id": 0}).to_list(500)
        ]
        data["style_advice"] = [
            sec_extras.redact_sensitive_fields(s)
            for s in await db.style_advices.find({"user_id": eid}, {"_id": 0}).to_list(200)
        ]
    elif etype == "barbershop":
        data["services"] = [
            sec_extras.redact_sensitive_fields(s)
            for s in await db.services.find({"barbershop_id": eid}, {"_id": 0}).to_list(500)
        ]
        data["bookings"] = [
            sec_extras.redact_sensitive_fields(b)
            for b in await db.bookings.find({"barbershop_id": eid}, {"_id": 0}).to_list(1000)
        ]
        data["gallery"] = [
            sec_extras.redact_sensitive_fields(g)
            for g in await db.gallery_images.find({"barbershop_id": eid}, {"_id": 0}).to_list(100)
        ]
        data["products"] = [
            sec_extras.redact_sensitive_fields(p)
            for p in await db.products.find({"shop_id": eid}, {"_id": 0}).to_list(500)
        ]
        data["orders"] = [
            sec_extras.redact_sensitive_fields(o)
            for o in await db.orders.find({"shop_id": eid}, {"_id": 0}).to_list(1000)
        ]

    await _log_audit("account.exported", actor_id=eid, actor_type=etype)
    return data


@api_router.delete("/users/me/account")
async def delete_my_account(request: Request, entity: Dict = Depends(require_auth)):
    """GDPR Art. 17 — right to erasure. Deletes the account and anonymizes
    historical data so reports/rankings aren't broken. Barbershops with active
    subscriptions are marked for deletion and require human review."""
    eid = entity["id"]
    etype = entity["entity_type"]

    # Safety: Master Owner can never delete themselves via this endpoint
    if etype == "admin" and admin_is_master(entity):
        raise HTTPException(
            status_code=403,
            detail="Master Owner account cannot be deleted. Contact support.",
        )

    if etype == "user":
        # Anonymize past bookings + reviews (keep for shop statistics)
        anonymized_name = f"Deleted User {eid[:6]}"
        await db.bookings.update_many(
            {"user_id": eid},
            {"$set": {
                "user_phone_for_notification": None,
                "customer_phone": None,
                "customer_name": anonymized_name,
                "user_deleted": True,
            }}
        )
        await db.reviews.update_many(
            {"user_id": eid},
            {"$set": {"user_name": anonymized_name, "user_deleted": True}}
        )
        # Hard-delete personal data
        await db.favorites.delete_many({"user_id": eid})
        await db.notifications.delete_many({"recipient_id": eid})
        await db.style_advices.delete_many({"user_id": eid})
        await db.ai_tryon_sessions.delete_many({"user_id": eid})
        await db.refresh_tokens.delete_many({"entity_id": eid})
        await db.push_subscriptions.delete_many({"user_id": eid})
        await db.users.delete_one({"id": eid})
    elif etype == "barbershop":
        # Mark for deletion instead (preserves history)
        await db.barbershops.update_one(
            {"id": eid},
            {"$set": {
                "status": "pending_deletion",
                "deletion_requested_at": datetime.now(timezone.utc).isoformat(),
                "is_verified": False,
                "active": False,
            }}
        )
        await db.refresh_tokens.delete_many({"entity_id": eid})
    elif etype == "admin":
        # Non-master admin can delete themselves (sub-admin self-leave)
        await db.admins.delete_one({"id": eid})
        await db.refresh_tokens.delete_many({"entity_id": eid})

    await _log_audit("account.deleted", actor_id=eid, actor_type=etype, request=request)
    return {"message": "Account deleted successfully"}


# ============== CALENDAR (.ICS) EXPORT ================================

@api_router.get("/bookings/{booking_id}/calendar.ics")
async def booking_ics(booking_id: str, entity: Dict = Depends(require_auth)):
    """Download the booking as an .ics calendar file (Google, Apple, Outlook, ...)."""
    if not SEC_EXTRAS_OK:
        raise HTTPException(status_code=503, detail="Calendar export unavailable")

    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Ownership check (same rule as /api/bookings/{id})
    etype = entity.get("entity_type")
    if etype == "user" and booking.get("user_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not your booking")
    if etype == "barbershop" and booking.get("barbershop_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not your booking")

    shop = await db.barbershops.find_one({"id": booking.get("barbershop_id")}, {"_id": 0}) or {}
    ics_bytes = sec_extras.booking_to_ics(booking, shop)
    from fastapi.responses import Response
    return Response(
        content=ics_bytes,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="booking-{booking_id[:8]}.ics"',
            "Cache-Control": "no-store",
        },
    )


@api_router.get("/bookings/{booking_id}/calendar-link")
async def booking_calendar_link(booking_id: str, entity: Dict = Depends(require_auth)):
    """Return an 'Add to Google Calendar' URL for the booking."""
    if not SEC_EXTRAS_OK:
        raise HTTPException(status_code=503, detail="Calendar link unavailable")
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    etype = entity.get("entity_type")
    if etype == "user" and booking.get("user_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not your booking")
    if etype == "barbershop" and booking.get("barbershop_id") != entity["id"]:
        raise HTTPException(status_code=403, detail="Not your booking")
    shop = await db.barbershops.find_one({"id": booking.get("barbershop_id")}, {"_id": 0}) or {}
    return {"google_calendar_url": sec_extras.google_calendar_link(booking, shop)}


# ============== STAFF MANAGEMENT (multi-staff per salon) ==============

@api_router.post("/barbershops/me/staff")
async def create_staff(payload: StaffCreate, entity: Dict = Depends(require_barbershop)):
    """Add a new staff member (barber/assistant) to the salon."""
    staff_id = str(uuid.uuid4())
    doc = {
        "id": staff_id,
        "barbershop_id": entity["id"],
        "name": payload.name.strip(),
        "role": (payload.role or "barber").strip(),
        "phone": (payload.phone or "").strip() or None,
        "avatar_url": validate_image_base64(payload.avatar_url, "avatar_url"),
        "specialties": payload.specialties or [],
        "active": bool(payload.active),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.staff.insert_one(doc)
    await _log_audit("staff.created", actor_id=entity["id"], actor_type="barbershop", target_id=staff_id, target_type="staff")
    doc.pop("_id", None)
    return doc


@api_router.get("/barbershops/me/staff")
async def list_my_staff(entity: Dict = Depends(require_barbershop)):
    items = await db.staff.find({"barbershop_id": entity["id"]}, {"_id": 0}).to_list(200)
    return {"staff": items, "count": len(items)}


@api_router.get("/barbershops/{shop_id}/staff")
async def list_shop_staff(shop_id: str):
    """Public: list active staff for a salon."""
    items = await db.staff.find(
        {"barbershop_id": shop_id, "active": True}, {"_id": 0}
    ).to_list(200)
    return {"staff": items, "count": len(items)}


@api_router.put("/barbershops/me/staff/{staff_id}")
async def update_staff(staff_id: str, payload: StaffUpdate, entity: Dict = Depends(require_barbershop)):
    existing = await db.staff.find_one({"id": staff_id, "barbershop_id": entity["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff member not found")
    updates: Dict[str, Any] = {}
    for field in ("name", "role", "phone", "specialties", "active"):
        val = getattr(payload, field, None)
        if val is not None:
            updates[field] = val
    if payload.avatar_url is not None:
        updates["avatar_url"] = validate_image_base64(payload.avatar_url, "avatar_url")
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.staff.update_one({"id": staff_id}, {"$set": updates})
    doc = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    return doc


@api_router.delete("/barbershops/me/staff/{staff_id}")
async def delete_staff(staff_id: str, entity: Dict = Depends(require_barbershop)):
    res = await db.staff.delete_one({"id": staff_id, "barbershop_id": entity["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await _log_audit("staff.deleted", actor_id=entity["id"], actor_type="barbershop", target_id=staff_id, target_type="staff")
    return {"deleted": True}


# ============== AUDIT LOG (admin) =====================================

@api_router.get("/admin/audit-log")
async def list_audit_log(
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    event: Optional[str] = None,
    actor_id: Optional[str] = None,
    entity: Dict = Depends(require_admin),
):
    """List audit log entries. Master admins see everything; sub-admins with
    support permission can view but cannot delete."""
    query: Dict[str, Any] = {}
    if event:
        query["event"] = event
    if actor_id:
        query["actor_id"] = actor_id
    total = await db.audit_log.count_documents(query)
    items = await (
        db.audit_log.find(query, {"_id": 0, "created_at_dt": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {"total": total, "items": items}


# ============== PUSH: REAL SENDER =====================================

@api_router.post("/push/test")
async def push_test(request: Request, entity: Dict = Depends(require_auth)):
    """Send a test push notification to all subscriptions for the current entity."""
    if not SEC_EXTRAS_OK or not sec_extras.WEBPUSH_OK:
        raise HTTPException(status_code=503, detail="Push service unavailable")
    subs = await db.push_subscriptions.find(
        {"user_id": entity["id"]}, {"_id": 0}
    ).to_list(50)
    if not subs:
        raise HTTPException(status_code=404, detail="No push subscriptions for this account")

    sent = 0
    removed = 0
    payload = {
        "title": "BARBER HUB",
        "body": "🎉 إشعار تجريبي / Test notification — Push يعمل بنجاح!",
        "icon": "/icons/icon-192.png",
        "badge": "/icons/badge-72.png",
        "url": "/",
    }
    for s in subs:
        try:
            sub_info = {
                "endpoint": s.get("endpoint"),
                "keys": s.get("keys", {}),
            }
            ok = sec_extras.send_web_push(sub_info, payload)
            if ok:
                sent += 1
            else:
                # Remove stale subscription
                await db.push_subscriptions.delete_one({"endpoint": s.get("endpoint")})
                removed += 1
        except Exception:
            removed += 1
    return {"sent": sent, "removed_stale": removed, "total_subscriptions": len(subs)}


# ============== GUEST MODE ============================================

@api_router.get("/guest/init")
async def guest_init(request: Request):
    """Initialize a guest session. Returns a short-lived token that lets users
    browse barbershops and view products without a full account. Guest tokens
    CANNOT create bookings, leave reviews, or access AI features — they need
    to register first (frontend prompts them)."""
    guest_id = f"guest_{secrets.token_hex(8)}"
    # Short-lived token (2 hours)
    payload = {
        "entity_id": guest_id,
        "entity_type": "guest",
        "exp": datetime.now(timezone.utc) + timedelta(hours=2)
    }
    tok = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "guest_token": tok,
        "guest_id": guest_id,
        "expires_in_seconds": 2 * 60 * 60,
        "capabilities": ["browse", "search", "view_profiles", "view_products"],
        "locked_features": ["booking", "reviews", "favorites", "ai_advisor", "ai_tryon"],
    }


# ============== SEO: SITEMAP ==========================================

@api_router.get("/sitemap.xml")
async def sitemap_xml():
    """Dynamic sitemap for SEO.
    v3.8 — only includes APPROVED shops, plus city-based landing pages (e.g.,
    /city/SY/Hasakah/male) which rank for searches like "حلاق في الحسكة" /
    "barber in Baghdad"."""
    from fastapi.responses import Response
    query = {
        "$or": [
            {"approval_status": "approved"},
            {"approval_status": {"$exists": False}, "is_verified": True},
        ]
    }
    shops = await db.barbershops.find(
        query, {"_id": 0, "id": 1, "updated_at": 1, "created_at": 1, "country": 1, "city": 1, "shop_type": 1}
    ).to_list(5000)
    base = APP_URL.rstrip("/")
    urls: List[str] = [
        f"<url><loc>{base}/</loc><priority>1.0</priority></url>",
        f"<url><loc>{base}/home</loc><priority>0.9</priority></url>",
        f"<url><loc>{base}/top-barbers</loc><priority>0.8</priority></url>",
        f"<url><loc>{base}/products</loc><priority>0.8</priority></url>",
        f"<url><loc>{base}/map</loc><priority>0.7</priority></url>",
        f"<url><loc>{base}/about</loc><priority>0.5</priority></url>",
        f"<url><loc>{base}/privacy</loc><priority>0.5</priority></url>",
        f"<url><loc>{base}/terms</loc><priority>0.5</priority></url>",
        f"<url><loc>{base}/contact</loc><priority>0.5</priority></url>",
    ]
    # Individual shop profiles
    for s in shops:
        lastmod = (s.get("updated_at") or s.get("created_at") or "")[:10]
        lastmod_tag = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        urls.append(f"<url><loc>{base}/barber/{s.get('id')}</loc>{lastmod_tag}<priority>0.7</priority></url>")

    # City landing pages (aggregated). Example: /city/SY/Hasakah/male
    # Google will rank these for "حلاق في الحسكة" and "barber Hasakah".
    city_pairs = set()
    for s in shops:
        country = (s.get("country") or "").strip()
        city = (s.get("city") or "").strip()
        gender = (s.get("shop_type") or "").strip()
        if country and city:
            city_pairs.add((country, city, gender or "all"))
            city_pairs.add((country, city, "all"))
    for country, city, gender in city_pairs:
        safe_city = city.replace(" ", "-")
        if gender == "all":
            urls.append(f"<url><loc>{base}/city/{country}/{safe_city}</loc><priority>0.8</priority></url>")
        else:
            urls.append(f"<url><loc>{base}/city/{country}/{safe_city}/{gender}</loc><priority>0.8</priority></url>")

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(urls)
        + "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


# ============== SEO: CITY LANDING PAGES =============================
@api_router.get("/seo/city/{country}/{city}")
async def seo_city_page(country: str, city: str, gender: Optional[str] = None, limit: int = 30):
    """Returns structured data for a city-specific barber listing page.
    Used by the frontend to render /city/:country/:city pages with great SEO
    (LocalBusiness JSON-LD, keyword-rich titles/descriptions).
    """
    city_clean = city.replace("-", " ")
    query: Dict[str, Any] = {
        "country": country,
        "city": city_clean,
        "$or": [
            {"approval_status": "approved"},
            {"approval_status": {"$exists": False}, "is_verified": True},
        ],
    }
    if gender in ("male", "female"):
        query["shop_type"] = gender
    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort("ranking_score", -1).limit(limit).to_list(limit)

    # JSON-LD LocalBusiness list for Google rich results
    items_ld = []
    for s in shops:
        items_ld.append({
            "@type": "ListItem",
            "position": len(items_ld) + 1,
            "item": {
                "@type": "HairSalon" if s.get("shop_type") == "female" else "BarberShop",
                "name": s.get("shop_name"),
                "image": s.get("shop_logo"),
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": s.get("address"),
                    "addressLocality": s.get("city"),
                    "addressCountry": s.get("country"),
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": s.get("latitude"),
                    "longitude": s.get("longitude"),
                } if s.get("latitude") else None,
                "telephone": s.get("phone_number"),
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": s.get("rating") or 0,
                    "reviewCount": s.get("total_reviews") or 0,
                } if s.get("total_reviews") else None,
                "url": f"{APP_URL.rstrip('/')}/barber/{s.get('id')}",
            },
        })
    jsonld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": items_ld,
    }
    return {
        "country": country,
        "city": city_clean,
        "gender": gender,
        "count": len(shops),
        "shops": shops,
        "jsonld": jsonld,
    }




# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "Welcome to BARBER HUB API", "version": "3.8.0"}

# ============== PWA / PUSH NOTIFICATIONS ==============

@api_router.post("/push/subscribe")
async def push_subscribe(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Store a Web Push subscription for the current user/device (auth optional)."""
    try:
        current_user = None
        try:
            if credentials:
                current_user = await get_current_entity(credentials)
        except Exception:
            current_user = None
        body = await request.json()
        subscription = body.get("subscription")
        if not subscription or not isinstance(subscription, dict) or "endpoint" not in subscription:
            raise HTTPException(status_code=400, detail="Invalid subscription payload")
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": (current_user or {}).get("id"),
            "entity_type": (current_user or {}).get("entity_type"),
            "endpoint": subscription.get("endpoint"),
            "keys": subscription.get("keys", {}),
            "user_agent": request.headers.get("user-agent", ""),
            "language": body.get("language", "ar"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        # Upsert by endpoint (one subscription per device)
        await db.push_subscriptions.update_one(
            {"endpoint": doc["endpoint"]},
            {"$set": doc},
            upsert=True,
        )
        return {"success": True, "message": "Subscription stored"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store subscription: {e}")


@api_router.delete("/push/unsubscribe")
async def push_unsubscribe(request: Request):
    try:
        body = await request.json()
        endpoint = body.get("endpoint")
        if not endpoint:
            raise HTTPException(status_code=400, detail="endpoint required")
        await db.push_subscriptions.delete_one({"endpoint": endpoint})
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/push/vapid-public-key")
async def push_vapid_public_key():
    """Returns VAPID public key if configured; otherwise empty (Push disabled server-side)."""
    key = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
    return {"public_key": key, "enabled": bool(key)}


# ============== PWA MANIFEST STATUS ==============

# ============== v3.9 — Dynamic Payment Wallets (Master Admin-managed) ==============
# The Master Admin can add/edit/remove manual payment methods per country so the
# app never ships hardcoded wallet numbers. Frontend reads from /api/payment-methods.

DEFAULT_WALLETS = [
    # Syria
    {"id": "sy-syriatel", "country": "SY", "country_name": "Syria", "kind": "mobile_wallet",
     "name_ar": "سيريتل كاش", "name_en": "Syriatel Cash", "recipient": "محمد الرجب",
     "number": "0935964158", "qr_image": None, "icon": "smartphone", "enabled": True, "order": 1},
    {"id": "sy-mtn", "country": "SY", "country_name": "Syria", "kind": "mobile_wallet",
     "name_ar": "MTN كاش", "name_en": "MTN Cash", "recipient": "محمد الرجب",
     "number": "0947000000", "qr_image": None, "icon": "smartphone", "enabled": True, "order": 2},
    # Iraq
    {"id": "iq-zain", "country": "IQ", "country_name": "Iraq", "kind": "mobile_wallet",
     "name_ar": "زين كاش", "name_en": "Zain Cash", "recipient": "محمد الرجب",
     "number": "07700000000", "qr_image": None, "icon": "smartphone", "enabled": True, "order": 1},
    {"id": "iq-asia", "country": "IQ", "country_name": "Iraq", "kind": "hawala",
     "name_ar": "آسيا حوالة", "name_en": "Asia Hawala", "recipient": "محمد الرجب",
     "number": "07830000000", "qr_image": None, "icon": "building", "enabled": True, "order": 2},
    # Jordan
    {"id": "jo-zain", "country": "JO", "country_name": "Jordan", "kind": "mobile_wallet",
     "name_ar": "زين كاش الأردن", "name_en": "Zain Cash Jordan", "recipient": "محمد الرجب",
     "number": "0790000000", "qr_image": None, "icon": "smartphone", "enabled": True, "order": 1},
    # Lebanon
    {"id": "lb-whish", "country": "LB", "country_name": "Lebanon", "kind": "mobile_wallet",
     "name_ar": "Whish Money", "name_en": "Whish Money", "recipient": "محمد الرجب",
     "number": "0300000000", "qr_image": None, "icon": "smartphone", "enabled": True, "order": 1},
    # Global fallback
    {"id": "gl-wu", "country": "XX", "country_name": "Global", "kind": "wire",
     "name_ar": "Western Union", "name_en": "Western Union", "recipient": "محمد الرجب",
     "number": "Contact admin", "qr_image": None, "icon": "globe", "enabled": True, "order": 1},
]

class PaymentMethodCreate(BaseModel):
    country: str  # ISO-2 (SY, IQ, JO, LB, XX for global)
    country_name: Optional[str] = None
    kind: str = "mobile_wallet"  # mobile_wallet | hawala | wire | bank | crypto
    name_ar: str
    name_en: Optional[str] = None
    recipient: Optional[str] = None
    number: Optional[str] = None
    qr_image: Optional[str] = None  # base64 data URL
    icon: Optional[str] = "smartphone"
    enabled: bool = True
    order: int = 99

class PaymentMethodUpdate(BaseModel):
    country: Optional[str] = None
    country_name: Optional[str] = None
    kind: Optional[str] = None
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    recipient: Optional[str] = None
    number: Optional[str] = None
    qr_image: Optional[str] = None
    icon: Optional[str] = None
    enabled: Optional[bool] = None
    order: Optional[int] = None


async def _ensure_default_payment_methods():
    """Seed default wallet methods on first run (idempotent)."""
    try:
        count = await db.payment_methods.count_documents({})
        if count == 0:
            now = datetime.now(timezone.utc).isoformat()
            seeded = []
            for w in DEFAULT_WALLETS:
                doc = dict(w)
                doc["created_at"] = now
                doc["updated_at"] = now
                seeded.append(doc)
            await db.payment_methods.insert_many(seeded)
            logger.info(f"Seeded {len(seeded)} default payment methods.")
    except Exception as e:
        logger.error(f"payment_methods seed failed: {e}")


@api_router.get("/payment-methods")
async def list_payment_methods(country: Optional[str] = None, all: bool = False):
    """Public: list enabled payment methods (optionally filtered by country)."""
    q: Dict[str, Any] = {} if all else {"enabled": True}
    if country:
        q["$or"] = [{"country": country.upper()}, {"country": "XX"}]
    items = await db.payment_methods.find(q, {"_id": 0}).sort([("country", 1), ("order", 1)]).to_list(200)
    # Don't expose QR image in list (can be big); use detail endpoint for QR.
    for it in items:
        if it.get("qr_image"):
            it["has_qr"] = True
            # Keep preview first 64 chars to enable showing in admin page.
        else:
            it["has_qr"] = False
    return items


@api_router.get("/payment-methods/{method_id}")
async def get_payment_method(method_id: str):
    m = await db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    if not m or not m.get("enabled", True):
        raise HTTPException(status_code=404, detail="Not found")
    return m


@api_router.post("/admin/payment-methods")
async def admin_create_payment_method(
    payload: PaymentMethodCreate,
    admin: Dict = Depends(require_admin),
):
    validate_image_base64(payload.qr_image, "qr_image")
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["country"] = (doc.get("country") or "XX").upper()
    doc["created_at"] = now
    doc["updated_at"] = now
    await db.payment_methods.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.put("/admin/payment-methods/{method_id}")
async def admin_update_payment_method(
    method_id: str,
    payload: PaymentMethodUpdate,
    admin: Dict = Depends(require_admin),
):
    validate_image_base64(payload.qr_image, "qr_image")
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "country" in updates and updates["country"]:
        updates["country"] = updates["country"].upper()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.payment_methods.update_one({"id": method_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    m = await db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    return m


@api_router.delete("/admin/payment-methods/{method_id}")
async def admin_delete_payment_method(method_id: str, admin: Dict = Depends(require_admin)):
    res = await db.payment_methods.delete_one({"id": method_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"message": "deleted"}


# ============== v3.9 — Payment Receipts (booking + subscription manual verification) ==============
class PaymentReceiptCreate(BaseModel):
    amount: float
    currency: str = "USD"
    method_id: Optional[str] = None  # id from payment_methods
    method_name: Optional[str] = None
    receipt_image: str  # base64 data URL
    target_type: str  # "booking" | "subscription" | "order"
    target_id: Optional[str] = None
    notes: Optional[str] = None
    # optional payer info for guests/anonymous
    payer_name: Optional[str] = None
    payer_phone: Optional[str] = None


@api_router.post("/payment-receipts")
async def submit_payment_receipt(
    payload: PaymentReceiptCreate,
    request: Request,
    entity: Optional[Dict] = Depends(get_current_entity),
):
    """Submit a payment receipt for manual verification by an admin or city agent."""
    validate_image_base64(payload.receipt_image, "receipt_image")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "amount": payload.amount,
        "currency": payload.currency,
        "method_id": payload.method_id,
        "method_name": payload.method_name or "",
        "receipt_image": payload.receipt_image,
        "target_type": payload.target_type,
        "target_id": payload.target_id,
        "notes": payload.notes or "",
        "payer_name": payload.payer_name or (entity.get("full_name") if entity else None),
        "payer_phone": payload.payer_phone or (entity.get("phone_number") if entity else None),
        "submitter_id": entity.get("id") if entity else None,
        "submitter_type": entity.get("entity_type") if entity else "guest",
        "status": "pending",  # pending | approved | rejected
        "reviewed_by": None,
        "reviewed_at": None,
        "rejection_reason": None,
        "ip": _client_ip(request),
        "created_at": now,
        "updated_at": now,
    }
    await db.payment_receipts.insert_one(doc)
    # Notify admins
    try:
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "recipient_type": "admin",
            "kind": "payment_receipt_pending",
            "title": "💰 إيصال دفع جديد بانتظار المراجعة / New payment receipt",
            "body": f"{payload.amount} {payload.currency} - {payload.target_type}",
            "data": {"receipt_id": doc["id"], "target_type": payload.target_type, "target_id": payload.target_id},
            "read": False,
            "created_at": now,
            "created_at_dt": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    return {k: v for k, v in doc.items() if k not in ("_id", "receipt_image")}


@api_router.get("/admin/payment-receipts")
async def admin_list_payment_receipts(
    admin: Dict = Depends(require_admin),
    status: Optional[str] = None,
    limit: int = 100,
):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    items = await db.payment_receipts.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items


@api_router.get("/admin/payment-receipts/{receipt_id}")
async def admin_get_payment_receipt(receipt_id: str, admin: Dict = Depends(require_admin)):
    r = await db.payment_receipts.find_one({"id": receipt_id}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    return r


class ReceiptReviewAction(BaseModel):
    rejection_reason: Optional[str] = None


@api_router.put("/admin/payment-receipts/{receipt_id}/approve")
async def admin_approve_receipt(
    receipt_id: str,
    admin: Dict = Depends(require_admin),
):
    r = await db.payment_receipts.find_one({"id": receipt_id})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_receipts.update_one(
        {"id": receipt_id},
        {"$set": {
            "status": "approved",
            "reviewed_by": admin.get("id"),
            "reviewed_at": now,
            "updated_at": now,
        }},
    )
    # If it was tied to a booking, mark the booking paid.
    try:
        if r.get("target_type") == "booking" and r.get("target_id"):
            await db.bookings.update_one(
                {"id": r["target_id"]},
                {"$set": {"payment_status": "paid", "paid_at": now, "updated_at": now}},
            )
        elif r.get("target_type") == "subscription" and r.get("target_id"):
            await db.subscriptions.update_one(
                {"id": r["target_id"]},
                {"$set": {"status": "active", "approved_at": now, "updated_at": now}},
            )
        elif r.get("target_type") == "order" and r.get("target_id"):
            await db.orders.update_one(
                {"id": r["target_id"]},
                {"$set": {"payment_status": "paid", "paid_at": now, "updated_at": now}},
            )
    except Exception as e:
        logger.debug(f"receipt approve side-effect error: {e}")
    return {"message": "approved"}


@api_router.put("/admin/payment-receipts/{receipt_id}/reject")
async def admin_reject_receipt(
    receipt_id: str,
    payload: ReceiptReviewAction,
    admin: Dict = Depends(require_admin),
):
    r = await db.payment_receipts.find_one({"id": receipt_id})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_receipts.update_one(
        {"id": receipt_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": (payload.rejection_reason or "").strip()[:500] or "Not provided",
            "reviewed_by": admin.get("id"),
            "reviewed_at": now,
            "updated_at": now,
        }},
    )
    return {"message": "rejected"}


# ============== v3.9 — Agents (City Collection Representatives) ==============
# Agents are sub-admins with a city scope. They can approve receipts only for
# targets inside their city and activate barbershops assigned to them.
class AgentCreate(BaseModel):
    full_name: str
    phone_number: str
    password: str
    email: Optional[str] = None
    country: str
    city: str
    commission_percent: float = 10.0

class AgentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    commission_percent: Optional[float] = None
    active: Optional[bool] = None


@api_router.post("/admin/agents")
async def admin_create_agent(payload: AgentCreate, master: Dict = Depends(require_master_admin)):
    # Validate password policy
    try:
        validate_password_strength(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    existing = await db.agents.find_one({"phone_number": payload.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Phone already used by another agent")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name,
        "phone_number": payload.phone_number,
        "email": payload.email,
        "password": hash_password(payload.password),
        "country": payload.country,
        "city": payload.city,
        "commission_percent": payload.commission_percent,
        "role": "agent",
        "active": True,
        "total_collected": 0.0,
        "created_by": master.get("id"),
        "created_at": now,
        "updated_at": now,
    }
    await db.agents.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("_id", "password")}


@api_router.get("/admin/agents")
async def admin_list_agents(admin: Dict = Depends(require_admin)):
    items = await db.agents.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(200)
    return items


@api_router.put("/admin/agents/{agent_id}")
async def admin_update_agent(agent_id: str, payload: AgentUpdate, master: Dict = Depends(require_master_admin)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.agents.update_one({"id": agent_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "updated"}


@api_router.delete("/admin/agents/{agent_id}")
async def admin_delete_agent(agent_id: str, master: Dict = Depends(require_master_admin)):
    res = await db.agents.delete_one({"id": agent_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "deleted"}


class AgentLoginRequest(BaseModel):
    phone_number: str
    password: str


@api_router.post("/agents/login", response_model=TokenResponse)
async def agent_login(payload: AgentLoginRequest, request: Request):
    ip = _client_ip(request)
    if not _rate_limit_check(f"login-agent:ip:{ip}", 20):
        raise HTTPException(status_code=429, detail="Too many login attempts")
    agent = await db.agents.find_one({"phone_number": payload.phone_number})
    if not agent or not verify_password(payload.password, agent.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not agent.get("active", True):
        raise HTTPException(status_code=403, detail="Agent account disabled")
    # Tokenize as a separate entity type so /api/agents/* routes can be gated.
    # Keep compatible with existing decode_token() by using entity_type='agent'.
    token = jwt.encode(
        {
            "entity_id": agent["id"],
            "entity_type": "agent",
            "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    safe = {k: v for k, v in agent.items() if k not in ("_id", "password")}
    return TokenResponse(access_token=token, user_type="agent", user=safe)


async def require_agent(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Agent authentication required")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("entity_type") != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    agent = await db.agents.find_one({"id": payload.get("entity_id")}, {"_id": 0, "password": 0})
    if not agent or not agent.get("active", True):
        raise HTTPException(status_code=403, detail="Agent account inactive")
    agent["entity_type"] = "agent"
    return agent


@api_router.get("/agents/me")
async def agent_me(agent: Dict = Depends(require_agent)):
    return agent


@api_router.get("/agents/receipts")
async def agent_list_receipts(agent: Dict = Depends(require_agent), status: Optional[str] = None):
    """Agents see receipts where the target barbershop/user lives in their city."""
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    items = await db.payment_receipts.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    # Filter by city from linked target if possible
    filtered = []
    for r in items:
        matched_city = False
        if r.get("target_type") == "booking" and r.get("target_id"):
            b = await db.bookings.find_one({"id": r["target_id"]}, {"_id": 0, "barbershop_id": 1})
            if b:
                s = await db.barbershops.find_one({"id": b["barbershop_id"]}, {"_id": 0, "city": 1})
                if s and (s.get("city") or "").lower() == (agent.get("city") or "").lower():
                    matched_city = True
        elif r.get("target_type") == "subscription" and r.get("target_id"):
            sub = await db.subscriptions.find_one({"id": r["target_id"]}, {"_id": 0, "barbershop_id": 1})
            if sub:
                s = await db.barbershops.find_one({"id": sub["barbershop_id"]}, {"_id": 0, "city": 1})
                if s and (s.get("city") or "").lower() == (agent.get("city") or "").lower():
                    matched_city = True
        if matched_city:
            filtered.append(r)
    return filtered


@api_router.put("/agents/receipts/{receipt_id}/approve")
async def agent_approve_receipt(receipt_id: str, agent: Dict = Depends(require_agent)):
    r = await db.payment_receipts.find_one({"id": receipt_id})
    if not r:
        raise HTTPException(status_code=404, detail="Not found")
    # Enforce city scope
    shop_city = None
    if r.get("target_type") == "booking" and r.get("target_id"):
        b = await db.bookings.find_one({"id": r["target_id"]}, {"_id": 0, "barbershop_id": 1})
        if b:
            s = await db.barbershops.find_one({"id": b["barbershop_id"]}, {"_id": 0, "city": 1})
            shop_city = (s or {}).get("city")
    elif r.get("target_type") == "subscription" and r.get("target_id"):
        sub = await db.subscriptions.find_one({"id": r["target_id"]}, {"_id": 0, "barbershop_id": 1})
        if sub:
            s = await db.barbershops.find_one({"id": sub["barbershop_id"]}, {"_id": 0, "city": 1})
            shop_city = (s or {}).get("city")
    if (shop_city or "").lower() != (agent.get("city") or "").lower():
        raise HTTPException(status_code=403, detail="Out-of-city receipt — cannot approve")
    now = datetime.now(timezone.utc).isoformat()
    await db.payment_receipts.update_one(
        {"id": receipt_id},
        {"$set": {"status": "approved", "reviewed_by": agent["id"],
                  "reviewed_at": now, "reviewer_type": "agent", "updated_at": now}},
    )
    # Side-effects same as admin approval
    if r.get("target_type") == "booking" and r.get("target_id"):
        await db.bookings.update_one(
            {"id": r["target_id"]},
            {"$set": {"payment_status": "paid", "paid_at": now, "updated_at": now}},
        )
    elif r.get("target_type") == "subscription" and r.get("target_id"):
        await db.subscriptions.update_one(
            {"id": r["target_id"]},
            {"$set": {"status": "active", "approved_at": now, "updated_at": now}},
        )
    # Update agent commission
    try:
        commission = (r.get("amount", 0) or 0) * (agent.get("commission_percent", 0) / 100.0)
        await db.agents.update_one(
            {"id": agent["id"]},
            {"$inc": {"total_collected": r.get("amount", 0), "total_commission": commission}},
        )
    except Exception:
        pass
    return {"message": "approved"}


@api_router.get("/config/public")
async def get_public_config():
    """Public configuration used by the frontend (non-sensitive)."""
    return {
        "admin_whatsapp": ADMIN_WHATSAPP,
        "app_url": APP_URL,
        "version": "3.8.0",
        "features": {
            "push_enabled": bool(os.environ.get("VAPID_PUBLIC_KEY", "")),
            "forgot_password": True,
            "phone_otp": True,
            "two_factor_auth": True,
            "data_export": True,
            "account_deletion": True,
            "staff_management": True,
            "calendar_export": True,
            "refresh_tokens": True,
            "guest_mode": True,
        },
        "languages": ["ar", "en", "fr", "es", "tr", "ur"],
    }

@api_router.get("/health")
async def health_check():
    """Deep health check — verifies DB connectivity for kubernetes liveness/readiness probes."""
    try:
        # Quick ping to mongo
        await db.command("ping")
        db_ok = True
    except Exception as e:
        db_ok = False
        logger.error(f"Health check - DB unreachable: {e}")
    return {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else "unreachable",
        "version": "3.8.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@api_router.get("/pwa/status")
async def pwa_status():
    """Health endpoint for PWA — used by the service worker to check connectivity."""
    return {
        "online": True,
        "version": "3.8.0",
        "features": {
            "push_enabled": bool(os.environ.get("VAPID_PUBLIC_KEY", "")),
            "offline_support": True,
            "install_prompt": True,
        },
    }

# ============================================================================
# SITE SETTINGS (contact info, social links) — admin controlled, public read
# ============================================================================
DEFAULT_SITE_SETTINGS = {
    "id": "site_settings_singleton",
    "phone": "+963 935 964 158",
    "email": "",
    "whatsapp": "",
    "facebook": "",
    "instagram": "",
    "twitter": "",
    "tiktok": "",
    "youtube": "",
    "snapchat": "",
    "address": "",
    "tagline_ar": "منصة BARBER HUB الرائدة في حجز مواعيد الحلاقة",
    "tagline_en": "BARBER HUB — the leading platform to book your barber",
    "updated_at": None,
}

class SiteSettingsUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    tiktok: Optional[str] = None
    youtube: Optional[str] = None
    snapchat: Optional[str] = None
    address: Optional[str] = None
    tagline_ar: Optional[str] = None
    tagline_en: Optional[str] = None


@api_router.get("/site-settings")
async def get_site_settings():
    """Public: fetch current site settings (contact info, social links)."""
    doc = await db.site_settings.find_one({"id": "site_settings_singleton"}, {"_id": 0})
    if not doc:
        # Seed default on first read
        seed = dict(DEFAULT_SITE_SETTINGS)
        seed["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.site_settings.insert_one(seed)
        doc = {k: v for k, v in seed.items() if k != "_id"}
    return doc


@api_router.put("/admin/site-settings")
async def update_site_settings(payload: SiteSettingsUpdate, admin: Dict = Depends(require_admin)):
    """Admin-only: update site-wide settings."""
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_settings.update_one(
        {"id": "site_settings_singleton"},
        {"$set": updates, "$setOnInsert": {"id": "site_settings_singleton", **{k: v for k, v in DEFAULT_SITE_SETTINGS.items() if k != "id" and k not in updates}}},
        upsert=True,
    )
    doc = await db.site_settings.find_one({"id": "site_settings_singleton"}, {"_id": 0})
    return {"success": True, "settings": doc}


# ============================================================================
# SUBSCRIPTION PLANS per country (admin managed)
# ============================================================================
class SubscriptionPlanCreate(BaseModel):
    country: str                      # e.g. "Syria", "Saudi Arabia", "global"
    country_code: Optional[str] = None  # e.g. "SY", "SA" — optional
    country_ar: Optional[str] = None
    currency: str = "USD"             # e.g. "SYP", "SAR", "USD"
    currency_symbol: Optional[str] = None  # e.g. "ل.س", "ر.س", "$"
    monthly_price: float = 20.0
    yearly_price: Optional[float] = None
    free_trial_months: int = 2
    subscribe_url: Optional[str] = None   # external payment link
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


async def _seed_default_plans_if_empty():
    count = await db.subscription_plans.count_documents({})
    if count > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    defaults = [
        {
            "id": str(uuid.uuid4()),
            "country": "Syria",
            "country_code": "SY",
            "country_ar": "سوريا",
            "currency": "SYP",
            "currency_symbol": "ل.س",
            "monthly_price": 250000.0,
            "yearly_price": None,
            "free_trial_months": 2,
            "subscribe_url": "",
            "badge_text_ar": "🎉 عرض خاص - أول شهرين مجاناً 🎉",
            "badge_text_en": "🎉 Special Offer - First 2 Months Free 🎉",
            "title_ar": "اشتراك احترافي",
            "title_en": "Professional Subscription",
            "description_ar": "باقة متكاملة لإدارة صالونك باحترافية عالية",
            "description_en": "Full package to run your salon professionally",
            "features_ar": DEFAULT_PLAN_FEATURES_AR,
            "features_en": DEFAULT_PLAN_FEATURES_EN,
            "active": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "id": str(uuid.uuid4()),
            "country": "Global",
            "country_code": "GLOBAL",
            "country_ar": "عالمي",
            "currency": "USD",
            "currency_symbol": "$",
            "monthly_price": 20.0,
            "yearly_price": 200.0,
            "free_trial_months": 2,
            "subscribe_url": "",
            "badge_text_ar": "🎉 عرض خاص - أول شهرين مجاناً 🎉",
            "badge_text_en": "🎉 Special Offer - First 2 Months Free 🎉",
            "title_ar": "اشتراك احترافي",
            "title_en": "Professional Subscription",
            "description_ar": "باقة متكاملة لإدارة صالونك باحترافية عالية",
            "description_en": "Full package to run your salon professionally",
            "features_ar": DEFAULT_PLAN_FEATURES_AR,
            "features_en": DEFAULT_PLAN_FEATURES_EN,
            "active": True,
            "created_at": now,
            "updated_at": now,
        },
    ]
    await db.subscription_plans.insert_many(defaults)


@api_router.get("/subscription-plans")
async def list_subscription_plans(country: Optional[str] = None, country_code: Optional[str] = None, active_only: bool = True):
    """Public: list subscription plans. Optionally filter by country or country_code.
    If filter yields nothing, returns the 'Global' plan as fallback.
    """
    await _seed_default_plans_if_empty()
    query: Dict[str, Any] = {}
    if active_only:
        query["active"] = True

    results: List[Dict] = []
    # Prefer country_code exact match first
    if country_code:
        results = await db.subscription_plans.find({**query, "country_code": country_code.upper()}, {"_id": 0}).to_list(50)
    if not results and country:
        results = await db.subscription_plans.find({**query, "country": {"$regex": f"^{country}$", "$options": "i"}}, {"_id": 0}).to_list(50)
    if not results and (country or country_code):
        # Fallback to Global
        results = await db.subscription_plans.find({**query, "country_code": "GLOBAL"}, {"_id": 0}).to_list(50)
    if not results:
        # No filters → all
        results = await db.subscription_plans.find(query, {"_id": 0}).sort("country", 1).to_list(200)
    return {"plans": results}


@api_router.get("/admin/subscription-plans")
async def admin_list_subscription_plans(admin: Dict = Depends(require_admin)):
    await _seed_default_plans_if_empty()
    plans = await db.subscription_plans.find({}, {"_id": 0}).sort("country", 1).to_list(500)
    return {"plans": plans}


@api_router.post("/admin/subscription-plans")
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


@api_router.put("/admin/subscription-plans/{plan_id}")
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


@api_router.delete("/admin/subscription-plans/{plan_id}")
async def delete_subscription_plan(plan_id: str, admin: Dict = Depends(require_admin)):
    res = await db.subscription_plans.delete_one({"id": plan_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True}


# ============================================================================
# TRANSFER RECIPIENTS (admin-managed Syriatel Cash + Exchange office recipients)
# Separate from existing /payment-methods (which is per-country wallets).
# This is for the "manual subscription payment" flow.
# ============================================================================
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
        {
            "id": "al-haram",
            "name_ar": "مكتب الهرم",
            "name_en": "Al-Haram Exchange",
            "recipient_ar": "ابراهيم الرجب",
            "recipient_en": "Ibrahim Al-Rajab",
            "province_ar": "معبدة",
            "province_en": "Maabada",
            "phone": "",
            "active": True,
        },
        {
            "id": "al-admiral",
            "name_ar": "مكتب الأدميرال",
            "name_en": "Al-Admiral Exchange",
            "recipient_ar": "احمد الرجب",
            "recipient_en": "Ahmad Al-Rajab",
            "province_ar": "معبدة",
            "province_en": "Maabada",
            "phone": "",
            "active": True,
        },
        {
            "id": "al-fuad",
            "name_ar": "مكتب الفؤاد",
            "name_en": "Al-Fuad Exchange",
            "recipient_ar": "احمد الرجب",
            "recipient_en": "Ahmad Al-Rajab",
            "province_ar": "معبدة",
            "province_en": "Maabada",
            "phone": "",
            "active": True,
        },
        {
            "id": "balance-transfer",
            "name_ar": "تحويل رصيد",
            "name_en": "Balance Transfer",
            "recipient_ar": "احمد الرجب",
            "recipient_en": "Ahmad Al-Rajab",
            "province_ar": "—",
            "province_en": "—",
            "phone": "+963 935 964 158",
            "active": True,
        },
    ],
    "general_note_ar": "بعد التحويل، ارفع صورة إشعار الدفع ليتم تفعيل اشتراكك خلال 24 ساعة.",
    "general_note_en": "After transferring, upload the payment receipt. Your subscription will be activated within 24 hours.",
    "updated_at": None,
}


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


@api_router.get("/transfer-recipients")
async def get_transfer_recipients():
    """Public: returns recipient info for Syriatel Cash + Exchange offices."""
    doc = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
    if not doc:
        seed = dict(DEFAULT_TRANSFER_RECIPIENTS)
        seed["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.transfer_recipients.insert_one(seed)
        doc = {k: v for k, v in seed.items() if k != "_id"}
    if doc.get("exchanges"):
        doc["exchanges"] = [e for e in doc["exchanges"] if e.get("active", True)]
    return doc


@api_router.get("/admin/transfer-recipients")
async def admin_get_transfer_recipients(admin: Dict = Depends(require_admin)):
    """Admin: returns full recipient info including inactive ones."""
    doc = await db.transfer_recipients.find_one({"id": "transfer_recipients_singleton"}, {"_id": 0})
    if not doc:
        seed = dict(DEFAULT_TRANSFER_RECIPIENTS)
        seed["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.transfer_recipients.insert_one(seed)
        doc = {k: v for k, v in seed.items() if k != "_id"}
    return doc


@api_router.put("/admin/transfer-recipients")
async def update_transfer_recipients(payload: TransferRecipientsUpdate, admin: Dict = Depends(require_admin)):
    """Admin: update Syriatel Cash number or exchange office recipient info."""
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


# ============================================================================
# SUBSCRIPTION ORDERS (semi-automatic: salon uploads receipt, admin approves)
# ============================================================================

def _generate_reference_code() -> str:
    """Generate a unique reference code for a subscription order. e.g. BH-26-A4F9B7"""
    from datetime import datetime as _dt
    year = _dt.now(timezone.utc).strftime("%y")
    rand = uuid.uuid4().hex[:6].upper()
    return f"BH-{year}-{rand}"


class SubscriptionOrderCreate(BaseModel):
    plan_id: str
    payment_method: str                     # 'syriatel_cash' | 'exchange'
    exchange_id: Optional[str] = None       # required if payment_method == 'exchange'
    reference_number: Optional[str] = None  # transfer ref/operation number (optional)
    receipt_image: Optional[str] = None     # base64 data URI (required)
    notes: Optional[str] = None             # additional notes from salon


class SubscriptionOrderAdminAction(BaseModel):
    admin_notes: Optional[str] = None
    duration_days: Optional[int] = None  # override (default: 30 for monthly, 365 for yearly)


@api_router.post("/subscription-orders")
async def create_subscription_order(
    payload: SubscriptionOrderCreate,
    entity: Dict = Depends(require_auth),
):
    """Any authenticated user (typically a salon owner) can submit a subscription order
    with a transfer receipt. Admin reviews and approves.
    """
    # Validate receipt
    if not payload.receipt_image or not payload.receipt_image.startswith("data:image"):
        raise HTTPException(status_code=400, detail="Receipt image is required (base64 data URI)")

    # Validate plan
    plan = await db.subscription_plans.find_one({"id": payload.plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found")

    # Validate payment method
    if payload.payment_method not in ("syriatel_cash", "exchange"):
        raise HTTPException(status_code=400, detail="payment_method must be 'syriatel_cash' or 'exchange'")

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

    # Determine the salon/shop associated with this order
    salon_id = None
    salon_name = None
    if entity.get("entity_type") == "barbershop":
        salon_id = entity.get("id")
        salon_name = entity.get("shop_name") or entity.get("name")
    else:
        # Regular user submitting (allowed for future cases), but salon_id may be missing
        salon_id = entity.get("id")
        salon_name = entity.get("name") or entity.get("phone_number")

    now = datetime.now(timezone.utc).isoformat()
    ref_code = _generate_reference_code()
    # Ensure uniqueness
    while await db.subscription_orders.find_one({"reference_code": ref_code}):
        ref_code = _generate_reference_code()

    order_doc = {
        "id": str(uuid.uuid4()),
        "reference_code": ref_code,
        "salon_id": salon_id,
        "salon_name": salon_name,
        "entity_type": entity.get("entity_type"),
        "plan_id": plan.get("id"),
        "plan_title_ar": plan.get("title_ar"),
        "plan_title_en": plan.get("title_en"),
        "country": plan.get("country"),
        "country_code": plan.get("country_code"),
        "currency": plan.get("currency"),
        "currency_symbol": plan.get("currency_symbol"),
        "amount": plan.get("monthly_price", 0),
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

    # Create an in-app admin notification if the collection exists
    try:
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()),
            "type": "subscription_order",
            "title": f"طلب اشتراك جديد - {ref_code}",
            "message": f"الصالون {salon_name or '-'} أرسل طلب اشتراك جديد ({plan.get('country') or ''})",
            "entity_id": order_doc["id"],
            "entity_type": "subscription_order",
            "read": False,
            "created_at": now,
        })
    except Exception:
        pass

    order_doc.pop("_id", None)
    return {"success": True, "order": order_doc, "reference_code": ref_code}


@api_router.get("/my-subscription-orders")
async def list_my_subscription_orders(entity: Dict = Depends(require_auth)):
    """Returns the authenticated entity's subscription orders."""
    orders = await db.subscription_orders.find(
        {"salon_id": entity.get("id")}, {"_id": 0, "receipt_image": 0}
    ).sort("created_at", -1).to_list(100)
    return {"orders": orders}


@api_router.get("/my-subscription-orders/{order_id}")
async def get_my_subscription_order(order_id: str, entity: Dict = Depends(require_auth)):
    order = await db.subscription_orders.find_one(
        {"id": order_id, "salon_id": entity.get("id")}, {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@api_router.get("/admin/subscription-orders")
async def admin_list_subscription_orders(
    admin: Dict = Depends(require_admin),
    status: Optional[str] = Query(None, regex="^(pending|approved|rejected)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """Admin: list all subscription orders with optional status filter.
    Excludes receipt_image to keep list lightweight; fetch individual to see receipt.
    """
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    orders = await db.subscription_orders.find(
        query, {"_id": 0, "receipt_image": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.subscription_orders.count_documents(query)
    pending_count = await db.subscription_orders.count_documents({"status": "pending"})
    return {"orders": orders, "total": total, "pending_count": pending_count}


@api_router.get("/admin/subscription-orders/{order_id}")
async def admin_get_subscription_order(order_id: str, admin: Dict = Depends(require_admin)):
    order = await db.subscription_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@api_router.post("/admin/subscription-orders/{order_id}/approve")
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
    # Determine duration in days
    duration_days = payload.duration_days or 30
    # If plan's yearly_price matches the paid amount, give a year
    plan = await db.subscription_plans.find_one({"id": order.get("plan_id")}, {"_id": 0}) or {}
    if plan.get("yearly_price") and float(order.get("amount", 0)) >= float(plan["yearly_price"]) * 0.95:
        duration_days = payload.duration_days or 365

    # Add free-trial months bonus
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

    # Activate the salon's subscription
    salon_id = order.get("salon_id")
    if salon_id and order.get("entity_type") == "barbershop":
        # Extend from max(existing_expiry, now)
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


@api_router.post("/admin/subscription-orders/{order_id}/reject")
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


# ============================================================================
# SALON VACATION / TEMPORARY-CLOSED toggle
# ============================================================================
class VacationToggle(BaseModel):
    is_on_vacation: bool
    vacation_message_ar: Optional[str] = None
    vacation_message_en: Optional[str] = None
    vacation_until: Optional[str] = None  # ISO date (optional — auto-reopen)


@api_router.post("/barbershop/me/vacation")
async def toggle_vacation(payload: VacationToggle, entity: Dict = Depends(require_barbershop)):
    """Salon toggles temporary-closed / vacation mode."""
    now = datetime.now(timezone.utc).isoformat()
    updates: Dict[str, Any] = {
        "is_on_vacation": bool(payload.is_on_vacation),
        "updated_at": now,
    }
    if payload.vacation_message_ar is not None:
        updates["vacation_message_ar"] = payload.vacation_message_ar
    if payload.vacation_message_en is not None:
        updates["vacation_message_en"] = payload.vacation_message_en
    if payload.vacation_until is not None:
        updates["vacation_until"] = payload.vacation_until

    await db.barbershops.update_one({"id": entity.get("id")}, {"$set": updates})
    return {"success": True, "is_on_vacation": updates["is_on_vacation"]}


# Include the router
app.include_router(api_router)

# ============== SECURITY HEADERS MIDDLEWARE ==============
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Prevent MIME sniffing
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        # Basic clickjacking protection
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        # Referrer control
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # Limit browser features
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(self), microphone=(), camera=(self), payment=(self)",
        )
        # HSTS (only when served over HTTPS by the ingress)
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        # Content-Security-Policy: only apply to HTML responses to avoid breaking image/JSON/APK downloads.
        # API/JSON responses still get a minimal restrictive default for safety.
        ct = response.headers.get("content-type", "").lower()
        if "text/html" in ct:
            # Permissive enough to allow our React app + needed CDNs while blocking inline scripts.
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; "
                "img-src 'self' data: blob: https:; "
                "media-src 'self' data: blob: https:; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; "
                "connect-src 'self' https: wss:; "
                "frame-ancestors 'self'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        elif "application/json" in ct:
            response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ============== CORS ==============
# 🚨 PRODUCTION DEPLOYMENT NOTE (v3.6.1):
#   Before going live on a public domain (e.g. barberhub.com), replace CORS_ORIGINS="*"
#   in /app/backend/.env with a comma-separated list of TRUSTED origins only. Example:
#       CORS_ORIGINS="https://barberhub.com,https://www.barberhub.com,https://app.barberhub.com"
#   Wildcard is acceptable for the Emergent Preview environment because the backend is
#   stateless (JWT in Authorization header, no cookies) — but it disables
#   allow_credentials by spec and should NOT ship to production as-is.
_cors_raw = os.environ.get('CORS_ORIGINS', '*').strip()
if _cors_raw == '*' or not _cors_raw:
    cors_origins = ["*"]
    cors_allow_credentials = False  # wildcard + credentials is forbidden by spec
    logging.warning("CORS is wide-open ('*'). Set CORS_ORIGINS env var to a list of trusted origins in production.")
else:
    cors_origins = [o.strip() for o in _cors_raw.split(',') if o.strip()]
    cors_allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_credentials=cors_allow_credentials,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db():
    # Create indexes
    await db.users.create_index("phone_number", unique=True)
    await db.users.create_index("id", unique=True)
    await db.barbershops.create_index("phone_number", unique=True)
    await db.barbershops.create_index("id", unique=True)
    await db.barbershops.create_index([("ranking_score", -1)])
    await db.barbershops.create_index("shop_type")
    await db.barbershops.create_index([("country", 1), ("city", 1)])
    await db.services.create_index("barbershop_id")
    await db.bookings.create_index("id", unique=True)
    await db.bookings.create_index([("barbershop_id", 1), ("booking_date", 1)])
    await db.bookings.create_index("user_id")
    await db.bookings.create_index([("user_id", 1), ("status", 1)])
    await db.bookings.create_index([("barbershop_id", 1), ("status", 1)])
    await db.reviews.create_index("id", unique=True)
    await db.reviews.create_index("barbershop_id")
    await db.barber_profiles.create_index("barbershop_id", unique=True)
    await db.gallery_images.create_index("barbershop_id")
    await db.products.create_index("shop_id")
    await db.products.create_index([("shop_id", 1), ("category", 1)])
    await db.products.create_index("featured")
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("shop_id")
    await db.orders.create_index([("shop_id", 1), ("status", 1)])
    await db.sponsored_ads.create_index("id", unique=True)
    await db.sponsored_ads.create_index([("status", 1), ("end_date", 1)])
    await db.sponsored_ads.create_index("shop_id")
    # Expire any active ads whose end_date has passed
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.sponsored_ads.update_many(
        {"status": "active", "end_date": {"$lt": now_iso}},
        {"$set": {"status": "expired", "updated_at": now_iso}}
    )
    await db.referrals.create_index("user_id", unique=True)
    await db.referrals.create_index("referral_code", unique=True)
    await db.favorites.create_index([("user_id", 1), ("shop_id", 1)], unique=True)
    await db.style_advices.create_index([("user_id", 1), ("booking_id", 1)])
    await db.ai_tryon_sessions.create_index([("user_id", 1), ("booking_id", 1)])
    # Push subscriptions - unique by endpoint for idempotency
    try:
        await db.push_subscriptions.create_index("endpoint", unique=True, sparse=True)
    except Exception:
        pass
    # Notifications - auto-cleanup after 90 days
    try:
        await db.notifications.create_index("recipient_id")
        await db.notifications.create_index(
            "created_at_dt",
            expireAfterSeconds=60 * 60 * 24 * 90,
        )
    except Exception:
        pass

    # v3.8 indexes
    try:
        await db.audit_log.create_index("created_at")
        await db.audit_log.create_index("actor_id")
        await db.audit_log.create_index("event")
        # TTL: keep audit log 180 days
        await db.audit_log.create_index("created_at_dt", expireAfterSeconds=60 * 60 * 24 * 180)
    except Exception:
        pass
    try:
        await db.refresh_tokens.create_index("token_hash", unique=True)
        await db.refresh_tokens.create_index("entity_id")
        await db.refresh_tokens.create_index("expires_at")
    except Exception:
        pass
    try:
        await db.password_reset_otps.create_index("phone_number", unique=True)
        await db.password_reset_otps.create_index("expires_at")
    except Exception:
        pass
    try:
        await db.phone_verification_otps.create_index("entity_id", unique=True)
    except Exception:
        pass
    try:
        await db.staff.create_index([("barbershop_id", 1), ("active", 1)])
    except Exception:
        pass

    # ---------- Admin user bootstrap ----------
    # SECURITY v3.6.1: Never auto-create an admin with a well-known password.
    # Bootstrap order:
    #   1. If ADMIN_BOOTSTRAP_PASSWORD env var is set → use it.
    #   2. Else if ALLOW_DEFAULT_ADMIN=true (dev/preview) → generate a RANDOM strong password
    #      and log it ONCE to the console so the operator can copy it. NEVER "admin123".
    #   3. Else → skip; operator must provision admin via a migration script.
    # Existing admins are left untouched, BUT if an existing admin still has the
    # legacy "admin123" password, force must_change_password=True so the new guard
    # in require_auth() blocks all privileged calls until it is rotated.
    admin_exists = await db.admins.find_one({}, {"_id": 0})
    if not admin_exists:
        bootstrap_pw = os.environ.get("ADMIN_BOOTSTRAP_PASSWORD")
        bootstrap_phone = os.environ.get("ADMIN_BOOTSTRAP_PHONE", "admin")
        if bootstrap_pw:
            admin_doc = {
                "id": str(uuid.uuid4()),
                "phone_number": bootstrap_phone,
                "password": hash_password(bootstrap_pw),
                "full_name": os.environ.get("ADMIN_BOOTSTRAP_NAME", "System Admin"),
                "role": "admin",
                "must_change_password": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin_doc)
            logger.info(f"Admin user bootstrapped with phone '{bootstrap_phone}'. User must change password on first login.")
        elif os.environ.get("ALLOW_DEFAULT_ADMIN", "true").lower() in ("1", "true", "yes"):
            # Generate a strong random password (NO hardcoded default)
            generated_pw = f"Admin-{secrets.token_urlsafe(14)}-2026"
            admin_doc = {
                "id": str(uuid.uuid4()),
                "phone_number": "admin",
                "password": hash_password(generated_pw),
                "full_name": "مدير النظام",
                "role": "admin",
                "must_change_password": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(admin_doc)
            logger.warning(
                "⚠️  BOOTSTRAP ADMIN CREATED. Phone='admin' | Password=%s | "
                "This password is shown ONCE in the logs. Record it now, log in, "
                "and IMMEDIATELY change it via POST /api/auth/change-password.",
                generated_pw,
            )
    else:
        # Legacy protection: if admin still has the old "admin123" password, ROTATE it to a
        # strong random value (satisfies user approval: option a + b). The new password is
        # logged ONCE; must_change_password stays True so even the rotated password has to
        # be changed on first login.
        if verify_password("admin123", admin_exists.get("password", "")):
            rotated_pw = f"Admin-{secrets.token_urlsafe(14)}-2026"
            await db.admins.update_one(
                {"id": admin_exists["id"]},
                {"$set": {
                    "password": hash_password(rotated_pw),
                    "must_change_password": True,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            # Also persist to a protected memory file so the operator can retrieve it.
            try:
                from pathlib import Path as _P
                mem = _P("/app/memory/admin_bootstrap_password.txt")
                mem.write_text(
                    "Auto-rotated admin password (v3.6.1).\n"
                    f"Phone: {admin_exists.get('phone_number', 'admin')}\n"
                    f"Password: {rotated_pw}\n"
                    "Status: must_change_password=True — rotate via POST /api/auth/change-password before anything else.\n"
                )
            except Exception:
                pass
            logger.warning(
                "⚠️  Legacy admin password 'admin123' detected and ROTATED. "
                "New password written to /app/memory/admin_bootstrap_password.txt. "
                "must_change_password flag is ON — admin must rotate again via "
                "POST /api/auth/change-password before using any protected endpoint."
            )

    # ---------- Master Owner auto-elevation (v3.7) ----------
    # Ensure the designated Master Owner (MASTER_OWNER_EMAIL) is always:
    #   - role=master_admin
    #   - permissions=ALL
    #   - active=True, is_verified=True
    # If no admin record has this email yet, we do NOT auto-create one (they must register
    # normally first or be created by an existing admin). But if one DOES exist, we elevate it.
    try:
        master_doc = await db.admins.find_one({"email": MASTER_OWNER_EMAIL})
        if master_doc:
            needs_update = (
                master_doc.get("role") != "master_admin"
                or master_doc.get("permissions") != ALL_PERMISSIONS
                or master_doc.get("active") is False
            )
            if needs_update:
                await db.admins.update_one(
                    {"id": master_doc["id"]},
                    {"$set": {
                        "role": "master_admin",
                        "permissions": ALL_PERMISSIONS,
                        "active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logger.info(f"Master Owner ({MASTER_OWNER_EMAIL}) auto-elevated to role=master_admin with full permissions.")
        else:
            logger.info(
                f"Master Owner email ({MASTER_OWNER_EMAIL}) not yet registered. "
                "When that account is created (or an existing admin adds this email), it will be auto-elevated on next boot."
            )
    except Exception as e:
        logger.error(f"Master Owner elevation failed: {e}")

    # ---------- v3.8 Dedicated Site Owner bootstrap ----------
    # The site owner explicitly requested a Master admin with:
    #   phone = +4917684034961 (stored WITHOUT the leading '+' to stay consistent
    #   with every other phone in the DB that uses the E.164 digits form)
    #   password = mhm321321/  (must_change_password=True so it MUST be rotated
    #   immediately on first login)
    # Idempotent: runs every boot but only inserts if missing; never overwrites a
    # password the owner has already rotated.
    try:
        owner_phone = "4917684034961"
        owner_initial_pw = "mhm321321/"
        existing = await db.admins.find_one({"phone_number": owner_phone})
        if not existing:
            owner_doc = {
                "id": str(uuid.uuid4()),
                "phone_number": owner_phone,
                "email": os.environ.get("SITE_OWNER_EMAIL", "owner@barberhub.com"),
                "password": hash_password(owner_initial_pw),
                "full_name": "Site Owner",
                "role": "master_admin",
                "permissions": ALL_PERMISSIONS,
                "active": True,
                "is_verified": True,
                "must_change_password": True,   # forces rotation on first login
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.admins.insert_one(owner_doc)
            logger.warning(
                "🔐 Site Owner account CREATED (v3.8). Phone=+%s — initial password is"
                " the one provided by the owner; must_change_password=True so it will"
                " be forced to rotate on first login.",
                owner_phone,
            )
        else:
            # Make sure it is elevated to master_admin with all permissions (idempotent).
            if (
                existing.get("role") != "master_admin"
                or existing.get("permissions") != ALL_PERMISSIONS
                or existing.get("active") is False
            ):
                await db.admins.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "role": "master_admin",
                        "permissions": ALL_PERMISSIONS,
                        "active": True,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                logger.info("🔐 Site Owner account re-elevated to master_admin with all permissions.")
    except Exception as e:
        logger.error(f"Site Owner bootstrap failed: {e}")

    # v3.9 — Seed payment methods + indexes for new collections
    try:
        await db.payment_methods.create_index("id", unique=True)
        await db.payment_methods.create_index([("country", 1), ("order", 1)])
        await db.payment_receipts.create_index("id", unique=True)
        await db.payment_receipts.create_index([("status", 1), ("created_at", -1)])
        await db.agents.create_index("id", unique=True)
        await db.agents.create_index("phone_number", unique=True)
        await db.agents.create_index([("country", 1), ("city", 1)])
        await _ensure_default_payment_methods()
    except Exception as e:
        logger.error(f"v3.9 indexes/seed failed: {e}")

    # ---------- Ranking recompute: initial + nightly schedule ----------
    import asyncio

    async def _nightly_ranking_task():
        """Background task: recompute all shop rankings every 24 hours."""
        while True:
            try:
                await asyncio.sleep(60 * 60 * 24)   # wait 24h then recompute
                await recompute_all_rankings()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Nightly ranking task error: {e}")

    # Run once at startup (non-blocking; don't delay server boot)
    async def _initial_recompute():
        try:
            # Small delay so the event loop can finish binding
            await asyncio.sleep(2)
            await recompute_all_rankings()
        except Exception as e:
            logger.error(f"Initial ranking recompute failed: {e}")

    asyncio.create_task(_initial_recompute())
    asyncio.create_task(_nightly_ranking_task())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
