import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BalanceTransaction, AuditLogItem } from '../types';
import { BookOpen, ShieldCheck } from 'lucide-react';

export const FinancialLedger: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'AUDIT'>('LEDGER');
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [txRes, auditRes] = await Promise.all([
        fetch('/api/financial/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (e) {
      console.error('Failed to load ledger records', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Audit Ledger & System Records
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete immutable ledger of all balance changes and server-side operational audit logs
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-md border border-gray-200 bg-white p-1 shadow-xs">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'LEDGER'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Financial Ledger ({transactions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'AUDIT'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'LEDGER' ? (
        /* Financial Ledger Table */
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 mb-4">Master Financial Ledger</h2>
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading ledger...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No transactions recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    <th className="py-3 px-3">Transaction ID</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Worker</th>
                    <th className="py-3 px-3">Balance Target</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Previous</th>
                    <th className="py-3 px-3">New Balance</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {transactions.map((tx) => {
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
                        <td className="py-3 px-3 font-semibold text-gray-900">{tx.worker_name}</td>
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
                        <td className="py-3 px-3 text-gray-500">
                          {tx.performed_by_name || 'System'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Table */
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-gray-900 mb-4">System Operational Audit Log</h2>
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">Loading audit trail...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No audit records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Entity Type</th>
                    <th className="py-3 px-3">Entity ID</th>
                    <th className="py-3 px-3">User</th>
                    <th className="py-3 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-3 text-gray-700 font-medium">{log.entity_type}</td>
                      <td className="py-3 px-3 font-mono text-gray-500">{log.entity_id || '—'}</td>
                      <td className="py-3 px-3 text-gray-900 font-medium">
                        {log.user_name || 'System'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 max-w-sm truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
