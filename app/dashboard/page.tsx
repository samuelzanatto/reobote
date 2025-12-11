'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';

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
  messages: { role: string; content: string }[];
  classification: Classification;
  createdAt: string;
  status: 'concluido' | 'pendente' | 'encaminhado';
}

export default function DashboardPage() {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);

  const fetchAtendimentos = async () => {
    try {
      const response = await fetch('/api/atendimentos');
      const data = await response.json();
      
      if (data.success) {
        setAtendimentos(data.atendimentos);
      }
    } catch (error) {
      console.error('Erro ao buscar atendimentos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAtendimentos();
    
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchAtendimentos, 30000);
    return () => clearInterval(interval);
  }, []);

  const getCreditTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'AUTO': '🚗 Automóvel',
      'IMÓVEL': '🏠 Imóvel',
      'NEGÓCIO': '💼 Negócio',
      'EDUCAÇÃO': '📚 Educação',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400 bg-green-400/10';
    if (score >= 5) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'alta': 'bg-red-500/20 text-red-400 border-red-500/30',
      'média': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'baixa': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[priority] || colors['média'];
  };

  // Estatísticas
  const stats = {
    total: atendimentos.length,
    alta: atendimentos.filter(a => a.classification.priority === 'alta').length,
    media: atendimentos.filter(a => a.classification.priority === 'média').length,
    baixa: atendimentos.filter(a => a.classification.priority === 'baixa').length,
    avgScore: atendimentos.length > 0 
      ? (atendimentos.reduce((acc, a) => acc + a.classification.score, 0) / atendimentos.length).toFixed(1)
      : '0',
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="/logo.avif"
                alt="Reobote"
                width={50}
                height={50}
                className="rounded-lg cursor-pointer hover:opacity-80 transition"
              />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard de Atendimentos</h1>
              <p className="text-gray-400 text-sm">Gerencie os leads e acompanhe as conversas</p>
            </div>
          </div>
          <button
            onClick={fetchAtendimentos}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 self-start md:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Total</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Prioridade Alta</p>
            <p className="text-3xl font-bold text-red-400">{stats.alta}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Prioridade Média</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.media}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <p className="text-gray-400 text-sm">Prioridade Baixa</p>
            <p className="text-3xl font-bold text-blue-400">{stats.baixa}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 col-span-2 md:col-span-1">
            <p className="text-gray-400 text-sm">Score Médio</p>
            <p className="text-3xl font-bold text-green-400">{stats.avgScore}</p>
          </div>
        </div>

        {/* Tabela de Atendimentos */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">Atendimentos Recentes</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando atendimentos...</p>
            </div>
          ) : atendimentos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum atendimento ainda</h3>
              <p className="text-gray-400 mb-4">Os atendimentos aparecerão aqui quando houver conversas finalizadas.</p>
              <Link
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Iniciar Simulação
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Tipo</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Prioridade</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Mensagens</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {atendimentos.map((atendimento) => (
                    <tr key={atendimento.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{atendimento.leadData.name}</p>
                          <p className="text-gray-400 text-sm">{atendimento.leadData.email}</p>
                          <p className="text-gray-500 text-xs">{atendimento.leadData.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-gray-300 text-sm">
                          {getCreditTypeLabel(atendimento.leadData.creditType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx(
                          'inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg',
                          getScoreColor(atendimento.classification.score)
                        )}>
                          {atendimento.classification.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell">
                        <span className={clsx(
                          'px-3 py-1 rounded-full text-xs font-medium border',
                          getPriorityBadge(atendimento.classification.priority)
                        )}>
                          {atendimento.classification.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center hidden lg:table-cell">
                        <span className="text-gray-300">{atendimento.messages.length}</span>
                      </td>
                      <td className="px-6 py-4 hidden xl:table-cell">
                        <span className="text-gray-400 text-sm">{formatDate(atendimento.createdAt)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedAtendimento(atendimento)}
                          className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-500 transition"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Detalhes */}
        {selectedAtendimento && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header do Modal */}
              <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedAtendimento.leadData.name}</h3>
                  <p className="text-gray-400 text-sm">{selectedAtendimento.id}</p>
                </div>
                <button
                  onClick={() => setSelectedAtendimento(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {/* Informações do Lead */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-400 text-sm">Email</p>
                    <p className="text-white">{selectedAtendimento.leadData.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Telefone</p>
                    <p className="text-white">{selectedAtendimento.leadData.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Tipo de Crédito</p>
                    <p className="text-white">{getCreditTypeLabel(selectedAtendimento.leadData.creditType)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Score / Prioridade</p>
                    <p className="text-white">
                      <span className={clsx('font-bold', getScoreColor(selectedAtendimento.classification.score).split(' ')[0])}>
                        {selectedAtendimento.classification.score}/10
                      </span>
                      {' - '}
                      <span className={clsx('font-medium', getPriorityBadge(selectedAtendimento.classification.priority).split(' ')[1])}>
                        {selectedAtendimento.classification.priority}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Mensagens */}
                <div>
                  <h4 className="text-white font-medium mb-3">Histórico da Conversa</h4>
                  <div className="space-y-3 bg-slate-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {selectedAtendimento.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          'p-3 rounded-lg text-sm',
                          msg.role === 'user'
                            ? 'bg-blue-600/20 text-blue-100 ml-8'
                            : 'bg-slate-700/50 text-gray-300 mr-8'
                        )}
                      >
                        <p className="text-xs text-gray-500 mb-1">
                          {msg.role === 'user' ? 'Cliente' : 'Assistente'}
                        </p>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão WhatsApp */}
                <div className="mt-6">
                  <a
                    href={`https://wa.me/55${selectedAtendimento.leadData.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Contatar via WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
