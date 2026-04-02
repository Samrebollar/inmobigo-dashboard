-- Migration: Create Visitor Passes Table for SaaS Module
-- Description: Advanced visitor pass management with specific time controls and status

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.visitor_passes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    resident_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    visitor_name text NOT NULL,
    visit_date date NOT NULL,
    start_time time NOT NULL,
    end_time time,
    notes text,
    qr_token uuid DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    status text CHECK (status IN ('pending', 'used', 'expired', 'cancelled')) DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (Seguridad por filas)
ALTER TABLE public.visitor_passes ENABLE ROW LEVEL SECURITY;

-- Politicas para el Guardia / Administrador
CREATE POLICY "Admins y Guardias pueden ver todos los pases de su organizacion"
  ON public.visitor_passes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff', 'owner') 
      AND profiles.organization_id = visitor_passes.organization_id
    )
  );

CREATE POLICY "Admins y Guardias pueden actualizar el status de los pases"
  ON public.visitor_passes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff', 'owner') 
      AND profiles.organization_id = visitor_passes.organization_id
    )
  );

-- Politicas para los Residentes (Dueños)
CREATE POLICY "Residentes pueden ver sus propios pases"
  ON public.visitor_passes FOR SELECT
  USING (resident_id = auth.uid());

CREATE POLICY "Residentes pueden crear sus propios pases"
  ON public.visitor_passes FOR INSERT
  WITH CHECK (resident_id = auth.uid());

CREATE POLICY "Residentes pueden actualizar (ej. cancelar) sus propios pases"
  ON public.visitor_passes FOR UPDATE
  USING (resident_id = auth.uid());
