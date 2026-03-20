-- Función corregida para obtener el total de unidades del usuario autenticado
CREATE OR REPLACE FUNCTION get_total_units()
RETURNS TABLE(total_unidades integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(u.id)::integer
    FROM 
        units u
    WHERE EXISTS (
        SELECT 1 
        FROM condominiums c
        JOIN organization_users ou ON ou.organization_id = c.organization_id
        WHERE c.id = u.condominium_id
        AND ou.user_id = auth.uid()
    );
END;
$$;
