-- Reservas de amenidades sin empalmes.
--
-- booking_mode:
--   'exclusivo'  → se aparta el día completo (salón de fiestas, palapa, asador).
--                   Una reserva pendiente o aprobada ocupa la fecha.
--   'compartido' → uso compartido (gimnasio, alberca): no bloquea fechas.
ALTER TABLE amenities ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'exclusivo'
    CHECK (booking_mode IN ('exclusivo', 'compartido'));

UPDATE amenities SET booking_mode = 'compartido'
WHERE name ~* '(gym|gimnasio|alberca|piscina|pool|fitness)';

CREATE INDEX IF NOT EXISTS idx_ar_amenity_date ON amenity_reservations(amenity_id, reservation_date);

-- Garantía en la base de datos (aunque dos residentes reserven al mismo
-- tiempo): una amenidad exclusiva no puede tener dos reservas activas el
-- mismo día.
CREATE OR REPLACE FUNCTION amenity_reservations_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status NOT IN ('pending', 'approved') THEN
        RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM amenities WHERE id = NEW.amenity_id AND booking_mode = 'exclusivo') THEN
        RETURN NEW;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext(NEW.amenity_id::text || NEW.reservation_date::text));
    IF EXISTS (
        SELECT 1 FROM amenity_reservations
        WHERE amenity_id = NEW.amenity_id
          AND reservation_date = NEW.reservation_date
          AND status IN ('pending', 'approved')
          AND id <> NEW.id
    ) THEN
        RAISE EXCEPTION 'AMENITY_DATE_TAKEN' USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION amenity_reservations_prevent_overlap() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_amenity_reservations_prevent_overlap ON amenity_reservations;
CREATE TRIGGER trg_amenity_reservations_prevent_overlap
BEFORE INSERT OR UPDATE OF status, reservation_date, amenity_id ON amenity_reservations
FOR EACH ROW EXECUTE FUNCTION amenity_reservations_prevent_overlap();
