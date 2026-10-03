-- Fotos de los daños al retener un depósito en garantía (bucket privado; se
-- muestran con URLs firmadas al residente de la reserva y al equipo).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('amenity_damage_evidence', 'amenity_damage_evidence', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

ALTER TABLE amenity_reservations ADD COLUMN IF NOT EXISTS deposit_photo_paths TEXT[] NOT NULL DEFAULT '{}';
