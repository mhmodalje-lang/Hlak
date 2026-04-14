from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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

# --- Users (الزبائن) ---
class UserCreate(BaseModel):
    phone_number: str
    email: Optional[str] = None
    full_name: str
    password: str
    gender: str  # 'male' or 'female'
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

# --- Barbershops (الصالونات) ---
class BarbershopCreate(BaseModel):
    owner_name: str
    shop_name: str
    shop_logo: Optional[str] = None
    description: Optional[str] = None
    shop_type: str  # 'male' or 'female'
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

# --- Services (الخدمات) ---
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: str = "other"

class ServiceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barbershop_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: str
    created_at: str

# --- Gallery Images (صور الأعمال) ---
class GalleryImageCreate(BaseModel):
    image_before: str
    image_after: str
    caption: Optional[str] = None

class GalleryImageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barbershop_id: str
    image_before: str
    image_after: str
    caption: Optional[str] = None
    created_at: str

# --- Bookings (الحجوزات) ---
class BookingCreate(BaseModel):
    barbershop_id: str
    service_id: str
    booking_date: str  # YYYY-MM-DD
    start_time: str    # HH:MM
    user_phone_for_notification: str

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: Optional[str] = None
    barbershop_id: str
    barbershop_name: Optional[str] = None
    service_id: str
    service_name: Optional[str] = None
    booking_date: str
    start_time: str
    end_time: str
    status: str
    user_phone_for_notification: str
    created_at: str

# --- Reviews (التقييمات) ---
class ReviewCreate(BaseModel):
    booking_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    booking_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    barbershop_id: str
    rating: int
    comment: Optional[str] = None
    created_at: str

# --- Reports (البلاغات) ---
class ReportCreate(BaseModel):
    reported_entity_id: str
    report_type: str  # 'no_show', 'misconduct', 'frequent_cancellation'
    description: Optional[str] = None

# --- Subscriptions (الاشتراكات) ---
class SubscriptionCreate(BaseModel):
    plan_type: str = "annual"  # 'annual' or 'monthly'
    amount: float
    payment_method: Optional[str] = None
    receipt_image: Optional[str] = None

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
    user_type: str  # 'user', 'barbershop', 'admin'
    user: Optional[Dict] = None

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

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """تسجيل زبون جديد"""
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
    user_response = {k: v for k, v in user_doc.items() if k != 'password'}
    
    return TokenResponse(access_token=token, user_type='user', user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """تسجيل دخول (زبون أو صالون أو مدير)"""
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
    """الحصول على بيانات المستخدم الحالي"""
    return entity

# ============== BARBERSHOP REGISTRATION ==============

@api_router.post("/auth/register-barbershop", response_model=TokenResponse)
async def register_barbershop(shop_data: BarbershopCreate):
    """تسجيل صالون جديد"""
    existing = await db.barbershops.find_one({"phone_number": shop_data.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    shop_id = str(uuid.uuid4())
    qr_code_data = f"https://barberhub.com/shop/{shop_id}"
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
    shop_response = {k: v for k, v in shop_doc.items() if k != 'password'}
    
    return TokenResponse(access_token=token, user_type='barbershop', user=shop_response)

# ============== BARBERSHOP ENDPOINTS ==============

@api_router.get("/barbershops", response_model=List[BarbershopResponse])
async def list_barbershops(
    type: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 50,  # km
    country: Optional[str] = None,
    city: Optional[str] = None,
    district: Optional[str] = None,
    sort_by: str = "ranking_score",
    limit: int = 50
):
    """الحصول على قائمة الصالونات مع البحث والفلترة"""
    query = {}
    
    if type:
        query["shop_type"] = type
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    if district:
        query["district"] = district
    
    # Sort options
    sort_field = "ranking_score" if sort_by == "ranking_score" else "created_at"
    sort_order = -1
    
    shops = await db.barbershops.find(query, {"_id": 0, "password": 0}).sort(sort_field, sort_order).limit(limit).to_list(limit)
    
    # If lat/lng provided, filter by distance
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

@api_router.get("/barbershops/{shop_id}", response_model=BarbershopResponse)
async def get_barbershop(shop_id: str):
    """الحصول على تفاصيل صالون معين"""
    shop = await db.barbershops.find_one({"id": shop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    return shop

@api_router.put("/barbershops/me", response_model=BarbershopResponse)
async def update_barbershop(update_data: BarbershopUpdate, shop: Dict = Depends(require_barbershop)):
    """تحديث بيانات الصالون"""
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.barbershops.update_one({"id": shop['id']}, {"$set": update_dict})
    
    updated = await db.barbershops.find_one({"id": shop['id']}, {"_id": 0, "password": 0})
    return updated

@api_router.get("/barbershops/{shop_id}/available-slots")
async def get_available_slots(shop_id: str, date: str, service_id: str):
    """الحصول على الأوقات المتاحة للحجز"""
    # Get service duration
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    duration = service['duration_minutes']
    
    # Get existing bookings for the date
    bookings = await db.bookings.find({
        "barbershop_id": shop_id,
        "booking_date": date,
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [(b['start_time'], b['end_time']) for b in bookings]
    
    # Generate available slots (9:00 - 21:00)
    available_slots = []
    for hour in range(9, 21):
        for minute in [0, 30]:
            start_time = f"{hour:02d}:{minute:02d}"
            end_time = calculate_end_time(start_time, duration)
            
            # Check if slot overlaps with any booked time
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

# ============== SERVICES ENDPOINTS ==============

@api_router.post("/barbershops/me/services", response_model=ServiceResponse)
async def create_service(service_data: ServiceCreate, shop: Dict = Depends(require_barbershop)):
    """إضافة خدمة جديدة للصالون"""
    service_id = str(uuid.uuid4())
    service_doc = {
        "id": service_id,
        "barbershop_id": shop['id'],
        "name": service_data.name,
        "description": service_data.description,
        "price": service_data.price,
        "duration_minutes": service_data.duration_minutes,
        "category": service_data.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.services.insert_one(service_doc)
    return service_doc

@api_router.get("/barbershops/{shop_id}/services", response_model=List[ServiceResponse])
async def get_shop_services(shop_id: str):
    """الحصول على خدمات صالون معين"""
    services = await db.services.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(100)
    return services

@api_router.delete("/barbershops/me/services/{service_id}")
async def delete_service(service_id: str, shop: Dict = Depends(require_barbershop)):
    """حذف خدمة"""
    result = await db.services.delete_one({"id": service_id, "barbershop_id": shop['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

# ============== GALLERY ENDPOINTS ==============

@api_router.post("/barbershops/me/gallery", response_model=GalleryImageResponse)
async def add_gallery_image(image_data: GalleryImageCreate, shop: Dict = Depends(require_barbershop)):
    """إضافة صورة للمعرض"""
    # Check max 3 images
    count = await db.gallery_images.count_documents({"barbershop_id": shop['id']})
    if count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 gallery images allowed")
    
    image_id = str(uuid.uuid4())
    image_doc = {
        "id": image_id,
        "barbershop_id": shop['id'],
        "image_before": image_data.image_before,
        "image_after": image_data.image_after,
        "caption": image_data.caption,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gallery_images.insert_one(image_doc)
    return image_doc

@api_router.get("/barbershops/{shop_id}/gallery", response_model=List[GalleryImageResponse])
async def get_shop_gallery(shop_id: str):
    """الحصول على صور معرض الصالون"""
    images = await db.gallery_images.find({"barbershop_id": shop_id}, {"_id": 0}).to_list(10)
    return images

@api_router.delete("/barbershops/me/gallery/{image_id}")
async def delete_gallery_image(image_id: str, shop: Dict = Depends(require_barbershop)):
    """حذف صورة من المعرض"""
    result = await db.gallery_images.delete_one({"id": image_id, "barbershop_id": shop['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted"}

# ============== BOOKING ENDPOINTS ==============

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_data: BookingCreate, entity: Dict = Depends(get_current_entity)):
    """إنشاء حجز جديد"""
    # Get service details
    service = await db.services.find_one({"id": booking_data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Get barbershop details
    shop = await db.barbershops.find_one({"id": booking_data.barbershop_id}, {"_id": 0, "password": 0})
    if not shop:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    
    # Calculate end time
    end_time = calculate_end_time(booking_data.start_time, service['duration_minutes'])
    
    # Check for conflicting bookings
    existing = await db.bookings.find_one({
        "barbershop_id": booking_data.barbershop_id,
        "booking_date": booking_data.booking_date,
        "status": {"$in": ["pending", "confirmed"]},
        "$or": [
            {"start_time": {"$lt": end_time}, "end_time": {"$gt": booking_data.start_time}}
        ]
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is not available")
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "user_id": entity['id'] if entity and entity.get('entity_type') == 'user' else None,
        "barbershop_id": booking_data.barbershop_id,
        "barbershop_name": shop['shop_name'],
        "service_id": booking_data.service_id,
        "service_name": service['name'],
        "booking_date": booking_data.booking_date,
        "start_time": booking_data.start_time,
        "end_time": end_time,
        "status": "pending",
        "user_phone_for_notification": booking_data.user_phone_for_notification,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
    # Create notification for barbershop
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "recipient_id": booking_data.barbershop_id,
        "recipient_type": "barbershop",
        "type": "booking_confirmation",
        "message": f"حجز جديد: {service['name']} - {booking_data.booking_date} {booking_data.start_time}",
        "channel": "whatsapp",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return booking_doc

@api_router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, entity: Dict = Depends(require_auth)):
    """الحصول على تفاصيل حجز"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, entity: Dict = Depends(require_auth)):
    """إلغاء حجز"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if user owns the booking or is the barbershop
    if entity.get('entity_type') == 'user' and booking['user_id'] != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    if entity.get('entity_type') == 'barbershop' and booking['barbershop_id'] != entity['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if cancellation is allowed (4 hours before)
    booking_datetime = datetime.strptime(f"{booking['booking_date']} {booking['start_time']}", "%Y-%m-%d %H:%M")
    if datetime.now() > booking_datetime - timedelta(hours=4):
        raise HTTPException(status_code=400, detail="Cannot cancel within 4 hours of appointment")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Booking cancelled"}

@api_router.put("/bookings/{booking_id}/confirm")
async def confirm_booking(booking_id: str, shop: Dict = Depends(require_barbershop)):
    """تأكيد حجز (للصالون)"""
    result = await db.bookings.update_one(
        {"id": booking_id, "barbershop_id": shop['id']},
        {"$set": {"status": "confirmed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking confirmed"}

@api_router.put("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, shop: Dict = Depends(require_barbershop)):
    """إتمام حجز (للصالون)"""
    result = await db.bookings.update_one(
        {"id": booking_id, "barbershop_id": shop['id']},
        {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": "Booking completed"}

@api_router.get("/bookings/my")
async def get_my_bookings(entity: Dict = Depends(require_auth)):
    """الحصول على حجوزاتي"""
    if entity.get('entity_type') == 'user':
        bookings = await db.bookings.find({"user_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    elif entity.get('entity_type') == 'barbershop':
        bookings = await db.bookings.find({"barbershop_id": entity['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = []
    return bookings

# ============== REVIEW ENDPOINTS ==============

@api_router.post("/bookings/{booking_id}/review", response_model=ReviewResponse)
async def create_review(booking_id: str, review_data: ReviewCreate, entity: Dict = Depends(require_auth)):
    """إضافة تقييم لحجز مكتمل"""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"booking_id": booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "booking_id": booking_id,
        "user_id": entity['id'] if entity.get('entity_type') == 'user' else None,
        "user_name": entity.get('full_name', 'Anonymous'),
        "barbershop_id": booking['barbershop_id'],
        "rating": min(5, max(1, review_data.rating)),
        "comment": review_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barbershop ranking
    all_reviews = await db.reviews.find({"barbershop_id": booking['barbershop_id']}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
    
    # Determine ranking tier
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

@api_router.get("/barbershops/{shop_id}/reviews", response_model=List[ReviewResponse])
async def get_shop_reviews(shop_id: str, limit: int = 50):
    """الحصول على تقييمات صالون"""
    reviews = await db.reviews.find({"barbershop_id": shop_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return reviews

# ============== REPORT ENDPOINTS ==============

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, entity: Dict = Depends(require_auth)):
    """إنشاء بلاغ"""
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "reporter_id": entity['id'],
        "reporter_type": entity.get('entity_type'),
        "reported_entity_id": report_data.reported_entity_id,
        "report_type": report_data.report_type,
        "description": report_data.description,
        "status": "pending",
        "penalty_applied": None,
        "penalty_duration": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reports.insert_one(report_doc)
    return {"message": "Report submitted", "id": report_id}

# ============== SUBSCRIPTION ENDPOINTS ==============

@api_router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(sub_data: SubscriptionCreate, shop: Dict = Depends(require_barbershop)):
    """طلب اشتراك جديد"""
    sub_id = str(uuid.uuid4())
    sub_doc = {
        "id": sub_id,
        "barbershop_id": shop['id'],
        "plan_type": sub_data.plan_type,
        "amount": sub_data.amount,
        "currency": "EUR",
        "payment_method": sub_data.payment_method,
        "receipt_image": sub_data.receipt_image,
        "status": "pending",
        "start_date": None,
        "end_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscriptions.insert_one(sub_doc)
    return sub_doc

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/pending-barbershops")
async def get_pending_barbershops(admin: Dict = Depends(require_admin)):
    """الحصول على الصالونات بانتظار التحقق"""
    shops = await db.barbershops.find({"is_verified": False}, {"_id": 0, "password": 0}).to_list(100)
    return shops

@api_router.put("/admin/barbershops/{shop_id}/verify")
async def verify_barbershop(shop_id: str, admin: Dict = Depends(require_admin)):
    """التحقق من صالون"""
    result = await db.barbershops.update_one(
        {"id": shop_id},
        {"$set": {"is_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    return {"message": "Barbershop verified"}

@api_router.get("/admin/reports")
async def get_admin_reports(admin: Dict = Depends(require_admin), status: str = "pending"):
    """الحصول على البلاغات"""
    reports = await db.reports.find({"status": status}, {"_id": 0}).to_list(100)
    return reports

@api_router.put("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str, admin: Dict = Depends(require_admin)):
    """معالجة بلاغ"""
    if action not in ["dismiss", "warning", "temp_ban", "perm_ban"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    update = {"status": "resolved"}
    if action != "dismiss":
        update["penalty_applied"] = action
        if action == "temp_ban":
            update["penalty_duration"] = 30  # 30 days
    
    await db.reports.update_one({"id": report_id}, {"$set": update})
    
    return {"message": f"Report resolved with action: {action}"}

@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(admin: Dict = Depends(require_admin), status: str = "pending"):
    """الحصول على طلبات الاشتراك"""
    subs = await db.subscriptions.find({"status": status}, {"_id": 0}).to_list(100)
    return subs

@api_router.put("/admin/subscriptions/{sub_id}/approve")
async def approve_subscription(sub_id: str, admin: Dict = Depends(require_admin)):
    """الموافقة على اشتراك"""
    sub = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    start_date = datetime.now(timezone.utc).date()
    end_date = start_date + timedelta(days=365 if sub['plan_type'] == 'annual' else 30)
    
    await db.subscriptions.update_one(
        {"id": sub_id},
        {"$set": {
            "status": "confirmed",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }}
    )
    
    await db.barbershops.update_one(
        {"id": sub['barbershop_id']},
        {"$set": {
            "subscription_status": "active",
            "subscription_expiry": end_date.isoformat()
        }}
    )
    
    return {"message": "Subscription approved"}

@api_router.get("/admin/stats")
async def get_admin_stats(admin: Dict = Depends(require_admin)):
    """إحصائيات لوحة التحكم"""
    total_users = await db.users.count_documents({})
    total_barbershops = await db.barbershops.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_bookings = await db.bookings.count_documents({"booking_date": today})
    pending_subs = await db.subscriptions.count_documents({"status": "pending"})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    pending_verification = await db.barbershops.count_documents({"is_verified": False})
    
    return {
        "total_users": total_users,
        "total_barbershops": total_barbershops,
        "total_bookings": total_bookings,
        "today_bookings": today_bookings,
        "pending_subscriptions": pending_subs,
        "pending_reports": pending_reports,
        "pending_verification": pending_verification
    }

# ============== LOCATION ENDPOINTS ==============

@api_router.get("/locations/countries")
async def get_countries():
    """الحصول على قائمة الدول"""
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
            {"code": "US", "name": "أمريكا", "name_en": "USA"}
        ]
    }

@api_router.get("/locations/cities/{country_code}")
async def get_cities(country_code: str):
    """الحصول على مدن دولة معينة"""
    cities_data = {
        "IQ": ["بغداد", "البصرة", "الموصل", "أربيل", "كركوك", "النجف", "كربلاء"],
        "SY": ["دمشق", "حلب", "حمص", "اللاذقية", "الحسكة", "دير الزور", "طرطوس"],
        "JO": ["عمان", "الزرقاء", "إربد", "العقبة"],
        "LB": ["بيروت", "طرابلس", "صيدا", "صور"],
        "SA": ["الرياض", "جدة", "مكة", "المدينة", "الدمام"],
        "AE": ["دبي", "أبوظبي", "الشارقة", "عجمان"],
        "KW": ["الكويت", "الجهراء", "حولي"],
        "QA": ["الدوحة", "الريان"],
        "BH": ["المنامة", "المحرق"],
        "OM": ["مسقط", "صلالة"],
        "EG": ["القاهرة", "الإسكندرية", "الجيزة"],
        "TR": ["إسطنبول", "أنقرة", "إزمير"],
        "DE": ["برلين", "ميونخ", "فرانكفورت"],
        "US": ["نيويورك", "لوس أنجلوس", "شيكاغو"]
    }
    return {"cities": cities_data.get(country_code, [])}

# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "Welcome to BARBER HUB API", "version": "2.0.0"}

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
