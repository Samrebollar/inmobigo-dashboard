-- ============================================================================
-- ESQUEMA DE BASE DE DATOS: Secuencia y función para Folios de Recibos
-- Tabla: payment_validations
-- ============================================================================

-- 1. Crear secuencia de folios si no existe
CREATE SEQUENCE IF NOT EXISTS public.payment_validations_folio_seq START WITH 100001;

-- 2. Agregar columna folio a payment_validations si no existe
ALTER TABLE public.payment_validations ADD COLUMN IF NOT EXISTS folio TEXT;

-- 3. Crear función plpgsql para asegurar o generar el folio exacto de un comprobante
CREATE OR REPLACE FUNCTION public.ensure_payment_validation_folio(p_validation_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_folio TEXT;
BEGIN
    -- Verificar si ya tiene folio asignado
    SELECT folio INTO v_folio
    FROM public.payment_validations
    WHERE id = p_validation_id;

    IF v_folio IS NOT NULL AND v_folio <> '' THEN
        RETURN v_folio;
    END IF;

    -- Generar y guardar folio único en la misma fila si está vacío
    UPDATE public.payment_validations
    SET folio = 'REC-' || nextval('public.payment_validations_folio_seq')::text
    WHERE id = p_validation_id AND (folio IS NULL OR folio = '')
    RETURNING folio INTO v_folio;

    -- Fallback si por alguna razón retornado fue NULL
    IF v_folio IS NULL THEN
        SELECT folio INTO v_folio
        FROM public.payment_validations
        WHERE id = p_validation_id;
    END IF;

    RETURN v_folio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
