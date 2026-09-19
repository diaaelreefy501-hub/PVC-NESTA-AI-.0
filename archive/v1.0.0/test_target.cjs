const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: companies } = await supabase.from('companies').select('*');
  console.log("Companies Target:");
  companies.forEach(c => console.log(c.name, c.monthly_target));
  
  const { data: sales } = await supabase.from('sales').select('*');
  let totalSales = sales.reduce((acc, s) => acc + (s.amount || 0), 0);
  console.log("Total Sales:", totalSales);
}
check();
