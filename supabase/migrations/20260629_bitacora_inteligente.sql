-- ============================================================
-- BITÁCORA INTELIGENTE — Migration
-- Adds audit columns to existing tables (additive only)
-- Creates unified bitacora_entries_view
-- ============================================================

-- 1. VISITOR_PASSES: Add audit columns for entry/exit tracking
ALTER TABLE public.visitor_passes
    ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guard_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS guard_name      TEXT,
    ADD COLUMN IF NOT EXISTS checkpoint      TEXT,          -- e.g. "Caseta Norte"
    ADD COLUMN IF NOT EXISTS visitor_type    TEXT CHECK (visitor_type IN (
        'visit','family','friend','provider','technician',
        'contractor','domestic','guest','event','delivery','other'
    )) DEFAULT 'visit';

-- 2. PACKAGE_ALERTS: Add arrival/departure timestamps
ALTER TABLE public.package_alerts
    ADD COLUMN IF NOT EXISTS received_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guard_name     TEXT,
    ADD COLUMN IF NOT EXISTS checkpoint     TEXT;

-- 3. AMENITY_RESERVATIONS: Add physical check-in/out
ALTER TABLE public.amenity_reservations
    ADD COLUMN IF NOT EXISTS checked_in_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guard_name     TEXT,
    ADD COLUMN IF NOT EXISTS start_time     TIME,
    ADD COLUMN IF NOT EXISTS end_time       TIME,
    ADD COLUMN IF NOT EXISTS unit_id        UUID REFERENCES public.units(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes          TEXT;

-- ============================================================
-- 4. UNIFIED VIEW: bitacora_entries_view
-- Combines all three sources into a single, normalized format
-- ============================================================
CREATE OR REPLACE VIEW public.bitacora_entries_view AS

-- ACCESS EVENTS (visitor_passes)
SELECT
    vp.id                                               AS id,
    'access'::TEXT                                      AS event_type,
    vp.organization_id,
    u.condominium_id,
    c.name                                              AS condominium_name,
    COALESCE(u.unit_number, vp.unit_id::TEXT)           AS unit_number,
    vp.visitor_name                                     AS person_name,
    p.full_name                                         AS authorized_by,
    vp.guard_name,
    vp.checkpoint,
    COALESCE(vp.checked_in_at, vp.created_at)          AS checked_in_at,
    vp.checked_out_at,
    CASE
        WHEN vp.checked_out_at IS NOT NULL AND vp.checked_in_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (vp.checked_out_at - vp.checked_in_at)) / 60
        ELSE NULL
    END::INTEGER                                        AS duration_minutes,
    CASE
        WHEN vp.status = 'used'      AND vp.checked_out_at IS NOT NULL THEN 'completed'
        WHEN vp.status = 'used'      AND vp.checked_out_at IS NULL     THEN 'active'
        WHEN vp.status = 'expired'                                      THEN 'expired'
        WHEN vp.status = 'cancelled'                                    THEN 'cancelled'
        ELSE 'pending'
    END                                                 AS status,
    'visitor_passes'::TEXT                              AS source_table,
    vp.id                                               AS source_id,
    vp.visitor_type,
    NULL::TEXT                                          AS company,
    NULL::TEXT                                          AS amenity_name,
    vp.created_at
FROM public.visitor_passes vp
LEFT JOIN public.units u      ON u.id = vp.unit_id
LEFT JOIN public.condominiums c ON c.id = u.condominium_id
LEFT JOIN public.profiles p   ON p.id = vp.resident_id

UNION ALL

-- DELIVERY EVENTS (package_alerts)
SELECT
    pa.id,
    'delivery'::TEXT                                    AS event_type,
    pa.organization_id,
    u.condominium_id,
    c.name                                              AS condominium_name,
    COALESCE(u.unit_number, pa.unit_id::TEXT)           AS unit_number,
    COALESCE(pa.carrier, 'Entrega')                     AS person_name,
    p.full_name                                         AS authorized_by,
    pa.guard_name,
    pa.checkpoint,
    COALESCE(pa.received_at, pa.created_at)             AS checked_in_at,
    pa.delivered_at                                     AS checked_out_at,
    CASE
        WHEN pa.delivered_at IS NOT NULL AND pa.received_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (pa.delivered_at - pa.received_at)) / 60
        ELSE NULL
    END::INTEGER                                        AS duration_minutes,
    CASE
        WHEN pa.status = 'delivered' THEN 'completed'
        WHEN pa.status = 'received'  THEN 'active'
        WHEN pa.status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
    END                                                 AS status,
    'package_alerts'::TEXT                              AS source_table,
    pa.id                                               AS source_id,
    'delivery'::TEXT                                    AS visitor_type,
    pa.carrier                                          AS company,
    NULL::TEXT                                          AS amenity_name,
    pa.created_at
FROM public.package_alerts pa
LEFT JOIN public.units u        ON u.id = pa.unit_id
LEFT JOIN public.condominiums c ON c.id = u.condominium_id
LEFT JOIN public.profiles p     ON p.id = pa.resident_id

UNION ALL

-- AMENITY EVENTS (amenity_reservations)
SELECT
    ar.id,
    'amenity'::TEXT                                     AS event_type,
    ar.organization_id,
    COALESCE(u.condominium_id, res.condominium_id)      AS condominium_id,
    COALESCE(c.name, res_condo.name)                    AS condominium_name,
    COALESCE(u.unit_number, res_unit.unit_number, '')   AS unit_number,
    p.full_name                                         AS person_name,
    p.full_name                                         AS authorized_by,
    ar.guard_name,
    NULL::TEXT                                          AS checkpoint,
    COALESCE(
        ar.checked_in_at,
        (ar.reservation_date::TIMESTAMPTZ)
    )                                                   AS checked_in_at,
    ar.checked_out_at,
    CASE
        WHEN ar.checked_out_at IS NOT NULL AND ar.checked_in_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ar.checked_out_at - ar.checked_in_at)) / 60
        ELSE NULL
    END::INTEGER                                        AS duration_minutes,
    CASE
        WHEN ar.status = 'approved'  AND ar.checked_out_at IS NOT NULL THEN 'completed'
        WHEN ar.status = 'approved'  AND ar.checked_in_at IS NOT NULL  THEN 'active'
        WHEN ar.status = 'approved'                                     THEN 'pending'
        WHEN ar.status = 'cancelled'                                    THEN 'cancelled'
        ELSE 'pending'
    END                                                 AS status,
    'amenity_reservations'::TEXT                        AS source_table,
    ar.id                                               AS source_id,
    'amenity'::TEXT                                     AS visitor_type,
    NULL::TEXT                                          AS company,
    am.name                                             AS amenity_name,
    ar.created_at
FROM public.amenity_reservations ar
LEFT JOIN public.amenities am   ON am.id = ar.amenity_id
LEFT JOIN public.units u        ON u.id = ar.unit_id
LEFT JOIN public.condominiums c ON c.id = u.condominium_id
LEFT JOIN public.profiles p     ON p.id = ar.resident_id
LEFT JOIN public.residents res  ON res.user_id = ar.resident_id
LEFT JOIN public.condominiums res_condo ON res_condo.id = res.condominium_id
LEFT JOIN public.units res_unit ON res_unit.id = res.unit_id;

-- ============================================================
-- 5. RPC: get_bitacora_kpis — Fast KPIs for the dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_bitacora_kpis(
    p_org_id UUID,
    p_date   DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'accesos_hoy',         (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND event_type = 'access'   AND checked_in_at::DATE = p_date),
        'entregas_hoy',        (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND event_type = 'delivery' AND checked_in_at::DATE = p_date),
        'amenidades_activas',  (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND event_type = 'amenity'  AND status IN ('active','pending') AND checked_in_at::DATE = p_date),
        'personas_dentro',     (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND event_type IN ('access','delivery') AND status = 'active'),
        'total_entradas',      (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND checked_in_at::DATE = p_date),
        'total_salidas',       (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND checked_out_at IS NOT NULL AND checked_out_at::DATE = p_date),
        'movimientos_hoy',     (SELECT COUNT(*) FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND checked_in_at::DATE = p_date),
        'tiempo_promedio_min', (SELECT COALESCE(AVG(duration_minutes), 0)::INTEGER FROM public.bitacora_entries_view WHERE organization_id = p_org_id AND duration_minutes IS NOT NULL AND checked_in_at::DATE = p_date)
    ) INTO result;
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bitacora_kpis TO authenticated, anon;
