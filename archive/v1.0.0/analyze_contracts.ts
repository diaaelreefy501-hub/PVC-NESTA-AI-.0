import * as initial from './data/initialData';

console.log("=== CONTRACTS RELATIONAL AUDIT ===");
const customers = initial.initialCustomers;
const contracts = initial.initialContracts;
const opportunities = (initial as any).initialOpportunities || [];

console.log(`Total Initial Contracts: ${contracts.length}`);

contracts.forEach(c => {
  const customer = customers.find(cust => cust.id === c.customerId);
  const opportunity = opportunities.find((o: any) => o.id === (c as any).opportunityId || o.customerId === c.customerId);
  
  console.log(`\nContract No: ${c.contractNumber} (ID: ${c.id})`);
  console.log(` - Customer ID: ${c.customerId} (${customer ? 'Found: ' + customer.name : 'ORPHAN - NOT FOUND'})`);
  console.log(` - Opportunity ID: ${(c as any).opportunityId || (opportunity ? 'Found linked via CustID: ' + opportunity.id : 'None')}`);
  console.log(` - Total Value: ${c.totalValue} ج.م`);
  console.log(` - Sign Date / Event Date: ${c.signDate || c.date || 'None'}`);
  console.log(` - Created At: ${c.createdAt}`);
  console.log(` - Company ID: ${c.companyId}`);
  console.log(` - Status: ${c.status}`);
});

const linkedContractsCount = contracts.filter(c => customers.some(cust => cust.id === c.customerId)).length;
const orphanContractsCount = contracts.length - linkedContractsCount;

console.log(`\nSummary:`);
console.log(` - Contracts linked to active customers: ${linkedContractsCount}`);
console.log(` - Contracts that cannot be linked to a customer (Orphans): ${orphanContractsCount}`);
