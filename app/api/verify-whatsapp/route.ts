import { NextRequest, NextResponse } from 'next/server';

interface VerifyRequest {
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { phone } = body;

    // Remove formatação do telefone para obter apenas números
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver
    const fullPhone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

    // Verifica se o número tem WhatsApp usando a API pública
    // Usando a API do WhatsApp Business ou alternativa gratuita
    const hasWhatsApp = await checkWhatsAppNumber(fullPhone);

    return NextResponse.json({
      valid: hasWhatsApp,
      phone: fullPhone,
    });

  } catch (error) {
    console.error('Erro ao verificar WhatsApp:', error);
    return NextResponse.json(
      { valid: false, error: 'Erro ao verificar número' },
      { status: 500 }
    );
  }
}

async function checkWhatsAppNumber(phone: string): Promise<boolean> {
  try {
    // Método 1: Usar a API wa.me para verificar se existe
    // Esta é uma verificação básica que faz uma requisição HEAD
    const response = await fetch(`https://api.whatsapp.com/send?phone=${phone}`, {
      method: 'HEAD',
      redirect: 'follow',
    });

    // Se retornar 200, o número potencialmente existe
    // Esta não é uma verificação 100% precisa, mas funciona para maioria dos casos
    if (response.ok) {
      return true;
    }

    // Método alternativo: Verificar via API de terceiros se disponível
    // Você pode integrar com APIs como:
    // - Twilio Lookup API
    // - MessageBird
    // - Infobip
    
    // Por enquanto, vamos fazer uma validação básica do formato brasileiro
    // DDD válido (11-99) + 9 dígitos começando com 9
    const ddd = phone.substring(2, 4);
    const number = phone.substring(4);
    
    const validDDDs = [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
      '21', '22', '24', // RJ
      '27', '28', // ES
      '31', '32', '33', '34', '35', '37', '38', // MG
      '41', '42', '43', '44', '45', '46', // PR
      '47', '48', '49', // SC
      '51', '53', '54', '55', // RS
      '61', // DF
      '62', '64', // GO
      '63', // TO
      '65', '66', // MT
      '67', // MS
      '68', // AC
      '69', // RO
      '71', '73', '74', '75', '77', // BA
      '79', // SE
      '81', '87', // PE
      '82', // AL
      '83', // PB
      '84', // RN
      '85', '88', // CE
      '86', '89', // PI
      '91', '93', '94', // PA
      '92', '97', // AM
      '95', // RR
      '96', // AP
      '98', '99', // MA
    ];
    
    // Verifica se DDD é válido e número começa com 9 (celular)
    const isValidDDD = validDDDs.includes(ddd);
    const isValidCellphone = number.length === 9 && number.startsWith('9');
    
    return isValidDDD && isValidCellphone;

  } catch (error) {
    console.error('Erro na verificação:', error);
    // Em caso de erro, faz validação básica
    const number = phone.substring(4);
    
    // Verifica formato básico de celular brasileiro
    return phone.length === 13 && number.startsWith('9');
  }
}
