import { 
  initialCustomers, 
  initialInquiries, 
  initialFollowUps, 
  initialQuotations, 
  initialContracts, 
  initialPayments, 
  initialSales, 
  initialInteractions, 
  initialInspections 
} from "./src/data/initialData";

console.log("--- Initial Data Counts from initialData.ts ---");
console.log("Customers:", initialCustomers.length);
console.log("Inquiries:", initialInquiries.length);
console.log("FollowUps:", initialFollowUps.length);
console.log("Quotations:", initialQuotations.length);
console.log("Contracts:", initialContracts.length);
console.log("Payments:", initialPayments.length);
console.log("Sales:", initialSales.length);
console.log("Interactions:", initialInteractions.length);
console.log("Inspections:", initialInspections.length);

const contractInteractions = initialInteractions.filter(i => i.type === "contract");
console.log("Contract Interactions:", contractInteractions.length);
console.log("Non-Contract Interactions:", initialInteractions.length - contractInteractions.length);
