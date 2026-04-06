
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function setup() {
    console.log("Setting up image_url column and bucket...");
    
    // We try to add the column. NOTE: This might fail if the user doesn't have an RPC for SQL.
    // However, we can try to use standard RPCs if they exist.
    // Alternative: We create a MIGRATION FILE for the user.
    
    const { error: colError } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url text;' 
    });
    
    if (colError) {
        console.warn("Could not add column via RPC (likely no exec_sql RPC). Please run this in Supabase SQL Editor: ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url text;");
    } else {
        console.log("Column image_url checked/added.");
    }
    
    // Storage Bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('announcements', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    });
    
    if (bucketError) {
        console.warn("Bucket might already exist or error:", bucketError.message);
    } else {
        console.log("Bucket 'announcements' created.");
    }
}

setup()
