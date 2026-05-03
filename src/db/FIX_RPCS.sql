-- FIX_RPCS.sql
-- This script updates all RPC functions to use the safe get_user_org_id() helper 
-- to avoid infinite recursion and RLS issues.

BEGIN;

-- 1. Update get_total_ingresos
CREATE OR REPLACE FUNCTION get_total_ingresos()
RETURNS TABLE (total_ingresos numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id();

  RETURN QUERY
  SELECT COALESCE(SUM(paid_amount), 0) AS total_ingresos
  FROM invoices i
  INNER JOIN condominiums c ON i.condominium_id = c.id
  WHERE i.status = 'paid'
    AND c.organization_id = v_org_id;
END;
$$;

-- 2. Update get_tasa_cobranza
CREATE OR REPLACE FUNCTION get_tasa_cobranza()
RETURNS TABLE (tasa_cobranza numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_total_facturado numeric;
  v_total_cobrado numeric;
BEGIN
  v_org_id := get_user_org_id();

  SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(paid_amount), 0)
  INTO v_total_facturado, v_total_cobrado
  FROM invoices i
  INNER JOIN condominiums c ON i.condominium_id = c.id
  WHERE c.organization_id = v_org_id;

  IF v_total_facturado = 0 THEN
    RETURN QUERY SELECT 0::numeric;
  ELSE
    RETURN QUERY SELECT (v_total_cobrado / v_total_facturado * 100)::numeric;
  END IF;
END;
$$;

-- 3. Update get_morosidad
CREATE OR REPLACE FUNCTION get_morosidad()
RETURNS TABLE (total_facturas_vencidas bigint, monto_vencido numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id();

  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_facturas_vencidas,
    COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0)::numeric AS monto_vencido
  FROM invoices i
  INNER JOIN condominiums c ON i.condominium_id = c.id
  WHERE i.status = 'overdue'
    AND c.organization_id = v_org_id;
END;
$$;

-- 4. Update get_income_summary_year
CREATE OR REPLACE FUNCTION get_income_summary_year(p_condominium_id uuid DEFAULT NULL)
RETURNS TABLE (month text, total_cobrado numeric, total_pendiente numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id();

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
    AND i.organization_id = v_org_id
    AND (p_condominium_id IS NULL OR i.condominium_id = p_condominium_id)
  GROUP BY m.month_date
  ORDER BY m.month_date;
END;
$$;

-- 5. Update get_income_summary_6_months
CREATE OR REPLACE FUNCTION get_income_summary_6_months()
RETURNS TABLE (month text, total_facturado numeric, total_cobrado numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id();

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
      WHEN 1 THEN 'Ene' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
      WHEN 4 THEN 'Abr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
      WHEN 7 THEN 'Jul' WHEN 8 THEN 'Ago' WHEN 9 THEN 'Sep'
      WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dic'
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

-- 6. Update get_total_residents
CREATE OR REPLACE FUNCTION get_total_residents()
RETURNS TABLE(total_residentes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
    v_org_id := get_user_org_id();
    
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.id)::integer
    FROM 
        residents r
    JOIN condominiums c ON r.condominium_id = c.id
    WHERE 
        r.status = 'active'
        AND c.organization_id = v_org_id;
END;
$$;

-- 7. Update get_total_occupied_units
CREATE OR REPLACE FUNCTION get_total_occupied_units()
RETURNS TABLE(total_ocupados integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
    v_org_id := get_user_org_id();

    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::integer
    FROM 
        units u
    JOIN condominiums c ON u.condominium_id = c.id
    WHERE 
        u.status = 'occupied'
        AND c.organization_id = v_org_id;
END;
$$;

-- 8. Update get_month_income
CREATE OR REPLACE FUNCTION get_month_income()
RETURNS TABLE(month_income numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
    v_org_id := get_user_org_id();

    RETURN QUERY
    SELECT 
        COALESCE(SUM(paid_amount), 0)::numeric
    FROM 
        invoices i
    WHERE 
        i.status = 'paid'
        AND i.organization_id = v_org_id
        AND i.created_at >= date_trunc('month', current_date);
END;
$$;

COMMIT;
