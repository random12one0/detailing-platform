"""
Backend API Tests for Car Wash Booking System
Tests: packages, calculate, available-slots, and booking creation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Package IDs from Supabase (fetched dynamically)
PACKAGE_IDS = {}


class TestPackagesAPI:
    """Test GET /api/packages endpoint"""
    
    def test_get_packages_success(self):
        """Test that packages endpoint returns 6 packages (3 interior, 3 exterior)"""
        response = requests.get(f"{BASE_URL}/api/packages")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "packages" in data
        assert len(data["packages"]) == 6
        
        # Verify package structure
        for pkg in data["packages"]:
            assert "id" in pkg
            assert "name" in pkg
            assert "category" in pkg
            assert "tier" in pkg
            assert "base_price" in pkg
            assert "duration_minutes" in pkg
            assert "description" in pkg
            assert "features" in pkg
            assert pkg["category"] in ["interior", "exterior"]
            assert pkg["tier"] in ["standard", "deluxe", "ultimate"]
    
    def test_packages_has_correct_categories(self):
        """Test that packages have 3 interior and 3 exterior"""
        response = requests.get(f"{BASE_URL}/api/packages")
        data = response.json()
        
        interior_count = sum(1 for p in data["packages"] if p["category"] == "interior")
        exterior_count = sum(1 for p in data["packages"] if p["category"] == "exterior")
        
        assert interior_count == 3, f"Expected 3 interior packages, got {interior_count}"
        assert exterior_count == 3, f"Expected 3 exterior packages, got {exterior_count}"
    
    def test_packages_have_correct_tiers(self):
        """Test that each category has standard, deluxe, and ultimate tiers"""
        response = requests.get(f"{BASE_URL}/api/packages")
        data = response.json()
        
        interior_tiers = {p["tier"] for p in data["packages"] if p["category"] == "interior"}
        exterior_tiers = {p["tier"] for p in data["packages"] if p["category"] == "exterior"}
        
        expected_tiers = {"standard", "deluxe", "ultimate"}
        
        assert interior_tiers == expected_tiers, f"Interior tiers mismatch: {interior_tiers}"
        assert exterior_tiers == expected_tiers, f"Exterior tiers mismatch: {exterior_tiers}"


class TestCalculateAPI:
    """Test POST /api/bookings/calculate endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_package_ids(self):
        """Fetch package IDs before tests"""
        global PACKAGE_IDS
        response = requests.get(f"{BASE_URL}/api/packages")
        data = response.json()
        
        for pkg in data["packages"]:
            key = f"{pkg['category']}_{pkg['tier']}"
            PACKAGE_IDS[key] = pkg["id"]
    
    def test_calculate_with_interior_only(self):
        """Test price calculation with only interior package"""
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": PACKAGE_IDS.get("interior_standard"),
                "exterior_package_id": None,
                "vehicle_size": "small"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["subtotal"] == 20.0  # Interior Standard price
        assert data["vehicle_size_fee"] == 0.0  # Small = free
        assert data["total_price"] == 20.0
        assert data["base_duration"] == 30  # Interior Standard duration
        assert data["buffer_minutes"] == 30
        assert data["total_duration"] == 60  # 30 + 30 buffer
    
    def test_calculate_with_exterior_only(self):
        """Test price calculation with only exterior package"""
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": None,
                "exterior_package_id": PACKAGE_IDS.get("exterior_deluxe"),
                "vehicle_size": "medium"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["subtotal"] == 35.0  # Exterior Deluxe price
        assert data["vehicle_size_fee"] == 5.0  # Medium = +$5
        assert data["total_price"] == 40.0
    
    def test_calculate_with_both_packages(self):
        """Test price calculation with both interior and exterior packages"""
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": PACKAGE_IDS.get("interior_deluxe"),
                "exterior_package_id": PACKAGE_IDS.get("exterior_deluxe"),
                "vehicle_size": "large"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        # Interior Deluxe ($40) + Exterior Deluxe ($35) = $75
        assert data["subtotal"] == 75.0
        assert data["vehicle_size_fee"] == 10.0  # Large = +$10
        assert data["total_price"] == 85.0
        # Duration: 45 + 45 = 90 + 30 buffer = 120
        assert data["base_duration"] == 90
        assert data["total_duration"] == 120
    
    def test_calculate_vehicle_size_fees(self):
        """Test that vehicle size fees are applied correctly"""
        # Test Small (free)
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": PACKAGE_IDS.get("interior_standard"),
                "exterior_package_id": None,
                "vehicle_size": "small"
            }
        )
        assert response.json()["vehicle_size_fee"] == 0.0
        
        # Test Medium (+$5)
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": PACKAGE_IDS.get("interior_standard"),
                "exterior_package_id": None,
                "vehicle_size": "medium"
            }
        )
        assert response.json()["vehicle_size_fee"] == 5.0
        
        # Test Large (+$10)
        response = requests.post(
            f"{BASE_URL}/api/bookings/calculate",
            json={
                "interior_package_id": PACKAGE_IDS.get("interior_standard"),
                "exterior_package_id": None,
                "vehicle_size": "large"
            }
        )
        assert response.json()["vehicle_size_fee"] == 10.0


class TestAvailableSlotsAPI:
    """Test POST /api/bookings/available-slots endpoint"""
    
    def test_available_slots_saturday(self):
        """Test available slots for Saturday (10 AM - 6 PM)"""
        # Find next Saturday
        today = datetime.now()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        next_saturday = today + timedelta(days=days_until_saturday)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/available-slots",
            json={
                "booking_date": next_saturday.strftime("%Y-%m-%d"),
                "duration_minutes": 60
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "slots" in data
        assert isinstance(data["slots"], list)
        
        # Saturday should have slots starting from 10:00
        if data["slots"]:
            first_slot = data["slots"][0]
            assert first_slot.startswith("10:") or first_slot.startswith("11:") or first_slot.startswith("12:")
    
    def test_available_slots_sunday(self):
        """Test available slots for Sunday (1 PM - 6 PM)"""
        # Find next Sunday
        today = datetime.now()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        next_sunday = today + timedelta(days=days_until_sunday)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/available-slots",
            json={
                "booking_date": next_sunday.strftime("%Y-%m-%d"),
                "duration_minutes": 60
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "slots" in data
        
        # Sunday should have slots starting from 13:00
        if data["slots"]:
            first_slot = data["slots"][0]
            assert first_slot.startswith("13:")
    
    def test_available_slots_weekday(self):
        """Test available slots for weekday (3 PM - 6 PM)"""
        # Find next Monday
        today = datetime.now()
        days_until_monday = (0 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/available-slots",
            json={
                "booking_date": next_monday.strftime("%Y-%m-%d"),
                "duration_minutes": 60
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "slots" in data
        
        # Weekday should have slots starting from 15:00
        if data["slots"]:
            first_slot = data["slots"][0]
            assert first_slot.startswith("15:")
    
    def test_available_slots_30_minute_intervals(self):
        """Test that slots are in 30-minute intervals"""
        # Find next Saturday for more slots
        today = datetime.now()
        days_until_saturday = (5 - today.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        next_saturday = today + timedelta(days=days_until_saturday)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/available-slots",
            json={
                "booking_date": next_saturday.strftime("%Y-%m-%d"),
                "duration_minutes": 60
            }
        )
        
        data = response.json()
        
        if len(data["slots"]) >= 2:
            # Check that slots are in 30-minute intervals
            for slot in data["slots"]:
                minutes = int(slot.split(":")[1])
                assert minutes in [0, 30], f"Slot {slot} is not on 30-minute interval"


class TestBookingCreation:
    """Test POST /api/bookings/create endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_package_ids(self):
        """Fetch package IDs before tests"""
        global PACKAGE_IDS
        response = requests.get(f"{BASE_URL}/api/packages")
        data = response.json()
        
        for pkg in data["packages"]:
            key = f"{pkg['category']}_{pkg['tier']}"
            PACKAGE_IDS[key] = pkg["id"]
    
    def test_create_booking_validation_no_package(self):
        """Test that booking fails without any package selected"""
        response = requests.post(
            f"{BASE_URL}/api/bookings/create",
            json={
                "customer_name": "TEST_John Doe",
                "customer_phone": "555-123-4567",
                "customer_email": "test@example.com",
                "service_type": "dropoff",
                "vehicle_size": "medium",
                "interior_package_id": None,
                "exterior_package_id": None,
                "booking_date": "2026-02-15",
                "start_time": "2026-02-15T15:00:00"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "package" in data["detail"].lower()
    
    def test_create_booking_validation_mobile_no_address(self):
        """Test that mobile service requires address"""
        response = requests.post(
            f"{BASE_URL}/api/bookings/create",
            json={
                "customer_name": "TEST_John Doe",
                "customer_phone": "555-123-4567",
                "customer_email": "test@example.com",
                "service_type": "mobile",
                "vehicle_size": "medium",
                "interior_package_id": PACKAGE_IDS.get("interior_standard"),
                "exterior_package_id": None,
                "customer_address": None,
                "booking_date": "2026-02-15",
                "start_time": "2026-02-15T15:00:00"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "address" in data["detail"].lower()


class TestAPIHealth:
    """Test API health and basic connectivity"""
    
    def test_api_root(self):
        """Test that API root endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_packages_endpoint_accessible(self):
        """Test that packages endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/packages")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
