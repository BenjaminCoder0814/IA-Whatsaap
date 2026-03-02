// iaBrain.js

const estados = {}; // memória por callId

function getEstado(callId) {
  if (!estados[callId]) {
    estados[callId] = {
      etapa: "inicio",
      produto: null,
      volume: null,
      urgencia: false,
      objeção: null,
      perfil: "geral"
    };
    // Memória expira após 30 minutos
    setTimeout(() => {
      delete estados[callId];
    }, 1000 * 60 * 30);
  }
  return estados[callId];
}

const bancoObjeções = {
  preco: "Nosso valor reflete qualidade industrial certificada. Um lacre violado pode gerar prejuízo muito maior.",
  prazo: "Temos logística rápida e controle rigoroso de estoque.",
  fornecedor: "O que exatamente você sente que poderia melhorar no seu fornecedor atual?"
};

function detectarPerfil(mensagem) {
  const texto = mensagem.toLowerCase();
  if (texto.includes("revenda")) return "revendedor";
  if (texto.includes("transporte")) return "transportadora";
  return "geral";
}

function atualizarEstrategia(callId, novaEtapa) {
  if (estados[callId]) {
    estados[callId].etapa = novaEtapa;
  }
}

function gerarResposta(callId, mensagem) {
  const estado = getEstado(callId);
  const texto = mensagem.toLowerCase();
  estado.perfil = detectarPerfil(texto);

  // ETAPA 1 - Identificação de produto
  if (estado.etapa === "inicio") {
    if (texto.includes("graneleiro")) {
      estado.produto = "lacre graneleiro";
    }
    if (texto.includes("container")) {
      estado.produto = "lacre container";
    }
    estado.etapa = "qualificacao";
    return "Perfeito. Você vai utilizar esse lacre em qual tipo de operação e qual volume mensal aproximado?";
  }

  // ETAPA 2 - Qualificação de volume
  if (estado.etapa === "qualificacao") {
    estado.volume = mensagem;
    estado.etapa = "proposta";
    return "Entendido. Para esse volume conseguimos trabalhar com excelente custo-benefício mantendo nosso padrão de segurança e rastreabilidade. Você precisa de envio imediato?";
  }

  // ETAPA 3 - Urgência
  if (estado.etapa === "proposta") {
    if (texto.includes("urgente") || texto.includes("hoje")) {
      estado.urgencia = true;
      estado.etapa = "fechamento";
      return "Temos pronta entrega. Posso preparar o pedido agora mesmo para garantir envio imediato. Confirmo os dados para faturamento?";
    }
    estado.etapa = "fechamento";
    return "Posso montar uma proposta formal para você agora. Deseja que eu envie com os valores detalhados?";
  }

  // ETAPA 4 - Objeção de preço
  if (texto.includes("caro") || texto.includes("desconto")) {
    estado.objeção = "preco";
    return bancoObjeções.preco;
  }
  if (texto.includes("prazo")) {
    estado.objeção = "prazo";
    return bancoObjeções.prazo;
  }
  if (texto.includes("fornecedor")) {
    estado.objeção = "fornecedor";
    return bancoObjeções.fornecedor;
  }

  return "Perfeito. Me explique um pouco mais da sua necessidade para que eu possa te ajudar com precisão.";
}

module.exports = {
  gerarResposta,
  atualizarEstrategia
};
