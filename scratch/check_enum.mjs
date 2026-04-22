import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
)

async function checkEnum() {
  console.log('--- BUSCANDO VALORES DEL ENUM ---')
  
  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: 'organization_type' })
  
  if (error) {
    // Si no existe el RPC, intentamos una consulta cruda a pg_enum si es posible, 
    // pero usualmente no podemos desde el cliente.
    // Usaremos un truco: intentar insertar un valor basura y ver el error de 'Permitted values are...'
    console.log('No se pudo usar RPC, intentando técnica de error provocado...')
    const { error: insertError } = await supabase.from('organizations').insert({ 
        name: 'Check', 
        type: 'valor_inexistente_de_prueba' 
    })
    console.error('Mensaje de error para identificar valores permitidos:', insertError?.message)
    console.error('Sugerencia:', insertError?.hint)
  } else {
    console.log('Valores permitidos:', data)
  }
}

checkEnum()
