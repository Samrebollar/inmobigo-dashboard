-- Verificación de identidad para el convenio firmado: el residente ahora
-- sube, junto con el PDF firmado, una foto de su INE (frente y reverso)
-- para que la administración pueda corroborar que la firma corresponde a
-- su identificación oficial antes de aprobar.
--
-- La INE es un documento sensible — a diferencia del reglamento/convenio
-- (que viven en el bucket público condominium_documents), las fotos de
-- INE se guardan en un bucket PRIVADO nuevo. Solo se acceden via signed
-- URLs generadas por el servidor (getIneSignedUrlsAction), que primero
-- verifica que quien pide verlas sea el propio residente o staff de su
-- organización.

ALTER TABLE payment_agreements
    ADD COLUMN IF NOT EXISTS ine_front_path text,
    ADD COLUMN IF NOT EXISTS ine_back_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resident_ine_documents', 'resident_ine_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Convención de carpeta: {condominium_id}/{resident_id}/archivo.jpg

CREATE POLICY "Residentes suben su propia INE"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resident_ine_documents'
    AND ((storage.foldername(name))[2])::uuid IN (
        SELECT id FROM residents WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Residente y staff de su organización pueden ver la INE"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'resident_ine_documents'
    AND (
        ((storage.foldername(name))[2])::uuid IN (
            SELECT id FROM residents WHERE user_id = auth.uid()
        )
        OR ((storage.foldername(name))[1])::uuid IN (
            SELECT c.id FROM condominiums c
            JOIN organization_users ou ON ou.organization_id = c.organization_id
            WHERE ou.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Residentes reemplazan su propia INE"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'resident_ine_documents'
    AND ((storage.foldername(name))[2])::uuid IN (
        SELECT id FROM residents WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Residentes eliminan su propia INE"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'resident_ine_documents'
    AND ((storage.foldername(name))[2])::uuid IN (
        SELECT id FROM residents WHERE user_id = auth.uid()
    )
);
