-- 20260318_get_income_summary_year_rpc.sql
-- Este script crea la función RPC 'get_income_summary_year' para la gráfica anual de ingresos filtrable.

CREATE OR REPLACE FUNCTION get_income_summary_year(p_condominium_id uuid DEFAULT NULL)
RETURNS TABLE (month text, total_cobrado numeric, total_pendiente numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
      DATE_TRUNC('month', CURRENT_DATE),
      INTERVAL '1 month'
    ) AS month_date
  )
  SELECT
    CASE EXTRACT(MONTH FROM m.month_date)
      WHEN 1 THEN 'Ene' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
      WHEN 4 THEN 'Abr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
      WHEN 7 THEN 'Jul' WHEN 8 THEN 'Ago' WHEN 9 THEN 'Sep'
      WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dic'
    END AS month,
    COALESCE(SUM(i.paid_amount), 0) AS total_cobrado,
    COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)) FILTER (WHERE i.status IN ('pending', 'overdue')), 0) AS total_pendiente
  FROM months m
  LEFT JOIN invoices i 
    ON DATE_TRUNC('month', i.created_at) = m.month_date
    AND i.organization_id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid()
    )
    AND (p_condominium_id IS NULL OR i.condominium_id = p_condominium_id)
  GROUP BY m.month_date
  ORDER BY m.month_date;
END;
$$;
