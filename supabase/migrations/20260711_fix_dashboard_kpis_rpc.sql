-- Fix RPC functions for dashboard KPIs

-- 1. get_total_occupied_units: Count units that have at least one active resident
CREATE OR REPLACE FUNCTION public.get_total_occupied_units()
RETURNS TABLE(total_ocupadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT r.unit_id)::integer
    FROM 
        public.residents r
    WHERE 
        r.status = 'active'
        AND r.unit_id IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM public.condominiums c
            JOIN public.organization_users ou ON c.organization_id = ou.organization_id
            WHERE c.id = r.condominium_id
            AND ou.user_id = auth.uid()
        );
END;
$$;

-- 2. get_total_delinquent_residents: Calculate delinquent residents dynamically
CREATE OR REPLACE FUNCTION public.get_total_delinquent_residents()
RETURNS TABLE(total_morosos integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_day integer;
    v_start_of_month date;
    v_end_of_month date;
BEGIN
    v_current_day := EXTRACT(DAY FROM CURRENT_DATE)::integer;
    v_start_of_month := DATE_TRUNC('month', CURRENT_DATE)::date;
    v_end_of_month := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date;

    RETURN QUERY
    WITH user_condos AS (
        SELECT c.id, c.organization_id
        FROM public.condominiums c
        JOIN public.organization_users ou ON c.organization_id = ou.organization_id
        WHERE ou.user_id = auth.uid()
    ),
    active_res AS (
        -- Get all active residents in user's condominiums
        SELECT r.id, r.condominium_id, r.unit_id
        FROM public.residents r
        JOIN user_condos uc ON r.condominium_id = uc.id
        WHERE r.status = 'active'
    ),
    condos_with_invoices AS (
        -- Find which user condominiums have generated invoices for this month
        SELECT DISTINCT ri.condominium_id
        FROM public.resident_invoices ri
        JOIN user_condos uc ON ri.condominium_id = uc.id
        WHERE ri.invoice_type = 'maintenance'
          AND ri.due_date >= v_start_of_month
          AND ri.due_date <= v_end_of_month
    ),
    delinquent_by_invoice AS (
        -- Residents with unpaid overdue/pending invoices (current or past)
        SELECT DISTINCT ri.resident_id
        FROM public.resident_invoices ri
        JOIN active_res ar ON ri.resident_id = ar.id
        WHERE ri.status = 'overdue'
           OR (ri.status = 'pending' AND ri.due_date < CURRENT_DATE)
           OR (ri.invoice_type = 'maintenance' 
               AND ri.due_date >= v_start_of_month 
               AND ri.due_date <= v_end_of_month 
               AND v_current_day > 10 
               AND ri.status != 'paid' 
               AND ri.balance_due > 0)
    ),
    delinquent_by_projection AS (
        -- If day > 10 and no invoices generated for the condo, all active residents are delinquent
        SELECT ar.id
        FROM active_res ar
        WHERE v_current_day > 10
          AND ar.condominium_id NOT IN (SELECT condominium_id FROM condos_with_invoices)
    )
    SELECT 
        COUNT(DISTINCT d.id)::integer
    FROM (
        SELECT resident_id AS id FROM delinquent_by_invoice
        UNION
        SELECT id FROM delinquent_by_projection
    ) d;
END;
$$;
