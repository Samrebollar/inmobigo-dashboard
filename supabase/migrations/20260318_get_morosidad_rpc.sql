-- 20260318_get_morosidad_rpc.sql
-- Este script crea la función RPC 'get_morosidad' para obtener métricas de morosidad.

CREATE OR REPLACE FUNCTION get_morosidad()
RETURNS TABLE (total_facturas_vencidas bigint, monto_vencido numeric)
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

  -- 2. Calcular facturas vencidas y monto total vencido
  RETURN QUERY
  SELECT 
    COUNT(*) AS total_facturas_vencidas,
    COALESCE(SUM(amount), 0) AS monto_vencido
  FROM invoices
  WHERE organization_id = v_org_id
    AND status = 'overdue';

END;
$$;
