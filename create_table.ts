import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function setup() {
  const query = `
    CREATE TABLE IF NOT EXISTS public.cash_registers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
        condominium_name TEXT NOT NULL,
        expected_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        counted_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        difference NUMERIC(10,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own org's cash registers" ON public.cash_registers;
    CREATE POLICY "Users can view their own org's cash registers" 
        ON public.cash_registers FOR SELECT 
        USING (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can insert their own org's cash registers" ON public.cash_registers;
    CREATE POLICY "Users can insert their own org's cash registers" 
        ON public.cash_registers FOR INSERT 
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_users WHERE user_id = auth.uid()));
  `;
  
  // Actually we need to run this via RPC if we want it executed directly, 
  // or we can use standard REST insert to see if the table exists, if not we'll need the user to run it in SQL editor.
  // We can't execute DDL over standard REST unless there's an RPC for it.
  
  console.log('SQL to run:\n', query);
}

setup().catch(console.error);
