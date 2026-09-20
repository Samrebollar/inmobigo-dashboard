-- La tarjeta "Políticas de Cobro y Facturación" del módulo de Configuración
-- (a nivel organización) se quitó porque estaba 100% desconectada — ninguna
-- función ni cron leía `organization_settings`. El usuario pidió recrearla
-- por propiedad, pero conectada de verdad esta vez, en Propiedades >
-- Configuración.
--
-- "Moneda" ya es real (condominiums.currency, fijada al crear la propiedad)
-- y "Recargo por mora" ya es real (settings_condominio + cron-service.ts).
-- Lo que faltaba por cablear es "Tipo de cobro" (mensual/bimestral/anual) y
-- "Generar cobros automáticos", que ahora controla de verdad el cron
-- /api/cron/generate-monthly-invoices.

ALTER TABLE settings_condominio
    ADD COLUMN IF NOT EXISTS tipo_cobro varchar(20) NOT NULL DEFAULT 'mensual'
        CHECK (tipo_cobro IN ('mensual', 'bimestral', 'anual')),
    ADD COLUMN IF NOT EXISTS generar_cobros_automaticos boolean NOT NULL DEFAULT true;
