-- Anticipos (excedente que queda como saldo a favor) se registran como pago
-- sin factura, para que cuenten en Ingresos del Mes y en el Corte de Caja.
alter table public.resident_invoice_payments alter column invoice_id drop not null;
comment on column public.resident_invoice_payments.invoice_id is 'Factura a la que se aplicó el pago. NULL = anticipo que quedó como saldo a favor del residente.';
