
// iaBrain.js enxuto e sem break/case/switch inválido
const estados = new Map();

function getEstado(callId) {
  if (!estados.has(callId)) {
    estados.set(callId, {
      etapa: "inicio",
      tipoOperacao: null,
      volume: null,
      urgencia: null,
    });
  }
  return estados.get(callId);
}

function normalizarTexto(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function classificarOperacao(txt) {
  if (txt.includes("graneleiro") || txt.includes("grao") || txt.includes("granel")) return "graneleiro";
  if (txt.includes("container") || txt.includes("navio")) return "container";
  if (txt.includes("caminhao") || txt.includes("rodovi")) return "rodoviario";
  if (txt.includes("malote")) return "malote";
  return "nao_definido";
}

function extrairNumero(txt) {
  const m = txt.match(/\d{2,}/); // pega 2+ dígitos
  return m ? parseInt(m[0], 10) : null;
}

function gerarResposta(callId, textoCliente) {
  try {
    const estado = getEstado(callId);
    const txt = normalizarTexto(textoCliente);

    // Captura operação
    if (!estado.tipoOperacao || estado.tipoOperacao === "nao_definido") {
      const op = classificarOperacao(txt);
      if (op !== "nao_definido") estado.tipoOperacao = op;
    }

    // Captura volume
    if (!estado.volume) {
      const vol = extrairNumero(txt);
      if (vol) estado.volume = vol;
    }

    // Etapas
    if (estado.etapa === "inicio") {
      estado.etapa = "operacao";
      return "Para eu indicar o lacre ideal, você utiliza em qual operação: rodoviário, graneleiro ou container?";
    }

    if (estado.etapa === "operacao") {
      if (!estado.tipoOperacao || estado.tipoOperacao === "nao_definido") {
        return "Entendi. É para rodoviário, graneleiro ou container?";
      }
      estado.etapa = "volume";
      return "Perfeito. Qual o volume mensal aproximado de lacres que você utiliza?";
    }

    if (estado.etapa === "volume") {
      if (!estado.volume) {
        return "Certo. Me passa uma estimativa de volume mensal (ex: 200, 500, 1000) para eu te orientar corretamente.";
      }
      estado.etapa = "urgencia";
      return "Essa demanda é para reposição imediata ou planejamento mensal?";
    }

    if (estado.etapa === "urgencia") {
      estado.urgencia = txt.includes("urg") || txt.includes("hoje") || txt.includes("imediat") ? "imediata" : "planejada";
      estado.etapa = "proposta";
      return `Ótimo. Para ${estado.tipoOperacao} e volume ~${estado.volume}/mês, consigo te orientar no modelo ideal. Posso preparar uma cotação estruturada agora?`;
    }

    // proposta
    return "Perfeito. Me confirme: sua operação é rodoviário, graneleiro ou container, e o volume mensal aproximado?";
  } catch (err) {
    console.error("IA_BRAIN_ERROR", err);
    return "Perfeito. Para eu te ajudar com precisão: qual a aplicação do lacre e o volume mensal aproximado?";
  }
}

module.exports = { gerarResposta, getEstado };


