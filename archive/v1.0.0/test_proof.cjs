require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTest() {
  console.log("=== 1. Initial State ===");
  let { data: initial, error: err1 } = await supabase
    .from('contracts')
    .select('id, contract_number, customer_id, company_id, total_value, date, created_at, status')
    .eq('id', 'ctr-nesta-255')
    .single();
  
  if (err1) console.error("Initial Error:", err1);
  console.log(initial);
  
  console.log("\n=== 2. Simulating UI Modification ===");
  // I will just print the steps as if the user is doing it or I can update it here
}

runTest();
