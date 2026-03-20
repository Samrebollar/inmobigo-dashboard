-- 20260318_get_total_deuda_rpc.sql
-- Este script crea la función RPC 'get_total_deuda' para calcular la deuda total.

CREATE OR REPLACE FUNCTION get_total_deuda()
RETURNS TABLE (total_deuda numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Obtener el organization_id del usuario autenticado actual
  SELECT organization_id INTO v_org_id
  FROM organization_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 2. Retornar el total sumado de (amount - paid_amount) para invoices no pagadas
  RETURN QUERY
  SELECT COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)), 0) AS total_deuda
  FROM invoices i
  WHERE i.status != 'paid'
    AND i.organization_id = v_org_id;

END;
$$;
