const http = require('http');

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testAll() {
  console.log("=== 1. Test /api/gemini/intake ===");
  try {
    const r1 = await post('/api/gemini/intake', {
      text: "عميل اسمه أحمد ممدوح من التجمع الخامس مهتم بقطاع بي في سي 4 شبابيك، تليفونه 01012345678"
    });
    console.log("Intake:", r1.status, r1.body.substring(0, 150));
  } catch (e) {
    console.error("Intake err:", e.message);
  }

  console.log("\n=== 2. Test /api/gemini/execute-command ===");
  try {
    const r2 = await post('/api/gemini/execute-command', {
      userMessage: "حول عملاء شركة نيو هاوس إلى حالة تعاقد"
    });
    console.log("Execute Command:", r2.status, r2.body);
  } catch (e) {
    console.error("Execute Command err:", e.message);
  }
}

testAll();
