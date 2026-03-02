// testWebhook8080.js
// Testa o endpoint /ihelp na porta 8080 via Node.js

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

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/ihelp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Resposta:', body);
  });
});

req.on('error', (e) => {
  console.error('Erro no teste:', e.message);
});

req.write(data);
req.end();
