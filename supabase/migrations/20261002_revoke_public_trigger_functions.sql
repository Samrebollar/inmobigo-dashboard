-- Las funciones de trigger SECURITY DEFINER no deben poder llamarse por la API
-- (/rest/v1/rpc). Los triggers siguen funcionando: Postgres no revisa EXECUTE
-- al dispararlos. No se borra ni modifica ninguna función ni trigger.
revoke execute on function public.cancel_unpaid_invoices_of_resident() from public, anon, authenticated;
revoke execute on function public.fill_invoice_organization_id() from public, anon, authenticated;
