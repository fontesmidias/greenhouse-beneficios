const fs = require('fs');

async function test() {
  console.log("1. Fetching Excel template from API...");
  try {
    const res1 = await fetch('http://localhost:3000/api/template');
    if (!res1.ok) throw new Error("Template API failed: " + res1.status);
    
    const buffer = await res1.arrayBuffer();
    fs.writeFileSync('test.xlsx', Buffer.from(buffer));
    console.log("-> Template downloaded and saved to test.xlsx.");

    console.log("2. Uploading the template to the Upload API...");
    const formData = new FormData();
    const blob = new Blob([Buffer.from(buffer)], { type: 'application/octet-stream' });
    formData.append('file', blob, 'test.xlsx');
    
    const res2 = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await res2.json();
    console.log("-> Server response:", result);
    
    if (result.success && result.count > 0) {
      console.log("✅ Q.A TEST PASSED!");
    } else {
      console.log("❌ Q.A TEST FAILED!");
    }
  } catch(e) {
    console.log("❌ Error:", e);
  }
}

test();
