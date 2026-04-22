-- Add iva_amount column to condo_expenses if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='condo_expenses' AND column_name='iva_amount') THEN
        ALTER TABLE condo_expenses ADD COLUMN iva_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;
