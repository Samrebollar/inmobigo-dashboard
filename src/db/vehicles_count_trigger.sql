-- AUTO-UPDATE VEHICLES COUNT
-- This script adds a 'vehicles_count' column to residents and keeps it in sync using a trigger.

BEGIN;

-- 1. Add column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='vehicles_count') THEN
        ALTER TABLE public.residents ADD COLUMN vehicles_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create Trigger Function
CREATE OR REPLACE FUNCTION update_resident_vehicles_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.residents
        SET vehicles_count = vehicles_count + 1
        WHERE id = NEW.resident_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.residents
        SET vehicles_count = GREATEST(0, vehicles_count - 1)
        WHERE id = OLD.resident_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_vehicle_change ON public.vehicles;

CREATE TRIGGER on_vehicle_change
AFTER INSERT OR DELETE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION update_resident_vehicles_count();

-- 4. Backfill existing counts (Just in case)
UPDATE public.residents r
SET vehicles_count = (
    SELECT COUNT(*) 
    FROM public.vehicles v 
    WHERE v.resident_id = r.id
);

COMMIT;
