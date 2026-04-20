from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, Request, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta, date, time
import jwt
import bcrypt
import qrcode
import io
import base64
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get APP_URL from environment for QR codes and referral links
APP_URL = os.environ.get('APP_URL', 'https://web-repo-tool.preview.emergentagent.com')

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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'barber_hub')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'barber-hub-secret-key-2026')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7

# Create the main app
app = FastAPI(title="BARBER HUB API", version="2.0.0")

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

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    entity = await get_current_entity(credentials)
    if not entity:
        raise HTTPException(status_code=401, detail="Authentication required")
    return entity

async def require_barbershop(entity: Dict = Depends(require_auth)) -> Dict:
    if entity.get('entity_type') != 'barbershop':
        raise HTTPException(status_code=403, detail="Barbershop access required")
    return entity

async def require_admin(entity: Dict = Depends(require_auth)) -> Dict:
    if entity.get('entity_type') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
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
        "rating": shop.get("ranking_score", 0.0),
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
    
    return enriched

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

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
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
async def login(credentials: UserLogin):
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
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/users/me")
async def get_current_user(entity: Dict = Depends(require_auth)):
    return entity

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
async def register_barbershop(shop_data: BarbershopCreate):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.barbershops.insert_one(shop_doc)
    
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
    query = {}
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
async def get_barbershop(shop_id: str):
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
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
    """Get top rated barbers by gender (legacy - global scope)"""
    query = {"shop_type": gender}
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

    query: Dict[str, Any] = {}
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
    """Get featured products across all shops"""
    products = await db.products.find({"featured": True, "in_stock": True}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # Enrich with shop info
    for product in products:
        shop = await db.barbershops.find_one({"id": product["shop_id"]}, {"_id": 0, "password": 0})
        if shop:
            product["shop_name"] = shop.get("shop_name", "")
            product["shop_city"] = shop.get("city", "")
            product["shop_country"] = shop.get("country", "")
    return products

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product_data: ProductUpdate, shop: Dict = Depends(require_barbershop)):
    """Update a product"""
    product = await db.products.find_one({"id": product_id, "shop_id": shop['id']})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_none=True)
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
    
    # Check for conflicting bookings
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barbershop ranking
    all_reviews = await db.reviews.find({"barbershop_id": barbershop_id}, {"_id": 0}).to_list(1000)
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
        "created_at": review_doc["created_at"]
    }

@api_router.get("/reviews/barber/{barber_id}")
async def get_barber_reviews(barber_id: str, limit: int = 50):
    """Get reviews for a barber - frontend compatibility"""
    reviews = await db.reviews.find({"barbershop_id": barber_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barbershop ranking
    all_reviews = await db.reviews.find({"barbershop_id": booking['barbershop_id']}, {"_id": 0}).to_list(1000)
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
    reviews = await db.reviews.find({"barbershop_id": shop_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reviews

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
    shops = await db.barbershops.find({"is_verified": False}, {"_id": 0, "password": 0}).to_list(100)
    return shops

@api_router.put("/admin/barbershops/{shop_id}/verify")
async def verify_barbershop(shop_id: str, admin: Dict = Depends(require_admin)):
    result = await db.barbershops.update_one(
        {"id": shop_id},
        {"$set": {"is_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    return {"message": "Barbershop verified"}

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
async def get_admin_users(admin: Dict = Depends(require_admin)):
    """Get all users (customers + barbershops) for admin dashboard"""
    result = []
    
    # Get all customers
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(500)
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
    
    # Get all barbershops
    shops = await db.barbershops.find({}, {"_id": 0, "password": 0}).to_list(500)
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
async def seed_database():
    """Inject seed data: 10 salons (5 men, 5 women) with services, reviews, bookings"""
    import random
    
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
        raw_password = shop_data.pop("password")
        
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
                "image_url": "",
                "in_stock": True,
                "featured": prod.get("featured", False),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product_doc)
        
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
            "admin": {"phone": "admin", "password": "admin123"},
            "salon_owner_1": {"phone": "0935964158", "password": "salon123", "name": "صالون الأناقة الملكية"},
            "all_salon_password": "salon123"
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
    or_clauses: List[Dict[str, Any]] = []
    if search:
        or_clauses.extend([
            {"shop_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
            {"district": {"$regex": search, "$options": "i"}},
            {"neighborhood": {"$regex": search, "$options": "i"}},
            {"village": {"$regex": search, "$options": "i"}},
        ])
    if area:
        or_clauses.extend([
            {"city": {"$regex": area, "$options": "i"}},
            {"district": {"$regex": area, "$options": "i"}},
            {"neighborhood": {"$regex": area, "$options": "i"}},
            {"village": {"$regex": area, "$options": "i"}},
            {"address": {"$regex": area, "$options": "i"}},
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
        raise HTTPException(status_code=500, detail=f"AI service unavailable: {_AI_IMPORT_ERROR if '_AI_IMPORT_ERROR' in globals() else 'unknown'}")

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
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)[:200]}")

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
        raise HTTPException(status_code=500, detail=f"AI Try-On unavailable: {_TRYON_IMPORT_ERROR if '_TRYON_IMPORT_ERROR' in globals() else 'unknown'}")

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
        raise HTTPException(status_code=500, detail=f"AI Try-On failed: {str(e)[:200]}")

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
async def get_usage_stats(entity: Dict = Depends(require_barbershop)):
    """
    Get AI usage statistics for monitoring API credits consumption.
    Returns total AI Advisor calls and AI Try-On generations.
    """
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
    
    # Get per-user breakdown (top 10 users)
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
    
    top_advisor_users = await db.style_advices.aggregate(advisor_pipeline).to_list(10)
    top_tryon_users = await db.ai_tryon_sessions.aggregate(tryon_pipeline).to_list(10)
    
    # Estimated cost (rough estimate)
    # AI Advisor (GPT-5 Vision): ~$0.01 per call
    # AI Try-On (Gemini Nano Banana): ~$0.005 per generation
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
            "ai_tryon": f"1 attempt per confirmed booking (ONE-SHOT POLICY)"
        }
    }


# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "Welcome to BARBER HUB API", "version": "3.0.0"}

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

@api_router.get("/pwa/status")
async def pwa_status():
    """Health endpoint for PWA — used by the service worker to check connectivity."""
    return {
        "online": True,
        "version": "3.1.0",
        "features": {
            "push_enabled": bool(os.environ.get("VAPID_PUBLIC_KEY", "")),
            "offline_support": True,
            "install_prompt": True,
        },
    }

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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
    await db.services.create_index("barbershop_id")
    await db.bookings.create_index("id", unique=True)
    await db.bookings.create_index([("barbershop_id", 1), ("booking_date", 1)])
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
    
    # Create admin user if not exists
    admin = await db.admins.find_one({"phone_number": "admin"})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "phone_number": "admin",
            "password": hash_password("admin123"),
            "full_name": "مدير النظام",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin_doc)
        logger.info("Admin user created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
