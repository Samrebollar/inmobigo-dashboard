const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
);

async function run() {
  const { data: res } = await supabase.from('residents').select('id, condominium_id, unit_id').limit(1).single();
  const { data: condo } = await supabase.from('condominiums').select('organization_id').eq('id', res.condominium_id).single();
  
  const payload = {
    organization_id: condo.organization_id,
    condominium_id: res.condominium_id,
    unit_id: res.unit_id,
    resident_id: res.id,
    title: 'Prueba de Soporte Técnico',
    description: 'Descripción de prueba del sistema de mantenimiento.',
    priority: 'high',
    category: 'fuga', // Let's test spanish
    status: 'open',
    images: ['https://example.com/test_leak.jpg']
  };
  
  console.log("Attempting ticket insertion with Spanish category:", payload.category);
  const { data, error } = await supabase.from('tickets').insert(payload).select();
  
  if (error) {
    console.error("INSERT WITH SPANISH FAILED!", error);
    
    // Let's see if we omit category entirely
    console.log("Attempting ticket insertion OMITTING category...");
    delete payload.category;
    const { data: dataNoCat, error: errNoCat } = await supabase.from('tickets').insert(payload).select();
    if (errNoCat) {
        console.error("OMITTING CATEGORY FAILED AS WELL!", errNoCat);
    } else {
        console.log("OMITTING CATEGORY SUCCESSFUL! Default category was assigned:", dataNoCat[0].category);
        await supabase.from('tickets').delete().eq('id', dataNoCat[0].id);
    }
  } else {
    console.log("INSERT WITH SPANISH SUCCESSFUL!", data);
    await supabase.from('tickets').delete().eq('id', data[0].id);
  }
}

run();
