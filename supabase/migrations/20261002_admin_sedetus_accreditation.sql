-- Matriculación y Acreditación de Administrador Condominal (SEDETUS).
-- Requisito obligatorio tanto para empresas administradoras como para comités;
-- se muestra en la ficha pública del QR (/administrador/<token>).
ALTER TABLE admin_public_profiles ADD COLUMN IF NOT EXISTS sedetus_registration_number TEXT;
ALTER TABLE admin_public_profiles ADD COLUMN IF NOT EXISTS sedetus_holder_name TEXT;
ALTER TABLE admin_public_profiles ADD COLUMN IF NOT EXISTS sedetus_issue_date DATE;
ALTER TABLE admin_public_profiles ADD COLUMN IF NOT EXISTS sedetus_expiry_date DATE;
ALTER TABLE admin_public_profiles ADD COLUMN IF NOT EXISTS sedetus_document_url TEXT;
