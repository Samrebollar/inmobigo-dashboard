-- ==============================================
-- INMOBIGO SCRIPT: STORAGE Y COMPROBANTES
-- ==============================================

-- 1. Crear el bucket de Storage (si no existe)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('accounting_receipts', 'accounting_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar la subida pública para usuarios autenticados al bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'accounting_receipts');

-- 3. Habilitar la lectura pública para que las URLs del comprobante funcionen
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'accounting_receipts');

-- 4. Modificar la nueva tabla de gastos para soportar la URL
ALTER TABLE public.condo_expenses ADD COLUMN IF NOT EXISTS receipt_url text;
