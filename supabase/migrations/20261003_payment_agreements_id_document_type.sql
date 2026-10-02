-- Identificación con la que el residente acredita su firma en el convenio de
-- pago: INE (frente y reverso) o Pasaporte (página con fotografía y firma).
-- Las fotos siguen en el bucket privado resident_ine_documents; con pasaporte
-- solo se usa ine_front_path.
ALTER TABLE payment_agreements ADD COLUMN IF NOT EXISTS id_document_type TEXT NOT NULL DEFAULT 'ine'
    CHECK (id_document_type IN ('ine', 'pasaporte'));
