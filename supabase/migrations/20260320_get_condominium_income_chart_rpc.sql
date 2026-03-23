-- Función para obtener la gráfica de ingresos de los últimos 6 meses de un condominio
CREATE OR REPLACE FUNCTION get_condominium_income_chart(p_user_id uuid, p_condominium_id uuid)
RETURNS TABLE (
    month text,
    total_facturado numeric,
    total_cobrado numeric,
    total_pendiente numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Diccionario interno para forzar meses cortos en español
    meses text[] := ARRAY['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
BEGIN
    -- 1. Validación de seguridad con el usuario logueado en la sesión
    IF NOT EXISTS (
        SELECT 1 
        FROM condominiums c
        JOIN organization_users ou ON c.organization_id = ou.organization_id
        WHERE c.id = p_condominium_id
          AND ou.user_id = auth.uid()
    ) THEN
        RETURN;
    END IF;

    -- 2. Retornaremos la tabla virtual generada
    RETURN QUERY
    WITH months_series AS (
        -- Generar estrictamente 6 series de tiempo hacia atrás (para asegurar los 0s si no hay data)
        SELECT 
            date_trunc('month', d)::date AS month_date
        FROM generate_series(
            date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
            date_trunc('month', CURRENT_DATE),
            INTERVAL '1 month'
        ) AS d
    ),
    monthly_data AS (
        -- Agrupar data cruda real por mes
        SELECT 
            date_trunc('month', i.created_at)::date AS month_date,
            SUM(i.amount) AS total_facturado,
            SUM(COALESCE(i.paid_amount, 0)) AS total_cobrado
        FROM invoices i
        WHERE i.condominium_id = p_condominium_id
          -- Filtramos solo para jalar facturas de los últimos 6 meses exactos
          AND date_trunc('month', i.created_at)::date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '5 months')::date
        GROUP BY date_trunc('month', i.created_at)::date
    )
    SELECT 
        -- Transformamos el extractor (1 a 12) a texto (Ene, Feb...)
        meses[CAST(EXTRACT(month FROM ms.month_date) AS integer)] AS month,
        
        -- Si hay facturado lo ponemos, si no un 0
        COALESCE(md.total_facturado, 0)::numeric AS total_facturado,
        
        -- Si hay cobrado lo ponemos, si no un 0
        COALESCE(md.total_cobrado, 0)::numeric AS total_cobrado,
        
        -- Para pendiente restamos facturado menos cobrado (protegido con GREATEST para evitar negativos raros)
        GREATEST(COALESCE(md.total_facturado, 0) - COALESCE(md.total_cobrado, 0), 0)::numeric AS total_pendiente
        
    FROM months_series ms
    -- LEFT JOIN es la clave: empuja ceros en los meses que generó generate_series pero que no tienen facturas
    LEFT JOIN monthly_data md ON ms.month_date = md.month_date
    ORDER BY ms.month_date ASC;
END;
$$;
