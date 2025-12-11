'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import clsx from 'clsx';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FormData {
  creditType: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}

// Função para formatar telefone enquanto digita
function formatPhone(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limited = numbers.slice(0, 11);
  
  // Aplica a máscara
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

export default function SimulationForm() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<FormData>({
    defaultValues: {
      creditType: '',
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  const phoneValue = watch('phone');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setValue('phone', formatted, { shouldValidate: true });
  };

  const verifyWhatsApp = async (phone: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/verify-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error('Erro ao verificar WhatsApp:', error);
      return false;
    }
  };

  const onSubmit = async (data: FormData) => {
    // Inicia verificação do WhatsApp
    setIsVerifying(true);

    try {
      const isValidWhatsApp = await verifyWhatsApp(data.phone);

      if (!isValidWhatsApp) {
        toast.error('Número de WhatsApp inválido', {
          description: 'Por favor, digite um número de celular válido com WhatsApp.',
          duration: 5000,
        });
        setIsVerifying(false);
        return;
      }

      // Inicia transição suave
      setIsTransitioning(true);
      
      // Cria query string com os dados do formulário
      const params = new URLSearchParams({
        creditType: data.creditType,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
      });

      // Aguarda a animação de fade out antes de redirecionar
      setTimeout(() => {
        router.push(`/chat?${params.toString()}`);
      }, 300);

    } catch (error) {
      console.error('Erro no envio:', error);
      toast.error('Erro ao processar', {
        description: 'Tente novamente em alguns instantes.',
      });
      setIsVerifying(false);
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto px-4 py-8 transition-all duration-300 ease-out ${isTransitioning ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
      {/* Logo e Cabeçalho do Formulário */}
      <div className="mb-16 text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.avif"
            alt="Reobote Logo"
            width={80}
            height={80}
            className="rounded-lg shadow-lg"
          />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Solicitar Simulação
        </h2>
        <p className="text-gray-200 text-sm md:text-base">
          Preencha os dados abaixo para iniciar seu atendimento personalizado
        </p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
        {/* Tipo de Crédito */}
        <div>
          <label className="block text-sm font-semibold text-gray-100 mb-2">
            Tipo de Crédito <span className="text-red-500">*</span>
          </label>
          <Controller
            name="creditType"
            control={control}
            rules={{ required: 'Selecione um tipo de crédito' }}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger 
                  className={clsx(
                    'w-full px-4 py-2.5 md:py-3 h-auto border rounded-lg bg-slate-800 text-gray-100 text-sm md:text-base',
                    'focus:outline-none focus:ring-2 focus:ring-offset-0 transition',
                    errors.creditType
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-700 focus:ring-blue-500'
                  )}
                >
                  <SelectValue placeholder="Selecione o tipo de crédito" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="AUTO" className="text-gray-100 focus:bg-slate-700 focus:text-white cursor-pointer">
                    🚗 Consórcio de Automóvel
                  </SelectItem>
                  <SelectItem value="IMÓVEL" className="text-gray-100 focus:bg-slate-700 focus:text-white cursor-pointer">
                    🏠 Consórcio de Imóvel
                  </SelectItem>
                  <SelectItem value="NEGÓCIO" className="text-gray-100 focus:bg-slate-700 focus:text-white cursor-pointer">
                    💼 Consórcio para Negócio
                  </SelectItem>
                  <SelectItem value="EDUCAÇÃO" className="text-gray-100 focus:bg-slate-700 focus:text-white cursor-pointer">
                    📚 Consórcio para Educação
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.creditType && (
            <p className="text-red-500 text-xs md:text-sm mt-1">{errors.creditType.message}</p>
          )}
        </div>

        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-100 mb-2">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Nome é obrigatório' })}
            placeholder="Seu nome completo"
            className={clsx(
              'w-full px-4 py-2.5 md:py-3 border rounded-lg bg-slate-800 text-gray-100 placeholder-gray-400 text-sm md:text-base',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 transition',
              errors.name
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-700 focus:ring-blue-500'
            )}
          />
          {errors.name && (
            <p className="text-red-500 text-xs md:text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-100 mb-2">
            E-mail <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email', {
              required: 'Email é obrigatório',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Email inválido',
              },
            })}
            placeholder="seu.email@email.com"
            className={clsx(
              'w-full px-4 py-2.5 md:py-3 border rounded-lg bg-slate-800 text-gray-100 placeholder-gray-400 text-sm md:text-base',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 transition',
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-700 focus:ring-blue-500'
            )}
          />
          {errors.email && (
            <p className="text-red-500 text-xs md:text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold text-gray-100 mb-2">
            Whatsapp com DDD <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="(85) 98888-7777"
            className={clsx(
              'w-full px-4 py-2.5 md:py-3 border rounded-lg bg-slate-800 text-gray-100 placeholder-gray-400 text-sm md:text-base',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 transition',
              errors.phone
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-700 focus:ring-blue-500'
            )}
          />
          <input
            type="hidden"
            {...register('phone', {
              required: 'Telefone é obrigatório',
              pattern: {
                value: /^\(\d{2}\) \d{5}-\d{4}$/,
                message: 'Digite um telefone válido com DDD',
              },
            })}
          />
          {errors.phone && (
            <p className="text-red-500 text-xs md:text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Mensagem */}
        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-gray-100 mb-2">
            Mensagem ou Dúvida (Opcional)
          </label>
          <textarea
            id="message"
            {...register('message')}
            placeholder="Conte-nos mais sobre seu interesse..."
            rows={4}
            className={clsx(
              'w-full px-4 py-2.5 md:py-3 border rounded-lg bg-slate-800 text-gray-100 placeholder-gray-400 text-sm md:text-base',
              'focus:outline-none focus:ring-2 focus:ring-offset-0 transition',
              errors.message
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-700 focus:ring-blue-500'
            )}
          />
          {errors.message && (
            <p className="text-red-500 text-xs md:text-sm mt-1">{errors.message.message}</p>
          )}
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isVerifying}
          className={clsx(
            'w-full py-3 md:py-4 px-4 rounded-lg font-bold text-white transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            isVerifying
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 active:scale-95'
          )}
        >
          {isVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verificando...
            </span>
          ) : (
            'Iniciar Atendimento'
          )}
        </button>
      </form>

      {/* Informação Adicional */}
      <p className="text-center text-gray-300 text-xs md:text-sm mt-6">
        Seus dados estão seguros. Não compartilhamos informações com terceiros.
      </p>
    </div>
  );
}
