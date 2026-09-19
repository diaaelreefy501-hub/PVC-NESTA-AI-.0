const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('companies').select('*');
  console.log('Select Error:', error);
}
test();
