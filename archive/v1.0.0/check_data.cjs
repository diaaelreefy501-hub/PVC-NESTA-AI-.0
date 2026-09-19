const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nzuadqnfoswrimfakdsv.supabase.co';
const supabaseKey = 'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const comp = await supabase.from('companies').select('*');
  console.log('Companies:', comp.data?.length, 'Error:', comp.error?.message);
  
  const cust = await supabase.from('customers').select('id');
  console.log('Customers:', cust.data?.length, 'Error:', cust.error?.message);
}
check();
