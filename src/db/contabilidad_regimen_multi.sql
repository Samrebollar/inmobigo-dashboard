-- Phase 1: Organizations Table Update
-- Adds the fiscal_regime column to allow multi-tenant accounting logic
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS fiscal_regime text;

-- Phase 2: Create Financial Records Table
-- Main ledger for Smart Accounting module
CREATE TABLE IF NOT EXISTS financial_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    type text NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    amount numeric NOT NULL DEFAULT 0,
    category text NOT NULL,
    fiscal_category text,
    description text,
    date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now()
);

-- Phase 3: RLS Policies (Row Level Security)
-- Ensures data privacy between different organizations
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Policy: Broad select for anyone in the organization (to view summaries)
CREATE POLICY "Users can view financial records of their organization"
ON financial_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users 
        WHERE organization_users.organization_id = financial_records.organization_id 
        AND organization_users.user_id = auth.uid()
    )
);

-- Policy: Elevated access for management roles
CREATE POLICY "Owners, admins and accountants can manage financial records"
ON financial_records FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_users 
        WHERE organization_users.organization_id = financial_records.organization_id 
        AND organization_users.user_id = auth.uid()
        AND organization_users.role IN ('owner', 'admin', 'accountant')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organization_users 
        WHERE organization_users.organization_id = financial_records.organization_id 
        AND organization_users.user_id = auth.uid()
        AND organization_users.role IN ('owner', 'admin', 'accountant')
    )
);
-- Phase 4: Organizations Update Policy
-- Allows admins and owners to set the fiscal_regime
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'organizations' AND policyname = 'Admins can update their own organization'
    ) THEN
        CREATE POLICY "Admins can update their own organization"
        ON organizations FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM organization_users 
                WHERE organization_users.organization_id = organizations.id 
                AND organization_users.user_id = auth.uid()
                AND organization_users.role IN ('owner', 'admin')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM organization_users 
                WHERE organization_users.organization_id = organizations.id 
                AND organization_users.user_id = auth.uid()
                AND organization_users.role IN ('owner', 'admin')
            )
        );
    END IF;
END $$;
