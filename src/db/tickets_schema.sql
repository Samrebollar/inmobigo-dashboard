
-- TICKET SYSTEM INITIALIZATION
-- This script ensures the tickets table exists and has proper RLS for both Admins and Residents.

-- 1. Create Tickets Table if not exists
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    condominium_id UUID REFERENCES public.condominiums(id) NOT NULL,
    unit_id UUID REFERENCES public.units(id),
    resident_id UUID REFERENCES public.residents(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_to UUID REFERENCES auth.users(id), -- Staff user ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_tickets_org ON public.tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_condo ON public.tickets(condominium_id);
CREATE INDEX IF NOT EXISTS idx_tickets_resident ON public.tickets(resident_id);

-- 3. Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 4. Polices
-- Users (Admins/Staff) can manage all tickets in their organization
CREATE POLICY "Admins can manage organization tickets" ON public.tickets
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

-- Residents can see their own tickets
CREATE POLICY "Residents can view their own tickets" ON public.tickets
    FOR SELECT
    USING (
        resident_id IN (
            SELECT id FROM residents WHERE user_id = auth.uid()
        )
    );

-- Residents can create tickets for their own unit/condominium
CREATE POLICY "Residents can create tickets" ON public.tickets
    FOR INSERT
    WITH CHECK (
        resident_id IN (
            SELECT id FROM residents WHERE user_id = auth.uid()
        )
    );

-- 5. Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
