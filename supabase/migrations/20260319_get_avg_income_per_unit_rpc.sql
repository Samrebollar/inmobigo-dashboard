-- Función para calcular el ingreso promedio por unidad ocupada en un condominio
CREATE OR REPLACE FUNCTION get_avg_income_per_unit(p_user_id uuid, p_condominium_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_income numeric;
    v_occupied_units integer;
    v_avg_income numeric;
BEGIN
    -- 1. Validación rigurosa de seguridad con auth.uid()
    IF NOT EXISTS (
        SELECT 1 
        FROM condominiums c
        JOIN organization_users ou ON c.organization_id = ou.organization_id
        WHERE c.id = p_condominium_id
          AND ou.user_id = auth.uid()
    ) THEN
        RETURN 0.0;
    END IF;

    -- 2. Sumar ingresos cobrados (paid) específicamente del mes actual
    SELECT COALESCE(SUM(i.paid_amount), 0)
    INTO v_total_income
    FROM invoices i
    WHERE i.condominium_id = p_condominium_id
      AND i.status = 'paid'
      AND date_trunc('month', i.created_at) = date_trunc('month', CURRENT_DATE);

    -- 3. Contar unidades estrictamente ocupadas (tienen al menos 1 residente 'active')
    SELECT COUNT(DISTINCT u.id) INTO v_occupied_units
    FROM units u
    JOIN residents r ON r.unit_id = u.id
    WHERE u.condominium_id = p_condominium_id
      AND r.status = 'active';

    -- 4. Calcular el promedio matemático evitando el colapso de división por cero
    IF v_occupied_units > 0 THEN
        v_avg_income := ROUND((v_total_income / v_occupied_units)::numeric, 2);
    ELSE
        -- Si hay $0 ingresos o 0 unidades ocupadas, el promedio es nulo matemáticamente
        v_avg_income := 0.0;
    END IF;

    RETURN COALESCE(v_avg_income, 0.0);
END;
$$;
