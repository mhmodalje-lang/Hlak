from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from datetime import datetime, timezone, timedelta
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
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Create the main app
app = FastAPI(title="BARBER HUB API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== PYDANTIC MODELS ==============

class UserBase(BaseModel):
    phone: str
    name: str
    country: str
    city: str
    gender: str  # 'male' or 'female'
    user_type: str  # 'customer', 'barber', 'salon', 'admin'

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    phone: str
    name: str
    country: str
    city: str
    gender: str
    user_type: str
    created_at: str
    is_active: bool = True
    subscription_status: str = "inactive"
    subscription_type: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ServiceItem(BaseModel):
    name: str
    name_ar: str
    price: float
    duration_minutes: int = 30

class BarberProfileBase(BaseModel):
    salon_name: str
    salon_name_ar: str
    description: str
    description_ar: str
    logo_url: Optional[str] = None
    services: List[ServiceItem] = []
    custom_services: List[ServiceItem] = []
    before_after_images: List[Dict[str, str]] = []  # [{before: url, after: url}]
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    tiktok: Optional[str] = None
    working_hours: Dict[str, Dict[str, str]] = {}  # {day: {start: "09:00", end: "21:00"}}
    location: Optional[Dict[str, float]] = None  # {lat: x, lng: y}
    address: str = ""
    neighborhood: str = ""
    average_service_time: int = 30  # minutes

class BarberProfileCreate(BarberProfileBase):
    pass

class BarberProfileResponse(BarberProfileBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    owner_name: str
    country: str
    city: str
    gender: str  # 'male' for barber, 'female' for salon
    rating: float = 0.0
    total_reviews: int = 0
    total_bookings: int = 0
    qr_code: Optional[str] = None
    is_featured: bool = False
    rank_level: str = "normal"  # normal, featured, top
    created_at: str
    is_active: bool = True

class BookingCreate(BaseModel):
    barber_id: str
    service_ids: List[str]
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    customer_phone: str
    customer_name: str
    notes: Optional[str] = None

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barber_id: str
    barber_name: str
    customer_id: Optional[str] = None
    customer_phone: str
    customer_name: str
    services: List[ServiceItem]
    total_price: float
    total_duration: int
    date: str
    time: str
    status: str  # pending, confirmed, completed, cancelled
    notes: Optional[str] = None
    created_at: str

class ReviewCreate(BaseModel):
    barber_id: str
    booking_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    barber_id: str
    customer_id: str
    customer_name: str
    booking_id: str
    rating: int
    comment: Optional[str] = None
    created_at: str

class ReportCreate(BaseModel):
    reported_user_id: str
    reason: str  # 'no_show', 'abuse', 'repeated_cancellation'
    description: Optional[str] = None

class SubscriptionRequest(BaseModel):
    barber_id: str
    subscription_type: str  # 'basic_75', 'barber_100', 'store_150', 'vip_175'

# ============== UTILITY FUNCTIONS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        'user_id': user_id,
        'user_type': user_type,
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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    return user

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(user: Dict = Depends(require_auth)) -> Dict:
    if user['user_type'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def generate_qr_code(url: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if phone exists
    existing = await db.users.find_one({"phone": user_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "phone": user_data.phone,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "country": user_data.country,
        "city": user_data.city,
        "gender": user_data.gender,
        "user_type": user_data.user_type,
        "is_active": True,
        "subscription_status": "inactive",
        "subscription_type": None,
        "warnings": 0,
        "is_banned": False,
        "ban_until": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.user_type)
    user_response = UserResponse(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get('is_banned') and user.get('ban_until'):
        ban_date = datetime.fromisoformat(user['ban_until'])
        if ban_date > datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail=f"Account banned until {user['ban_until']}")
    
    token = create_token(user['id'], user['user_type'])
    user_response = UserResponse(**{k: v for k, v in user.items() if k != 'password'})
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: Dict = Depends(require_auth)):
    return UserResponse(**{k: v for k, v in user.items() if k != 'password'})

# ============== BARBER PROFILE ENDPOINTS ==============

@api_router.post("/barbers/profile", response_model=BarberProfileResponse)
async def create_barber_profile(profile: BarberProfileCreate, user: Dict = Depends(require_auth)):
    if user['user_type'] not in ['barber', 'salon']:
        raise HTTPException(status_code=403, detail="Only barbers/salons can create profiles")
    
    existing = await db.barber_profiles.find_one({"user_id": user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    profile_id = str(uuid.uuid4())
    qr_url = f"https://barberhub.com/profile/{profile_id}"
    qr_code_base64 = generate_qr_code(qr_url)
    
    profile_doc = {
        "id": profile_id,
        "user_id": user['id'],
        "owner_name": user['name'],
        "country": user['country'],
        "city": user['city'],
        "gender": user['gender'],
        **profile.model_dump(),
        "rating": 0.0,
        "total_reviews": 0,
        "total_bookings": 0,
        "qr_code": qr_code_base64,
        "is_featured": False,
        "rank_level": "normal",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.barber_profiles.insert_one(profile_doc)
    
    return BarberProfileResponse(**{k: v for k, v in profile_doc.items() if k != '_id'})

@api_router.put("/barbers/profile", response_model=BarberProfileResponse)
async def update_barber_profile(profile: BarberProfileCreate, user: Dict = Depends(require_auth)):
    existing = await db.barber_profiles.find_one({"user_id": user['id']}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = profile.model_dump()
    await db.barber_profiles.update_one(
        {"user_id": user['id']},
        {"$set": update_data}
    )
    
    updated = await db.barber_profiles.find_one({"user_id": user['id']}, {"_id": 0})
    return BarberProfileResponse(**updated)

@api_router.get("/barbers/profile/me", response_model=BarberProfileResponse)
async def get_my_barber_profile(user: Dict = Depends(require_auth)):
    profile = await db.barber_profiles.find_one({"user_id": user['id']}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return BarberProfileResponse(**profile)

@api_router.get("/barbers/{barber_id}", response_model=BarberProfileResponse)
async def get_barber_profile(barber_id: str):
    profile = await db.barber_profiles.find_one({"id": barber_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Barber not found")
    return BarberProfileResponse(**profile)

@api_router.get("/barbers", response_model=List[BarberProfileResponse])
async def list_barbers(
    gender: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    neighborhood: Optional[str] = None,
    sort_by: str = "rating",  # rating, price, distance
    limit: int = 50
):
    query = {"is_active": True}
    if gender:
        query["gender"] = gender
    if country:
        query["country"] = country
    if city:
        query["city"] = city
    if neighborhood:
        query["neighborhood"] = neighborhood
    
    sort_field = "rating" if sort_by == "rating" else "created_at"
    sort_order = -1
    
    barbers = await db.barber_profiles.find(query, {"_id": 0}).sort(sort_field, sort_order).limit(limit).to_list(limit)
    return [BarberProfileResponse(**b) for b in barbers]

@api_router.get("/barbers/top/{gender}", response_model=List[BarberProfileResponse])
async def get_top_barbers(gender: str, limit: int = 10):
    query = {"is_active": True, "gender": gender, "rating": {"$gte": 4.0}}
    barbers = await db.barber_profiles.find(query, {"_id": 0}).sort([("rating", -1), ("total_reviews", -1)]).limit(limit).to_list(limit)
    return [BarberProfileResponse(**b) for b in barbers]

@api_router.get("/barbers/nearby", response_model=List[BarberProfileResponse])
async def get_nearby_barbers(lat: float, lng: float, radius_km: float = 10, gender: Optional[str] = None, limit: int = 20):
    # For simplicity, using basic distance calculation
    # In production, use MongoDB's $geoNear with 2dsphere index
    query = {"is_active": True, "location": {"$ne": None}}
    if gender:
        query["gender"] = gender
    
    barbers = await db.barber_profiles.find(query, {"_id": 0}).limit(100).to_list(100)
    
    # Filter by distance (simple Haversine approximation)
    def calc_distance(b):
        if not b.get('location'):
            return float('inf')
        dlat = abs(b['location']['lat'] - lat)
        dlng = abs(b['location']['lng'] - lng)
        return (dlat**2 + dlng**2)**0.5 * 111  # rough km conversion
    
    nearby = [b for b in barbers if calc_distance(b) <= radius_km]
    nearby.sort(key=calc_distance)
    
    return [BarberProfileResponse(**b) for b in nearby[:limit]]

# ============== BOOKING ENDPOINTS ==============

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking: BookingCreate, user: Dict = Depends(get_current_user)):
    barber = await db.barber_profiles.find_one({"id": booking.barber_id}, {"_id": 0})
    if not barber:
        raise HTTPException(status_code=404, detail="Barber not found")
    
    # Check for conflicting bookings
    existing = await db.bookings.find_one({
        "barber_id": booking.barber_id,
        "date": booking.date,
        "time": booking.time,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already booked")
    
    # Calculate services
    all_services = barber.get('services', []) + barber.get('custom_services', [])
    selected_services = [s for s in all_services if s['name'] in booking.service_ids or s.get('name_ar') in booking.service_ids]
    
    if not selected_services:
        # Default service if none found
        selected_services = [{"name": "General Service", "name_ar": "خدمة عامة", "price": 0, "duration_minutes": 30}]
    
    total_price = sum(s['price'] for s in selected_services)
    total_duration = sum(s.get('duration_minutes', 30) for s in selected_services)
    
    booking_id = str(uuid.uuid4())
    booking_doc = {
        "id": booking_id,
        "barber_id": booking.barber_id,
        "barber_name": barber['salon_name'],
        "customer_id": user['id'] if user else None,
        "customer_phone": booking.customer_phone,
        "customer_name": booking.customer_name,
        "services": selected_services,
        "total_price": total_price,
        "total_duration": total_duration,
        "date": booking.date,
        "time": booking.time,
        "status": "pending",
        "notes": booking.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
    # Update barber's total bookings
    await db.barber_profiles.update_one(
        {"id": booking.barber_id},
        {"$inc": {"total_bookings": 1}}
    )
    
    return BookingResponse(**{k: v for k, v in booking_doc.items() if k != '_id'})

@api_router.get("/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(user: Dict = Depends(require_auth)):
    if user['user_type'] in ['barber', 'salon']:
        profile = await db.barber_profiles.find_one({"user_id": user['id']}, {"_id": 0})
        if not profile:
            return []
        bookings = await db.bookings.find({"barber_id": profile['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        bookings = await db.bookings.find({"customer_id": user['id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return [BookingResponse(**b) for b in bookings]

@api_router.get("/bookings/barber/{barber_id}/schedule")
async def get_barber_schedule(barber_id: str, date: str):
    bookings = await db.bookings.find({
        "barber_id": barber_id,
        "date": date,
        "status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).to_list(100)
    
    booked_times = [b['time'] for b in bookings]
    return {"date": date, "booked_times": booked_times}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, user: Dict = Depends(require_auth)):
    if status not in ["confirmed", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check authorization
    if user['user_type'] in ['barber', 'salon']:
        profile = await db.barber_profiles.find_one({"user_id": user['id']})
        if not profile or profile['id'] != booking['barber_id']:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif booking['customer_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    
    return {"message": "Status updated", "status": status}

@api_router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user: Dict = Depends(require_auth)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check if cancellation is allowed (4 hours before)
    booking_datetime = datetime.fromisoformat(f"{booking['date']}T{booking['time']}:00")
    if datetime.now(timezone.utc) > booking_datetime - timedelta(hours=4):
        raise HTTPException(status_code=400, detail="Cannot cancel within 4 hours of appointment")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    
    return {"message": "Booking cancelled"}

# ============== REVIEW ENDPOINTS ==============

@api_router.post("/reviews", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, user: Dict = Depends(require_auth)):
    # Verify booking exists and is completed
    booking = await db.bookings.find_one({"id": review.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    if booking['customer_id'] != user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"booking_id": review.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "barber_id": review.barber_id,
        "customer_id": user['id'],
        "customer_name": user['name'],
        "booking_id": review.booking_id,
        "rating": min(5, max(1, review.rating)),
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update barber's rating
    all_reviews = await db.reviews.find({"barber_id": review.barber_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
    
    # Update rank level based on rating and reviews
    rank_level = "normal"
    if avg_rating >= 4.5 and len(all_reviews) >= 50:
        rank_level = "top"
    elif avg_rating >= 4.0 and len(all_reviews) >= 20:
        rank_level = "featured"
    
    await db.barber_profiles.update_one(
        {"id": review.barber_id},
        {"$set": {"rating": round(avg_rating, 2), "total_reviews": len(all_reviews), "rank_level": rank_level}}
    )
    
    return ReviewResponse(**{k: v for k, v in review_doc.items() if k != '_id'})

@api_router.get("/reviews/barber/{barber_id}", response_model=List[ReviewResponse])
async def get_barber_reviews(barber_id: str, limit: int = 50):
    reviews = await db.reviews.find({"barber_id": barber_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return [ReviewResponse(**r) for r in reviews]

# ============== REPORT ENDPOINTS ==============

@api_router.post("/reports")
async def create_report(report: ReportCreate, user: Dict = Depends(require_auth)):
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "reporter_id": user['id'],
        "reported_user_id": report.reported_user_id,
        "reason": report.reason,
        "description": report.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reports.insert_one(report_doc)
    
    # Check for repeated violations
    user_reports = await db.reports.count_documents({"reported_user_id": report.reported_user_id})
    
    if user_reports >= 3:
        # Issue warning or ban
        reported_user = await db.users.find_one({"id": report.reported_user_id})
        if reported_user:
            warnings = reported_user.get('warnings', 0) + 1
            update = {"warnings": warnings}
            
            if warnings >= 3:
                update["is_banned"] = True
                update["ban_until"] = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            
            await db.users.update_one({"id": report.reported_user_id}, {"$set": update})
    
    return {"message": "Report submitted", "id": report_id}

# ============== SUBSCRIPTION ENDPOINTS ==============

@api_router.post("/subscriptions/request")
async def request_subscription(request: SubscriptionRequest, user: Dict = Depends(require_auth)):
    subscription_prices = {
        "basic_75": 75,
        "barber_100": 100,
        "store_150": 150,
        "vip_175": 175
    }
    
    if request.subscription_type not in subscription_prices:
        raise HTTPException(status_code=400, detail="Invalid subscription type")
    
    sub_id = str(uuid.uuid4())
    sub_doc = {
        "id": sub_id,
        "user_id": user['id'],
        "barber_id": request.barber_id,
        "subscription_type": request.subscription_type,
        "price": subscription_prices[request.subscription_type],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.subscription_requests.insert_one(sub_doc)
    
    return {
        "message": "Subscription request submitted",
        "id": sub_id,
        "price": subscription_prices[request.subscription_type],
        "instructions": "Please send payment to WhatsApp: +963 935 964 158"
    }

# ============== ADMIN ENDPOINTS ==============

@api_router.get("/admin/stats")
async def get_admin_stats(user: Dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_barbers = await db.barber_profiles.count_documents({})
    total_bookings = await db.bookings.count_documents({})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_bookings = await db.bookings.count_documents({"date": today})
    pending_subs = await db.subscription_requests.count_documents({"status": "pending"})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_barbers": total_barbers,
        "total_bookings": total_bookings,
        "today_bookings": today_bookings,
        "pending_subscriptions": pending_subs,
        "pending_reports": pending_reports
    }

@api_router.get("/admin/users")
async def get_all_users(user: Dict = Depends(require_admin), limit: int = 100):
    users = await db.users.find({}, {"_id": 0, "password": 0}).limit(limit).to_list(limit)
    return users

@api_router.get("/admin/subscriptions")
async def get_subscription_requests(user: Dict = Depends(require_admin), status: str = "pending"):
    subs = await db.subscription_requests.find({"status": status}, {"_id": 0}).to_list(100)
    return subs

@api_router.put("/admin/subscriptions/{sub_id}/approve")
async def approve_subscription(sub_id: str, user: Dict = Depends(require_admin)):
    sub = await db.subscription_requests.find_one({"id": sub_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription request not found")
    
    await db.subscription_requests.update_one({"id": sub_id}, {"$set": {"status": "approved"}})
    
    # Update user subscription
    await db.users.update_one(
        {"id": sub['user_id']},
        {"$set": {
            "subscription_status": "active",
            "subscription_type": sub['subscription_type'],
            "subscription_expires": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        }}
    )
    
    return {"message": "Subscription approved"}

@api_router.get("/admin/reports")
async def get_reports(user: Dict = Depends(require_admin), status: str = "pending"):
    reports = await db.reports.find({"status": status}, {"_id": 0}).to_list(100)
    return reports

@api_router.put("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str, user: Dict = Depends(require_admin)):
    if action not in ["dismiss", "warn", "ban"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await db.reports.update_one({"id": report_id}, {"$set": {"status": "resolved", "action": action}})
    
    if action == "warn":
        await db.users.update_one({"id": report['reported_user_id']}, {"$inc": {"warnings": 1}})
    elif action == "ban":
        await db.users.update_one(
            {"id": report['reported_user_id']},
            {"$set": {"is_banned": True, "ban_until": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}}
        )
    
    return {"message": f"Report resolved with action: {action}"}

# ============== COUNTRIES/CITIES DATA ==============

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
            {"code": "US", "name": "أمريكا", "name_en": "USA"}
        ]
    }

@api_router.get("/locations/cities/{country_code}")
async def get_cities(country_code: str):
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
    return {"message": "Welcome to BARBER HUB API", "version": "1.0.0"}

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
    await db.users.create_index("phone", unique=True)
    await db.users.create_index("id", unique=True)
    await db.barber_profiles.create_index("id", unique=True)
    await db.barber_profiles.create_index("user_id", unique=True)
    await db.barber_profiles.create_index([("rating", -1)])
    await db.bookings.create_index("id", unique=True)
    await db.reviews.create_index("id", unique=True)
    
    # Create admin user if not exists
    admin = await db.users.find_one({"phone": "admin"})
    if not admin:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "phone": "admin",
            "name": "مدير النظام",
            "password": hash_password("admin123"),
            "country": "SY",
            "city": "الحسكة",
            "gender": "male",
            "user_type": "admin",
            "is_active": True,
            "subscription_status": "active",
            "subscription_type": "admin",
            "warnings": 0,
            "is_banned": False,
            "ban_until": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        logger.info("Admin user created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
