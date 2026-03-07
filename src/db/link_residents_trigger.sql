-- LINK AUTH USERS TO RESIDENTS
-- This script enables the "Claim Profile" flow.
-- When a user signs up with role 'resident', we check if an Admin already created a Resident profile 
-- with that email. If so, we link them.

BEGIN;

-- 1. Add user_id to residents if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='user_id') THEN
        ALTER TABLE public.residents ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
    
    -- Ensure email is indexed for fast lookups (and ideally unique per condo, but for linking we just find the first match or all matches?)
    -- A user could potentially be a resident in multiple condos? 
    -- For now, let's assume one main profile or link all matching emails.
    CREATE INDEX IF NOT EXISTS idx_residents_email ON public.residents(email);
END $$;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_resident_signup() 
RETURNS TRIGGER AS $$
DECLARE
    matched_resident_id UUID;
BEGIN
    -- Only run for users with 'resident' role (stored in metadata)
    -- OR just try to link anyone who has an email match in residents table.
    -- Let's be broad: If email matches, link it.
    
    -- Find existing resident profile(s) with this email that don't have a user_id yet
    UPDATE public.residents
    SET user_id = NEW.id,
        status = 'active' -- Auto-activate if they claim it
    WHERE email = NEW.email
    AND user_id IS NULL; -- Only claim if not already claimed
    
    -- We don't forbid signup if no resident found; they just start valid but unlinked (maybe waiting for admin).
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on auth.users
-- Drop first to allow updates
DROP TRIGGER IF EXISTS on_auth_user_created_link_resident ON auth.users;

CREATE TRIGGER on_auth_user_created_link_resident
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_resident_signup();

COMMIT;
