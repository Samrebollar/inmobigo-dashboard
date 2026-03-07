-- ==========================================
-- NUCLEAR DIAGNOSTIC & FIX FOR SUBSCRIPTIONS
-- ==========================================
-- 1. Check if the project is correct
-- Project URL from .env.local: https://djxllvplxdigosbhhicn.supabase.co

-- 2. VERIFY: Does the column exist in the database?
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name = 'user_id';

-- 3. FORCE FIX: If it's missing, add it. If it's there, do nothing.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='user_id') THEN
        ALTER TABLE public.subscriptions ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 4. PERMISSIONS: Ensure the API can see it
GRANT ALL ON TABLE public.subscriptions TO postgres, service_role, authenticated;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- 5. TRIGGER CACHE REFRESH: 
-- Changing the comment on the table is the standard way to trigger a metadata update
COMMENT ON TABLE public.subscriptions IS 'Subscription tracking table - SYNC_VERSION: ' || now();

-- ==========================================
-- ¡IMPORTANTE! INSTRUCCIONES FINALES:
-- ==========================================
-- Después de correr este script:
-- 1. Ve a "Settings" -> "API" en tu Dashboard de Supabase.
-- 2. Haz clic en "Refresh PostgREST Cache".
-- 3. Si el error persiste, REINICIA el servidor local (npm run dev).
-- ==========================================
