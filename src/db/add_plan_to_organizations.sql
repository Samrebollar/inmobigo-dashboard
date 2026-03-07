-- ADD PLAN COLUMN TO ORGANIZATIONS
-- This script adds 'plan' and 'status' columns to the organizations table if they don't exist.

BEGIN;

-- 1. Add 'plan' column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='plan') THEN
        ALTER TABLE public.organizations ADD COLUMN plan TEXT DEFAULT 'free';
    END IF;
END $$;

-- 2. Add 'status' column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='status') THEN
        ALTER TABLE public.organizations ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 3. Verify RLS (Just to be safe, facilitate public registration if needed strictly for INSERT)
-- Actually, for registration, the user is authenticated but doesn't have an org yet. 
-- The insert happens with the authenticated user's JWT. 
-- We might need a policy allowing authenticated users to INSERT into organizations.

-- Check if policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' 
        AND policyname = 'Allow authenticated users to create organizations'
    ) THEN
        CREATE POLICY "Allow authenticated users to create organizations" ON public.organizations
        FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
    END IF;
END $$;

COMMIT;
