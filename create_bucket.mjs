import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createBucketInit() {
  console.log('Intentando crear bucket "amenity_rules"...');
  
  // Create bucket
  const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('amenity_rules', {
    public: true,
  });
  
  if (bucketError) {
    if (bucketError.message.includes('already exists') || bucketError.message.includes('Duplicate')) {
       console.log('El bucket ya existía.');
    } else {
       console.error('Error al crear bucket:', bucketError);
       return;
    }
  } else {
    console.log('✅ Bucket "amenity_rules" creado exitosamente:', bucketData);
  }

  // Double check bucket status
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const rulesBucket = buckets.find(b => b.name === 'amenity_rules');
  
  if (rulesBucket) {
    console.log('✅ Bucket verificado y listo para usar. Es público:', rulesBucket.public);
  }
}

createBucketInit();
