-- Función RPC para obtener las últimas 5 facturas
CREATE OR REPLACE FUNCTION public.get_recent_invoices(p_condominium_id uuid)
RETURNS TABLE (
    folio text,
    unidad text,
    concepto text,
    monto numeric,
    estado text,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id::text AS folio,
        COALESCE(u.name, 'S/N') AS unidad,
        i.concept AS concepto,
        i.amount AS monto,
        i.status AS estado,
        i.created_at
    FROM public.invoices i
    LEFT JOIN public.units u ON u.id = i.unit_id
    WHERE i.condominium_id = p_condominium_id
    ORDER BY i.created_at DESC
    LIMIT 5;
END;
$$;
