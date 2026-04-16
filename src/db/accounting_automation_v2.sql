-- Step 1: Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominium_id uuid REFERENCES public.condominiums(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount numeric NOT NULL DEFAULT 0,
    category text NOT NULL,
    description text,
    date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id)
);

-- Step 2: Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'expenses' AND policyname = 'Users can view expenses of their organization'
    ) THEN
        CREATE POLICY "Users can view expenses of their organization"
        ON public.expenses FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM organization_users 
                WHERE organization_users.organization_id = expenses.organization_id 
                AND organization_users.user_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'expenses' AND policyname = 'Admins can manage expenses'
    ) THEN
        CREATE POLICY "Admins can manage expenses"
        ON public.expenses FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM organization_users 
                WHERE organization_users.organization_id = expenses.organization_id 
                AND organization_users.user_id = auth.uid()
                AND organization_users.role IN ('owner', 'admin', 'accountant')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM organization_users 
                WHERE organization_users.organization_id = expenses.organization_id 
                AND organization_users.user_id = auth.uid()
                AND organization_users.role IN ('owner', 'admin', 'accountant')
            )
        );
    END IF;
END $$;

-- Step 4: Migrate data from financial_records to expenses
-- We only migrate 'egreso' types. 
-- We try to map condominium_id via unit_id if it exists.
INSERT INTO public.expenses (id, condominium_id, organization_id, amount, category, description, date, created_at, user_id)
SELECT 
    f.id,
    u.condominium_id,
    f.organization_id,
    f.amount,
    f.category,
    f.description,
    f.date,
    f.created_at,
    f.user_id
FROM public.financial_records f
LEFT JOIN public.units u ON f.unit_id = u.id
WHERE f.type = 'egreso'
ON CONFLICT (id) DO NOTHING;
