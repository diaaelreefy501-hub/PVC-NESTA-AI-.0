import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCapacity() {
  const tables = [
    "companies", "users", "customers", "inquiries", "follow_ups", 
    "quotations", "contracts", "sales", "payments", "inspections", 
    "interactions", "products", "opportunities", "tasks"
  ];

  console.log("Fetching row counts...");
  
  let totalRows = 0;
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`Table: ${table} - Count: 0 (Error or RLS)`);
    } else {
      console.log(`Table: ${table} - Count: ${count}`);
      totalRows += (count || 0);
    }
  }
  console.log(`Total Rows: ${totalRows}`);
}

checkCapacity();
