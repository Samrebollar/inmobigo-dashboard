-- Función para obtener el total de condominios del usuario autenticado
CREATE OR REPLACE FUNCTION get_total_condominiums()
RETURNS TABLE(total_condominios integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id)::integer
    FROM 
        condominiums c
    JOIN 
        organization_users ou ON c.organization_id = ou.organization_id
    WHERE 
        ou.user_id = auth.uid();
END;
$$;
