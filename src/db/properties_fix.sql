-- Properties Fix: Missing Tables and RLS

-- 1. Create condominiums table if missing
CREATE TABLE IF NOT EXISTS public.condominiums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT CHECK (type IN ('residential', 'commercial', 'mixed')) DEFAULT 'residential',
    country TEXT DEFAULT 'México',
    state TEXT,
    city TEXT,
    address TEXT,
    units_total INTEGER DEFAULT 0,
    billing_day INTEGER DEFAULT 1,
    currency TEXT CHECK (currency IN ('MXN', 'USD')) DEFAULT 'MXN',
    status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create organization_users table if missing
-- This table is required for RLS and org identification
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role role_type DEFAULT 'admin',
    status user_status DEFAULT 'active',
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Ensure RLS is enabled
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy for condominiums
DROP POLICY IF EXISTS "Enable manage for admins of the same organization" ON condominiums;
CREATE POLICY "Enable manage for admins of the same organization" ON condominiums
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

-- 5. RLS Policy for organization_users
DROP POLICY IF EXISTS "Users can view their own organization links" ON organization_users;
CREATE POLICY "Users can view their own organization links" ON organization_users
    FOR SELECT
    USING (user_id = auth.uid());
