import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_secret_fen7yFNGihYfCuW2VJCf-Q__b-NnIlS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // We can query the pg_tables view via RPC if we have an exec_sql rpc, but since we don't, 
  // let's try querying standard tables to see which ones return a 404 (doesn't exist) vs empty/success.
  const possibleTables = [
    "users", "companies", "customers", "inquiries", "quotations", 
    "contracts", "payments", "sales", "inspections", "interactions", 
    "follow_ups", "opportunities", "collections"
  ];
  
  for (const table of possibleTables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`Table '${table}': Error code ${error.code} - ${error.message}`);
    } else {
      console.log(`Table '${table}': Exists! Rows: ${data ? "available" : "none"}`);
    }
  }
}
run();
