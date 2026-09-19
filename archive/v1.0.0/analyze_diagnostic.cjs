const fs = require('fs');
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');

// Let us count objects in initialContracts by searching for id:
const contractLines = content.split('\n').filter(l => l.includes('totalValue:'));
console.log("Contract totalValue lines:", contractLines.length);

let sum = 0;
contractLines.forEach(l => {
  const match = l.match(/totalValue:\s*([0-9,\.]+)/);
  if (match) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    sum += val;
  }
});
console.log("Sum of totalValues from lines:", sum);
