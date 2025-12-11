import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
  creditType: string;
  message?: string;
}

interface ChatRequest {
  leadData: LeadData;
  messages: Message[];
  isFirstMessage: boolean;
}

// Armazenar contexto de conversas (em produção, usar Redis/banco de dados)
const conversationContext = new Map<string, {
  messageCount: number;
  hasAskedAboutValue: boolean;
  hasAskedAboutTimeline: boolean;
  hasAskedAboutCurrentSituation: boolean;
  collectedInfo: {
    estimatedValue?: number;
    timeline?: string;
    currentSituation?: string;
    mainConcern?: string;
  };
}>();

function getCreditTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'AUTO': 'automóvel',
    'IMÓVEL': 'imóvel',
    'NEGÓCIO': 'negócio',
    'EDUCAÇÃO': 'educação',
  };
  return labels[type] || type.toLowerCase();
}

function generateWhatsAppLink(leadData: LeadData, classification: { score: number; priority: string }, collectedInfo: Record<string, unknown>): string {
  const creditLabel = getCreditTypeLabel(leadData.creditType);
  
  let message = `Olá! Sou ${leadData.name}.\n`;
  message += `Tenho interesse em consórcio de ${creditLabel}.\n`;
  
  if (collectedInfo.estimatedValue) {
    message += `Valor aproximado: R$ ${(collectedInfo.estimatedValue as number).toLocaleString()}\n`;
  }
  if (collectedInfo.timeline) {
    message += `Prazo: ${collectedInfo.timeline}\n`;
  }
  if (collectedInfo.mainConcern) {
    message += `Principal interesse: ${collectedInfo.mainConcern}\n`;
  }
  
  message += `\n[Lead ${classification.priority.toUpperCase()} - Score: ${classification.score}/10]`;
  
  const encoded = encodeURIComponent(message);
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5585988887777';
  return `https://wa.me/${whatsappNumber}?text=${encoded}`;
}

function classifyLead(leadData: LeadData, messages: Message[], collectedInfo: Record<string, unknown>): { score: number; priority: string } {
  let score = 5;
  
  // Tipo de crédito
  if (leadData.creditType === 'IMÓVEL') score += 2;
  else if (leadData.creditType === 'AUTO') score += 1.5;
  else if (leadData.creditType === 'NEGÓCIO') score += 1;
  
  // Quantidade de mensagens (engajamento)
  if (messages.length >= 6) score += 1.5;
  else if (messages.length >= 4) score += 1;
  else if (messages.length >= 2) score += 0.5;
  
  // Informações coletadas
  if (collectedInfo.estimatedValue) {
    const value = collectedInfo.estimatedValue as number;
    if (value >= 100000) score += 2;
    else if (value >= 50000) score += 1.5;
    else if (value >= 20000) score += 1;
  }
  
  if (collectedInfo.timeline) {
    const timeline = (collectedInfo.timeline as string).toLowerCase();
    if (timeline.includes('urgente') || timeline.includes('já') || timeline.includes('agora')) score += 1.5;
    else if (timeline.includes('mês') || timeline.includes('breve')) score += 1;
  }
  
  // Análise de sentimento das mensagens
  const allUserMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  
  if (allUserMessages.includes('quero') || allUserMessages.includes('preciso') || allUserMessages.includes('urgente')) {
    score += 1;
  }
  if (allUserMessages.includes('comparando') || allUserMessages.includes('pesquisando')) {
    score -= 0.5;
  }
  
  // Normalizar score
  score = Math.min(Math.max(Math.round(score * 10) / 10, 1), 10);
  
  // Determinar prioridade
  let priority: string;
  if (score >= 8) priority = 'alta';
  else if (score >= 5) priority = 'média';
  else priority = 'baixa';
  
  return { score, priority };
}

function shouldFinishConversation(messages: Message[], context: typeof conversationContext extends Map<string, infer V> ? V : never): { shouldFinish: boolean; hasInterest: boolean } {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || '';
  const allUserMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  
  // Palavras que indicam FALTA de interesse
  const noInterestKeywords = [
    'não tenho interesse', 'não estou interessado', 'não quero', 'não preciso',
    'sem interesse', 'desinteressado', 'não é pra mim', 'não é para mim',
    'não vou querer', 'não vou precisar', 'mudei de ideia', 'desisti',
    'não agora', 'talvez depois', 'outro momento', 'não no momento'
  ];
  
  // Palavras de despedida/encerramento sem interesse
  const farewellKeywords = ['tchau', 'adeus', 'até mais', 'até logo', 'falou', 'flw', 'vlw'];
  
  // Verificar se demonstrou falta de interesse
  const hasNoInterest = noInterestKeywords.some(kw => allUserMessages.includes(kw));
  const isFarewell = farewellKeywords.some(kw => lastUserMessage.includes(kw));
  
  // Se não tem interesse, encerrar
  if (hasNoInterest || (isFarewell && messages.length >= 2)) {
    return { shouldFinish: true, hasInterest: false };
  }
  
  // Finalizar após coletar informações suficientes ou após muitas mensagens
  if (messages.length >= 8) return { shouldFinish: true, hasInterest: true };
  
  const collectedCount = Object.values(context.collectedInfo).filter(Boolean).length;
  if (collectedCount >= 2 && messages.length >= 4) return { shouldFinish: true, hasInterest: true };
  
  // Verificar se usuário quer encerrar COM interesse
  const finishKeywords = ['ok', 'tudo bem', 'pode ser', 'vamos', 'quero falar', 'atendente', 'humano', 'whatsapp', 'obrigado', 'valeu'];
  
  if (finishKeywords.some(kw => lastUserMessage.includes(kw)) && messages.length >= 3) {
    // Verificar se foi um "obrigado" de despedida sem interesse vs com interesse
    if ((lastUserMessage.includes('obrigado') || lastUserMessage.includes('valeu')) && hasNoInterest) {
      return { shouldFinish: true, hasInterest: false };
    }
    return { shouldFinish: true, hasInterest: true };
  }
  
  return { shouldFinish: false, hasInterest: true };
}

function extractInfoFromMessages(messages: Message[]): Record<string, unknown> {
  const info: Record<string, unknown> = {};
  
  // Analisar apenas mensagens do USUÁRIO para extrair informações
  const userMessages = messages.filter(m => m.role === 'user');
  const userText = userMessages.map(m => m.content).join(' ');
  
  // Extrair valor - apenas se o usuário explicitamente mencionou
  // Padrão mais específico: R$ seguido de número, ou número seguido de "mil/k/reais"
  const valuePatterns = [
    /r\$\s*([\d.,]+)/i,
    /(\d+)\s*(?:mil|k)\b/i,
    /(?:valor|pensando em|quero|cerca de|aproximadamente)\s*(?:r\$)?\s*([\d.,]+)/i,
  ];
  
  for (const pattern of valuePatterns) {
    const match = userText.match(pattern);
    if (match) {
      let valueStr = match[1].replace(/[.,]/g, '');
      let value = parseInt(valueStr);
      
      // Verificar se mencionou "mil" ou "k" junto
      const context = userText.substring(Math.max(0, (match.index || 0) - 5), (match.index || 0) + match[0].length + 10);
      if (context.match(/mil|k\b/i) && value < 1000) {
        value = value * 1000;
      }
      
      // Apenas valores razoáveis para consórcio (mínimo 1000)
      if (value >= 1000) {
        info.estimatedValue = value;
        break;
      }
    }
  }
  
  // Extrair timeline
  const timelineKeywords = ['urgente', 'já', 'agora', 'próximo mês', 'esse ano', 'ano que vem', 'sem pressa', 'planejando'];
  for (const kw of timelineKeywords) {
    if (userText.toLowerCase().includes(kw)) {
      info.timeline = kw;
      break;
    }
  }
  
  return info;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { leadData, messages, isFirstMessage } = body;

    // Criar ID único para a conversa
    const conversationId = `${leadData.email}-${leadData.phone}`;
    
    // Inicializar ou recuperar contexto
    if (!conversationContext.has(conversationId)) {
      conversationContext.set(conversationId, {
        messageCount: 0,
        hasAskedAboutValue: false,
        hasAskedAboutTimeline: false,
        hasAskedAboutCurrentSituation: false,
        collectedInfo: {},
      });
    }
    
    const context = conversationContext.get(conversationId)!;
    context.messageCount = messages.length;
    
    // Extrair informações das mensagens
    const extractedInfo = extractInfoFromMessages(messages);
    context.collectedInfo = { ...context.collectedInfo, ...extractedInfo };
    
    const creditTypeLabel = getCreditTypeLabel(leadData.creditType);
    
    // Construir prompt do sistema
    const systemPrompt = `Você é a Ana, uma consultora simpática e experiente da Reobote Consórcios. Seu objetivo é entender a necessidade do cliente de forma natural e humanizada, como uma conversa real.

INFORMAÇÕES DO CLIENTE:
- Nome: ${leadData.name}
- Interesse: Consórcio de ${creditTypeLabel}
- Dúvida inicial: ${leadData.message || 'Não informada'}

INFORMAÇÕES JÁ COLETADAS:
${context.collectedInfo.estimatedValue ? `- Valor aproximado: R$ ${context.collectedInfo.estimatedValue}` : '- Valor: ainda não informado'}
${context.collectedInfo.timeline ? `- Prazo: ${context.collectedInfo.timeline}` : '- Prazo: ainda não informado'}
${context.collectedInfo.mainConcern ? `- Principal interesse: ${context.collectedInfo.mainConcern}` : ''}

REGRAS DE CONVERSA:
1. Seja natural, simpática e use emojis moderadamente (1-2 por mensagem)
2. Use o primeiro nome do cliente
3. Faça UMA pergunta por vez, de forma casual
4. Se o cliente já disse algo sobre valor ou prazo, não pergunte novamente
5. Respostas curtas (2-4 frases no máximo)
6. Não seja robótica ou formal demais
7. Demonstre entusiasmo genuíno em ajudar

REGRA CRÍTICA - NUNCA INVENTE INFORMAÇÕES:
- NUNCA mencione valores, prazos ou informações que o cliente NÃO disse explicitamente
- Se você não tem certeza de uma informação, pergunte em vez de assumir
- Baseie-se APENAS no que está escrito no histórico da conversa
- Se o campo "ainda não informado" aparecer acima, NÃO invente um valor

PERGUNTAS PARA FAZER (se ainda não tiver a informação):
- Qual valor aproximado você está pensando?
- Tem algum prazo em mente?
- É seu primeiro consórcio?

${messages.length >= 4 ? 'IMPORTANTE: A conversa está avançada. Se já tiver informações suficientes, ofereça para transferir para um especialista no WhatsApp de forma natural.' : ''}

${messages.length >= 6 ? 'MUITO IMPORTANTE: Hora de finalizar! Agradeça, resuma o que entendeu e convide para falar com um especialista no WhatsApp.' : ''}`;

    // Construir mensagens para o modelo
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Se for primeira mensagem, criar saudação personalizada
    if (isFirstMessage) {
      let greeting = `Oi ${leadData.name.split(' ')[0]}! 😊 `;
      
      if (leadData.message) {
        greeting += `Vi que você tem interesse em ${creditTypeLabel} e mencionou: "${leadData.message}". Me conta mais sobre o que você está buscando!`;
      } else {
        greeting += `Que legal que você está interessado em consórcio de ${creditTypeLabel}! Me conta, o que te motivou a buscar essa opção?`;
      }
      
      return NextResponse.json({
        message: greeting,
        shouldFinish: false,
      });
    }

    // Gerar resposta do agente
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: chatMessages,
    });

    // Verificar se deve finalizar e se tem interesse
    const { shouldFinish, hasInterest } = shouldFinishConversation(messages, context);
    
    let responseMessage = result.text;
    let classification = null;
    let whatsappLink = null;

    if (shouldFinish) {
      // Classificar lead (mesmo sem interesse, para registro)
      classification = classifyLead(leadData, messages, context.collectedInfo);
      
      // Ajustar score se não tiver interesse
      if (!hasInterest) {
        classification.score = Math.max(1, classification.score - 5);
        classification.priority = 'baixa';
      }
      
      whatsappLink = generateWhatsAppLink(leadData, classification, context.collectedInfo);
      
      // Ajustar mensagem baseado no interesse
      if (hasInterest) {
        // Com interesse: mensagem de que entrará em contato
        if (!responseMessage.toLowerCase().includes('whatsapp') && !responseMessage.toLowerCase().includes('especialista') && !responseMessage.toLowerCase().includes('contato')) {
          responseMessage += `\n\nBom, ${leadData.name.split(' ')[0]}, com base no que conversamos, tenho certeza que temos a opção perfeita pra você! 🎯 Um dos nossos especialistas entrará em contato em breve pelo WhatsApp!`;
        }
      }
      // Se não tem interesse, a IA já deve ter dado uma despedida educada
      
      // Limpar contexto
      conversationContext.delete(conversationId);
    }

    return NextResponse.json({
      message: responseMessage,
      shouldFinish,
      hasInterest,
      classification,
      whatsappLink,
    });

  } catch (error) {
    console.error('Erro no chat:', error);
    return NextResponse.json(
      { 
        message: 'Ops, tive um probleminha aqui. Pode repetir?',
        shouldFinish: false,
      },
      { status: 200 }
    );
  }
}
