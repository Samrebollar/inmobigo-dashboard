-- 20260318_get_tasa_cobranza_rpc.sql
-- Este script crea la función RPC 'get_tasa_cobranza' para calcular la tasa de cobranza.

CREATE OR REPLACE FUNCTION get_tasa_cobranza()
RETURNS TABLE (tasa_cobranza numeric)
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

  -- 2. Retornar la tasa de cobranza
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COALESCE(SUM(i.amount), 0) = 0 THEN 0
      ELSE (COALESCE(SUM(i.paid_amount), 0) / NULLIF(SUM(i.amount), 0)) * 100
    END AS tasa_cobranza
  FROM invoices i
  WHERE i.organization_id = v_org_id;

END;
$$;
