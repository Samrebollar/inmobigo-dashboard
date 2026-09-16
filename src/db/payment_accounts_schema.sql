-- INMOBIGO: PAYMENT_ACCOUNTS — Tokens OAuth de Mercado Pago Connect por condominio
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- 1. Crear la tabla
CREATE TABLE IF NOT EXISTS public.payment_accounts (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    condominium_id  uuid NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    provider        text NOT NULL DEFAULT 'mercadopago'
                    CHECK (provider IN ('mercadopago')),
    access_token    text NOT NULL,
    refresh_token   text,
    mp_user_id      text,
    public_key      text,
    expires_at      timestamptz,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- 2. Constraint único — un solo registro por (condominio, proveedor)
--    Si ya existe la tabla sin el constraint, este ALTER la corrige.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payment_accounts_condominium_provider_key'
    ) THEN
        ALTER TABLE public.payment_accounts
            ADD CONSTRAINT payment_accounts_condominium_provider_key
            UNIQUE (condominium_id, provider);
    END IF;
END
$$;

-- 3. Índice para búsquedas por condominio
CREATE INDEX IF NOT EXISTS idx_payment_accounts_condominium_id
    ON public.payment_accounts(condominium_id);

-- 4. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_payment_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_accounts_updated_at ON public.payment_accounts;
CREATE TRIGGER trg_payment_accounts_updated_at
    BEFORE UPDATE ON public.payment_accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_payment_accounts_updated_at();

-- 5. Row Level Security
--    Los tokens de acceso son sensibles; solo service_role los lee/escribe.
--    El código de la app siempre usa adminSupabase (service_role) para esta tabla.
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Bloquear acceso directo desde el cliente (anon / authenticated roles)
DROP POLICY IF EXISTS "No direct client access" ON public.payment_accounts;
CREATE POLICY "No direct client access" ON public.payment_accounts
    USING (false);

-- Nota: service_role bypasses RLS — el backend puede leer/escribir sin restricción.
