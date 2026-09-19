const fs = require('fs');
let initialData = fs.readFileSync('src/data/initialData.ts', 'utf8');

function extractArray(name) {
  let match = initialData.match(new RegExp(`export const ${name}: [a-zA-Z\\[\\]]+ = \\[(\\s|\\S)*?\\n\\];`));
  if(match) return match[0];
  return null;
}

console.log("Sales count: ", extractArray('initialSales').match(/id:/g).length);
console.log("Contracts count: ", extractArray('initialContracts').match(/id:/g).length);
console.log("Opportunities count: ", extractArray('initialOpportunities') ? extractArray('initialOpportunities').match(/id:/g).length : "Not found");
console.log("Quotations count: ", extractArray('initialQuotations').match(/id:/g).length);
