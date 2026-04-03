-- Migration: Create Visitas Table matching exact User specifications
-- Route: accesos.inmobigo.mx

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.visitas (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_visitante text NOT NULL,
    nombre_residente text NOT NULL,
    fecha date NOT NULL,
    hora time NOT NULL,
    estado text CHECK (estado IN ('pendiente', 'usado', 'expirado', 'cancelado')) DEFAULT 'pendiente',
    qr_usado boolean DEFAULT false,
    fecha_uso timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Extra fields to maintain application integrity since Inmobigo is multi-tenant SaaS
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    resident_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_number text
);

-- Habilitar Row Level Security
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;

-- Politicas para el Guardia / Administrador (pueden ver accesos de su organizacion)
CREATE POLICY "Admins ver visitas"
  ON public.visitas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff', 'owner') 
      AND profiles.organization_id = visitas.organization_id
    )
  );

CREATE POLICY "Admins actualizar visitas"
  ON public.visitas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'staff', 'owner') 
      AND profiles.organization_id = visitas.organization_id
    )
  );

-- Politicas para los Residentes
CREATE POLICY "Residentes pueden ver sus propias visitas"
  ON public.visitas FOR SELECT
  USING (resident_id = auth.uid());

CREATE POLICY "Residentes pueden crear visitas"
  ON public.visitas FOR INSERT
  WITH CHECK (resident_id = auth.uid());

CREATE POLICY "Residentes pueden actualizar visitas"
  ON public.visitas FOR UPDATE
  USING (resident_id = auth.uid());
