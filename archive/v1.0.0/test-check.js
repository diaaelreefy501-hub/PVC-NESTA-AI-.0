import fs from 'fs';
const dbStr = fs.readFileSync('src/data/initialData.ts', 'utf-8');
// Just manually check if there's any sale without contractId
const lines = dbStr.split('\n');
lines.forEach((l, i) => {
  if(l.includes('id: "sale-')) {
    console.log(lines.slice(i, i+10).join('\n'));
    console.log('---');
  }
});
