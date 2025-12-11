'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Chat from '../components/Chat';

interface LeadData {
  creditType: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Descodifica os parâmetros da URL
    try {
      const creditType = searchParams.get('creditType') || '';
      const name = searchParams.get('name') || '';
      const email = searchParams.get('email') || '';
      const phone = searchParams.get('phone') || '';
      const message = searchParams.get('message') || '';

      if (!name || !email) {
        // Se não tiver dados, volta para o formulário
        router.push('/');
        return;
      }

      setLeadData({
        creditType,
        name,
        email,
        phone,
        message,
      });
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, router]);

  // Bloqueia scroll do body
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (isLoading || !leadData) {
    return (
      <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const handleFinish = () => {
    // Volta para a página principal
    router.push('/');
  };

  return (
    <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center md:p-8">
      <Chat leadData={leadData} onFinish={handleFinish} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-dvh bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
