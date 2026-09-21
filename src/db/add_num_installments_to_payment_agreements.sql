-- El residente elige cuántas cuotas quiere (3/6/9/12/18/24 meses) al
-- solicitar un convenio de pago, pero ese número nunca se guardaba en
-- ningún lado (solo quedaba mencionado en el texto libre de "Detalles del
-- Plan" si el residente no escribía uno propio). Además, cuando el admin
-- aprobaba un convenio, el código nunca generaba las cuotas
-- (agreement_installments) — ni siquiera existía forma de saber en cuántas
-- partes dividir la deuda. Esta columna guarda ese número para poder
-- generar el calendario real de cuotas al aprobar.

ALTER TABLE public.payment_agreements
    ADD COLUMN IF NOT EXISTS num_installments integer;

-- El residente ahora se suscribe en tiempo real a cambios de su convenio y
-- sus cuotas (para ver al instante cuando la administración aprueba/rechaza
-- o se generan las cuotas), pero ninguna de las dos tablas estaba agregada
-- a la publicación de Realtime de Supabase.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'payment_agreements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_agreements;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'agreement_installments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.agreement_installments;
    END IF;
END
$$;
