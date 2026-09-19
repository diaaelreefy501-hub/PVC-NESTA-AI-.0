import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Querying with publishable key...");
  const tables = ["users", "companies", "customers", "inquiries", "quotations", "contracts", "payments", "sales", "inspections", "interactions", "follow_ups"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.log(`  ${table}: Error ${error.code} - ${error.message}`);
    } else {
      console.log(`  ${table}: Success, loaded ${data ? data.length : 0} rows`);
    }
  }
}
run();
