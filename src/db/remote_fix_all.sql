-- COMPREHENSIVE FIX FOR REMOTE DATABASE
-- Run this in Supabase Dashboard > SQL Editor

BEGIN;

-- 1. FUNCTION & TRIGGER: When a User Signs Up -> Link to existing Resident Profile
CREATE OR REPLACE FUNCTION public.handle_new_resident_signup() 
RETURNS TRIGGER AS $$
BEGIN
    -- Link to resident profile if exists and unlinked
    UPDATE public.residents
    SET user_id = NEW.id,
        status = 'active'
    WHERE email = NEW.email
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_link_resident ON auth.users;
CREATE TRIGGER on_auth_user_created_link_resident
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_resident_signup();


-- 2. FUNCTION & TRIGGER: When Admin creates Resident -> Link to existing User
CREATE OR REPLACE FUNCTION public.handle_new_resident_profile() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check if keys exist in auth.users
    -- We can't select from auth.users directly in a BEFORE INSERT easily without permissions, 
    -- but usually SECURITY DEFINER helps.
    
    -- We'll try to find the user ID.
    -- Note: BEFORE INSERT, we can modify NEW.user_id if valid.
    
    IF NEW.user_id IS NULL THEN
        SELECT id INTO NEW.user_id
        FROM auth.users 
        WHERE email = NEW.email 
        LIMIT 1;
        
        IF NEW.user_id IS NOT NULL THEN
             NEW.status := 'active';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_resident_created_link_auth ON public.residents;
CREATE TRIGGER on_resident_created_link_auth
BEFORE INSERT ON public.residents
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_resident_profile();


-- 3. MANUAL FIX: Link any existing unlinked residents
UPDATE public.residents r
SET user_id = u.id,
    status = 'active'
FROM auth.users u
WHERE r.email = u.email
AND r.user_id IS NULL;

COMMIT;
