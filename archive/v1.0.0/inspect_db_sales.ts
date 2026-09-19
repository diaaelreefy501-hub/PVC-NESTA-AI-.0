import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_secret_fen7yFNGihYfCuW2VJCf-Q__b-NnIlS";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching sales from database...");
  const { data: sales, error: sErr } = await supabase.from("sales").select("*");
  if (sErr) return console.error(sErr);
  
  console.log(`Loaded ${sales.length} sales rows.`);
  const uniqueSalesCustIds = new Set(sales.map(s => s.customerId).filter(Boolean));
  console.log(`Unique Customer IDs in Sales: ${uniqueSalesCustIds.size}`);
  
  const sampleSales = sales.slice(0, 5);
  console.log("Sample Sales rows:");
  sampleSales.forEach((s, idx) => {
    console.log(`  ${idx+1}. ID: ${s.id}, CustomerId: ${s.customerId}, Name: ${s.customerName}, Amount: ${s.amount}, CompanyId: ${s.companyId}`);
  });

  console.log("\nFetching interactions from database...");
  const { data: interactions, error: iErr } = await supabase.from("interactions").select("*");
  if (iErr) return console.error(iErr);

  console.log(`Loaded ${interactions.length} interactions rows.`);
  const uniqueInteractionsCustIds = new Set(interactions.map(i => i.customerId).filter(Boolean));
  console.log(`Unique Customer IDs in Interactions: ${uniqueInteractionsCustIds.size}`);

  const sampleInteractions = interactions.slice(0, 5);
  console.log("Sample Interactions rows:");
  sampleInteractions.forEach((i, idx) => {
    console.log(`  ${idx+1}. ID: ${i.id}, CustomerId: ${i.customerId}, Type: ${i.type}, Notes: ${i.notes ? i.notes.substring(0, 50) + "..." : "none"}`);
  });

  // Let's check intersection
  const intersection = [...uniqueSalesCustIds].filter(id => uniqueInteractionsCustIds.has(id));
  console.log(`\nIntersection of Customer IDs between Sales and Interactions: ${intersection.length} matching IDs.`);
}
run();
