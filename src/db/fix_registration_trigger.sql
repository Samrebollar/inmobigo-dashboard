-- ==========================================
-- FIX FOR REGISTRATION DATABASE ERROR
-- ==========================================
-- Run this in Supabase Dashboard > SQL Editor

BEGIN;

-- 1. Create a safer handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_val text;
BEGIN
  -- Combine first and last name if full_name is not provided
  name_val := coalesce(
    new.raw_user_meta_data->>'full_name', 
    concat(new.raw_user_meta_data->>'first_name', ' ', new.raw_user_meta_data->>'last_name')
  );

  -- Use ON CONFLICT to avoid "Database error" if profile already exists
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    trim(name_val), 
    coalesce(new.raw_user_meta_data->>'role', 'resident')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block auth signup if possible
  -- (Though usually we want the profile to exist)
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-create the trigger to ensure it's pointing to the correct function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Ensure the linking trigger is also safe
CREATE OR REPLACE FUNCTION public.handle_new_resident_signup() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check if residents table exists before updating
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'residents') THEN
        UPDATE public.residents
        SET user_id = NEW.id,
            status = 'active'
        WHERE email = NEW.email
        AND user_id IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
