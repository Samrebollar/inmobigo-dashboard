-- ============================================================================
-- ESQUEMA DE BASE DE DATOS: mp_connect_tokens
-- Registra tokens de invitación de un solo uso para conectar Mercado Pago
-- sin requerir sesión en InmobiGo (ej. para comités de vigilancia).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mp_connect_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_mp_connect_tokens_token ON public.mp_connect_tokens(token);
CREATE INDEX IF NOT EXISTS idx_mp_connect_tokens_condo ON public.mp_connect_tokens(condominium_id);

-- RLS: Bloquear todo acceso directo vía cliente Supabase (solo accesible por service_role en el backend)
ALTER TABLE public.mp_connect_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to mp_connect_tokens" ON public.mp_connect_tokens;
CREATE POLICY "No client access to mp_connect_tokens"
    ON public.mp_connect_tokens
    FOR ALL
    TO authenticated, anon
    USING (false);

COMMENT ON TABLE public.mp_connect_tokens IS 'Tokens de invitación para la conexión OAuth de Mercado Pago a nivel condominio.';
