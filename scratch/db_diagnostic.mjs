import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
)

async function diagnostic() {
  console.log('--- DIAGNÓSTICO DE ESQUEMA ---')
  
  // Verificar Organizaciones
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('*').limit(1)
  if (orgError) {
    console.error('Error en Organizaciones:', orgError.message)
  } else if (orgs && orgs.length > 0) {
    console.log('Columnas en organizations:', Object.keys(orgs[0]))
  } else {
    console.log('No hay datos en organizations para inferir columnas.')
  }

  // Verificar Perfiles
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*').limit(1)
  if (profError) {
    console.error('Error en Perfiles:', profError.message)
  } else if (profiles && profiles.length > 0) {
    console.log('Columnas en profiles:', Object.keys(profiles[0]))
  }

  console.log('--- FIN ---')
}

diagnostic()
