-- Bitácora: los rechazos se muestran como "Rechazado" (antes caían en
-- "Pendiente"/"Cancelado") con su motivo y el vehículo, la salida de
-- paquetería usa checked_out_at, y los tipos que guarda el bot de WhatsApp
-- ('repartidor'/'proveedor') se normalizan a 'delivery'/'provider'.
-- Solo agrega columnas al final de la vista; las existentes no cambian de tipo.
CREATE OR REPLACE VIEW public.bitacora_entries_view AS
 SELECT vp.id,
    'access'::text AS event_type,
    vp.organization_id,
    u.condominium_id,
    c.name AS condominium_name,
    COALESCE(u.unit_number, vp.unit_id::text) AS unit_number,
    vp.visitor_name AS person_name,
    p.full_name AS authorized_by,
    vp.guard_name,
    vp.checkpoint,
    COALESCE(vp.checked_in_at, vp.created_at) AS checked_in_at,
    vp.checked_out_at,
        CASE
            WHEN vp.checked_out_at IS NOT NULL AND vp.checked_in_at IS NOT NULL THEN EXTRACT(epoch FROM vp.checked_out_at - vp.checked_in_at) / 60::numeric
            ELSE NULL::numeric
        END::integer AS duration_minutes,
        CASE
            WHEN vp.status = 'rejected'::text THEN 'rejected'::text
            WHEN vp.status = 'used'::text AND vp.checked_out_at IS NOT NULL THEN 'completed'::text
            WHEN vp.status = 'used'::text AND vp.checked_out_at IS NULL THEN 'active'::text
            WHEN vp.status = 'expired'::text THEN 'expired'::text
            WHEN vp.status = 'cancelled'::text THEN 'cancelled'::text
            ELSE 'pending'::text
        END AS status,
    'visitor_passes'::text AS source_table,
    vp.id AS source_id,
        CASE vp.visitor_type
            WHEN 'repartidor'::text THEN 'delivery'::text
            WHEN 'proveedor'::text THEN 'provider'::text
            ELSE vp.visitor_type
        END AS visitor_type,
    NULL::text AS company,
    NULL::text AS amenity_name,
    vp.created_at,
    vp.rejection_reason,
    vp.vehicle_info
   FROM visitor_passes vp
     LEFT JOIN units u ON u.id = vp.unit_id
     LEFT JOIN condominiums c ON c.id = u.condominium_id
     LEFT JOIN profiles p ON p.id = vp.resident_id
UNION ALL
 SELECT pa.id,
    'delivery'::text AS event_type,
    pa.organization_id,
    u.condominium_id,
    c.name AS condominium_name,
    COALESCE(u.unit_number, pa.unit_id::text) AS unit_number,
    COALESCE(pa.carrier, 'Entrega'::text) AS person_name,
    p.full_name AS authorized_by,
    pa.guard_name,
    pa.checkpoint,
    COALESCE(pa.checked_in_at, pa.received_at, pa.created_at) AS checked_in_at,
    COALESCE(pa.checked_out_at, pa.delivered_at) AS checked_out_at,
        CASE
            WHEN COALESCE(pa.checked_out_at, pa.delivered_at) IS NOT NULL AND COALESCE(pa.checked_in_at, pa.received_at) IS NOT NULL
                THEN EXTRACT(epoch FROM COALESCE(pa.checked_out_at, pa.delivered_at) - COALESCE(pa.checked_in_at, pa.received_at)) / 60::numeric
            ELSE NULL::numeric
        END::integer AS duration_minutes,
        CASE
            WHEN pa.status = 'rejected'::text THEN 'rejected'::text
            WHEN pa.status = 'delivered'::text OR pa.checked_out_at IS NOT NULL THEN 'completed'::text
            WHEN pa.status = 'received'::text THEN 'active'::text
            WHEN pa.status = 'cancelled'::text THEN 'cancelled'::text
            ELSE 'pending'::text
        END AS status,
    'package_alerts'::text AS source_table,
    pa.id AS source_id,
    'delivery'::text AS visitor_type,
    pa.carrier AS company,
    NULL::text AS amenity_name,
    pa.created_at,
    pa.rejection_reason,
    pa.vehicle_info
   FROM package_alerts pa
     LEFT JOIN units u ON u.id = pa.unit_id
     LEFT JOIN condominiums c ON c.id = u.condominium_id
     LEFT JOIN profiles p ON p.id = pa.resident_id
UNION ALL
 SELECT ar.id,
    'amenity'::text AS event_type,
    ar.organization_id,
    COALESCE(u.condominium_id, res.condominium_id) AS condominium_id,
    COALESCE(c.name, res_condo.name) AS condominium_name,
    COALESCE(u.unit_number, res_unit.unit_number, ''::text) AS unit_number,
    p.full_name AS person_name,
    p.full_name AS authorized_by,
    ar.guard_name,
    NULL::text AS checkpoint,
    COALESCE(ar.checked_in_at, ar.reservation_date::timestamp with time zone) AS checked_in_at,
    ar.checked_out_at,
        CASE
            WHEN ar.checked_out_at IS NOT NULL AND ar.checked_in_at IS NOT NULL THEN EXTRACT(epoch FROM ar.checked_out_at - ar.checked_in_at) / 60::numeric
            ELSE NULL::numeric
        END::integer AS duration_minutes,
        CASE
            WHEN ar.status = 'approved'::text AND ar.checked_out_at IS NOT NULL THEN 'completed'::text
            WHEN ar.status = 'approved'::text AND ar.checked_in_at IS NOT NULL THEN 'active'::text
            WHEN ar.status = 'approved'::text THEN 'pending'::text
            WHEN ar.status = 'cancelled'::text THEN 'cancelled'::text
            ELSE 'pending'::text
        END AS status,
    'amenity_reservations'::text AS source_table,
    ar.id AS source_id,
    'amenity'::text AS visitor_type,
    NULL::text AS company,
    am.name AS amenity_name,
    ar.created_at,
    NULL::text AS rejection_reason,
    NULL::text AS vehicle_info
   FROM amenity_reservations ar
     LEFT JOIN amenities am ON am.id = ar.amenity_id
     LEFT JOIN units u ON u.id = ar.unit_id
     LEFT JOIN condominiums c ON c.id = u.condominium_id
     LEFT JOIN profiles p ON p.id = ar.resident_id
     LEFT JOIN residents res ON res.user_id = ar.resident_id
     LEFT JOIN condominiums res_condo ON res_condo.id = res.condominium_id
     LEFT JOIN units res_unit ON res_unit.id = res.unit_id
UNION ALL
 SELECT tn.id,
    'transport'::text AS event_type,
    tn.organization_id,
    u.condominium_id,
    c.name AS condominium_name,
    COALESCE(u.unit_number, tn.unit_name, tn.unit_id::text) AS unit_number,
    COALESCE(tn.resident_name, 'Residente'::text) AS person_name,
    NULL::text AS authorized_by,
    tn.guard_name,
    tn.checkpoint,
    COALESCE(tn.checked_in_at, tn.created_at) AS checked_in_at,
    tn.checked_out_at,
        CASE
            WHEN tn.checked_out_at IS NOT NULL AND tn.checked_in_at IS NOT NULL THEN EXTRACT(epoch FROM tn.checked_out_at - tn.checked_in_at) / 60::numeric
            ELSE NULL::numeric
        END::integer AS duration_minutes,
        CASE
            WHEN tn.status = 'closed'::text THEN 'completed'::text
            WHEN tn.status = 'received'::text THEN 'active'::text
            WHEN tn.status = 'rejected'::text THEN 'rejected'::text
            ELSE 'pending'::text
        END AS status,
    'transport_notices'::text AS source_table,
    tn.id AS source_id,
    'other'::text AS visitor_type,
    (tn.platform || ' — '::text) ||
        CASE
            WHEN tn.direction = 'pickup'::text THEN 'Recogida'::text
            WHEN tn.direction = 'dropoff'::text THEN 'Llegada'::text
            ELSE tn.direction
        END AS company,
    NULL::text AS amenity_name,
    tn.created_at,
    tn.rejection_reason,
    tn.vehicle_info
   FROM transport_notices tn
     LEFT JOIN units u ON u.id = tn.unit_id
     LEFT JOIN condominiums c ON c.id = u.condominium_id;
