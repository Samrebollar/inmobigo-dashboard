-- Función para obtener el total de residentes con morosidad del usuario autenticado
CREATE OR REPLACE FUNCTION get_total_delinquent_residents()
RETURNS TABLE(total_morosos integer)
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
        r.status = 'delinquent'
        AND EXISTS (
            SELECT 1 
            FROM condominiums c
            JOIN organization_users ou ON ou.organization_id = c.organization_id
            LEFT JOIN units u ON u.condominium_id = c.id 
            WHERE (r.condominium_id = c.id OR r.unit_id = u.id)
            AND ou.user_id = auth.uid()
        );
END;
$$;
