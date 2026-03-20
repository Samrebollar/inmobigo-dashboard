-- Función sobrecargada para obtener la cantidad de residentes morosos de un SOLO condominio
CREATE OR REPLACE FUNCTION get_total_delinquent_residents(p_user_id uuid, p_condominium_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_delinquent integer;
BEGIN
    SELECT COUNT(DISTINCT r.id)::integer
    INTO total_delinquent
    FROM residents r
    WHERE r.status = 'delinquent'
      AND EXISTS (
          SELECT 1 
          FROM condominiums c
          JOIN organization_users ou ON c.organization_id = ou.organization_id
          -- Vinculación doble (por unidad o directo al condominio) que descubrimos anteriormente
          LEFT JOIN units u ON u.condominium_id = c.id
          WHERE (r.condominium_id = c.id OR r.unit_id = u.id)
            AND c.id = p_condominium_id
            AND ou.user_id = auth.uid() -- Validación de seguridad principal
      );

    RETURN total_delinquent;
END;
$$;
