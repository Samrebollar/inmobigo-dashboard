-- REVERSE LINK: Link existing Auth User when Admin creates a Resident profile
-- This handles the case where the User registered BEFORE the Admin created their profile.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_resident_profile() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check if an Auth User already exists with this email
    UPDATE public.residents
    SET user_id = (
        SELECT id FROM auth.users WHERE email = NEW.email LIMIT 1
    ),
    status = 'active'
    WHERE id = NEW.id
    AND user_id IS NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on residents table
DROP TRIGGER IF EXISTS on_resident_created_link_auth ON public.residents;

CREATE TRIGGER on_resident_created_link_auth
BEFORE INSERT ON public.residents
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_resident_profile();

COMMIT;
