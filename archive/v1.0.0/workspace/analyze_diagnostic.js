const fs = require('fs');
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');

// Let us extract export const initialCustomers and initialContracts using a small script
// Or better, let us import/require after stripping TS types or inspecting via regex
console.log("Analyzing initialData.ts...");

// Let us count customers and contracts by matching id entries in initialCustomers and initialContracts
const custBlockMatch = content.match(/export const initialCustomers[\s\S]*?export const initialInquiries/);
const contBlockMatch = content.match(/export const initialContracts[\s\S]*?export const initialPayments/);
const salesBlockMatch = content.match(/export const initialSales[\s\S]*?export const initialInteractions/);
const oppBlockMatch = content.match(/export const initialOpportunities[\s\S]*?export const initialGuardianAlerts/);

console.log("Customer block found:", !!custBlockMatch);
console.log("Contract block found:", !!contBlockMatch);
console.log("Sales block found:", !!salesBlockMatch);
console.log("Opportunity block found:", !!oppBlockMatch);
