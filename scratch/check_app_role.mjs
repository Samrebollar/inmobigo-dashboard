import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
)

async function checkAppRole() {
  console.log('--- BUSCANDO VALORES DEL ENUM app_role ---')
  
  // Intentar técnica de error provocado para ver valores permitidos en el mensaje de error de PG
  const { error } = await supabase.from('organization_users').insert({ 
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy
      organization_id: '00000000-0000-0000-0000-000000000000', // Dummy
      role_new: 'cargo_falso_de_prueba' 
  })
  
  if (error) {
    console.error('Mensaje de error:', error.message)
    console.error('Sugerencia (HINT):', error.hint)
  } else {
    console.log('Inserción exitosa (inesperado)');
  }
}

checkAppRole()
