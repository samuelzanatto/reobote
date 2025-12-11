import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { NextRequest, NextResponse } from 'next/server';

interface Lead {
  name: string;
  email: string;
  phone: string;
  creditType: string;
  message: string;
  interestLevel: number;
  estimatedValue?: number;
  score: number;
  priority: string;
  createdAt: string;
  whatsappUrl: string;
}

// Armazenar leads em memória (em produção, usar banco de dados)
const leadsDatabase: Lead[] = [];

// Função para classificar lead baseada em regras
function classifyLead(name: string, email: string, phone: string, creditType: string, message: string): Omit<Lead, 'name' | 'email' | 'phone' | 'creditType' | 'message'> {
  // Determinar nível de interesse baseado no tipo de crédito
  let baseScore = 5;
  
  if (creditType === 'AUTO' || creditType === 'IMÓVEL') {
    baseScore += 2;
  }
  
  if (message && message.length > 20) {
    baseScore += 1;
  }

  // Determinar prioridade
  let priority = 'baixa';
  if (baseScore >= 8) {
    priority = 'alta';
  } else if (baseScore >= 6) {
    priority = 'média';
  }

  return {
    score: Math.min(baseScore, 10),
    priority,
    interestLevel: baseScore,
    createdAt: new Date().toISOString(),
    whatsappUrl: generateWhatsAppLink(name, creditType, message),
  };
}

// Gerar link do WhatsApp
function generateWhatsAppLink(name: string, creditType: string, message: string): string {
  const texto = `Olá! Meu nome é ${name}. Tenho interesse em ${creditType.toLowerCase()} e gostaria de saber mais sobre os produtos da Reobote Consórcios. ${message ? `Minha dúvida é: ${message}` : ''}`;
  const encoded = encodeURIComponent(texto);
  return `https://wa.me/5585988887777?text=${encoded}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, creditType, message } = body;

    if (!name || !email || !phone || !creditType) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Usar o agente para gerar uma resposta humanizada
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: `
        Você é um agente de atendimento simpático e profissional da Reobote Consórcios.
        Um novo cliente entrou em contato com as seguintes informações:
        
        Nome: ${name}
        Email: ${email}
        Telefone: ${phone}
        Tipo de Crédito: ${creditType}
        Mensagem: ${message || 'Nenhuma mensagem adicional'}
        
        Responda de forma amigável e humanizada, agradecendo o interesse e confirmando que um atendente entrará em contato em breve via WhatsApp.
        Seja breve, mas cordial.
      `,
    });

    // Classificar o lead
    const classification = classifyLead(name, email, phone, creditType, message || '');

    // Criar objeto do lead
    const leadData: Lead = {
      name,
      email,
      phone,
      creditType,
      message: message || '',
      ...classification,
    };

    leadsDatabase.push(leadData);

    return NextResponse.json({
      success: true,
      message: result.text,
      lead: leadData,
      whatsappLink: classification.whatsappUrl,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao processar agente:', error);
    return NextResponse.json(
      { error: errorMessage || 'Erro ao processar a solicitação' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    leads: leadsDatabase,
    total: leadsDatabase.length,
  });
}
