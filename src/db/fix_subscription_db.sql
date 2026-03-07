-- MASTER FIX FOR SUBSCRIPTION SYSTEM
-- This script adds missing columns to 'subscriptions' and 'organizations' tables

BEGIN;

-- 1. Update 'subscriptions' table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS unit_limit INTEGER;

-- Update existing rows if any (safety)
UPDATE public.subscriptions SET unit_limit = 20 WHERE plan_name = 'CORE' AND unit_limit IS NULL;
UPDATE public.subscriptions SET unit_limit = 60 WHERE plan_name = 'PLUS' AND unit_limit IS NULL;
UPDATE public.subscriptions SET unit_limit = 120 WHERE plan_name = 'ELITE' AND unit_limit IS NULL;
UPDATE public.subscriptions SET unit_limit = 250 WHERE plan_name = 'CORPORATE' AND unit_limit IS NULL;

-- 2. Update 'organizations' table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS units_limit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS units_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- 3. Update RLS for subscriptions to allow organization-based access
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their organization subscriptions"
ON public.subscriptions FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can create their own pending subscriptions" ON public.subscriptions;
CREATE POLICY "Users can create organization pending subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
);

COMMIT;
