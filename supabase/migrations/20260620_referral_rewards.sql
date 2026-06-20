-- =============================================================================
-- MIGRATION: 20260620_referral_rewards.sql
-- Propósito: Agregar trazabilidad completa a benefit_referrals y crear
--            tabla benefit_reward_payments para el sistema de recompensas.
-- =============================================================================

-- -----------------------------------------------------------------------
-- 1. ALTER TABLE benefit_referrals — Columnas de trazabilidad completa
-- -----------------------------------------------------------------------
ALTER TABLE public.benefit_referrals
    ADD COLUMN IF NOT EXISTS referred_registered_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS plan_activated_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reward_generated_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reward_paid_at          TIMESTAMPTZ;

-- Índice para búsquedas por organización referida
CREATE INDEX IF NOT EXISTS idx_benefit_referrals_referred_org
    ON public.benefit_referrals (referred_organization_id)
    WHERE referred_organization_id IS NOT NULL;

-- Índice para búsquedas de recompensas pendientes
CREATE INDEX IF NOT EXISTS idx_benefit_referrals_status
    ON public.benefit_referrals (status);


-- -----------------------------------------------------------------------
-- 2. CREATE TABLE benefit_reward_payments
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.benefit_reward_payments (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          UUID          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    referral_id              UUID          NOT NULL REFERENCES public.benefit_referrals(id) ON DELETE CASCADE,
    referrer_organization_id UUID          NOT NULL REFERENCES public.organizations(id),
    amount                   NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    status                   VARCHAR(30)   NOT NULL DEFAULT 'pending',
    payment_method           VARCHAR(50),
    payment_reference        TEXT,
    notes                    TEXT,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    paid_at                  TIMESTAMPTZ,
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_reward_payment_status CHECK (
        status IN ('pending', 'approved', 'paid', 'cancelled', 'failed')
    ),
    -- Un referido solo puede tener una recompensa activa
    CONSTRAINT uq_reward_per_referral UNIQUE (referral_id)
);

-- RLS: el referente ve sus propias recompensas; el admin cliente ve las suyas
ALTER TABLE public.benefit_reward_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrer_can_view_own_rewards"
    ON public.benefit_reward_payments FOR SELECT
    USING (
        referrer_organization_id IN (
            SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "org_can_view_their_reward_records"
    ON public.benefit_reward_payments FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()
        )
    );

-- Solo el sistema (admin client) puede insertar/actualizar recompensas
-- El Owner actúa a través de server actions con createAdminClient()

-- Trigger updated_at
CREATE TRIGGER set_benefit_reward_payments_updated_at
    BEFORE UPDATE ON public.benefit_reward_payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_reward_payments_referrer
    ON public.benefit_reward_payments (referrer_organization_id);

CREATE INDEX IF NOT EXISTS idx_reward_payments_status
    ON public.benefit_reward_payments (status);

CREATE INDEX IF NOT EXISTS idx_reward_payments_referral
    ON public.benefit_reward_payments (referral_id);


-- -----------------------------------------------------------------------
-- 3. Política adicional en benefit_referral_codes — lectura pública
--    para validar códigos en el formulario de registro (sin auth)
-- -----------------------------------------------------------------------
-- Permite que un nuevo usuario (pre-auth) valide un código durante el registro.
-- Se usa únicamente para SELECT con filtro por code + is_active.
CREATE POLICY "public_can_validate_referral_codes"
    ON public.benefit_referral_codes FOR SELECT
    USING (is_active = true);
