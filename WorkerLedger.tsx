import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BalanceTransaction } from '../types';

export const WorkerLedger: React.FC = () => {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLedger = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch('/api/transactions/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setTransactions(await res.json());
        }
      } catch (e) {
        console.error('Failed to load transaction ledger', e);
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [token]);

  const filtered = transactions.filter((tx) => {
    const txType = tx.transaction_type || (tx as any).transactionType || '';
    const balType = tx.balance_type || (tx as any).balanceType || '';
    if (filterType === 'ALL') return true;
    if (filterType === 'EARNINGS') return txType === 'TASK_EARNING';
    if (filterType === 'BONUS') return balType === 'BONUS';
    if (filterType === 'WITHDRAWAL') return txType.includes('WITHDRAWAL');
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="text-xs text-gray-500 mt-1">
            Immutable, audit-ready record of every balance change and task compensation on your account
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {['ALL', 'EARNINGS', 'BONUS', 'WITHDRAWAL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                filterType === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading ledger records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No transactions match filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Balance Target</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Previous</th>
                  <th className="py-3 px-3">New Balance</th>
                  <th className="py-3 px-3">Reason / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filtered.map((tx) => {
                  const txType = tx.transaction_type || (tx as any).transactionType || '';
                  const balType = tx.balance_type || (tx as any).balanceType || 'EARNING';
                  const txId = tx.transaction_id || (tx as any).transactionId || `TX-${tx.id}`;
                  const createdAt =
                    tx.created_at || (tx as any).createdAt || new Date().toISOString();
                  const amountVal = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount || 0);
                  const prevBalVal =
                    typeof tx.previous_balance === 'number'
                      ? tx.previous_balance
                      : Number((tx as any).previousBalance || 0);
                  const newBalVal =
                    typeof tx.new_balance === 'number'
                      ? tx.new_balance
                      : Number((tx as any).newBalance || 0);
                  const isCredit = txType.includes('CREDIT') || txType === 'TASK_EARNING';

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3 font-mono font-medium text-gray-800">{txId}</td>
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            balType === 'BONUS'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {balType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-700">{txType}</td>
                      <td className="py-3 px-3 font-mono font-bold tabular-nums">
                        <span className={isCredit ? 'text-emerald-700' : 'text-red-600'}>
                          {isCredit ? '+' : '-'}${amountVal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500 tabular-nums">
                        ${prevBalVal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 tabular-nums">
                        ${newBalVal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs">{tx.reason}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
