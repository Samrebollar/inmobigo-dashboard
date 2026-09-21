-- El admin ahora puede subir el formato/archivo de convenio de pago (PDF)
-- desde Propiedades > Configuración > Configuración General, igual que el
-- reglamento del condominio. Reutiliza el mismo bucket de storage
-- (condominium_documents), cuyas políticas de RLS ya permiten subir/leer/
-- reemplazar/eliminar cualquier archivo dentro del bucket.

ALTER TABLE condominiums
    ADD COLUMN IF NOT EXISTS convenio_url text,
    ADD COLUMN IF NOT EXISTS convenio_uploaded_at timestamptz;
