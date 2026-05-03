-- Update role_type enum to include missing roles
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'admin_condominio';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'admin_propiedad';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'security';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'resident';
ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'tenant';
