-- Supabase marcaba 39 funciones SECURITY DEFINER ejecutables por anon (y por
-- cualquier usuario con sesión). Varias de reportes reciben un id de
-- condominio y devolvían datos financieros de cualquier organización sin
-- validar al usuario.

-- 1. Nadie sin sesión ejecuta funciones SECURITY DEFINER de public
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- 2. Funciones de disparadores: se ejecutan solas, nadie debe llamarlas
revoke execute on function public.check_unit_limit_before_insert() from authenticated;
revoke execute on function public.handle_automated_fund_deposit() from authenticated;
revoke execute on function public.handle_deleted_fund_transaction() from authenticated;
revoke execute on function public.handle_new_resident_profile() from authenticated;
revoke execute on function public.handle_new_resident_signup() from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.link_resident_on_signup() from authenticated;
revoke execute on function public.update_resident_vehicles_count() from authenticated;

-- 3. Funciones de reportes que no usa la app y que, con un id de condominio,
--    devolvían datos de cualquier organización sin validar al usuario
revoke execute on function public.get_avg_income_per_unit(uuid, uuid) from authenticated;
revoke execute on function public.get_billing_summary(uuid) from authenticated;
revoke execute on function public.get_condominium_income_chart(uuid, uuid) from authenticated;
revoke execute on function public.get_income_potential(uuid, uuid) from authenticated;
revoke execute on function public.get_income_summary_6_months() from authenticated;
revoke execute on function public.get_month_income() from authenticated;
revoke execute on function public.get_month_income(uuid, uuid) from authenticated;
revoke execute on function public.get_occupancy_rate(uuid, uuid) from authenticated;
revoke execute on function public.get_recent_invoices(uuid) from authenticated;
revoke execute on function public.get_total_condominiums() from authenticated;
revoke execute on function public.get_total_debt(uuid, uuid) from authenticated;
revoke execute on function public.get_total_delinquent_residents() from authenticated;
revoke execute on function public.get_total_delinquent_residents(uuid, uuid) from authenticated;
revoke execute on function public.get_total_occupied_units() from authenticated;
revoke execute on function public.get_total_residents() from authenticated;
revoke execute on function public.get_total_residents(uuid) from authenticated;
revoke execute on function public.get_total_units() from authenticated;
revoke execute on function public.get_total_units(uuid) from authenticated;
revoke execute on function public.process_recurring_financial_records() from authenticated;

-- Se mantienen para authenticated: las usadas en políticas RLS
-- (can_access_condominium, check_is_org_admin, get_my_org_id, get_user_org_id),
-- las del panel que ya filtran por la organización del usuario
-- (get_morosidad, get_tasa_cobranza, get_total_deuda, get_total_ingresos,
-- get_income_summary_year) y ayudantes sobre el propio usuario.
