-- Función para obtener los ingresos cobrados (paid) del mes actual por condominio
CREATE OR REPLACE FUNCTION get_month_income(p_user_id uuid, p_condominium_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_income numeric;
BEGIN
    SELECT COALESCE(SUM(i.paid_amount), 0)
    INTO total_income
    FROM invoices i
    WHERE i.condominium_id = p_condominium_id
      AND i.status = 'paid'
      -- Filtramos específicamente las facturas creadas en el mes y año actual
      AND date_trunc('month', i.created_at) = date_trunc('month', CURRENT_DATE)
      -- Validamos fuertemente que el usuario ejecutor pertenezca a la organización dueña del condominio
      AND EXISTS (
          SELECT 1
          FROM condominiums c
          JOIN organization_users ou ON c.organization_id = ou.organization_id
          WHERE c.id = i.condominium_id
          AND ou.user_id = auth.uid() -- Obligatorio usar el token del usuario logueado en lugar de depender del parámetro
      );

    RETURN total_income;
END;
$$;
