-- ==========================================
-- FORCE SCHEMA CACHE SYNC
-- Run this in Supabase SQL Editor
-- ==========================================

BEGIN;

-- 1. If for some reason the table is corrupted, we forcefully add the columns
ALTER TABLE IF EXISTS public.subscriptions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE IF EXISTS public.subscriptions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Grant permissions again
GRANT ALL ON TABLE public.subscriptions TO postgres, service_role, authenticated;

-- 3. Force a "touch" on the table to notify PostgREST
COMMENT ON TABLE public.subscriptions IS 'Table for managing SaaS subscriptions - Last sync: ' || now();

COMMIT;

-- ==========================================
-- ¡IMPORTANTE! PASO FINAL MANUAL:
-- ==========================================
-- Si el error "Could not find column user_id" persiste:
-- 1. Ve a "Dashboard" de Supabase.
-- 2. Ve a "Settings" (Icono de engranaje abajo a la izquierda).
-- 3. Ve a "API".
-- 4. Busca el botón "Refresh PostgREST Cache" y haz clic.
-- ==========================================
