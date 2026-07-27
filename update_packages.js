import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adtlnvihwrcqcasqcjwd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePackageDescriptions() {
  try {
    // Update Exterior packages
    const exteriorUpdates = [
      { name: 'Basic Exterior', description: 'Standard Exterior Detail', base_price: 20 },
      { name: 'Standard Exterior', description: 'Deluxe Exterior Detail', base_price: 35 },
      { name: 'Premium Exterior', description: 'Ultimate Exterior Detail', base_price: 50 },
    ];

    for (const pkg of exteriorUpdates) {
      const { error } = await supabase
        .from('packages')
        .update({ 
          description: pkg.description, 
          base_price: pkg.base_price,
          updated_at: new Date().toISOString()
        })
        .eq('category', 'exterior')
        .eq('name', pkg.name);
      
      if (error) {
        console.error(`Error updating ${pkg.name}:`, error);
      } else {
        console.log(`Updated ${pkg.name} to ${pkg.description}`);
      }
    }

    // Update Interior packages
    const interiorUpdates = [
      { name: 'Basic Interior', description: 'Standard Interior Clean', base_price: 20 },
      { name: 'Standard Interior', description: 'Deluxe Interior Clean', base_price: 40 },
      { name: 'Premium Interior', description: 'Ultimate Interior Clean', base_price: 60 },
    ];

    for (const pkg of interiorUpdates) {
      const { error } = await supabase
        .from('packages')
        .update({ 
          description: pkg.description, 
          base_price: pkg.base_price,
          updated_at: new Date().toISOString()
        })
        .eq('category', 'interior')
        .eq('name', pkg.name);
      
      if (error) {
        console.error(`Error updating ${pkg.name}:`, error);
      } else {
        console.log(`Updated ${pkg.name} to ${pkg.description}`);
      }
    }

    console.log('Package descriptions updated successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

updatePackageDescriptions();
