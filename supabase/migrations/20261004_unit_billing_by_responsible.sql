-- Cobro por responsable de la unidad (etapa 2).
--
-- Si se da de alta a un residente real en una unidad marcada como
-- "desocupada", la unidad pasa a "vive el propietario": así se le sigue
-- facturando al residente (comportamiento de siempre) en lugar de quedar
-- esperando un propietario capturado. El registro de cobro del propietario
-- (role = 'propietario_no_residente') no cuenta como ocupante.

CREATE OR REPLACE FUNCTION units_mark_occupied_on_resident()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.unit_id IS NOT NULL
       AND COALESCE(NEW.role, '') <> 'propietario_no_residente'
       AND COALESCE(NEW.status, 'active') <> 'inactive' THEN
        UPDATE units SET occupancy_type = 'propietario'
        WHERE id = NEW.unit_id AND occupancy_type = 'desocupada';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_units_mark_occupied_on_resident ON residents;
CREATE TRIGGER trg_units_mark_occupied_on_resident
AFTER INSERT OR UPDATE OF unit_id, status ON residents
FOR EACH ROW EXECUTE FUNCTION units_mark_occupied_on_resident();
