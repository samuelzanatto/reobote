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

interface Classification {
  score: number;
  priority: string;
}

interface Atendimento {
  id: string;
  leadData: LeadData;
  messages: Message[];
  classification: Classification;
  createdAt: string;
  status: 'concluido' | 'pendente' | 'encaminhado';
}

// Armazenamento em memória (em produção, use um banco de dados)
const atendimentos: Atendimento[] = [];

// GET - Lista todos os atendimentos
export async function GET() {
  try {
    // Ordena por data mais recente primeiro
    const sorted = [...atendimentos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      atendimentos: sorted,
      total: sorted.length,
    });
  } catch (error) {
    console.error('Erro ao listar atendimentos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar atendimentos' },
      { status: 500 }
    );
  }
}

// POST - Salva um novo atendimento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadData, messages, classification } = body;

    // Validação básica
    if (!leadData || !leadData.name || !leadData.email) {
      return NextResponse.json(
        { success: false, error: 'Dados do lead são obrigatórios' },
        { status: 400 }
      );
    }

    // Cria o atendimento
    const atendimento: Atendimento = {
      id: `ATD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      leadData,
      messages: messages || [],
      classification: classification || { score: 5, priority: 'média' },
      createdAt: new Date().toISOString(),
      status: 'encaminhado',
    };

    // Salva no array (em produção, salve no banco de dados)
    atendimentos.push(atendimento);

    console.log(`[Atendimento Salvo] ID: ${atendimento.id}, Lead: ${leadData.name}, Score: ${atendimento.classification.score}`);

    return NextResponse.json({
      success: true,
      atendimento,
    });

  } catch (error) {
    console.error('Erro ao salvar atendimento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar atendimento' },
      { status: 500 }
    );
  }
}
