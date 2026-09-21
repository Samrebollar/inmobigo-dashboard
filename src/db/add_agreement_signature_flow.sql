-- Nuevo paso obligatorio en el flujo de Convenios de Pago: antes de la
-- aprobación final, la administración debe enviarle al residente el
-- archivo de convenio (el mismo subido en Propiedades > Configuración >
-- Archivo de Convenios) para que lo firme y lo vuelva a subir firmado.
--
-- Flujo de status en payment_agreements:
--   pending -> awaiting_signature -> pending_final_approval -> approved | rejected
--   (rejected también es alcanzable desde cualquiera de los tres primeros)

ALTER TABLE payment_agreements
    ADD COLUMN IF NOT EXISTS unsigned_document_url text,
    ADD COLUMN IF NOT EXISTS unsigned_document_sent_at timestamptz,
    ADD COLUMN IF NOT EXISTS signed_document_url text,
    ADD COLUMN IF NOT EXISTS signed_document_uploaded_at timestamptz;
