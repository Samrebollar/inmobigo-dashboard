-- Create Role Type Enum
CREATE TYPE role_type AS ENUM ('owner', 'admin', 'manager', 'accountant', 'staff', 'viewer');

-- Create User Status Enum
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending');

-- Update organization_users table
ALTER TABLE organization_users 
ADD COLUMN IF NOT EXISTS role role_type DEFAULT 'viewer',
ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS on Tables
ALTER TABLE condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Helper Function to get current user's org ID
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic Isolation Policy (Read/Write own org data)
-- For condominiums
CREATE POLICY "Enable access for users of the same organization" ON condominiums
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- For units (via condominium relation or direct org_id if exists, assuming link to condo)
-- Note: Assuming units has condominium_id
CREATE POLICY "Enable access for users of the same organization" ON units
    USING (condominium_id IN (
        SELECT id FROM condominiums WHERE organization_id = get_user_org_id()
    ))
    WITH CHECK (condominium_id IN (
        SELECT id FROM condominiums WHERE organization_id = get_user_org_id()
    ));

-- For residents
CREATE POLICY "Enable access for users of the same organization" ON residents
    USING (condominium_id IN (
        SELECT id FROM condominiums WHERE organization_id = get_user_org_id()
    ))
    WITH CHECK (condominium_id IN (
        SELECT id FROM condominiums WHERE organization_id = get_user_org_id()
    ));

-- For invoices
CREATE POLICY "Enable access for users of the same organization" ON invoices
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- For tickets
CREATE POLICY "Enable access for users of the same organization" ON tickets
    USING (organization_id = get_user_org_id())
    WITH CHECK (organization_id = get_user_org_id());

-- For organization_users (Users can see their colleagues)
CREATE POLICY "Enable access for users of the same organization" ON organization_users
    USING (organization_id = get_user_org_id());

-- Only Owner/Admin can MANAGE organization_users (Insert/Update/Delete)
CREATE POLICY "Admins can manage organization users" ON organization_users
    AS PERMISSIVE
    FOR ALL
    USING (
        organization_id = get_user_org_id() AND 
        EXISTS (
            SELECT 1 FROM organization_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );
