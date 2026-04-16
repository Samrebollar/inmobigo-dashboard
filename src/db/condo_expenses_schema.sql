-- ==============================================
-- INMOBIGO SCRIPT DE MIGRACIÓN: GASTOS MANUALES
-- ==============================================

-- 1. Crear tabla independiente para evitar conflictos con tablas antiguas
CREATE TABLE IF NOT EXISTS public.condo_expenses (
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

-- 2. Habilitar seguridad
ALTER TABLE public.condo_expenses ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas de acceso limpias
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'condo_expenses' AND policyname = 'Users can view expenses of their organization'
    ) THEN
        CREATE POLICY "Users can view expenses of their organization"
        ON public.condo_expenses FOR SELECT
        TO authenticated
        USING (
            organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'condo_expenses' AND policyname = 'Admins can manage expenses'
    ) THEN
        CREATE POLICY "Admins can manage expenses"
        ON public.condo_expenses FOR ALL
        TO authenticated
        USING (
            organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
        )
        WITH CHECK (
            organization_id IN (
                SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
                UNION
                SELECT id FROM organizations WHERE owner_id = auth.uid()
            )
        );
    END IF;
END $$;
