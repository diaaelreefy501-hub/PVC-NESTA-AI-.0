const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    console.log("=== PVC NESTA AI LIVE DATA AUDIT ===");
    
    // Fetch all records
    const { data: customers, error: errCustomers } = await supabase.from('customers').select('*');
    const { data: contracts, error: errContracts } = await supabase.from('contracts').select('*');
    const { data: opportunities, error: errOpportunities } = await supabase.from('opportunities').select('*');
    const { data: quotations, error: errQuotations } = await supabase.from('quotations').select('*');
    const { data: sales, error: errSales } = await supabase.from('sales').select('*');
    const { data: collections, error: errCollections } = await supabase.from('collections').select('*');
    const { data: followUps, error: errFollowUps } = await supabase.from('follow_ups').select('*');

    if (errCustomers) console.error("Customers Error:", errCustomers);
    if (errContracts) console.error("Contracts Error:", errContracts);
    if (errOpportunities) console.error("Opportunities Error:", errOpportunities);
    if (errQuotations) console.error("Quotations Error:", errQuotations);
    if (errSales) console.error("Sales Error:", errSales);
    if (errCollections) console.error("Collections Error:", errCollections);
    if (errFollowUps) console.error("FollowUps Error:", errFollowUps);

    console.log(`\n--- Actual Record Counts ---`);
    console.log(`Customers: ${customers?.length || 0}`);
    console.log(`Contracts: ${contracts?.length || 0}`);
    console.log(`Opportunities: ${opportunities?.length || 0}`);
    console.log(`Quotations: ${quotations?.length || 0}`);
    console.log(`Sales: ${sales?.length || 0}`);
    console.log(`Collections: ${collections?.length || 0}`);
    console.log(`Follow-Ups: ${followUps?.length || 0}`);

    // Check schema of Customer
    if (customers && customers.length > 0) {
      console.log(`\nCustomer Keys:`, Object.keys(customers[0]));
    }
    // Check schema of Contract
    if (contracts && contracts.length > 0) {
      console.log(`Contract Keys:`, Object.keys(contracts[0]));
    }
    // Check schema of Opportunity
    if (opportunities && opportunities.length > 0) {
      console.log(`Opportunity Keys:`, Object.keys(opportunities[0]));
    }

    // Calculate totals and inspect contracts
    if (contracts) {
      let activeContracts = contracts.filter(c => c.status !== 'excluded' && c.status !== 'deleted');
      console.log(`Active Contracts Count (Not excluded/deleted): ${activeContracts.length}`);
      let totalContractValue = activeContracts.reduce((sum, c) => sum + (c.totalValue || c.total_value || 0), 0);
      console.log(`Total Contract Value (Active): ${totalContractValue}`);

      // List all contracts with value
      console.log(`\nActive Contracts list:`);
      activeContracts.forEach(c => {
        console.log(`ID: ${c.id}, Num: ${c.contractNumber || c.contract_number}, CustID: ${c.customerId || c.customer_id}, Value: ${c.totalValue || c.total_value}, Status: ${c.status}, Date: ${c.date}`);
      });
    }

    // Analyze Opportunities Won vs Contracts
    if (opportunities && contracts) {
      const wonOpps = opportunities.filter(o => o.status === 'won' || o.stage === 'won' || o.stage === 'Contract signed' || o.status === 'Contract signed');
      console.log(`\nOpportunities with Won/Signed Status Count: ${wonOpps.length}`);
      wonOpps.forEach(o => {
        console.log(`Won Opp ID: ${o.id}, CustID: ${o.customerId || o.customer_id}, Value: ${o.value || o.amount}, Status: ${o.status || o.stage}`);
      });
    }

  } catch (err) {
    console.error("Audit Execution Failed:", err);
  }
}

run();
