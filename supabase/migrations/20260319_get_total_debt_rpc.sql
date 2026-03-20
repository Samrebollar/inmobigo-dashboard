-- Función para obtener la deuda total acumulada por condominio
CREATE OR REPLACE FUNCTION get_total_debt(p_user_id uuid, p_condominium_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_debt numeric;
BEGIN
    -- Calculamos (amount - paid_amount). Usamos COALESCE interno por si paid_amount es null
    -- y COALESCE externo por si no hay facturas pendientes en absoluto.
    SELECT COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)), 0)
    INTO total_debt
    FROM invoices i
    WHERE i.condominium_id = p_condominium_id
      AND i.status IN ('pending', 'overdue')
      -- Validar que el usuario tenga acceso a la organización dueña
      AND EXISTS (
          SELECT 1
          FROM condominiums c
          JOIN organization_users ou ON c.organization_id = ou.organization_id
          WHERE c.id = i.condominium_id
          AND ou.user_id = auth.uid() 
      );

    RETURN total_debt;
END;
$$;
