-- Función para calcular el potencial de ingresos (si todas las unidades pagaran el promedio facturado)
CREATE OR REPLACE FUNCTION get_income_potential(p_user_id uuid, p_condominium_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avg_invoice numeric;
    v_total_units integer;
    v_income_potential numeric;
BEGIN
    -- 1. Validación estricta de seguridad
    IF NOT EXISTS (
        SELECT 1 
        FROM condominiums c
        JOIN organization_users ou ON c.organization_id = ou.organization_id
        WHERE c.id = p_condominium_id
          AND ou.user_id = auth.uid()
    ) THEN
        RETURN 0.0;
    END IF;

    -- 2. Obtener el monto promedio FACTURADO (amount) en el mes actual
    -- Usamos AVG() nativo de SQL. Si no hay facturas, COALESCE lo convierte en 0
    SELECT COALESCE(AVG(i.amount), 0)
    INTO v_avg_invoice
    FROM invoices i
    WHERE i.condominium_id = p_condominium_id
      AND date_trunc('month', i.created_at) = date_trunc('month', CURRENT_DATE);

    -- 3. Contar el total de unidades físicas que existen en el condominio
    SELECT COUNT(id) INTO v_total_units
    FROM units 
    WHERE condominium_id = p_condominium_id;

    -- 4. Calcular el potencial: promedio de facturación * capacidad total de unidades
    v_income_potential := ROUND((v_avg_invoice * v_total_units)::numeric, 2);

    RETURN COALESCE(v_income_potential, 0.0);
END;
$$;
