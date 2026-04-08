-- ==========================================
-- PREMIUM SERVICES MODULE SCHEMA
-- ==========================================
-- This table tracks leads for premium services.
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.premium_service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Policies
ALTER TABLE public.premium_service_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own premium requests"
    ON public.premium_service_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all premium requests"
    ON public.premium_service_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'owner')
        )
    );

-- Allow insertion for authenticated users
CREATE POLICY "Users can create premium requests"
    ON public.premium_service_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);
