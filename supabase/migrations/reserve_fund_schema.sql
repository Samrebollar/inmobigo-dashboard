-- Reserve Fund Table (Keep existing)
CREATE TABLE IF NOT EXISTS public.reserve_fund (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    condominium_id UUID REFERENCES public.condominiums(id) UNIQUE,
    balance DECIMAL(15,2) DEFAULT 0,
    target_amount DECIMAL(15,2) DEFAULT 0,
    contribution_type TEXT CHECK (contribution_type IN ('percentage', 'fixed')),
    contribution_value DECIMAL(15,2) DEFAULT 0,
    is_automated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Reserve Fund Transactions Table (Updated with linking columns)
CREATE TABLE IF NOT EXISTS public.reserve_fund_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES public.reserve_fund(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('deposit', 'withdrawal')),
    amount DECIMAL(15,2) NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id),
    -- Linking columns for automatic synchronization
    expense_id UUID REFERENCES public.condo_expenses(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.reserve_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_fund_transactions ENABLE ROW LEVEL SECURITY;

-- Policies (Keep existing)
-- [Existing policies here...]

-- 1. TRIGGER FOR AUTOMATED DEPOSITS (Updated to save invoice_id)
CREATE OR REPLACE FUNCTION public.handle_automated_fund_deposit()
RETURNS TRIGGER AS $$
DECLARE
    fund_record RECORD;
    deposit_amount DECIMAL(15,2);
BEGIN
    IF (NEW.status IN ('pagado', 'paid')) AND (OLD.status NOT IN ('pagado', 'paid') OR OLD.status IS NULL) THEN
        SELECT * INTO fund_record FROM public.reserve_fund
        WHERE condominium_id = NEW.condominium_id AND is_automated = true;

        IF FOUND THEN
            IF fund_record.contribution_type = 'percentage' THEN
                deposit_amount := NEW.amount * (fund_record.contribution_value / 100);
            ELSE
                deposit_amount := fund_record.contribution_value;
            END IF;

            INSERT INTO public.reserve_fund_transactions (fund_id, type, amount, reason, description, invoice_id)
            VALUES (fund_record.id, 'deposit', deposit_amount, 'Aportación Automática', 'Generado por pago de factura: ' || COALESCE(NEW.folio, NEW.id::text), NEW.id);

            UPDATE public.reserve_fund
            SET balance = balance + deposit_amount,
                updated_at = now()
            WHERE id = fund_record.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER FOR RESTORING BALANCE ON DELETION
CREATE OR REPLACE FUNCTION public.handle_deleted_fund_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- If the transaction is deleted (usually because of ON DELETE CASCADE from expense or invoice)
    -- we must REVERSE its effect on the fund balance.
    UPDATE public.reserve_fund
    SET balance = CASE 
        WHEN OLD.type = 'deposit' THEN balance - OLD.amount
        WHEN OLD.type = 'withdrawal' THEN balance + OLD.amount
        ELSE balance
    END,
    updated_at = now()
    WHERE id = OLD.fund_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_fund_transaction_deleted ON public.reserve_fund_transactions;
CREATE TRIGGER on_fund_transaction_deleted
BEFORE DELETE ON public.reserve_fund_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_deleted_fund_transaction();

-- Policies for reserve_fund (Restored for completeness)
CREATE POLICY "Admins can manage reserve_fund" ON public.reserve_fund
    FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_users WHERE organization_users.organization_id = reserve_fund.organization_id AND organization_users.user_id = auth.uid()));
CREATE POLICY "Residents can view reserve_fund" ON public.reserve_fund
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.residents WHERE residents.condominium_id = reserve_fund.condominium_id AND residents.user_id = auth.uid()));
CREATE POLICY "Admins can manage reserve_fund_transactions" ON public.reserve_fund_transactions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.reserve_fund JOIN public.organization_users ON organization_users.organization_id = reserve_fund.organization_id WHERE reserve_fund.id = reserve_fund_transactions.fund_id AND organization_users.user_id = auth.uid()));
CREATE POLICY "Residents can view reserve_fund_transactions" ON public.reserve_fund_transactions
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.reserve_fund JOIN public.residents ON residents.condominium_id = reserve_fund.condominium_id WHERE reserve_fund.id = reserve_fund_transactions.fund_id AND residents.user_id = auth.uid()));
