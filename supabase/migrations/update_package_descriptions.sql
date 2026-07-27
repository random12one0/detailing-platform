-- Update package descriptions and prices to match booking widget requirements

-- Update Exterior packages
UPDATE packages 
SET description = 'Standard Exterior Detail', base_price = 20
WHERE category = 'exterior' AND name = 'Basic Exterior';

UPDATE packages 
SET description = 'Deluxe Exterior Detail', base_price = 35
WHERE category = 'exterior' AND name = 'Standard Exterior';

UPDATE packages 
SET description = 'Ultimate Exterior Detail', base_price = 50
WHERE category = 'exterior' AND name = 'Premium Exterior';

-- Update Interior packages
UPDATE packages 
SET description = 'Standard Interior Clean', base_price = 20
WHERE category = 'interior' AND name = 'Basic Interior';

UPDATE packages 
SET description = 'Deluxe Interior Clean', base_price = 40
WHERE category = 'interior' AND name = 'Standard Interior';

UPDATE packages 
SET description = 'Ultimate Interior Clean', base_price = 60
WHERE category = 'interior' AND name = 'Premium Interior';
