-- Función RPC para Resumen de Facturación y Cobranza (Mes Actual)
CREATE OR REPLACE FUNCTION public.get_billing_summary(p_condominium_id uuid)
RETURNS TABLE (
    total_facturado numeric,
    total_recaudado numeric,
    total_por_cobrar numeric,
    total_vencido numeric,
    residentes_en_mora bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(amount), 0) AS total_facturado,
        COALESCE(SUM(paid_amount), 0) AS total_recaudado,
        COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount - COALESCE(paid_amount, 0) ELSE 0 END), 0) AS total_por_cobrar,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount - COALESCE(paid_amount, 0) ELSE 0 END), 0) AS total_vencido,
        COUNT(DISTINCT unit_id) FILTER (WHERE status = 'overdue') AS residentes_en_mora
    FROM public.invoices
    WHERE condominium_id = p_condominium_id
      AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
      AND date_trunc('year', created_at) = date_trunc('year', CURRENT_DATE);
END;
$$;
