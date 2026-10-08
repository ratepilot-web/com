import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Power,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  Ticket,
  Coins,
} from 'lucide-react';

interface FinancialStats {
  total_workers: number;
  tasks_completed_today: number;
  total_earnings_today: number;
  pending_withdrawals: number;
  active_tasks_count?: number;
  max_tasks_limit?: number;
  total_tasks_count?: number;
  daily_task_status: 'OPEN' | 'CLOSED';
  latest_session?: {
    status: 'OPEN' | 'CLOSED';
    changed_by: string;
    updated_at: string;
    note?: string;
  };
}

interface FinancialDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ onNavigateTab }) => {
  const { token, refreshDailyStatus } = useAuth();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStats = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/financial/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to load financial statistics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [token]);

  const initiateToggle = (newStatus: 'OPEN' | 'CLOSED') => {
    setTargetStatus(newStatus);
    setNote(
      newStatus === 'CLOSED'
        ? "Closing tasks for the day per financial operations schedule"
        : "Reopening daily review tasks batch for verified workers"
    );
    setShowNoteModal(true);
  };

  const handleConfirmToggle = async () => {
    if (!token) return;
    setToggling(true);
    try {
      const res = await fetch('/api/financial/daily-task-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to toggle daily task status');
      }

      setFeedback(`Daily tasks successfully marked ${targetStatus}. Server gate updated.`);
      setShowNoteModal(false);
      await refreshDailyStatus();
      await loadStats();

      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setToggling(false);
    }
  };

  const isDailyOpen = stats?.daily_task_status === 'OPEN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200">
              FINANCIAL OPERATIONS
            </span>
            <span className="text-xs text-gray-500">Platform Control</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Financial Management
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Worker balances, task pricing matrix, withdrawal processing, and daily task gates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('tasks-mgmt')}
            className="rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 shadow-xs transition"
          >
            Task Management ({stats?.active_tasks_count || 0}/40)
          </button>
          <button
            onClick={() => onNavigateTab('pricing')}
            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs transition"
          >
            Task Pricing Matrix
          </button>
          <button
            onClick={() => onNavigateTab('workers')}
            className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs transition"
          >
            Worker Directory
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* TASK MANAGEMENT STATUS WIDGET (Requirement 18) */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                TASK MANAGEMENT
              </span>
              <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                Active Tasks: {stats?.active_tasks_count || 27} / {stats?.max_tasks_limit || 40}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              Active Tasks: {stats?.active_tasks_count || 27} / {stats?.max_tasks_limit || 40}
            </div>
            <p className="mt-1 text-xs text-gray-600 max-w-xl">
              Operations Team controls task pricing, activation, deactivation, and parameters.
              When 300 tasks exist, another task cannot be activated until one is deactivated.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('tasks-mgmt')}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              <span>Manage Tasks</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* DAILY TASK CONTROL MASTER CARD */}
      <div
        className={`rounded-lg border p-6 shadow-xs bg-white ${
          isDailyOpen ? 'border-emerald-200' : 'border-red-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Power className={`h-4 w-4 ${isDailyOpen ? 'text-emerald-600' : 'text-red-600'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Daily Task Submission Gate
              </span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-gray-900">Status:</span>
              <span
                className={`text-2xl font-bold ${
                  isDailyOpen ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {stats?.daily_task_status || 'OPEN'}
              </span>
            </div>
            <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
              {isDailyOpen
                ? 'Tasks are currently OPEN. Workers across the platform can start, review, and complete tasks with automatic balance crediting.'
                : 'Tasks are currently CLOSED. Workers cannot submit or complete tasks. Server automatically rejects completions.'}
            </p>

            {stats?.latest_session && (
              <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                <span>
                  Last modified by{' '}
                  <strong className="text-gray-700">{stats.latest_session.changed_by}</strong> on{' '}
                  {new Date(stats.latest_session.updated_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isDailyOpen ? (
              <button
                onClick={() => initiateToggle('CLOSED')}
                className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 transition"
              >
                <Power className="h-4 w-4" />
                <span>Close Today's Tasks</span>
              </button>
            ) : (
              <button
                onClick={() => initiateToggle('OPEN')}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <Power className="h-4 w-4" />
                <span>Reopen Today's Tasks</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          onClick={() => onNavigateTab('workers')}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300 transition"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Workers</span>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">
            {stats?.total_workers || 0}
          </div>
          <span className="mt-1 block text-xs text-gray-500">Registered active accounts</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Completed Today
            </span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700 tabular-nums">
            {stats?.tasks_completed_today || 0}
          </div>
          <span className="mt-1 block text-xs text-gray-500">Verified review proofs</span>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Earnings Paid
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">
            ${stats?.total_earnings_today.toFixed(2) || '0.00'}
          </div>
          <span className="mt-1 block text-xs text-gray-500">Credited to Earning Balances</span>
        </div>

        <div
          onClick={() => onNavigateTab('withdrawals')}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300 transition"
        >
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Withdrawals
            </span>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700 tabular-nums">
            {stats?.pending_withdrawals || 0}
          </div>
          <span className="mt-1 block text-xs text-gray-500">Awaiting department approval</span>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => onNavigateTab('referrals')}
          className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs hover:border-emerald-300 transition"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Ticket className="h-4 w-4 text-emerald-600" />
              <span>Referral Codes (500)</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Confidential pool. Only Operations Team can view and issue codes. Single-use enforcement.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('workers')}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300 transition"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span>Worker Balances</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Search workers, inspect dual balances, and perform adjustments with mandatory audit logging.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('pricing')}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300 transition"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span>User-Specific Pricing</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Assign custom task earning amounts per individual worker. Transparent and matrix-controlled.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('deposits')}
          className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs hover:border-emerald-300 transition"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-600" />
              <span>Deposits Audit & Crypto</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Verify worker cryptocurrency and wire deposits. Approvals credit Earning Balance.
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('withdrawals')}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-xs hover:border-gray-300 transition"
        >
          <h3 className="text-sm font-bold text-gray-900 flex items-center justify-between">
            <span>Withdrawals Queue</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </h3>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Approve or reject payouts from Earning Balance. Rejections trigger automated funds reversal.
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Daily Task Status Change */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl text-gray-900">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${targetStatus === 'CLOSED' ? 'text-red-600' : 'text-emerald-600'}`}
              />
              <span>Confirm Task Status: {targetStatus}</span>
            </h3>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              This action will update the server submission gate and be recorded in the audit trail.
              Please provide an operational reason:
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Operational Note / Audit Reason
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Reason for changing status..."
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={toggling}
                onClick={handleConfirmToggle}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold text-white shadow-xs transition ${
                  targetStatus === 'CLOSED'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirm {targetStatus} Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
