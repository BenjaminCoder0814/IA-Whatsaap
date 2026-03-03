require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { gerarResposta } = require("./iaBrain");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ====== ENV ======
const PORT = process.env.PORT || 8080;
const IHELP_TOKEN = process.env.IHELP_TOKEN;
const IHELP_CANAL_ID = process.env.IHELP_CANAL_ID;
const IHELP_IA_USER_ID = String(process.env.IHELP_IA_USER_ID || "");
const IHELP_API_BASE_SEND = process.env.IHELP_API_BASE_SEND || "https://api.ihelpchat.com";
const IHELP_API_BASE_V3 = process.env.IHELP_API_BASE_V3 || "https://apiv3.ihelpchat.com";

// ====== Guardrails ======
process.on("uncaughtException", (err) => console.error("UNCAUGHT:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED:", err));

// ====== Log Middleware ======
app.use((req, res, next) => {
  console.log("HTTP", req.method, req.url);
  next();
});

// ====== Health Check ======
app.get("/", (req, res) => {
  res.send("Zenith IA online ✅");
});

// ====== Flood Protection ======
const floodCache = new Map();
function isFlood(callId) {
  const now = Date.now();
  const last = floodCache.get(callId);
  if (last && now - last < 3000) return true;
  floodCache.set(callId, now);
  return false;
}

// ====== Fetch Helper ======
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    console.error("fetch error:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ====== Verifica se há humano ======
async function temHumanoAtivo(callId) {
  if (!callId) return false;

  try {
    const resp = await fetchWithTimeout(
      `${IHELP_API_BASE_V3}/api/v2/customers/${callId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${IHELP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!resp || !resp.ok) return false;

    const data = await resp.json();
    const usuarios = data?.dados?.atendimentoUsuarios || [];

    return Array.isArray(usuarios)
      ? usuarios.some((u) => String(u.id) !== IHELP_IA_USER_ID)
      : false;
  } catch (err) {
    console.error("Erro ao consultar atendimento:", err.message);
    return false;
  }
}

// ====== Enviar mensagem ======
async function sendMessageIhelp(numero, mensagem) {
  try {
    const resp = await fetchWithTimeout(
      `${IHELP_API_BASE_V3}/api/v2/customers/send-message`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${IHELP_TOKEN}`,
        },
        body: JSON.stringify({
          texto: mensagem,
          canalId: IHELP_CANAL_ID,
          contato: numero,
          messageType: 0,
        }),
      }
    );

    if (!resp) {
      console.error("Falha ao enviar mensagem");
      return;
    }

    const data = await resp.text();
    console.log("Resposta IHELP:", data);
  } catch (err) {
    console.error("Erro envio IHELP:", err.message);
  }
}

// ====== WEBHOOK ======
app.post("/ihelp", async (req, res) => {
  try {
    const { event, message } = req.body || {};

    if (event !== "MessageReceive") return res.json({ ok: true });
    if (!message) return res.json({ ok: true });

    const { callId, fromMe, messageType, texto, whatsAppNumber } = message;

    if (fromMe) return res.json({ ok: true });
    if (messageType !== "Text") return res.json({ ok: true });
    if (!texto || !whatsAppNumber) return res.json({ ok: true });

    console.log("Mensagem recebida:", texto);

    if (isFlood(callId)) {
      console.log("Flood detectado");
      return res.json({ ok: true });
    }

    if (await temHumanoAtivo(callId)) {
      console.log("Humano ativo, IA não responde");
      return res.json({ ok: true });
    }

    const resposta = gerarResposta(callId, texto);

    await sendMessageIhelp(whatsAppNumber, resposta);

    console.log("IA respondeu:", resposta);

    return res.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook:", err);
    return res.json({ ok: true });
  }
});

// ====== (Sanitização extra) Remover qualquer break solto ======
// (Não existe break solto neste arquivo, mas esta linha garante que não há lixo estrutural)
// Se você encontrar break; aqui, APAGUE IMEDIATAMENTE.

// ====== Start ======
app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});


