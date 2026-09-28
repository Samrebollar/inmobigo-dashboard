-- Cortesías: periodos gratis otorgados por InmobiGo a un prospecto, con un
-- plan completo (p. ej. CORPORATE PLUS, 400 unidades) como si lo hubiera
-- pagado. Se registran como suscripción activa con payment_provider =
-- 'cortesia' y $0 pagado. Al vencer siguen la regla normal: suspensión,
-- avisos y eliminación a los 30 días sin pago. Si el cliente contrata antes,
-- el webhook de Mercado Pago cierra la cortesía y respeta los días restantes.

alter table public.subscriptions add column if not exists notes text;

create or replace function public.grant_courtesy_subscription(
    p_email text,
    p_plan text,
    p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user uuid;
    v_org uuid;
    v_org_name text;
    v_price numeric;
    v_units integer;
    v_start timestamptz := now();
    v_end timestamptz;
    v_sub uuid;
    v_note text;
begin
    -- Mismos precios y límites que src/app/api/subscriptions/create/route.ts
    select price, units into v_price, v_units from (values
        ('CORE', 1199, 20), ('PLUS', 2499, 60), ('ELITE', 4499, 120),
        ('CORPORATE', 6999, 250), ('CORPORATE PLUS', 9999, 400)
    ) as plans(name, price, units) where name = upper(p_plan);
    if v_price is null then
        return jsonb_build_object('ok', false, 'error', 'Plan no válido: ' || p_plan);
    end if;

    select id into v_user from auth.users where lower(email) = lower(trim(p_email));
    if v_user is null then
        return jsonb_build_object('ok', false, 'error', 'No existe una cuenta con ese correo; el cliente debe registrarse primero');
    end if;

    select o.id, o.name into v_org, v_org_name from organizations o
    where o.owner_id = v_user order by o.created_at desc limit 1;
    if v_org is null then
        select ou.organization_id, o.name into v_org, v_org_name from organization_users ou
        join organizations o on o.id = ou.organization_id
        where ou.user_id = v_user order by ou.created_at desc limit 1;
    end if;
    if v_org is null then
        return jsonb_build_object('ok', false, 'error', 'El cliente aún no completa el alta de su organización');
    end if;

    v_end := v_start + make_interval(days => p_days);
    v_note := format('Cortesía %s días otorgada por InmobiGo el %s — plan %s (%s unidades), vence el %s',
        p_days,
        to_char(v_start at time zone 'America/Mexico_City', 'DD/MM/YYYY'),
        upper(p_plan), v_units,
        to_char(v_end at time zone 'America/Mexico_City', 'DD/MM/YYYY'));

    -- Cualquier suscripción activa previa queda reemplazada por la cortesía
    update subscriptions set subscription_status = 'expired', canceled_at = v_start at time zone 'UTC'
    where organization_id = v_org and subscription_status = 'active';

    insert into subscriptions (
        organization_id, user_id, plan_name, price, unit_limit, billing_cycle,
        status, subscription_status, payment_provider, amount_paid, currency,
        start_date, last_payment_date, next_payment_date, notes
    ) values (
        v_org, v_user, upper(p_plan), v_price, v_units, 'monthly',
        'trial', 'active', 'cortesia', 0, 'MXN',
        (v_start at time zone 'America/Mexico_City')::date, v_start at time zone 'UTC', v_end at time zone 'UTC', v_note
    ) returning id into v_sub;

    update organizations set
        plan = upper(p_plan),
        units_limit = v_units,
        subscription_status = 'active',
        trial_ends_at = v_end at time zone 'UTC',
        next_billing_date = v_end at time zone 'UTC'
    where id = v_org;

    return jsonb_build_object('ok', true, 'organizacion', v_org_name, 'organization_id', v_org,
        'suscripcion', v_sub, 'vence', v_end, 'nota', v_note);
end;
$$;

revoke all on function public.grant_courtesy_subscription(text, text, integer) from public, anon, authenticated;
grant execute on function public.grant_courtesy_subscription(text, text, integer) to service_role;
