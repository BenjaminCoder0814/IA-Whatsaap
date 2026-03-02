// Importa o cérebro estratégico
const { gerarResposta } = require("./iaBrain");
// Personalidade e contexto da IA
const promptBase = `
Você é ZENITH IA (Vendas), especialista em lacres industriais.
Seu objetivo é conduzir o cliente até o fechamento da venda.
Nunca dê desconto automaticamente.
Sempre pergunte volume e aplicação antes de passar preço.
Se o cliente demonstrar urgência, conduza para pedido imediato.
Tom de voz: profissional, seguro, técnico, direto.
`;

const estilo = `
Responda de forma clara, segura e estratégica.
Seja objetivo.
Evite textos longos demais.
Use persuasão baseada em autoridade e experiência.
`;

// Controle de estágio por callId
const estagios = {};

function classificarIntencao(texto) {
  const t = texto.toLowerCase();
  if (t.includes("preço") || t.includes("valor")) return "preco";
  if (t.includes("prazo")) return "prazo";
  if (t.includes("catálogo")) return "catalogo";
  if (t.includes("quantidade") || t.includes("volume")) return "volume";
  if (t.includes("desconto")) return "desconto";
  if (t.includes("outro fornecedor")) return "concorrente";
  return "geral";
}

function gerarRespostaComercial(callId, texto) {
  // Inicializa estágio se não existir
  if (!estagios[callId]) {
    estagios[callId] = { etapa: "qualificacao", produto: null, volume: null };
  }
  const intencao = classificarIntencao(texto);
  let resposta = "";
  switch (intencao) {
    case "preco":
      resposta = "Antes de passar o preço, poderia informar a aplicação e o volume aproximado?";
      estagios[callId].etapa = "preco";
      break;
    case "prazo":
      resposta = "Qual a urgência do seu pedido? Assim consigo te ajudar melhor.";
      estagios[callId].etapa = "prazo";
      break;
    case "catalogo":
      resposta = "Posso te enviar nosso catálogo digital. Qual produto você procura?";
      estagios[callId].etapa = "catalogo";
      break;
    case "volume":
      resposta = "Ótimo! Qual a aplicação do lacre? Precisa para caminhão, container ou outro uso?";
      estagios[callId].volume = texto.match(/\d+/)?.[0] || null;
      estagios[callId].etapa = "volume";
      break;
    case "desconto":
      resposta = "Trabalhamos sempre com qualidade e segurança. O diferencial Zenith é o suporte técnico e entrega rápida.";
      estagios[callId].etapa = "desconto";
      break;
    case "concorrente":
      resposta = "Nossos lacres têm certificação e garantia. Posso te mostrar os diferenciais técnicos?";
      estagios[callId].etapa = "concorrente";
      break;
    default:
      resposta = "Me conte um pouco mais sobre sua necessidade para eu te ajudar da melhor forma.";
      estagios[callId].etapa = "qualificacao";
  }
  return `${promptBase}\n${estilo}\n${resposta}`;
}
// Helper fetchWithTimeout
let fetch;
try {
  fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
} catch (err) {
  console.error('Dependência node-fetch ausente. Adicione ao package.json.');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  options.signal = controller.signal;
  try {
    const response = await fetch(url, options);
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function sendMessageIhelp(numero, mensagem) {
  try {
    const response = await fetchWithTimeout('https://api.ihelpchat.com/api/v2/customers/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.IHELP_TOKEN}`,
      },
      body: JSON.stringify({
        texto: mensagem,
        canalId: process.env.IHELP_CANAL_ID,
        contato: numero,
        messageType: 0,
      }),
    });
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    console.log('IA respondeu');
    return await response.json();
  } catch (err) {
    console.error('Erro ao enviar mensagem IHELP:', err);
    return null;
  }
}

// Função para checar se há humano ativo
async function temHumanoAtivo(callId) {
  try {
    const response = await fetchWithTimeout(`${process.env.IHELP_API_BASE}/api/v2/customers/${callId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.IHELP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const data = await response.json();
    if (data?.dados?.atendimentoUsuarios?.length > 0) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro ao consultar atendimento:', err);
    return false;
  }
}

// Proteção contra flood
const floodCache = new Map(); // callId -> timestamp
function isFlood(callId) {
  const now = Date.now();
  const last = floodCache.get(callId);
  if (last && now - last < 3000) return true;
  floodCache.set(callId, now);
  return false;
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware para logar todas requisições
app.use((req, res, next) => {
  console.log("HTTP", req.method, req.url);
  next();
});
const PORT = process.env.PORT || 3000;

// Validação de variáveis obrigatórias
if (!process.env.IHELP_TOKEN || !process.env.IHELP_CANAL_ID || !process.env.IHELP_IA_USER_ID || !process.env.IHELP_API_BASE) {
  console.error('❌ Variáveis obrigatórias ausentes no .env. Verifique IHELP_TOKEN, IHELP_CANAL_ID, IHELP_IA_USER_ID, IHELP_API_BASE.');
}
const DATA_DIR = path.join(__dirname, 'data', 'conversas');
const IHELP_TOKEN = process.env.IHELP_TOKEN || process.env.IHELP_API_TOKEN; // mantém compat com nome antigo
const IHELP_CANAL_ID = process.env.IHELP_CANAL_ID;
const IHELP_IA_USER_ID = process.env.IHELP_IA_USER_ID;
// Usar apenas apiv3.ihelpchat.com

fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const attendanceCache = new Map(); // callId -> { hasHuman: boolean, ts: number }

function extractMessageAndPhone(body) {
  let mensagem = body?.mensagem ?? body?.message ?? body?.text ?? body?.input ?? body?.cliente?.mensagem;
  if (!mensagem) {
    try {
      mensagem = JSON.stringify(body);
    } catch (err) {
      mensagem = String(body);
    }
  }

  let telefone = body?.telefone ?? body?.phone ?? body?.from ?? body?.contact ?? body?.cliente?.telefone ?? 'desconhecido';

  return {
    mensagem: typeof mensagem === 'string' ? mensagem : String(mensagem),
    telefone: typeof telefone === 'string' ? telefone : 'desconhecido',
  };
}

function responder(mensagemBruta) {
  const normalizeText = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const textoNormalizado = normalizeText(mensagemBruta);

  if (textoNormalizado.includes('preco') || textoNormalizado.includes('valor')) {
    return 'Para enviar a cotação, me informe CNPJ, cidade/UF e volume aproximado de lacres.';
  }

  if (textoNormalizado.includes('lacre') && textoNormalizado.includes('caminhao')) {
    return 'Temos lacres para caminhão. É graneleiro, baú ou carreta?';
  }

  if (textoNormalizado.includes('container') || textoNormalizado.includes('navio')) {
    return 'Recomendo lacre para container. Qual o destino e a urgência do embarque?';
  }

  return 'Me diga a aplicação do lacre e a quantidade aproximada para eu ajudar.';
}


function normalizeNumber(num) {
  return String(num || '').replace(/\D/g, '');
}

function extractTextFromPayload(body) {
  // iHelp payload pode variar; tente chaves comuns e caia para JSON.
  const candidates = [
    body?.message?.text,
    body?.message?.body,
    body?.message?.content,
    body?.mensagem,
    body?.message,
    body?.text,
    body?.input,
    body?.cliente?.mensagem,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  try {
    return JSON.stringify(body);
  } catch (err) {
    return String(body);
  }
}

function isCacheFresh(entry) {
  if (!entry) return false;
  const TEN_SECONDS = 10 * 1000;
  return Date.now() - entry.ts < TEN_SECONDS;
}

async function hasHumanInAttendance(callId) {
  if (!callId) return false;

  if (!IHELP_TOKEN) {
    console.warn('IHELP_TOKEN não configurado; assumindo que não há humano no atendimento.');
    return false;
  }

  const cached = attendanceCache.get(callId);
  if (isCacheFresh(cached)) {
    return cached.hasHuman;
  }

  try {
    const resp = await fetch(IHELP_API_CUSTOMER(callId), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${IHELP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      console.error('Erro ao consultar atendimento iHelp', resp.status, resp.statusText);
      attendanceCache.set(callId, { hasHuman: false, ts: Date.now() });
      return false;
    }

    const data = await resp.json();
    const usuarios = data?.dados?.atendimentoUsuarios || data?.dados?.atendimento?.usuarios || [];
    const hasHuman = Array.isArray(usuarios)
      ? usuarios.some((u) => u?.id && String(u.id) !== String(IHELP_IA_USER_ID))
      : false;

    attendanceCache.set(callId, { hasHuman, ts: Date.now() });
    return hasHuman;
  } catch (err) {
    console.error('Falha ao checar humanos no atendimento', err);
    attendanceCache.set(callId, { hasHuman: false, ts: Date.now() });
    return false;
  }
}

function loadHistory(telefone) {
  const filePath = path.join(DATA_DIR, `${telefone}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      // Se o arquivo estiver corrompido, reinicia o histórico
      return { telefone, historico: [] };
    }
  }
  return { telefone, historico: [] };
}

function saveHistory(telefone, historico) {
  const filePath = path.join(DATA_DIR, `${telefone}.json`);
  const payload = { telefone, historico: historico.slice(-20) };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

app.get('/', (req, res) => {
  res.send('Zenith IA online ✅');
});

app.post('/ihelp', async (req, res) => {
  try {
    const { event, message } = req.body;

    if (event !== "MessageReceive") {
      return res.status(200).json({ ok: true });
    }
    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const { callId, fromMe, messageType, texto, whatsAppNumber } = message;

    if (fromMe) {
      return res.status(200).json({ ok: true });
    }
    if (messageType !== "Text") {
      return res.status(200).json({ ok: true });
    }
    if (!texto || !whatsAppNumber) {
      return res.status(200).json({ ok: true });
    }

    console.log("Mensagem recebida:", texto);

    // Proteção contra flood
    if (isFlood(callId)) {
      console.log('Flood detectado, ignorando callId:', callId);
      return res.status(200).json({ ok: true });
    }

    // Bloqueio se humano ativo
    if (await temHumanoAtivo(callId)) {
      console.log('Humano ativo, IA não respondeu');
      return res.status(200).json({ ok: true });
    }

    // Gerar resposta e enviar
    try {
      const resposta = gerarResposta(callId, texto);
      await sendMessageIhelp(whatsAppNumber, resposta);
      console.log('IA respondeu:', resposta);
    } catch (err) {
      console.error('Erro ao responder via IA:', err);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.status(200).json({ ok: true });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
