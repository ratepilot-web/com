import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BalanceCard } from './BalanceCard';
import { DailyTaskAlertBanner } from './DailyTaskAlertBanner';
import { TaskItem, TaskCompletion, BalanceTransaction } from '../types';
import {
  Briefcase,
  CheckCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Star,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

interface WorkerDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenTaskModal: (task: TaskItem) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  onNavigateTab,
  onOpenTaskModal,
}) => {
  const { user, token, dailyStatus } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!token) return;
      try {
        const [tasksRes, historyRes, txRes] = await Promise.all([
          fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/tasks/history', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/transactions/my', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (historyRes.ok) setCompletions(await historyRes.json());
        if (txRes.ok) setTransactions(await txRes.json());
      } catch (e) {
        console.error('Error loading dashboard data', e);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token]);

  const completedTodayCount = completions.length;
  const earningsTodayTotal = completions.reduce((acc, c) => acc + c.earning_credited, 0);

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome back, {user?.full_name}
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            Complete authentic business ratings and customer feedback, and receive immediate credits into your
            Earning Balance.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Daily Task Status Banner */}
      <DailyTaskAlertBanner status={dailyStatus} />

      {/* Dual Balances Display */}
      <BalanceCard
        bonusBalance={user?.bonus_balance || 0}
        earningBalance={user?.earning_balance || 0}
        onRequestDeposit={() => onNavigateTab('deposits')}
        onRequestWithdrawal={() => onNavigateTab('withdrawals')}
      />

      {/* Key Metrics: Today's Tasks, Completed Tasks, Today's Earnings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Tasks</span>
            <Briefcase className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{tasks.length}</div>
          <span className="text-xs text-gray-500">Assigned in current batch</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Tasks</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
            {completedTodayCount}
          </div>
          <span className="text-xs text-emerald-700 font-medium">Verified proof submitted</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Earnings</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 tabular-nums">
            ${earningsTodayTotal.toFixed(2)}
          </div>
          <span className="text-xs text-gray-500">Credited to Earning Balance</span>
        </div>
      </div>

      {/* Available Tasks Section (Requirement 17) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Available Tasks</h2>
            <p className="text-xs text-gray-500">
              Each task has a set price deducted from your Earning Balance when started.
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>View All ({tasks.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
            Loading available business tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
            No tasks currently assigned.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.slice(0, 3).map((task) => {
              const isCompleted = task.has_completed || task.assignment_status === 'COMPLETED';
              const isInProgress = task.assignment_status === 'IN_PROGRESS';
              const isDailyClosed = dailyStatus === 'CLOSED';
              const hasReviewed = Boolean(task.has_reviewed_business);

              return (
                <div
                  key={task.id}
                  className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-xs transition hover:border-gray-300"
                >
                  <div>
                    {/* Header: Task Type badge & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        {task.task_type || 'Rating'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 tabular-nums">
                          Price: ${task.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Business Name */}
                    <h3 className="mt-3 text-base font-bold text-gray-900">
                      {task.business?.name}
                    </h3>

                    {/* Task Title & Status */}
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium truncate">{task.title}</span>
                      {isCompleted ? (
                        <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 shrink-0">
                          Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="rounded bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200 shrink-0 animate-pulse">
                          In Progress
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-bold shrink-0">
                          Available
                        </span>
                      )}
                    </div>

                    <p className="mt-2.5 text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {task.instructions}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px]">
                      <span className="text-gray-500">Completion Reward:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        +${task.completion_amount.toFixed(2)}
                      </span>
                    </div>

                    {false && !isCompleted && !isInProgress && (
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                        <span>Rating task available</span>
                      </div>
                    )}
                  </div>

                  {/* Start Task Button with price deduction notice */}
                  <div className="mt-4 pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-500 mb-1.5">
                      Starting deducts ${task.price.toFixed(2)} from Earning Balance
                    </p>
                    <button
                      onClick={() => onOpenTaskModal(task)}
                      disabled={
                        isCompleted ||
                        (hasReviewed && !isInProgress) ||
                        (isDailyClosed && !isInProgress)
                      }
                      className={`w-full rounded-md py-2 text-xs font-semibold transition ${
                        isCompleted
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isInProgress
                          ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                          : hasReviewed
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : isDailyClosed
                          ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {isCompleted
                        ? 'Completed'
                        : isInProgress
                        ? 'Continue Task'
                        : hasReviewed
                        ? 'Already Reviewed'
                        : isDailyClosed
                        ? 'Session Closed'
                        : `Start Task ($${task.price.toFixed(2)})`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Ledger Transactions */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Recent Transactions</h2>
            <p className="text-xs text-gray-500">
              Audit-ready balance changes recorded on your account
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <span>Full Ledger</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">
              No transactions recorded yet.
            </div>
          ) : (
            transactions.slice(0, 4).map((tx) => {
              const txType = tx.transaction_type || (tx as any).transactionType || '';
              const balType = tx.balance_type || (tx as any).balanceType || 'EARNING';
              const txId = tx.transaction_id || (tx as any).transactionId || `TX-${tx.id}`;
              const amountVal = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount || 0);
              const newBalVal =
                typeof tx.new_balance === 'number'
                  ? tx.new_balance
                  : Number((tx as any).newBalance || 0);
              const isCredit = txType.includes('CREDIT') || txType === 'TASK_EARNING';

              return (
                <div key={tx.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-gray-600">
                        {txId}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                          balType === 'BONUS'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {balType}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-700">{tx.reason}</p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-mono text-xs font-bold tabular-nums ${
                        isCredit ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {isCredit ? '+' : '-'}${amountVal.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500 tabular-nums">
                      Balance: ${newBalVal.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
