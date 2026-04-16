-- Phase 1: Schema Expansion for Smart Accounting v3
-- Adds support for Unit tracking, Status management, and Automation

-- 1. Alter financial_records to add new SaaS fields
ALTER TABLE financial_records 
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pagado' CHECK (status IN ('pendiente', 'pagado', 'vencido')),
ADD COLUMN IF NOT EXISTS es_recurrente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS frecuencia text CHECK (frecuencia IN ('mensual', 'semanal')),
ADD COLUMN IF NOT EXISTS dia_corte integer CHECK (dia_corte >= 1 AND dia_corte <= 31),
ADD COLUMN IF NOT EXISTS fecha_inicio date,
ADD COLUMN IF NOT EXISTS fecha_fin date;

-- 2. Automation Engine Function
-- This function can be called by a CRON job (pg_cron) or Edge Function
-- It looks for active recurrences whose 'dia_corte' matches today and haven't was generated yet this period
CREATE OR REPLACE FUNCTION process_recurring_financial_records()
RETURNS void AS $$
DECLARE
    rec RECORD;
    today_date DATE := CURRENT_DATE;
    today_day INTEGER := EXTRACT(DAY FROM CURRENT_DATE);
BEGIN
    FOR rec IN 
        SELECT * FROM financial_records 
        WHERE es_recurrente = true 
        AND (fecha_fin IS NULL OR fecha_fin >= today_date)
        AND fecha_inicio <= today_date
        AND dia_corte = today_day
        AND frecuencia = 'mensual'
    LOOP
        -- Simple check to avoid double generation in the same month
        -- We check if there's already a record for this org, unit, category and description in the same month
        IF NOT EXISTS (
            SELECT 1 FROM financial_records 
            WHERE organization_id = rec.organization_id 
            AND unit_id = rec.unit_id 
            AND category = rec.category 
            AND description = rec.description
            AND type = rec.type
            AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM today_date)
            AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM today_date)
            AND es_recurrente = false -- Don't match the template itself
        ) THEN
            INSERT INTO financial_records (
                organization_id, 
                user_id, 
                type, 
                amount, 
                category, 
                description, 
                date, 
                unit_id, 
                status, 
                es_recurrente
            ) VALUES (
                rec.organization_id,
                rec.user_id,
                rec.type,
                rec.amount,
                rec.category,
                rec.description,
                today_date,
                rec.unit_id,
                'pendiente', -- Generated charges are pending by default
                false -- The generated record is a simple record, not a template
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
