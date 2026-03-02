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
  estado.historico.push({ cliente: mensagem, ts: Date.now() });

  // Gatilho para transferência
  if (gatilhosTransferencia.some(g => texto.includes(g))) {
    estado.etapa = "transferencia";
    estado.transferir = true;
    return "Vou direcionar você para um consultor especializado para dar sequência com mais precisão técnica.";
  }

  // Saudação estratégica
  if (estado.etapa === "saudacao") {
    estado.etapa = "diagnostico_operacao";
    return "Olá! Para indicar o lacre ideal, preciso entender sua operação. Você utiliza para transporte rodoviário, container, granel ou outro tipo?";
  }

  // Diagnóstico operação
  if (estado.etapa === "diagnostico_operacao") {
    if (/rodoviário|container|granel|baú|carreta|navio/.test(texto)) {
      estado.operacao = texto;
      estado.etapa = "diagnostico_volume";
      return "Qual o volume mensal aproximado de lacres que você utiliza?";
    }
    return "Para indicar o lacre ideal, preciso saber: sua operação é transporte rodoviário, container, granel ou outro tipo?";
  }

  // Diagnóstico volume
  if (estado.etapa === "diagnostico_volume") {
    const volumeMatch = texto.match(/\d+/);
    if (volumeMatch) {
      estado.volume = volumeMatch[0];
      estado.etapa = "diagnostico_urgencia";
      return "Essa demanda é para reposição imediata ou planejamento mensal?";
    }
    return "Qual o volume mensal aproximado de lacres que você utiliza?";
  }

  // Diagnóstico urgência
  if (estado.etapa === "diagnostico_urgencia") {
    if (/imediata|urgente|hoje|planejamento/.test(texto)) {
      estado.urgencia = texto;
      estado.etapa = "recomendacao_tecnica";
      return "Para esse tipo de operação e nesse volume, o modelo mais indicado é o Zenith Pro, por oferecer maior resistência e rastreabilidade.";
    }
    return "Essa demanda é para reposição imediata ou planejamento mensal?";
  }

  // Recomendação técnica
  if (estado.etapa === "recomendacao_tecnica") {
    estado.etapa = "pre_orcamento";
    return "Posso preparar uma cotação estruturada para você?";
  }

  // Pre-orçamento
  if (estado.etapa === "pre_orcamento") {
    if (/sim|ok|pode|quero/.test(texto)) {
      estado.etapa = "proposta";
      estado.proposta = true;
      return "Ótimo! Vou montar a proposta e enviar os detalhes técnicos e valores.";
    }
    return "Posso preparar uma cotação estruturada para você?";
  }

  // Proposta
  if (estado.etapa === "proposta") {
    return "Proposta enviada. Caso precise de ajuste ou tenha dúvidas técnicas, posso direcionar para um consultor especializado.";
  }

  // Controle de objeções
  if (/preço|valor/.test(texto)) {
    return "Consigo sim, mas para não te passar um valor incorreto preciso entender o volume mensal aproximado. Você utiliza em média quantas unidades por mês?";
  }
  if (/caro/.test(texto)) {
    return "Hoje você utiliza qual modelo e em qual volume? Em volumes maiores conseguimos otimizar custo unitário.";
  }

  // Base de conhecimento
  for (const item of baseConhecimento) {
    if (texto.includes(item.pergunta.toLowerCase())) {
      return item.resposta;
    }
  }

  // fallback: saudação estratégica
  estado.etapa = "saudacao";
  return DNA + "\nOlá! Para indicar o lacre ideal, preciso entender sua operação. Você utiliza para transporte rodoviário, container, granel ou outro tipo?";
}

module.exports = {
  gerarResposta,
  atualizarEstrategia: (callId, novaEtapa) => { if (estados[callId]) estados[callId].etapa = novaEtapa; }
};

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
