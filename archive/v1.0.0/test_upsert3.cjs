const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nzuadqnfoswrimfakdsv.supabase.co', 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky');

async function test() {
  const comp = { id: 'comp-test3', name: 'Test' };
  const { data, error } = await supabase.from('companies').insert([comp]).select();
  console.log('Insert company:', error);
}
test();
