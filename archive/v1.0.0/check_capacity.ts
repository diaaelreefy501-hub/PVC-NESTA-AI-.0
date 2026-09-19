import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCapacity() {
  const tables = [
    "companies", "users", "customers", "inquiries", "follow_ups", 
    "quotations", "contracts", "sales", "payments", "inspections", 
    "interactions", "products", "opportunities", "tasks"
  ];

  console.log("Fetching row counts...");
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`Table: ${table} - Error/RLS restricted (or empty)`);
    } else {
      console.log(`Table: ${table} - Count: ${count}`);
    }
  }
}

checkCapacity();
