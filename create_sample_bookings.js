import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adtlnvihwrcqcasqcjwd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdGxudmlod3JjcWNhc3FjandkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MjI4OTcsImV4cCI6MjA4NTQ5ODg5N30.bB8gQ0cTC9MaeFrf3jcMt3F2HqXMZDG1Ip_qPqJlT-k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleBookings() {
  // First, get available packages
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('*');
  
  if (packagesError) {
    console.error('Error fetching packages:', packagesError);
    return;
  }
  
  console.log('Available packages:', packages.length);
  
  // Get interior and exterior packages
  const interiorPackage = packages.find(p => p.tier === 'interior' || p.name.toLowerCase().includes('interior'));
  const exteriorPackage = packages.find(p => p.tier === 'exterior' || p.name.toLowerCase().includes('exterior'));
  
  console.log('Interior package:', interiorPackage?.name);
  console.log('Exterior package:', exteriorPackage?.name);
  
  // Create sample bookings - bookings table stores customer info directly
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  const sampleBookings = [
    {
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '555-0100',
      booking_date: today.toISOString().split('T')[0],
      start_time: '10:00:00',
      end_time: '12:00:00',
      status: 'confirmed',
      service_type: 'interior',
      vehicle_size: 'sedan',
      total_price: 150.00,
      subtotal: 150.00,
      total_duration_minutes: 120,
      payment_status: 'paid',
      interior_package_id: interiorPackage?.id,
      has_water_electric: true,
      customer_notes: 'Sample booking for today'
    },
    {
      customer_name: 'Jane Smith',
      customer_email: 'jane@example.com',
      customer_phone: '555-0101',
      booking_date: tomorrow.toISOString().split('T')[0],
      start_time: '14:00:00',
      end_time: '16:00:00',
      status: 'confirmed',
      service_type: 'exterior',
      vehicle_size: 'suv',
      total_price: 200.00,
      subtotal: 200.00,
      total_duration_minutes: 120,
      payment_status: 'pending',
      exterior_package_id: exteriorPackage?.id,
      has_water_electric: false,
      customer_notes: 'Sample booking for tomorrow'
    },
    {
      customer_name: 'Bob Johnson',
      customer_email: 'bob@example.com',
      customer_phone: '555-0102',
      booking_date: nextWeek.toISOString().split('T')[0],
      start_time: '09:00:00',
      end_time: '12:00:00',
      status: 'confirmed',
      service_type: 'both',
      vehicle_size: 'truck',
      total_price: 350.00,
      subtotal: 350.00,
      total_duration_minutes: 180,
      payment_status: 'paid',
      interior_package_id: interiorPackage?.id,
      exterior_package_id: exteriorPackage?.id,
      has_water_electric: true,
      customer_notes: 'Full service - interior and exterior'
    }
  ];
  
  console.log('\nCreating sample bookings...');
  for (const booking of sampleBookings) {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select();
    
    if (error) {
      console.error('Error creating booking:', error);
    } else {
      console.log('✓ Created booking for', booking.booking_date, 'at', booking.start_time);
    }
  }
  
  console.log('\nDone! Check your admin dashboard to see the bookings.');
}

createSampleBookings();
