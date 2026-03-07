-- NUCLEAR CASCADE FIX
-- This script automatically finds ALL foreign keys in the 'public' schema
-- and ensures they have 'ON DELETE CASCADE' enabled. 
-- This ensures that when a parent (like a Condominium) is deleted, 
-- EVERYTHING related (units, residents, invoices, charges, etc.) is cleaned up.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.table_schema, 
            tc.table_name, 
            kcu.column_name, 
            con.conname AS constraint_name,
            ccu.table_name AS referenced_table_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            JOIN pg_constraint AS con
              ON con.conname = tc.constraint_name
        WHERE 
            tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_schema = 'public'
            -- We avoid auth.users to be safe, although usually it's the other way around
            AND ccu.table_schema = 'public'
    ) LOOP
        -- Log the action
        RAISE NOTICE 'Updating constraint % on %.% (%) -> % (CASCADE)', 
                     r.constraint_name, r.table_schema, r.table_name, r.column_name, r.referenced_table_name;
        
        -- Drop the old constraint
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.table_schema, r.table_name, r.constraint_name);
        
        -- Add the new constraint with ON DELETE CASCADE
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE CASCADE', 
                       r.table_schema, r.table_name, r.constraint_name, r.column_name, r.referenced_table_name);
    END LOOP;
END $$;
