-- 20260318_get_income_summary_rpc.sql
-- Este script crea la función RPC 'get_income_summary_6_months' para gráfica de ingresos.

CREATE OR REPLACE FUNCTION get_income_summary_6_months()
RETURNS TABLE (month text, total_facturado numeric, total_cobrado numeric)
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

  -- 2. Retornar el resumen de ingresos de los últimos 6 meses (siempre 6 filas)
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
      DATE_TRUNC('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) AS month_date
  )
  SELECT
    CASE EXTRACT(MONTH FROM m.month_date)
      WHEN 1 THEN 'Ene'
      WHEN 2 THEN 'Feb'
      WHEN 3 THEN 'Mar'
      WHEN 4 THEN 'Abr'
      WHEN 5 THEN 'May'
      WHEN 6 THEN 'Jun'
      WHEN 7 THEN 'Jul'
      WHEN 8 THEN 'Ago'
      WHEN 9 THEN 'Sep'
      WHEN 10 THEN 'Oct'
      WHEN 11 THEN 'Nov'
      WHEN 12 THEN 'Dic'
    END AS month,
    COALESCE(SUM(i.amount), 0) AS total_facturado,
    COALESCE(SUM(i.paid_amount), 0) AS total_cobrado
  FROM months m
  LEFT JOIN invoices i 
    ON DATE_TRUNC('month', i.created_at) = m.month_date 
    AND i.organization_id = v_org_id
  GROUP BY m.month_date
  ORDER BY m.month_date;

END;
$$;
