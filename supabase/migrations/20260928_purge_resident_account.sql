-- Eliminación de la cuenta de un residente desde su panel. Sin respaldo:
-- no se puede deshacer.
--
-- Se borra su cuenta de acceso y su información personal de la App
-- (avisos, pases, reservas, mensajes, mascotas, vehículos, historial de
-- WhatsApp...). NO se borran su registro de residente ni su estado de cuenta
-- (facturas, pagos, convenios): son la contabilidad del condominio y deben
-- quedar con la administración (si no, un moroso podría borrar su deuda).
-- El registro de residente solo se desvincula de la cuenta.
--
-- Solo aplica a cuentas de residente: si el usuario es dueño o miembro del
-- equipo de una organización, o admin de la plataforma, no se toca.
--
-- p_dry_run = true (default) simula todo y regresa los conteos sin borrar nada.
create or replace function public.purge_resident_account(p_user uuid, p_dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_residents uuid[];
    v_phones text[];
    v_detail text;
    v_res jsonb := '{}'::jsonb;
    n bigint;
begin
    if not exists (select 1 from auth.users where id = p_user) then
        return jsonb_build_object('ok', false, 'error', 'La cuenta no existe');
    end if;

    if exists (select 1 from organizations where owner_id = p_user)
        or exists (select 1 from organization_users where user_id = p_user)
        or exists (select 1 from platform_admins where user_id = p_user)
        or exists (select 1 from profiles where id = p_user and role_new::text in ('owner', 'admin_condominio', 'admin_propiedad', 'security', 'super_admin')) then
        return jsonb_build_object('ok', false, 'error', 'Esta cuenta administra una organización; no se puede eliminar desde el panel de residente');
    end if;

    select coalesce(array_agg(id), '{}') into v_residents from residents where user_id = p_user;

    -- Conversaciones de WhatsApp (si el teléfono no es de otro residente)
    select coalesce(array_agg(distinct r.phone), '{}') into v_phones from residents r
        where r.id = any(v_residents) and r.phone is not null
          and not exists (select 1 from residents o where o.phone = r.phone and not (o.id = any(v_residents)));

    begin
        -- Información personal de la App
        delete from announcement_views where user_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('announcement_views', n); end if;
        delete from amenity_reservations where resident_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('amenity_reservations', n); end if;
        delete from visitor_passes where resident_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('visitor_passes', n); end if;
        delete from package_alerts where resident_id = p_user or resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('package_alerts', n); end if;
        delete from transport_notices where resident_id = p_user or resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('transport_notices', n); end if;
        delete from incidents where user_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('incidents', n); end if;
        delete from service_requests where user_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('service_requests', n); end if;
        delete from marketplace_items where seller_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('marketplace_items', n); end if;
        delete from resident_messages where resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('resident_messages', n); end if;
        delete from pets where resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('pets', n); end if;
        delete from vehicles where resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('vehicles', n); end if;
        delete from n8n_chat_histories where session_id = any(v_phones);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('n8n_chat_histories', n); end if;
        delete from memoria_chat where telefono = any(v_phones);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('memoria_chat', n); end if;

        -- La contabilidad se queda con la administración, sin ligarla a la cuenta
        update invoices set user_id = null where user_id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('facturas_conservadas', n); end if;
        update residents set user_id = null where id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('registro_residente_desvinculado', n); end if;

        -- La cuenta (el perfil cae en cascada)
        delete from auth.users where id = p_user;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('usuarios', n); end if;

        if p_dry_run then
            raise exception using errcode = 'IGDRY', message = 'dry_run', detail = v_res::text;
        end if;
    exception when sqlstate 'IGDRY' then
        get stacked diagnostics v_detail = pg_exception_detail;
        return jsonb_build_object('ok', true, 'dry_run', true, 'usuario', p_user, 'borraria', v_detail::jsonb);
    end;

    return jsonb_build_object('ok', true, 'dry_run', false, 'usuario', p_user, 'borrado', v_res);
end;
$$;

revoke all on function public.purge_resident_account(uuid, boolean) from public, anon, authenticated;
grant execute on function public.purge_resident_account(uuid, boolean) to service_role;
