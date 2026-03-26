-- ==========================================
-- SECURE CLOSED-ACCESS SIGNUP FLOW
-- ==========================================
-- This script ensures only pre-approved residents can sign up.
-- Run this in Supabase Dashboard > SQL Editor

BEGIN;

-- 1. Add registration status to residents if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='is_registered') THEN
        ALTER TABLE public.residents ADD COLUMN is_registered BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create/Update the handle_new_user function to enforce pre-approval
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_val text;
  resident_record RECORD;
BEGIN
  -- COMBINED LOGIC: Profile Sync + Closed Access Validation
  
  -- Use coalesce for role to handle potential missing metadata
  -- If role is 'resident', we MUST find them in the residents table
  IF coalesce(NEW.raw_user_meta_data->>'role', 'resident') = 'resident' THEN
    SELECT * INTO resident_record FROM public.residents WHERE email = NEW.email LIMIT 1;
    
    IF NOT FOUND THEN
      -- BLOCK SIGNUP: Email not pre-approved
      RAISE EXCEPTION 'You are not registered as a resident. Please contact administration. (%)', NEW.email;
    END IF;
  END IF;

  -- 1. Sync to public.profiles
  name_val := coalesce(
    NEW.raw_user_meta_data->>'full_name', 
    concat(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name')
  );

  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id, 
    NEW.email, 
    trim(name_val), 
    coalesce(NEW.raw_user_meta_data->>'role', 'resident'),
    -- If they are a resident, we automatically assign their organization
    coalesce(resident_record.organization_id, NEW.raw_user_meta_data->>'organization_id')::uuid
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role;

  -- 2. Link back to residents table if applicable
  IF resident_record.id IS NOT NULL THEN
    UPDATE public.residents
    SET user_id = NEW.id,
        is_registered = TRUE,
        status = 'active'
    WHERE id = resident_record.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
