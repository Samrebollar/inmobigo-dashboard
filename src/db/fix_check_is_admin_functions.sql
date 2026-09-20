-- Fix: check_is_org_admin() y check_is_any_admin() comparaban role_new (enum
-- app_role) contra 'admin', un valor que NUNCA existió en ese enum (solo
-- existía en la columna de texto vieja profiles.role). Postgres truena al
-- intentar convertir 'admin' al tipo app_role, sin importar el rol real del
-- usuario — esto rompe CUALQUIER consulta que dispare la política RLS
-- "org_users_manage_policy" de organization_users (por ejemplo, el SELECT de
-- Control Operativo sobre "tickets", que revisa la membresía de organización
-- del usuario).
--
-- Valores válidos de app_role: super_admin, admin_condominio, admin_propiedad,
-- resident, tenant, security, staff, accountant, owner.

CREATE OR REPLACE FUNCTION public.check_is_org_admin(target_org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
    WHERE user_id = auth.uid()
    AND organization_id = target_org_id
    AND role_new IN ('owner', 'admin_condominio', 'admin_propiedad')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_is_any_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_users
    WHERE user_id = auth.uid()
    AND role_new IN ('owner', 'admin_condominio', 'admin_propiedad')
  );
END;
$function$;
