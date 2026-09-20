-- El admin ahora puede subir el reglamento del condominio (PDF) desde
-- Propiedades > Configuración > Configuración General.

ALTER TABLE condominiums
    ADD COLUMN IF NOT EXISTS reglamento_url text,
    ADD COLUMN IF NOT EXISTS reglamento_uploaded_at timestamptz;
