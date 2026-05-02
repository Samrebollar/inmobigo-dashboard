-- Add credit_amount to residents table
ALTER TABLE public.residents 
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(10, 2) DEFAULT 0;

-- Optional: Comment for clarity
COMMENT ON COLUMN public.residents.credit_amount IS 'Saldo a favor del residente (independiente de la deuda)';
