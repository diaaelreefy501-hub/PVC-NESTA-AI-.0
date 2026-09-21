
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://nzuadqnfoswrimfakdsv.supabase.co";
const supabaseKey = "sb_publishable_boNkcS0gqulm2IW_spGc-A_l1lEh8ky";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostic() {
  console.log("Fetching data from Supabase...");
  
  const { data: contracts, error: contErr } = await supabase.from('contracts').select('*');
  const { data: payments, error: payErr } = await supabase.from('payments').select('*');
  
  if (contErr || payErr) {
    console.error("Error fetching data:", contErr || payErr);
    return;
  }
  
  console.log(`Loaded ${contracts.length} contracts and ${payments.length} payments.`);
  
  const validContracts = contracts.filter(
    (c) => c.recordStatus !== "duplicate" && c.recordStatus !== "excluded" && c.status !== "cancelled"
  );
  
  const validPayments = payments.filter(
    (p) => p.recordStatus !== "duplicate" && p.recordStatus !== "excluded" && p.status !== "reversed" && p.status !== "refunded"
  );

  const totalContractValue = validContracts.reduce((sum, c) => sum + (Number(c.totalValue) || 0), 0);
  const totalPaymentValue = validPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const gap = totalContractValue - totalPaymentValue;
  
  const unlinkedPayments = validPayments.filter(p => !p.contractId);
  const unlinkedPaymentsValue = unlinkedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  console.log("\n=== RECONCILIATION RESULTS ===");
  console.log("Total Contracts (Valid):", validContracts.length);
  console.log("Total Contract Value:", totalContractValue.toLocaleString());
  console.log("Total Payments (Valid):", validPayments.length);
  console.log("Total Payment Value (Linked + Unlinked):", totalPaymentValue.toLocaleString());
  console.log("Difference (Gap):", gap.toLocaleString());
  console.log("Unlinked Payments Count:", unlinkedPayments.length);
  console.log("Unlinked Payments Value:", unlinkedPaymentsValue.toLocaleString());
  
  if (gap === 520000) {
    console.log("\nSUCCESS: Found the 520,000 EGP gap!");
  } else {
    console.log(`\nNOTE: Gap is ${gap.toLocaleString()}, not exactly 520,000.`);
  }

  // Check for contracts where totalValue !== paidAmount (as recorded in contract field)
  const contractsWithFieldGap = validContracts.filter(c => Math.abs((Number(c.totalValue) || 0) - (Number(c.paidAmount) || 0)) > 1);
  console.log("\nContracts with Internal Field Gap (totalValue !== paidAmount):", contractsWithFieldGap.length);
  
  // Check for unlinked payments
  if (unlinkedPayments.length > 0) {
    console.log("\nSample Unlinked Payments:");
    unlinkedPayments.slice(0, 5).forEach(p => console.log(`- Amount: ${p.amount}, Date: ${p.date}, Customer: ${p.customerName}`));
  }

  // Top 10 Gap Contracts (System vs Field)
  const topGaps = validContracts
    .map(c => {
      const contractPayments = validPayments.filter(p => p.contractId === c.id);
      const paid = contractPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        customerName: c.customerName,
        totalValue: Number(c.totalValue) || 0,
        paidInSystem: paid,
        paidInField: Number(c.paidAmount) || 0,
        gap: (Number(c.totalValue) || 0) - paid
      };
    })
    .filter(c => c.gap > 1)
    .sort((a, b) => b.gap - a.gap);

  console.log("\nTop 10 Contracts by Gap:");
  topGaps.slice(0, 10).forEach(c => {
    console.log(`- ${c.contractNumber} (${c.customerName}): Value ${c.totalValue}, Paid in System: ${c.paidInSystem}, Gap: ${c.gap}`);
  });
}

runDiagnostic();
