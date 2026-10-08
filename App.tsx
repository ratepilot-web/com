import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WorkerDashboard } from './components/WorkerDashboard';
import { WorkerTasks } from './components/WorkerTasks';
import { WorkerWithdrawals } from './components/WorkerWithdrawals';
import { WorkerDeposits } from './components/WorkerDeposits';
import { WorkerLedger } from './components/WorkerLedger';
import { WorkerHistory } from './components/WorkerHistory';
import { FinancialDashboard } from './components/FinancialDashboard';
import { FinancialWorkers } from './components/FinancialWorkers';
import { FinancialPricing } from './components/FinancialPricing';
import { FinancialWithdrawals } from './components/FinancialWithdrawals';
import { FinancialDeposits } from './components/FinancialDeposits';
import { FinancialLedger } from './components/FinancialLedger';
import { FinancialTaskManagement } from './components/FinancialTaskManagement';
import { FinancialReferrals } from './components/FinancialReferrals';
import { WorkerProfile } from './components/WorkerProfile';
import { FinancialCycles } from './components/FinancialCycles';
import { FinancialProofs } from './components/FinancialProofs';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { TaskItem } from './types';
import {
  LayoutDashboard,
  Briefcase,
  History,
  Wallet,
  ArrowDownLeft,
  FileSpreadsheet,
  Users,
  Tag,
  CreditCard,
  BookOpen,
  Globe,
  CheckSquare,
  Ticket,
  ShieldCheck,
  UserCircle,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedTaskModal, setSelectedTaskModal] = useState<TaskItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const isFinancial = user?.role === 'FINANCIAL_DEPARTMENT';

  const handleOpenTaskModal = (task: TaskItem) => {
    setSelectedTaskModal(task);
    setCurrentTab('tasks');
  };

  const workerNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Rating Tasks', icon: Briefcase },
    { id: 'history', label: 'Task History', icon: History },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
    { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
    { id: 'transactions', label: 'Financial Ledger', icon: FileSpreadsheet },
    { id: 'profile', label: 'My Profile', icon: UserCircle },
    { id: 'landing', label: 'About Platform', icon: Globe },
  ];

  const financialNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'referrals', label: 'Referral Codes (500)', icon: Ticket },
    { id: 'tasks-mgmt', label: 'Rating Catalogue', icon: CheckSquare },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'pricing', label: 'Task Pricing', icon: Tag },
    { id: 'cycles', label: 'Task Cycles', icon: CheckSquare },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
        { id: 'withdrawals', label: 'Withdrawals', icon: CreditCard },
    { id: 'ledger', label: 'Master Ledger & Audit', icon: BookOpen },
    { id: 'landing', label: 'About Platform', icon: Globe },
  ];

  const currentNav = isFinancial ? financialNav : workerNav;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm animate-pulse">
            <Briefcase className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-slate-600 tracking-normal">
            Loading RATEPILOT...
          </span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, render the rich Landing Page with the embedded sign in module
  if (!user) {
    return <LandingPage onEnterDashboard={() => setCurrentTab('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Responsive navigation: desktop rail + compact mobile tabs */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside className="hidden md:flex w-[270px] shrink-0 flex-col border-r border-blue-100 bg-white/85 px-4 py-6 shadow-[8px_0_30px_rgba(21,89,214,.04)]">
          <div className="mb-5 px-3 text-[10px] font-extrabold uppercase tracking-[.2em] text-blue-500">Workspace</div>
          <nav className="space-y-1.5">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button key={item.id} onClick={() => { setCurrentTab(item.id); if (item.id !== 'tasks') setSelectedTaskModal(null); }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm transition ${isActive ? 'bg-gradient-to-r from-blue-700 to-blue-500 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? 'bg-white/15' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}><Icon className="h-[18px] w-[18px]" /></span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
            <div className="text-xs font-extrabold text-blue-900">Stay in sequence</div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Tasks unlock one at a time. The next day opens only after Operations approval.</p>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="sticky top-[92px] z-30 border-b border-blue-100 bg-white/95 px-3 py-2 shadow-sm backdrop-blur md:hidden">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {currentNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return <button key={item.id} onClick={() => { setCurrentTab(item.id); if (item.id !== 'tasks') setSelectedTaskModal(null); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${isActive ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-800'}`}><Icon className="h-4 w-4"/><span>{item.label}</span></button>;
              })}
            </div>
          </div>

      {/* Main Content Area */}
      <main className="min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {currentTab === 'landing' && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8">
            <LandingPage onEnterDashboard={() => setCurrentTab('dashboard')} />
          </div>
        )}

        {/* WORKER VIEWS */}
        {!isFinancial && currentTab !== 'landing' && (
          <>
            {currentTab === 'dashboard' && (
              <WorkerDashboard
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenTaskModal={handleOpenTaskModal}
              />
            )}
            {currentTab === 'tasks' && (
              <WorkerTasks
                selectedTaskModal={selectedTaskModal}
                onCloseModal={() => setSelectedTaskModal(null)}
              />
            )}
            {currentTab === 'history' && <WorkerHistory />}
            {currentTab === 'deposits' && (
              <WorkerDeposits onNavigateTab={(tab) => setCurrentTab(tab)} />
            )}
            {currentTab === 'withdrawals' && (
              <WorkerWithdrawals onNavigateTab={(tab) => setCurrentTab(tab)} />
            )}
            {currentTab === 'transactions' && <WorkerLedger />}
            {currentTab === 'profile' && <WorkerProfile />}
          </>
        )}

        {/* FINANCIAL DEPARTMENT VIEWS */}
        {isFinancial && currentTab !== 'landing' && (
          <>
            {currentTab === 'dashboard' && (
              <FinancialDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />
            )}
            {currentTab === 'referrals' && <FinancialReferrals />}
            {currentTab === 'tasks-mgmt' && <FinancialTaskManagement />}
            {currentTab === 'workers' && <FinancialWorkers />}
            {currentTab === 'pricing' && <FinancialPricing />}
            {currentTab === 'cycles' && <FinancialCycles />}
            {currentTab === 'deposits' && <FinancialDeposits />}
            {currentTab === 'proofs' && <FinancialProofs />}
            {currentTab === 'withdrawals' && <FinancialWithdrawals />}
            {currentTab === 'ledger' && <FinancialLedger />}
          </>
        )}
      </main>
        </div>
      </div>

      {/* Professional Footer */}
      <footer className="border-t border-blue-100 bg-white py-6 text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-[.12em] text-blue-800">RATEPILOT</span>
            <span>•</span>
            <span>Verified Task & Earning Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} RATEPILOT Inc. All rights reserved.</span>
            <span>•</span>
            <button
              onClick={() => setCurrentTab('landing')}
              className="hover:text-slate-900 transition"
            >
              Privacy & Guidelines
            </button>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
