-- Función para obtener la tasa de ocupación por condominio
CREATE OR REPLACE FUNCTION get_occupancy_rate(p_user_id uuid, p_condominium_id uuid)
RETURNS TABLE(
    occupied_units integer,
    total_units integer,
    occupancy_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_units integer;
    v_occupied_units integer;
    v_occupancy_rate numeric;
BEGIN
    -- Validación de acceso de seguridad
    IF NOT EXISTS (
        SELECT 1 
        FROM condominiums c
        JOIN organization_users ou ON c.organization_id = ou.organization_id
        WHERE c.id = p_condominium_id
          AND ou.user_id = auth.uid()
    ) THEN
        RETURN QUERY SELECT 0::integer, 0::integer, 0.0::numeric;
        RETURN;
    END IF;

    -- Extraer cantidad total de unidades en el condominio
    SELECT COUNT(id) INTO v_total_units
    FROM units 
    WHERE condominium_id = p_condominium_id;

    -- Extraer cantidad de unidades ocupadas (tienen al menos 1 residente 'active')
    SELECT COUNT(DISTINCT u.id) INTO v_occupied_units
    FROM units u
    JOIN residents r ON r.unit_id = u.id
    WHERE u.condominium_id = p_condominium_id
      AND r.status = 'active';

    -- Calcular el porcentaje (occupancy_rate)
    IF v_total_units > 0 THEN
        -- ROUND a 2 decimales para mayor limpieza
        v_occupancy_rate := ROUND((v_occupied_units::numeric / v_total_units::numeric) * 100, 2);
    ELSE
        v_occupancy_rate := 0.0;
    END IF;

    -- Retornar la fila estructurada con los 3 valores exigidos
    RETURN QUERY SELECT 
        COALESCE(v_occupied_units, 0)::integer, 
        COALESCE(v_total_units, 0)::integer, 
        COALESCE(v_occupancy_rate, 0.0)::numeric;
END;
$$;
