const http = require('http');

const data = JSON.stringify({
  text: "عميل اسمه أحمد ممدوح من التجمع الخامس مهتم بقطاع بي في سي 4 شبابيك، تليفونه 01012345678"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/gemini/extract-lead',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Extract Response:", body);
  });
});

req.on('error', (e) => {
  console.error("Extract Request error:", e.message);
});

req.write(data);
req.end();
