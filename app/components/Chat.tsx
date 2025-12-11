'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
  creditType: string;
  message?: string;
}

interface ChatProps {
  leadData: LeadData;
  onFinish?: () => void;
}

export default function Chat({ leadData, onFinish }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [classification, setClassification] = useState<{ score: number; priority: string } | null>(null);
  const [hasInterest, setHasInterest] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lidar com teclado virtual sem mover o conteúdo, apenas ajustando o espaçamento do input
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateOffset = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(Math.ceil(offset));
    };

    updateOffset();
    window.visualViewport.addEventListener('resize', updateOffset);
    window.visualViewport.addEventListener('scroll', updateOffset);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
    };
  }, []);

  // Função para calcular delay humanizado baseado no tamanho da mensagem
  const getHumanDelay = (text: string): number => {
    // Simula ~40-60 palavras por minuto de digitação
    const words = text.split(' ').length;
    const baseDelay = 800; // delay mínimo
    const perWordDelay = 50; // ms por palavra
    const randomFactor = Math.random() * 500; // variação aleatória
    return Math.min(baseDelay + (words * perWordDelay) + randomFactor, 3500); // máximo 3.5s
  };

  // Iniciar conversa automaticamente
  useEffect(() => {
    const startConversation = async () => {
      setIsTyping(true);
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadData,
            messages: [],
            isFirstMessage: true,
          }),
        });

        const data = await response.json();
        
        if (data.message) {
          // Delay humanizado antes de mostrar a mensagem
          const delay = getHumanDelay(data.message);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: data.message,
            timestamp: new Date(),
          }]);
        }

        // Se já tiver classificação (lead muito claro), configurar para mostrar botão WhatsApp
        if (data.shouldFinish && data.classification) {
          setWhatsappLink(data.whatsappLink);
          setClassification(data.classification);
        }
      } catch (error) {
        console.error('Erro ao iniciar conversa:', error);
        setMessages([{
          id: Date.now().toString(),
          role: 'assistant',
          content: `Olá ${leadData.name}! 😊 Que bom ter você aqui! Vi que você tem interesse em consórcio de ${getCreditTypeLabel(leadData.creditType).toLowerCase()}. Me conta mais sobre o que você está buscando?`,
          timestamp: new Date(),
        }]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    };

    startConversation();
  }, [leadData]);

  const getCreditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'AUTO': 'Automóvel',
      'IMÓVEL': 'Imóvel',
      'NEGÓCIO': 'Negócio',
      'EDUCAÇÃO': 'Educação',
    };
    return labels[type] || type;
  };

  // Função para salvar o atendimento
  const saveAtendimento = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/atendimentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadData,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          classification,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Atendimento salvo:', data.atendimento.id);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao salvar atendimento:', error);
      toast.error('Erro ao salvar atendimento', {
        description: 'Mas não se preocupe, um consultor entrará em contato.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadData,
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          isFirstMessage: false,
        }),
      });

      const data = await response.json();

      if (data.message) {
        // Delay humanizado antes de mostrar a mensagem
        const delay = getHumanDelay(data.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }]);
      }

      // Verificar se deve finalizar e mostrar botão WhatsApp
      if (data.shouldFinish && data.classification) {
        setWhatsappLink(data.whatsappLink);
        setClassification(data.classification);
        setHasInterest(data.hasInterest !== false); // Se não veio, assume true
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      await new Promise(resolve => setTimeout(resolve, 1000)); // delay mesmo no erro
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um probleminha técnico. Pode repetir o que disse?',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-screen h-dvh max-h-dvh flex flex-col bg-slate-800 overflow-hidden z-50 md:w-full md:max-w-2xl md:h-[700px] md:max-h-[700px] md:rounded-2xl md:shadow-2xl md:border md:border-slate-700">
      {/* Header do Chat */}
      <div className="bg-slate-900 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 flex items-center gap-3 border-b border-slate-700 shrink-0">
        <div className="relative">
          <Image
            src="/logo.avif"
            alt="Reobote"
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm">Assistente Reobote</h3>
          <p className="text-green-400 text-xs">Online agora</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-gray-400 text-xs">{getCreditTypeLabel(leadData.creditType)}</p>
          <p className="text-gray-500 text-xs">{leadData.name.split(' ')[0]}</p>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[80%] px-4 py-3 rounded-2xl text-sm',
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-slate-700 text-gray-100 rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className={clsx(
                'text-xs mt-1 block',
                message.role === 'user' ? 'text-blue-200' : 'text-gray-400'
              )}>
                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Indicador de Digitação */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mensagem de Encerramento - COM interesse */}
      {whatsappLink && classification && hasInterest && (
        <div className="bg-blue-900/30 px-4 py-6 border-t border-blue-600/50">
          <div className="text-center">
            <p className="text-blue-200 text-sm mb-2">
              Obrigado pelo contato, {leadData.name.split(' ')[0]}!
            </p>
            <p className="text-gray-300 text-sm">
              Um de nossos consultores especializados entrará em contato em breve pelo WhatsApp.
            </p>
            <button
              onClick={async () => {
                await saveAtendimento();
                onFinish?.();
              }}
              disabled={isSaving}
              className={clsx(
                'mt-6 px-8 py-3 bg-blue-600 text-white rounded-full font-semibold text-sm transition-all',
                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 active:scale-95'
              )}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finalizando...
                </span>
              ) : (
                'Voltar ao Início'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mensagem de Encerramento - SEM interesse */}
      {whatsappLink && classification && !hasInterest && (
        <div className="bg-slate-800/50 px-4 py-6 border-t border-slate-700">
          <div className="text-center">
            <div className="mb-4">
              <span className="text-4xl">👋</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              Obrigado pelo contato!
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Foi um prazer conversar com você, {leadData.name.split(' ')[0]}!
            </p>
            <p className="text-gray-400 text-sm">
              Caso mude de ideia, estaremos aqui para ajudar. Tenha um ótimo dia! 😊
            </p>
            <button
              onClick={async () => {
                await saveAtendimento();
                onFinish?.();
              }}
              disabled={isSaving}
              className={clsx(
                'mt-6 px-8 py-3 bg-slate-600 text-white rounded-full font-semibold text-sm transition-all',
                isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-500 active:scale-95'
              )}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finalizando...
                </span>
              ) : (
                'Voltar ao Início'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input de Mensagem */}
      {!whatsappLink && !classification && (
        <div
          className="bg-slate-900 px-4 py-3 md:pb-3 border-t border-slate-700 shrink-0"
          style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom) + ${keyboardOffset}px)` }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className={clsx(
                'flex-1 px-4 py-3 rounded-full bg-slate-700 text-white placeholder-gray-400 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={clsx(
                'px-5 py-3 rounded-full font-semibold text-sm transition-all',
                isLoading || !input.trim()
                  ? 'bg-slate-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              )}
            >
              {isLoading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
