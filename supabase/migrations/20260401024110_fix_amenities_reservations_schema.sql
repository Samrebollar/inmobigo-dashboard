-- Add missing columns to amenity_reservations if they don't exist
alter table amenity_reservations 
  add column if not exists status text check (status in ('pending', 'approved', 'cancelled')) default 'pending',
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());
  
-- Optionally force a schema reload if needed
notify pgrst, 'reload schema';