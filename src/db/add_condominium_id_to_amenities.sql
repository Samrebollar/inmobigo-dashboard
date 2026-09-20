-- Las "Amenidades" (Alberca, Gimnasio, Salón de Fiestas, etc.) vivían como un
-- catálogo a nivel ORGANIZACIÓN (amenities.organization_id), es decir,
-- compartido por todos los condominios/propiedades de la cuenta. El usuario
-- pidió que cada propiedad configure sus propios espacios según su propia
-- operación, así que se agrega condominium_id para poder escopar cada
-- amenidad a UN condominio específico.
--
-- Es nullable a propósito: las amenidades ya existentes (organization_id-only,
-- creadas antes de este cambio) se quedan con condominium_id = NULL y se
-- siguen mostrando a todos los residentes de la organización (comportamiento
-- histórico, sin romper nada). Las amenidades nuevas que se creen desde
-- Propiedades → Configuración sí llevan su condominium_id, y solo se muestran
-- a los residentes de ESE condominio.

ALTER TABLE amenities
    ADD COLUMN IF NOT EXISTS condominium_id uuid REFERENCES condominiums(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_amenities_condominium_id ON amenities(condominium_id);
