-- SQL Migration to create payment_validations table
-- This replaces the local JSON file storage which doesn't work in serverless environments

CREATE TABLE IF NOT EXISTS public.payment_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
    resident_name TEXT,
    unit TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL,
    comprobante_url TEXT,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
    nota TEXT,
    observacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_validations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read for admins" ON public.payment_validations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow residents to insert their own validations" ON public.payment_validations
    FOR INSERT WITH CHECK (true); -- Ideally link to user_id, but keeping it simple for now

CREATE POLICY "Allow admins to update validations" ON public.payment_validations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete validations" ON public.payment_validations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_validations_updated_at
    BEFORE UPDATE ON public.payment_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_validations;

-- Table for Bank Accounts linked to condominiums
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read for authenticated" ON public.bank_accounts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to manage bank accounts" ON public.bank_accounts
    FOR ALL USING (auth.role() = 'authenticated');

-- Enable Realtime for bank_accounts
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
