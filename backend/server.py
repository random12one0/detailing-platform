from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date, time as dt_time
import booking_service


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Booking Models
class BookingCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    customer_address: Optional[str] = None
    booking_date: str  # ISO format date string
    start_time: str  # ISO format time string
    service_type: str  # 'mobile' or 'dropoff'
    vehicle_size: str  # 'small', 'medium', 'large'
    interior_package_id: Optional[str] = None
    exterior_package_id: Optional[str] = None
    has_water_electric: bool = False
    customer_notes: Optional[str] = None

class AvailabilityCheck(BaseModel):
    booking_date: Optional[str] = None  # ISO format date string (optional for calculate)
    interior_package_id: Optional[str] = None
    exterior_package_id: Optional[str] = None
    vehicle_size: str

class TimeSlotRequest(BaseModel):
    booking_date: str
    duration_minutes: int

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Booking Endpoints
@api_router.get("/packages")
async def get_packages():
    """Get all available packages"""
    try:
        packages = await booking_service.get_packages()
        return {"success": True, "packages": packages}
    except Exception as e:
        logger.error(f"Error fetching packages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/bookings/calculate")
async def calculate_booking(data: AvailabilityCheck):
    """Calculate pricing and duration for selected packages"""
    try:
        details = await booking_service.calculate_booking_details(
            data.interior_package_id,
            data.exterior_package_id,
            data.vehicle_size
        )
        return {"success": True, **details}
    except Exception as e:
        logger.error(f"Error calculating booking: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/bookings/check-availability")
async def check_availability(data: AvailabilityCheck):
    """Check if selected date/time is available"""
    try:
        # Calculate duration first
        details = await booking_service.calculate_booking_details(
            data.interior_package_id,
            data.exterior_package_id,
            data.vehicle_size
        )
        
        booking_date = datetime.fromisoformat(data.booking_date).date()
        
        # Get business hours for that date
        business_hours = booking_service.get_business_hours(booking_date)
        
        if not business_hours:
            return {
                "success": False,
                "available": False,
                "message": "We are closed on this day",
                "business_hours": None
            }
        
        return {
            "success": True,
            "available": True,
            "duration_minutes": details['total_duration'],
            "business_hours": {
                "start": business_hours['start'].strftime('%H:%M'),
                "end": business_hours['end'].strftime('%H:%M')
            }
        }
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/bookings/available-slots")
async def get_available_slots(data: TimeSlotRequest):
    """Get list of available time slots for a date"""
    try:
        booking_date = datetime.fromisoformat(data.booking_date).date()
        slots = await booking_service.get_available_time_slots(
            booking_date,
            data.duration_minutes
        )
        return {"success": True, "slots": slots}
    except Exception as e:
        logger.error(f"Error fetching available slots: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/bookings/create")
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    try:
        # Validate that at least one package is selected
        if not booking_data.interior_package_id and not booking_data.exterior_package_id:
            raise HTTPException(
                status_code=400,
                detail="Please select at least one service package"
            )
        
        # Validate mobile service requirements
        if booking_data.service_type == 'mobile' and not booking_data.customer_address:
            raise HTTPException(
                status_code=400,
                detail="Address is required for mobile service"
            )
        
        booking = await booking_service.create_booking(booking_data.model_dump())
        
        return {
            "success": True,
            "message": "Booking created successfully!",
            "booking": booking
        }
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating booking: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {str(e)}")

@api_router.get("/bookings/list")
async def list_bookings(status: Optional[str] = None, limit: int = 100):
    """List all bookings (for admin use)"""
    try:
        from supabase import create_client
        supabase_url = os.environ.get('SUPABASE_URL')
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
        supabase = create_client(supabase_url, supabase_key)
        
        query = supabase.table('bookings').select('*').order('booking_date', desc=True).limit(limit)
        
        if status:
            query = query.eq('status', status)
        
        result = query.execute()
        
        return {
            "success": True,
            "bookings": result.data,
            "count": len(result.data)
        }
    except Exception as e:
        logger.error(f"Error listing bookings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()