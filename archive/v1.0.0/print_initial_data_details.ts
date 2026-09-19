import * as initial from './data/initialData';

console.log("================ INITIAL DATA INSPECTION ================");
console.log(`Customers (${initial.initialCustomers.length}):`);
initial.initialCustomers.forEach(c => {
  console.log(` - ID: ${c.id}, Name: ${c.name}, Phone: ${c.phone}, Stage: ${c.stage}, CompanyID: ${c.companyId}`);
});

console.log(`\nInquiries (${initial.initialInquiries.length}):`);
initial.initialInquiries.forEach(i => {
  console.log(` - ID: ${i.id}, CustomerID: ${i.customerId}, CustName: ${i.customerName}, Phone: ${i.customerPhone}, Date: ${i.date}, CompanyID: ${i.companyId}`);
});

console.log(`\nFollowUps (${initial.initialFollowUps.length}):`);
initial.initialFollowUps.forEach(f => {
  console.log(` - ID: ${f.id}, CustomerID: ${f.customerId}, Phone: ${f.customerPhone}, Date: ${f.date}, DueDate: ${f.dueDate}, Status: ${f.status}, CompanyID: ${f.companyId}`);
});

console.log(`\nQuotations (${initial.initialQuotations.length}):`);
initial.initialQuotations.forEach(q => {
  console.log(` - ID: ${q.id}, CustomerID: ${q.customerId}, CustName: ${q.customerName}, QuoteNo: ${q.quoteNumber}, Total: ${q.totalAmount}, Discount: ${q.discount}, Date: ${q.date}, Status: ${q.status}, CompanyID: ${q.companyId}`);
});

console.log(`\nContracts (${initial.initialContracts.length}):`);
initial.initialContracts.forEach(c => {
  console.log(` - ID: ${c.id}, CustomerID: ${c.customerId}, CustName: ${c.customerName}, ContractNo: ${c.contractNumber}, Value: ${c.totalValue}, Paid: ${c.paidAmount}, Date: ${c.date || c.signDate || c.createdAt}, Status: ${c.status}, RecordStatus: ${(c as any).recordStatus || 'none'}, CompanyID: ${c.companyId}`);
});

console.log(`\nSales (${initial.initialSales.length}):`);
initial.initialSales.forEach(s => {
  console.log(` - ID: ${s.id}, CustomerID: ${s.customerId}, CustName: ${s.customerName}, ContractID: ${s.contractId}, Amount: ${s.amount}, Date: ${s.date}, CompanyID: ${s.companyId}`);
});

console.log(`\nPayments/Collections (${initial.initialPayments.length}):`);
initial.initialPayments.forEach(p => {
  console.log(` - ID: ${p.id}, CustomerID: ${p.customerId}, CustName: ${p.customerName}, ContractID: ${p.contractId}, Amount: ${p.amount}, Date: ${p.date}, CompanyID: ${p.companyId}`);
});
