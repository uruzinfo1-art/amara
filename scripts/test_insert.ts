import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('movimientos').insert([{ tipo: 'gasto_fijo_config', monto: 0, categoria: 'test', descripcion: 'test', fecha: new Date().toISOString() }]);
  console.log(error ? error.message : "SUCCESS");
}
test();
