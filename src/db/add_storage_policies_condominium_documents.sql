-- El bucket "condominium_documents" (Storage) ya existe y está marcado como
-- público, pero le faltan las políticas de RLS sobre storage.objects que
-- permiten subir/leer/reemplazar/borrar archivos ahí — por eso la subida del
-- reglamento fallaba aunque el bucket sí existiera. Mismo patrón que ya usan
-- los buckets amenity_rules/avatars/announcements en este proyecto.

CREATE POLICY "Permitir subida de reglamento a administradores"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'condominium_documents');

CREATE POLICY "Permitir lectura publica de reglamento"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'condominium_documents');

CREATE POLICY "Permitir actualizar reglamento"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'condominium_documents');

CREATE POLICY "Permitir eliminar reglamento"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'condominium_documents');
