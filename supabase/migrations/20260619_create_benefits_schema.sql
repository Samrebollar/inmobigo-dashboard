-- =============================================================================
-- MIGRATION: 20260619_create_benefits_schema.sql
-- Propósito: Estructura del nuevo módulo "Beneficios" (Capacitación y Referidos)
-- =============================================================================

-- 1. TABLA: benefit_training_categories (Categorías de Capacitación)
CREATE TABLE IF NOT EXISTS public.benefit_training_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para benefit_training_categories
ALTER TABLE public.benefit_training_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benefit categories of their organization" 
    ON public.benefit_training_categories FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert benefit categories of their organization" 
    ON public.benefit_training_categories FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update benefit categories of their organization" 
    ON public.benefit_training_categories FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete benefit categories of their organization" 
    ON public.benefit_training_categories FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER set_benefit_training_categories_updated_at
    BEFORE UPDATE ON public.benefit_training_categories
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();


-- 2. TABLA: benefit_trainings (Cursos y capacitaciones)
CREATE TABLE IF NOT EXISTS public.benefit_trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.benefit_training_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    difficulty VARCHAR(30),
    content_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para benefit_trainings
ALTER TABLE public.benefit_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trainings of their organization" 
    ON public.benefit_trainings FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert trainings of their organization" 
    ON public.benefit_trainings FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update trainings of their organization" 
    ON public.benefit_trainings FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete trainings of their organization" 
    ON public.benefit_trainings FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER set_benefit_trainings_updated_at
    BEFORE UPDATE ON public.benefit_trainings
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();


-- 3. TABLA: benefit_training_progress (Avance del administrador)
CREATE TABLE IF NOT EXISTS public.benefit_training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES public.benefit_trainings(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, training_id)
);

-- RLS para benefit_training_progress
ALTER TABLE public.benefit_training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view progress of their organization" 
    ON public.benefit_training_progress FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert progress of their organization" 
    ON public.benefit_training_progress FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update progress of their organization" 
    ON public.benefit_training_progress FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete progress of their organization" 
    ON public.benefit_training_progress FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER set_benefit_training_progress_updated_at
    BEFORE UPDATE ON public.benefit_training_progress
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();


-- 4. TABLA: benefit_referral_codes (Código de referido de la organización)
CREATE TABLE IF NOT EXISTS public.benefit_referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    total_referrals INTEGER DEFAULT 0,
    total_rewards NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para benefit_referral_codes
ALTER TABLE public.benefit_referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referral codes of their organization" 
    ON public.benefit_referral_codes FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert referral codes of their organization" 
    ON public.benefit_referral_codes FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update referral codes of their organization" 
    ON public.benefit_referral_codes FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER set_benefit_referral_codes_updated_at
    BEFORE UPDATE ON public.benefit_referral_codes
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();


-- 5. TABLA: benefit_referrals (Recomendaciones realizadas)
CREATE TABLE IF NOT EXISTS public.benefit_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    referral_code_id UUID NOT NULL REFERENCES public.benefit_referral_codes(id) ON DELETE CASCADE,
    referrer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    referred_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    referred_name VARCHAR(255),
    referred_email VARCHAR(255),
    referred_phone VARCHAR(30),
    status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'trial', 'active_plan', 'reward_pending', 'reward_paid', 'cancelled')),
    reward_amount NUMERIC(12,2) DEFAULT 1000.00,
    reward_paid BOOLEAN DEFAULT false,
    reward_paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS para benefit_referrals
ALTER TABLE public.benefit_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals of their organization" 
    ON public.benefit_referrals FOR SELECT 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert referrals of their organization" 
    ON public.benefit_referrals FOR INSERT 
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update referrals of their organization" 
    ON public.benefit_referrals FOR UPDATE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete referrals of their organization" 
    ON public.benefit_referrals FOR DELETE 
    USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER set_benefit_referrals_updated_at
    BEFORE UPDATE ON public.benefit_referrals
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
