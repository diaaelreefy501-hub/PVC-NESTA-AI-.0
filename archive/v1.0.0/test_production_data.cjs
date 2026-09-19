const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nzuadqnfoswrimfakdsv.supabase.co',
  'sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky'
);

async function runTests() {
  console.log("Fetching Companies...");
  const { data: companies, error: compErr } = await supabase.from('companies').select('*');
  if (compErr) return console.error(compErr);
  
  if (!companies || companies.length === 0) {
    console.log("No companies found in database.");
    return;
  }
  
  console.log(`Found ${companies.length} companies.`);
  const comp1 = companies[0];
  const comp2 = companies.length > 1 ? companies[1] : companies[0];
  
  console.log(`\nSelected Companies for Test:`);
  console.log(`1. ${comp1.name} (ID: ${comp1.id})`);
  console.log(`2. ${comp2.name} (ID: ${comp2.id})`);

  console.log("\nFetching Customers...");
  const { data: customers, error: custErr } = await supabase.from('customers').select('*');
  if (custErr) return console.error(custErr);
  
  const custComp1 = customers.filter(c => c.companyId === comp1.id);
  const custComp2 = customers.filter(c => c.companyId === comp2.id);
  const orphanCustomers = customers.filter(c => !c.companyId);
  
  console.log(`Customers in ${comp1.name}: ${custComp1.length}`);
  console.log(`Customers in ${comp2.name}: ${custComp2.length}`);
  console.log(`Orphan Customers: ${orphanCustomers.length}`);
  
  if (custComp1.length > 0) {
    console.log(`Sample Customer from ${comp1.name}: ${custComp1[0].name} - Region: ${custComp1[0].area}`);
  }

  console.log("\nFetching Sales...");
  const { data: sales, error: salesErr } = await supabase.from('sales').select('*');
  
  const salesComp1 = sales ? sales.filter(s => s.companyId === comp1.id) : [];
  const salesComp2 = sales ? sales.filter(s => s.companyId === comp2.id) : [];
  
  console.log(`Sales in ${comp1.name}: ${salesComp1.length}`);
  console.log(`Sales in ${comp2.name}: ${salesComp2.length}`);
}

runTests();
