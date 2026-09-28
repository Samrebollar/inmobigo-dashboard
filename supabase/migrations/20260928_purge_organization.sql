-- Eliminación definitiva de una organización (cuenta del administrador) y
-- todos los datos de sus residentes, incluida la bitácora. Se usa al día 31
-- sin pago de la suscripción. Sin respaldo: no se puede deshacer.
--
-- Los usuarios que también pertenecen a OTRA organización (residente en otro
-- condominio, miembro u owner de otra organización, admin de la plataforma)
-- NO se borran: su perfil se mueve a la otra organización.
--
-- p_dry_run = true (default) simula todo y regresa los conteos sin borrar nada.
create or replace function public.purge_organization(p_org uuid, p_dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_condos uuid[];
    v_units uuid[];
    v_residents uuid[];
    v_users uuid[];
    v_keep uuid[];
    v_phones text[];
    v_name text;
    v_detail text;
    v_res jsonb := '{}'::jsonb;
    n bigint;
begin
    select name into v_name from organizations where id = p_org;
    if not found then
        return jsonb_build_object('ok', false, 'error', 'La organización no existe');
    end if;

    select coalesce(array_agg(id), '{}') into v_condos from condominiums where organization_id = p_org;
    select coalesce(array_agg(id), '{}') into v_units from units where organization_id = p_org or condominium_id = any(v_condos);
    select coalesce(array_agg(id), '{}') into v_residents from residents where condominium_id = any(v_condos) or unit_id = any(v_units);

    select coalesce(array_agg(distinct uid), '{}') into v_users from (
        select id as uid from profiles where organization_id = p_org
        union select user_id from organization_users where organization_id = p_org
        union select user_id from residents where id = any(v_residents)
        union select owner_id from organizations where id = p_org
    ) x where uid is not null;

    select coalesce(array_agg(distinct uid), '{}') into v_keep from (
        select r.user_id as uid from residents r join condominiums c on c.id = r.condominium_id
            where r.user_id = any(v_users) and c.organization_id <> p_org
        union select user_id from organization_users where user_id = any(v_users) and organization_id <> p_org
        union select owner_id from organizations where owner_id = any(v_users) and id <> p_org
        union select user_id from platform_admins where user_id = any(v_users)
    ) k where uid is not null;

    v_users := array(select unnest(v_users) except select unnest(v_keep));

    -- Conversaciones de WhatsApp de sus residentes (si el teléfono no es de otro residente)
    select coalesce(array_agg(distinct r.phone), '{}') into v_phones from residents r
        where r.id = any(v_residents) and r.phone is not null
          and not exists (select 1 from residents o where o.phone = r.phone and not (o.id = any(v_residents)));

    begin
        -- Los usuarios que se conservan pasan a su otra organización
        update profiles p set organization_id = coalesce(
            (select c.organization_id from residents r join condominiums c on c.id = r.condominium_id
                where r.user_id = p.id and c.organization_id <> p_org limit 1),
            (select ou.organization_id from organization_users ou where ou.user_id = p.id and ou.organization_id <> p_org limit 1),
            (select o.id from organizations o where o.owner_id = p.id and o.id <> p_org limit 1))
        where p.id = any(v_keep) and p.organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('perfiles_conservados', n); end if;

        -- Tablas sin borrado en cascada (o con NO ACTION) primero
        delete from announcement_views where announcement_id in (select id from announcements where organization_id = p_org) or user_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('announcement_views', n); end if;
        delete from announcements where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('announcements', n); end if;
        delete from amenity_reservations where organization_id = p_org or resident_id = any(v_users) or unit_id = any(v_units)
            or amenity_id in (select id from amenities where organization_id = p_org or condominium_id = any(v_condos));
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('amenity_reservations', n); end if;
        delete from amenities where organization_id = p_org or condominium_id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('amenities', n); end if;
        delete from benefit_reward_payments where organization_id = p_org or referrer_organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_reward_payments', n); end if;
        delete from benefit_referrals where organization_id = p_org or referrer_organization_id = p_org or referred_organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_referrals', n); end if;
        delete from benefit_referral_codes where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_referral_codes', n); end if;
        delete from benefit_training_progress where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_training_progress', n); end if;
        delete from benefit_trainings where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_trainings', n); end if;
        delete from benefit_training_categories where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('benefit_training_categories', n); end if;
        delete from incidents where organization_id = p_org or unit_id = any(v_units) or user_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('incidents', n); end if;
        delete from marketplace_items where organization_id = p_org or seller_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('marketplace_items', n); end if;
        delete from service_requests where organization_id = p_org or unit_id = any(v_units) or user_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('service_requests', n); end if;
        delete from resident_complaints where organization_id = p_org or condominium_id = any(v_condos)
            or reporter_resident_id = any(v_residents) or subject_resident_id = any(v_residents) or subject_unit_id = any(v_units);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('resident_complaints', n); end if;
        delete from reserve_fund where organization_id = p_org or condominium_id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('reserve_fund', n); end if;
        delete from payment_links where condominium_id = any(v_condos)
            or agreement_installment_id in (select ai.id from agreement_installments ai where ai.resident_id = any(v_residents));
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('payment_links', n); end if;
        delete from payment_accounts where condominium_id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('payment_accounts', n); end if;
        delete from invoices where organization_id = p_org or condominium_id = any(v_condos) or resident_id = any(v_residents)
            or unit_id = any(v_units) or user_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('invoices', n); end if;
        delete from payment_agreements where resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('payment_agreements', n); end if;
        delete from package_alerts where organization_id = p_org or unit_id = any(v_units) or resident_id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('package_alerts', n); end if;
        delete from resident_monthly_charges where organization_id = p_org or condominium_id = any(v_condos) or resident_id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('resident_monthly_charges', n); end if;
        delete from organization_settings where organization_id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('organization_settings', n); end if;
        delete from settings_condominio where condominio_id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('settings_condominio', n); end if;
        delete from charge_templates where condominium_id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('charge_templates', n); end if;
        delete from transport_notices where organization_id = p_org or unit_id = any(v_units);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('transport_notices', n); end if;
        delete from visitor_passes where organization_id = p_org or resident_id = any(v_users) or unit_id = any(v_units);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('visitor_passes', n); end if;
        delete from n8n_chat_histories where session_id = any(v_phones);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('n8n_chat_histories', n); end if;
        delete from memoria_chat where telefono = any(v_phones);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('memoria_chat', n); end if;

        -- Núcleo: el resto cae en cascada (cargos, pagos, mascotas, tickets, bitácora...)
        delete from residents where id = any(v_residents);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('residents', n); end if;
        delete from condominiums where id = any(v_condos);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('condominiums', n); end if;
        delete from units where id = any(v_units);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('units', n); end if;
        delete from organizations where id = p_org;
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('organizations', n); end if;
        delete from auth.users where id = any(v_users);
        get diagnostics n = row_count; if n > 0 then v_res := v_res || jsonb_build_object('usuarios', n); end if;

        if p_dry_run then
            -- Código propio para no confundir la simulación con otros errores
            raise exception using errcode = 'IGDRY', message = 'dry_run', detail = v_res::text;
        end if;
    exception when sqlstate 'IGDRY' then
        get stacked diagnostics v_detail = pg_exception_detail;
        return jsonb_build_object('ok', true, 'dry_run', true, 'organizacion', p_org, 'nombre', v_name, 'borraria', v_detail::jsonb);
    end;

    return jsonb_build_object('ok', true, 'dry_run', false, 'organizacion', p_org, 'nombre', v_name, 'borrado', v_res);
end;
$$;

revoke all on function public.purge_organization(uuid, boolean) from public, anon, authenticated;
