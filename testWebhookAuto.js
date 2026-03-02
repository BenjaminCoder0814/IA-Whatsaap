// testWebhookAuto.js
// Testa o endpoint /ihelp nas portas 8080 e 3000 automaticamente

const http = require('http');

const data = JSON.stringify({
  event: "MessageReceive",
  message: {
    callId: "551199999999",
    fromMe: false,
    messageType: "Text",
    texto: "Quero preço do lacre graneleiro",
    whatsAppNumber: "551199999999"
  }
});

function testPort(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port,
      path: '/ihelp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ port, status: res.statusCode, body });
      });
    });
    req.on('error', (e) => {
      resolve({ port, error: e.message });
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  const results = await Promise.all([testPort(8080), testPort(3000)]);
  for (const result of results) {
    if (result.error) {
      console.log(`Porta ${result.port}: Erro - ${result.error}`);
    } else {
      console.log(`Porta ${result.port}: Status ${result.status}`);
      console.log(`Resposta: ${result.body}`);
    }
  }
})();
