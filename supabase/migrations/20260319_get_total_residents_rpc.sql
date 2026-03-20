-- Función actualizada para obtener el total de residentes activos del usuario autenticado
CREATE OR REPLACE FUNCTION get_total_residents()
RETURNS TABLE(total_residentes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.id)::integer
    FROM 
        residents r
    WHERE 
        r.status = 'active' -- Nota: Asegúrate de que los 5 residentes realmente tengan status = 'active' en la base de datos
        AND EXISTS (
            SELECT 1 
            FROM condominiums c
            JOIN organization_users ou ON ou.organization_id = c.organization_id
            -- Vinculamos tanto si el residente está asignado a la unidad como si está asignado directo al condominio
            LEFT JOIN units u ON u.condominium_id = c.id 
            WHERE (r.condominium_id = c.id OR r.unit_id = u.id)
            AND ou.user_id = auth.uid()
        );
END;
$$;
