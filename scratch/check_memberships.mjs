import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
)

async function checkOrgUsers() {
  console.log('--- DIAGNÓSTICO ORGANIZATION_USERS ---')
  
  // Intentamos obtener una fila para ver las columnas
  const { data, error } = await supabase.from('organization_users').select('*').limit(1)
  
  if (error) {
    console.error('Error al acceder a la tabla:', error.message)
    console.error('Código:', error.code)
  } else if (data && data.length > 0) {
    console.log('Columnas encontradas:', Object.keys(data[0]))
  } else {
    console.log('La tabla está vacía. Intentando técnica de inspección por error...')
    const { error: insertError } = await supabase.from('organization_users').insert({ 
        non_existent_column_test: 'test' 
    })
    console.log('Mensaje de inspección:', insertError?.message)
  }
}

checkOrgUsers()
