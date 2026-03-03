
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

