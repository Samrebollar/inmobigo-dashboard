-- Script to enforce subscription limits at the database level

CREATE OR REPLACE FUNCTION check_unit_limit_before_insert()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
    org_id UUID;
    sub_limit INT;
    current_count INT;
BEGIN
    -- 1. Obtener el organization_id del condominio al que pertenecerá la unidad
    SELECT organization_id INTO org_id
    FROM condominiums
    WHERE id = NEW.condominium_id;

    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Condominio no encontrado o sin organización asociada.';
    END IF;

    -- 2. Obtener el límite de unidades de la suscripción activa de esa organización
    -- Asumimos un límite base de 10 si no hay suscripción activa (o puedes cambiarlo a 0 para bloquear todo)
    SELECT COALESCE(MAX(unit_limit), 5) INTO sub_limit
    FROM subscriptions
    WHERE organization_id = org_id AND subscription_status = 'active';

    -- 3. Contar el número total de unidades registradas para esa organización (a través de todos sus condominios)
    SELECT COUNT(*) INTO current_count
    FROM units u
    JOIN condominiums c ON u.condominium_id = c.id
    WHERE c.organization_id = org_id;

    -- 4. Validar si al insertar esta nueva unidad se supera el límite
    IF current_count >= sub_limit THEN
        RAISE EXCEPTION 'Has alcanzado el máximo de unidades permitidas (%) de acuerdo a tu plan actual. Para seguir creciendo, te invitamos a mejorar tu suscripción.', sub_limit;
    END IF;

    -- Si todo está bien, permitir la inserción
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asegurarse de quitar un trigger anterior si existe
DROP TRIGGER IF EXISTS enforce_unit_limit_trigger ON units;

-- Crear el trigger que se ejecuta antes de cada INSERT en la tabla 'units'
CREATE TRIGGER enforce_unit_limit_trigger
BEFORE INSERT ON units
FOR EACH ROW
EXECUTE FUNCTION check_unit_limit_before_insert();
