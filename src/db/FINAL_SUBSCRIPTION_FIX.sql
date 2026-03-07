-- ==========================================
-- DEFINITIVE FIX FOR SUBSCRIPTION SYSTEM
-- Run this in Supabase SQL Editor
-- ==========================================

BEGIN;

-- 1. Ensure 'subscriptions' table exists with ALL required columns
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    plan_name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    unit_limit INTEGER NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    subscription_status TEXT NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'active', 'cancelled', 'expired')),
    mercado_subscription_id TEXT,
    mercado_customer_id TEXT,
    last_payment_date TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    amount_paid NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns to 'organizations' table if they are missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='subscription_status') THEN
        ALTER TABLE public.organizations ADD COLUMN subscription_status TEXT DEFAULT 'none';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='units_limit') THEN
        ALTER TABLE public.organizations ADD COLUMN units_limit INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='units_used') THEN
        ALTER TABLE public.organizations ADD COLUMN units_used INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='next_billing_date') THEN
        ALTER TABLE public.organizations ADD COLUMN next_billing_date TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Setup Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_mercado_id ON public.subscriptions(mercado_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(organization_id);

-- 4. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create their own pending subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their organization subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create organization pending subscriptions" ON public.subscriptions;

-- 6. Create clean RLS Policies
CREATE POLICY "Users can view their organization subscriptions"
ON public.subscriptions FOR SELECT
USING (
    organization_id IN (
        SELECT org_id FROM (
            SELECT organization_id as org_id FROM organization_users WHERE user_id = auth.uid()
        ) as sub
    )
);

CREATE POLICY "Users can create organization pending subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT org_id FROM (
            SELECT organization_id as org_id FROM organization_users WHERE user_id = auth.uid()
        ) as sub
    )
    AND auth.uid() = user_id
);

COMMIT;

-- 7. REFRESH SCHEMA CACHE (Run this manually in Supabase if errors persist)
-- Typically happens automatically, but if you still see "column not found"
-- go to Settings -> API -> Refresh PostgREST Cache.
