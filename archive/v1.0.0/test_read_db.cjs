import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_secret_fen7yFNGihYfCuW2VJCf-Q__b-NnIlS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = ["users", "companies", "customers", "inquiries", "quotations", "contracts", "payments", "sales", "inspections", "interactions", "follow_ups"];
  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select("*", { count: "exact" });
    if (error) {
      console.log(`${table}: Error ${error.message}`);
    } else {
      console.log(`${table}: ${count || (data ? data.length : 0)} rows`);
      if (data && data.length > 0) {
        console.log(`  Sample ID of first row: ${data[0].id}`);
      }
    }
  }
}
run();
