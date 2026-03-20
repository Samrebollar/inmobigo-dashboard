-- 20260317_get_total_ingresos_rpc.sql
-- Este script crea la función RPC 'get_total_ingresos' para calcular ingresos.

CREATE OR REPLACE FUNCTION get_total_ingresos()
RETURNS TABLE (total_ingresos numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Obtener el organization_id del usuario autenticado actual.
  -- Asumimos que el usuario rige bajo 'organization_users'.
  SELECT organization_id INTO v_org_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 2. Retornar el total sumado de 'paid_amount'
  -- Mapeamos a través de condominiums para filtrar invoices de la organización correcta.
  RETURN QUERY
  SELECT COALESCE(SUM(paid_amount), 0) AS total_ingresos
  FROM invoices i
  INNER JOIN condominiums c ON i.condominium_id = c.id
  WHERE i.status = 'paid'
    AND c.organization_id = v_org_id;

END;
$$;
