-- Panel de Seguridad: flujo Acceso → Salida, columna Color/Placas y motivo de rechazo
-- para visitas, paquetería y transporte.

-- Visitas
ALTER TABLE public.visitor_passes
    ADD COLUMN IF NOT EXISTS vehicle_info text,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE public.visitor_passes DROP CONSTRAINT IF EXISTS visitor_passes_status_check;
ALTER TABLE public.visitor_passes
    ADD CONSTRAINT visitor_passes_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'used'::text, 'expired'::text, 'cancelled'::text, 'rejected'::text]));

-- Paquetería (checked_in_at = llegó el repartidor, checked_out_at = salió el repartidor)
ALTER TABLE public.package_alerts
    ADD COLUMN IF NOT EXISTS vehicle_info text,
    ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
    ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- Transporte (vehicle_info, checked_in_at, checked_out_at y rejection_reason ya existen)
ALTER TABLE public.transport_notices
    ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
    ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejection_reason text,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
