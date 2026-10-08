import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Withdrawal } from '../types';
import {
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X,
} from 'lucide-react';

export const FinancialWithdrawals: React.FC = () => {
  const { token, refreshUserData } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Rejection modal
  const [rejectModalWd, setRejectModalWd] = useState<Withdrawal | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadWithdrawals = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/financial/withdrawals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWithdrawals(await res.json());
      }
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [token]);

  const handleProcess = async (
    withdrawalId: string,
    status: 'APPROVED' | 'REJECTED' | 'COMPLETED',
    reason?: string
  ) => {
    if (!token) return;
    setProcessingId(withdrawalId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/financial/withdrawals/${withdrawalId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          rejection_reason: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update withdrawal');
      }

      setFeedback(
        `Withdrawal ${withdrawalId} status updated to ${status}.${
          status === 'REJECTED' ? ' Funds automatically refunded to worker Earning Balance.' : ''
        }`
      );
      setRejectModalWd(null);
      setRejectionReason('');
      await loadWithdrawals();
      await refreshUserData();
    } catch (err: any) {
      alert(err.message || 'Error processing request');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = withdrawals.filter((w) => {
    if (filter === 'ALL') return true;
    return w.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Withdrawal Approvals</h1>
          <p className="text-xs text-gray-500 mt-1">
            Review worker payout requests from Earning Balance. Rejections trigger automated funds
            restoration.
          </p>
        </div>

        {/* Filters */}
        <div className="flex rounded-md border border-gray-200 bg-white p-1 shadow-xs">
          {['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                filter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading withdrawal queue...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No withdrawal requests match current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Worker</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method & Details</th>
                  <th className="py-3 px-3">Requested At</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3 font-mono font-medium text-gray-800">{w.withdrawal_id}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{w.worker_name}</td>
                    <td className="py-3 px-3 font-mono font-bold text-gray-900 tabular-nums">
                      ${w.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-gray-700 max-w-xs">
                      <span className="font-semibold text-gray-900">{w.payment_method}</span>
                      <p className="text-[11px] text-gray-500 truncate">{w.payment_details}</p>
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(w.requested_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                          w.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : w.status === 'APPROVED'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : w.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {w.status === 'PENDING' && <Clock className="h-3 w-3" />}
                        {w.status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
                        {w.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {w.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            disabled={processingId === w.withdrawal_id}
                            onClick={() => handleProcess(w.withdrawal_id, 'APPROVED')}
                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span>Approve</span>
                          </button>
                          <button
                            disabled={processingId === w.withdrawal_id}
                            onClick={() => setRejectModalWd(w)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-800 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {w.status === 'APPROVED' && (
                        <div className="flex items-center justify-end">
                          <button
                            disabled={processingId === w.withdrawal_id}
                            onClick={() => handleProcess(w.withdrawal_id, 'COMPLETED')}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 shadow-xs"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Mark Paid</span>
                          </button>
                        </div>
                      )}

                      {(w.status === 'COMPLETED' || w.status === 'REJECTED') && (
                        <span className="text-[11px] text-gray-400 font-mono">Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalWd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl text-gray-900">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span>Reject Withdrawal {rejectModalWd.withdrawal_id}</span>
            </h3>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Rejecting this request will immediately refund the full ${rejectModalWd.amount.toFixed(
                2
              )}{' '}
              back into {rejectModalWd.worker_name}'s Earning Balance, recording an automated
              ledger reversal.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Rejection Reason (Audit Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g. Invalid bank details, compliance check required..."
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-red-600 focus:outline-none"
                required
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalWd(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleProcess(rejectModalWd.withdrawal_id, 'REJECTED', rejectionReason)
                }
                className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-xs"
              >
                Confirm Rejection & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
