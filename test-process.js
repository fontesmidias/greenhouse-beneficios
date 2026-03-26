async function test() {
  try {
    console.log("1. Mocking payload...");
    const payload = {
      records: [
        { NOME: "João Teste QA", CPF: "11122233344", VA_VALOR_DIARIO: 46.38, VT_VALOR_DIARIO: 11, DIAS_UTEIS: 22, DIAS_DESCONTO: 1 }
      ]
    };
    
    console.log("2. Fetching /api/process...");
    const res = await fetch('http://localhost:3000/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log("-> Response Status:", res.status);
    console.log("-> Response Body:", text);
    
  } catch(e) {
    console.error("❌ Test failed exception:", e);
  }
}
test();
