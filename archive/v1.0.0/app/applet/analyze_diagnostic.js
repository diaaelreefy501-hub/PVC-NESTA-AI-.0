const fs = require('fs');
const content = fs.readFileSync('src/data/initialData.ts', 'utf8');
console.log("File loaded successfully. Length:", content.length);
