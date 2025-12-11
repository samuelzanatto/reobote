import SimulationForm from './components/SimulationForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <SimulationForm />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-700 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>&copy; 2025 Reobote Consórcios. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
