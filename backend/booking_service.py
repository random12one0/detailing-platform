"""
Booking System Service
Handles all booking-related operations including:
- Availability checking
- Booking creation
- Google Calendar integration
- Email notifications
"""

from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from supabase import create_client, Client
from datetime import datetime, time, timedelta, date
from typing import List, Dict, Optional, Tuple
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ics import Calendar, Event as ICSEvent
import resend
import logging

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Resend
resend.api_key = os.environ.get('RESEND_API_KEY')

# Business hours configuration
BUSINESS_HOURS = {
    0: None,  # Monday - closed in morning
    1: None,  # Tuesday - closed in morning
    2: None,  # Wednesday - closed in morning
    3: None,  # Thursday - closed in morning
    4: None,  # Friday - closed in morning
    5: {'start': time(10, 0), 'end': time(18, 0)},  # Saturday
    6: {'start': time(13, 0), 'end': time(18, 0)},  # Sunday
}

# Monday-Friday afternoon hours
WEEKDAY_HOURS = {'start': time(15, 0), 'end': time(18, 0)}

# Buffer time in minutes
BUFFER_MINUTES = 30

# Vehicle size fees
VEHICLE_SIZE_FEES = {
    'small': 0.00,
    'medium': 5.00,
    'large': 10.00
}


def get_business_hours(booking_date: date) -> Optional[Dict[str, time]]:
    """Get business hours for a specific date"""
    weekday = booking_date.weekday()
    
    # Monday-Friday: 3:00 PM - 6:00 PM
    if weekday < 5:
        return WEEKDAY_HOURS
    
    # Saturday/Sunday
    return BUSINESS_HOURS.get(weekday)


def is_time_slot_valid(booking_date: date, start_time: time, duration_minutes: int) -> Tuple[bool, str]:
    """
    Check if a time slot is within business hours
    Returns: (is_valid, error_message)
    """
    business_hours = get_business_hours(booking_date)
    
    if not business_hours:
        return False, "We are closed on this day"
    
    # Calculate end time
    start_datetime = datetime.combine(booking_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    end_time = end_datetime.time()
    
    # Check if within business hours
    if start_time < business_hours['start']:
        return False, f"Start time must be after {business_hours['start'].strftime('%I:%M %p')}"
    
    if end_time > business_hours['end']:
        return False, f"Service would end after closing time ({business_hours['end'].strftime('%I:%M %p')})"
    
    return True, ""


async def get_packages():
    """Fetch all packages from database"""
    try:
        response = supabase.table('packages').select('*').order('category, tier').execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching packages: {e}")
        raise


async def calculate_booking_details(
    interior_package_id: Optional[str],
    exterior_package_id: Optional[str],
    vehicle_size: str
) -> Dict:
    """
    Calculate total price, duration, and other booking details
    """
    total_price = 0.0
    total_duration = 0
    packages_info = []
    
    # Fetch package details
    if interior_package_id:
        interior = supabase.table('packages').select('*').eq('id', interior_package_id).single().execute()
        if interior.data:
            total_price += float(interior.data['base_price'])
            total_duration += interior.data['duration_minutes']
            packages_info.append(interior.data)
    
    if exterior_package_id:
        exterior = supabase.table('packages').select('*').eq('id', exterior_package_id).single().execute()
        if exterior.data:
            total_price += float(exterior.data['base_price'])
            total_duration += exterior.data['duration_minutes']
            packages_info.append(exterior.data)
    
    # Add vehicle size fee
    vehicle_fee = VEHICLE_SIZE_FEES.get(vehicle_size, 0.0)
    total_price += vehicle_fee
    
    # Add buffer time to duration
    total_duration_with_buffer = total_duration + BUFFER_MINUTES
    
    return {
        'subtotal': total_price - vehicle_fee,
        'vehicle_size_fee': vehicle_fee,
        'total_price': total_price,
        'base_duration': total_duration,
        'buffer_minutes': BUFFER_MINUTES,
        'total_duration': total_duration_with_buffer,
        'packages': packages_info
    }


async def check_availability(booking_date: date, start_time: time, duration_minutes: int) -> Tuple[bool, str]:
    """
    Check if a time slot is available
    Returns: (is_available, message)
    """
    # First check business hours
    is_valid, error_msg = is_time_slot_valid(booking_date, start_time, duration_minutes)
    if not is_valid:
        return False, error_msg
    
    # Calculate end time
    start_datetime = datetime.combine(booking_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    end_time = end_datetime.time()
    
    # Check for conflicts in database
    try:
        conflict = supabase.rpc(
            'check_booking_conflict',
            {
                'p_booking_date': booking_date.isoformat(),
                'p_start_time': start_time.isoformat(),
                'p_end_time': end_time.isoformat()
            }
        ).execute()
        
        if conflict.data:
            return False, "This time slot is already booked. Please choose another time."
        
        return True, "Time slot is available"
        
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise


def generate_ics_file(booking: Dict) -> str:
    """Generate ICS calendar file for Apple Calendar"""
    cal = Calendar()
    event = ICSEvent()
    
    # Parse datetime
    booking_datetime = datetime.fromisoformat(f"{booking['booking_date']}T{booking['start_time']}")
    end_datetime = datetime.fromisoformat(f"{booking['booking_date']}T{booking['end_time']}")
    
    event.name = f"Car Wash - {booking['customer_name']}"
    event.begin = booking_datetime
    event.end = end_datetime
    event.description = f"""
Customer: {booking['customer_name']}
Phone: {booking['customer_phone']}
Email: {booking['customer_email']}
Service Type: {booking['service_type'].title()}
Vehicle Size: {booking['vehicle_size'].title()}
Total: ${booking['total_price']}
Notes: {booking.get('customer_notes', 'None')}
    """.strip()
    
    if booking.get('customer_address'):
        event.location = booking['customer_address']
    
    cal.events.add(event)
    return str(cal)


async def send_confirmation_emails(booking: Dict, ics_content: str):
    """Send confirmation emails to customer and owner"""
    owner_email = os.environ.get('OWNER_EMAIL')
    
    # Format booking details
    packages_list = []
    if booking.get('interior_package_name'):
        packages_list.append(f"Interior: {booking['interior_package_name']}")
    if booking.get('exterior_package_name'):
        packages_list.append(f"Exterior: {booking['exterior_package_name']}")
    
    packages_str = "\n".join(packages_list)
    
    # Email to customer
    try:
        customer_email_html = f"""
        <h2>Booking Confirmation - Andrew's Auto Detail & Car Wash</h2>
        <p>Hi {booking['customer_name']},</p>
        <p>Your booking has been confirmed! Here are the details:</p>
        
        <h3>Booking Details:</h3>
        <ul>
            <li><strong>Date:</strong> {booking['booking_date']}</li>
            <li><strong>Time:</strong> {booking['start_time']}</li>
            <li><strong>Service Type:</strong> {booking['service_type'].title()}</li>
            <li><strong>Vehicle Size:</strong> {booking['vehicle_size'].title()}</li>
        </ul>
        
        <h3>Services Selected:</h3>
        <p>{packages_str.replace(chr(10), '<br>')}</p>
        
        <h3>Total Price: ${booking['total_price']}</h3>
        
        {f"<p><strong>Address:</strong> {booking.get('customer_address', 'N/A')}</p>" if booking.get('customer_address') else ""}
        {f"<p><strong>Notes:</strong> {booking.get('customer_notes', 'None')}</p>" if booking.get('customer_notes') else ""}
        
        <p>If you need to make any changes, please contact us directly.</p>
        <p>Thank you for choosing Andrew's Auto Detail & Car Wash!</p>
        
        <p>Best regards,<br>Andrew<br>Andrew's Auto Detail & Car Wash</p>
        """
        
        resend.Emails.send({
            "from": "Andrew's Auto <onboarding@resend.dev>",
            "to": [booking['customer_email']],
            "subject": "Booking Confirmation - Andrew's Auto Detail",
            "html": customer_email_html
        })
        
        logger.info(f"Confirmation email sent to customer: {booking['customer_email']}")
        
    except Exception as e:
        logger.error(f"Error sending customer email: {e}")
    
    # Email to owner with ICS attachment
    try:
        owner_email_html = f"""
        <h2>New Booking Received</h2>
        
        <h3>Customer Information:</h3>
        <ul>
            <li><strong>Name:</strong> {booking['customer_name']}</li>
            <li><strong>Phone:</strong> {booking['customer_phone']}</li>
            <li><strong>Email:</strong> {booking['customer_email']}</li>
            {f"<li><strong>Address:</strong> {booking.get('customer_address', 'N/A')}</li>" if booking.get('customer_address') else ""}
        </ul>
        
        <h3>Booking Details:</h3>
        <ul>
            <li><strong>Date:</strong> {booking['booking_date']}</li>
            <li><strong>Time:</strong> {booking['start_time']} - {booking['end_time']}</li>
            <li><strong>Duration:</strong> {booking['total_duration_minutes']} minutes</li>
            <li><strong>Service Type:</strong> {booking['service_type'].title()}</li>
            <li><strong>Vehicle Size:</strong> {booking['vehicle_size'].title()}</li>
            {f"<li><strong>Water/Electric Access:</strong> {'Yes' if booking.get('has_water_electric') else 'No'}</li>" if booking['service_type'] == 'mobile' else ""}
        </ul>
        
        <h3>Services:</h3>
        <p>{packages_str.replace(chr(10), '<br>')}</p>
        
        <h3>Pricing:</h3>
        <ul>
            <li>Subtotal: ${booking['subtotal']}</li>
            <li>Vehicle Size Fee: ${booking['vehicle_size_fee']}</li>
            <li><strong>Total: ${booking['total_price']}</strong></li>
        </ul>
        
        {f"<p><strong>Customer Notes:</strong> {booking['customer_notes']}</p>" if booking.get('customer_notes') else ""}
        
        <p>Apple Calendar file (.ics) is attached to this email.</p>
        """
        
        resend.Emails.send({
            "from": "Booking System <onboarding@resend.dev>",
            "to": [owner_email],
            "subject": f"New Booking: {booking['customer_name']} - {booking['booking_date']}",
            "html": owner_email_html,
            "attachments": [
                {
                    "filename": f"booking_{booking['id']}.ics",
                    "content": ics_content
                }
            ]
        })
        
        logger.info(f"Notification email sent to owner: {owner_email}")
        
    except Exception as e:
        logger.error(f"Error sending owner email: {e}")


async def create_booking(booking_data: Dict) -> Dict:
    """
    Create a new booking with all validations and integrations
    """
    # Calculate booking details
    details = await calculate_booking_details(
        booking_data.get('interior_package_id'),
        booking_data.get('exterior_package_id'),
        booking_data['vehicle_size']
    )
    
    # Parse date and time
    booking_date = datetime.fromisoformat(booking_data['booking_date']).date()
    start_time = datetime.fromisoformat(booking_data['start_time']).time()
    
    # Check availability
    is_available, message = await check_availability(
        booking_date,
        start_time,
        details['total_duration']
    )
    
    if not is_available:
        raise ValueError(message)
    
    # Calculate end time
    start_datetime = datetime.combine(booking_date, start_time)
    end_datetime = start_datetime + timedelta(minutes=details['total_duration'])
    
    # Prepare booking record
    booking_record = {
        'customer_name': booking_data['customer_name'],
        'customer_phone': booking_data['customer_phone'],
        'customer_email': booking_data['customer_email'],
        'customer_address': booking_data.get('customer_address'),
        'booking_date': booking_date.isoformat(),
        'start_time': start_time.isoformat(),
        'end_time': end_datetime.time().isoformat(),
        'total_duration_minutes': details['total_duration'],
        'service_type': booking_data['service_type'],
        'vehicle_size': booking_data['vehicle_size'],
        'vehicle_size_fee': details['vehicle_size_fee'],
        'interior_package_id': booking_data.get('interior_package_id'),
        'exterior_package_id': booking_data.get('exterior_package_id'),
        'subtotal': details['subtotal'],
        'total_price': details['total_price'],
        'has_water_electric': booking_data.get('has_water_electric', False),
        'customer_notes': booking_data.get('customer_notes'),
        'status': 'confirmed'
    }
    
    # Insert into database
    result = supabase.table('bookings').insert(booking_record).execute()
    booking = result.data[0]
    
    # Add package names for emails
    for package in details['packages']:
        if package['category'] == 'interior':
            booking['interior_package_name'] = package['name']
        else:
            booking['exterior_package_name'] = package['name']
    
    # Generate ICS file
    ics_content = generate_ics_file(booking)
    
    # Update booking to mark ICS as sent
    supabase.table('bookings').update({'ics_file_sent': True}).eq('id', booking['id']).execute()
    
    # Send emails
    await send_confirmation_emails(booking, ics_content)
    
    logger.info(f"Booking created successfully: {booking['id']}")
    
    return booking


async def get_available_time_slots(booking_date: date, duration_minutes: int) -> List[str]:
    """
    Get list of available time slots for a given date and duration
    Returns list of time strings in "HH:MM" format
    """
    business_hours = get_business_hours(booking_date)
    
    if not business_hours:
        return []
    
    available_slots = []
    slot_interval = 30  # 30-minute intervals
    
    # Generate all possible slots
    current_time = datetime.combine(booking_date, business_hours['start'])
    end_boundary = datetime.combine(booking_date, business_hours['end'])
    
    while current_time < end_boundary:
        slot_end = current_time + timedelta(minutes=duration_minutes)
        
        # Check if slot fits within business hours
        if slot_end.time() <= business_hours['end']:
            # Check availability
            is_available, _ = await check_availability(
                booking_date,
                current_time.time(),
                duration_minutes
            )
            
            if is_available:
                available_slots.append(current_time.strftime('%H:%M'))
        
        current_time += timedelta(minutes=slot_interval)
    
    return available_slots
