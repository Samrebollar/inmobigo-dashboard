-- Add fields for the new onboarding flow
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portfolio_type TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS total_units INTEGER;

-- Ensure user_type exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
