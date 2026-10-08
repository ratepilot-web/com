import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Lock,
  Wallet,
  X,
  Loader2,
} from 'lucide-react';

interface WorkerItem {
  id: number;
  email: string;
  phone_number?: string;
  profile_code?: string;
  task_access_approved?: boolean;
  level?: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  bonus_balance: number;
  earning_balance: number;
  completed_tasks_count: number;
}

export const FinancialWorkers: React.FC = () => {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Balance Adjustment Modal State
  const [activeWorker, setActiveWorker] = useState<WorkerItem | null>(null);
  const [balanceType, setBalanceType] = useState<'BONUS' | 'EARNING'>('BONUS');
  const [action, setAction] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const resetCredential = async (id:number, kind:'password'|'pin') => { if(!token)return; const r=await fetch(`/api/financial/workers/${id}/${kind==='password'?'password-reset':'pin-reset'}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}}); const d=await r.json(); if(!r.ok){setCredentialMessage(d.detail||'Reset failed');return;} setCredentialMessage(kind==='password'?`Temporary password: ${d.temporary_password}`:`Temporary payment PIN: ${d.temporary_pin}`); };

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadWorkers = async (q?: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const url = q ? `/api/financial/workers?query=${encodeURIComponent(q)}` : '/api/financial/workers';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWorkers(await res.json());
      }
    } catch (e) {
      console.error('Failed to load workers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers(searchQuery);
  }, [token, searchQuery]);

  const openAdjustmentModal = (
    worker: WorkerItem,
    bType: 'BONUS' | 'EARNING',
    act: 'INCREASE' | 'DECREASE'
  ) => {
    setActiveWorker(worker);
    setBalanceType(bType);
    setAction(act);
    setAmount('');
    setReason('');
    setFeedback(null);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorker || !token) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be greater than $0.00' });
      return;
    }

    if (!reason || reason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'Mandatory reason is required (min 3 characters).' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/financial/balances/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          worker_id: activeWorker.id,
          balance_type: balanceType,
          action,
          amount: numAmount,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Adjustment failed');
      }

      setFeedback({
        type: 'success',
        message: `Success! ${data.transaction_type} created (${data.transaction_id}). New ${data.balance_type} balance: $${data.new_balance.toFixed(
          2
        )}`,
      });

      await loadWorkers(searchQuery);
      setTimeout(() => {
        setActiveWorker(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error executing balance adjustment' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Worker Balance Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Search workers, inspect dual balances, and execute audited Bonus & Earning adjustments
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workers by name or email..."
            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {credentialMessage && <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{credentialMessage}</div>}

      {/* Workers Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading worker directory...</div>
        ) : workers.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No workers match query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-3">Worker</th>
                  <th className="py-3 px-3">Registered</th>
                  <th className="py-3 px-3">Tasks Completed</th>
                  <th className="py-3 px-3">Bonus Balance</th>
                  <th className="py-3 px-3">Earning Balance</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-gray-900">{w.full_name}</div>
                      <div className="text-[11px] text-gray-500">{w.email}</div><div className="text-[11px] text-gray-500">{w.phone_number || 'No phone on file'}</div><div className="text-[10px] font-mono text-gray-400">{w.profile_code}</div>
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(w.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-gray-700">
                      {w.completed_tasks_count}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-gray-800 tabular-nums">
                        ${w.bonus_balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-emerald-700 tabular-nums">
                        ${w.earning_balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">                        <button onClick={() => resetCredential(w.id,'password')} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Temp Password</button>
                        <button onClick={() => resetCredential(w.id,'pin')} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700">Reset PIN</button>

                        {/* Bonus Adjustment */}
                        <button
                          onClick={() => openAdjustmentModal(w, 'BONUS', 'INCREASE')}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          title="Increase Bonus Balance"
                        >
                          + Bonus
                        </button>
                        <button
                          onClick={() => openAdjustmentModal(w, 'BONUS', 'DECREASE')}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          title="Decrease Bonus Balance"
                        >
                          - Bonus
                        </button>

                        {/* Earning Adjustment */}
                        <button
                          onClick={() => openAdjustmentModal(w, 'EARNING', 'INCREASE')}
                          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                          title="Increase Earning Balance"
                        >
                          + Earning
                        </button>
                        <button
                          onClick={() => openAdjustmentModal(w, 'EARNING', 'DECREASE')}
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800 hover:bg-red-100"
                          title="Decrease Earning Balance"
                        >
                          - Earning
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Balance Adjustment Modal */}
      {activeWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl text-gray-900">
            <button
              onClick={() => setActiveWorker(null)}
              className="absolute right-4 top-4 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Balance Management
              </span>
              <h3 className="mt-1 text-lg font-bold text-gray-900">
                Adjust Balance for {activeWorker.full_name}
              </h3>
              <p className="text-xs text-gray-500">{activeWorker.email}</p>
            </div>

            {/* Current Balances Snapshot */}
            <div className="my-4 grid grid-cols-2 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">
                  Current Bonus Balance:
                </span>
                <div className="font-mono text-base font-bold text-gray-900 tabular-nums">
                  ${activeWorker.bonus_balance.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500">
                  Current Earning Balance:
                </span>
                <div className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                  ${activeWorker.earning_balance.toFixed(2)}
                </div>
              </div>
            </div>

            {feedback && (
              <div
                className={`mb-4 rounded-md border p-3 text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Select Balance Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBalanceType('BONUS')}
                  className={`flex items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition ${
                    balanceType === 'BONUS'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Bonus Balance</span>
                  <Lock className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType('EARNING')}
                  className={`flex items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition ${
                    balanceType === 'EARNING'
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Earning Balance</span>
                  <Wallet className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Select Action Direction */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('INCREASE')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition border ${
                    action === 'INCREASE'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span>Increase (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('DECREASE')}
                  className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition border ${
                    action === 'DECREASE'
                      ? 'border-red-600 bg-red-50 text-red-800'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Minus className="h-4 w-4 text-red-600" />
                  <span>Decrease (-)</span>
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Adjustment Amount ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-slate-900 focus:outline-none"
                  required
                />
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mandatory Audit Reason (Immutable Ledger Entry)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State operational reason (e.g. Monthly promotional reward, manual balance adjustment...)"
                  rows={2}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveWorker(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Execute Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
