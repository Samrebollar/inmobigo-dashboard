-- Función para obtener el total de unidades ocupadas del usuario autenticado
CREATE OR REPLACE FUNCTION get_total_occupied_units()
RETURNS TABLE(total_ocupadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::integer
    FROM 
        units u
    WHERE 
        u.billing_status = 'active'
        AND u.condominium_id IN (
            SELECT c.id 
            FROM condominiums c
            JOIN organization_users ou ON c.organization_id = ou.organization_id
            WHERE ou.user_id = auth.uid()
        );
END;
$$;
