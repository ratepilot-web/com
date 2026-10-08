import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Tag,
  Save,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  DollarSign,
  Loader2,
} from 'lucide-react';

interface WorkerOption {
  id: number;
  full_name: string;
  email: string;
}

interface TaskOption {
  id: number;
  title: string;
  business_name?: string;
}

interface PriceRule {
  id: number;
  task_id: number;
  task_title: string;
  worker_id: number;
  worker_name: string;
  amount: number;
  updated_at: string;
}

export const FinancialPricing: React.FC = () => {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [workersRes, tasksRes, pricesRes] = await Promise.all([
        fetch('/api/financial/workers', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/financial/tasks/prices', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (workersRes.ok) {
        const wList = await workersRes.json();
        setWorkers(wList);
        if (wList.length > 0 && !selectedWorkerId) {
          setSelectedWorkerId(wList[0].id.toString());
        }
      }

      if (tasksRes.ok) {
        const tList = await tasksRes.json();
        setTasks(
          tList.map((t: any) => ({
            id: t.id,
            title: t.title,
            business_name: t.business?.name,
          }))
        );
        if (tList.length > 0 && !selectedTaskId) {
          setSelectedTaskId(tList[0].id.toString());
        }
      }

      if (pricesRes.ok) {
        setPriceRules(await pricesRes.json());
      }
    } catch (e) {
      console.error('Failed to load pricing data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWorkerId || !selectedTaskId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Earning reward must be greater than $0.00' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/financial/tasks/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task_id: parseInt(selectedTaskId, 10),
          worker_id: parseInt(selectedWorkerId, 10),
          amount: numAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save task price');
      }

      setFeedback({
        type: 'success',
        message: `Task price configured: Assigned +$${numAmount.toFixed(
          2
        )} to Worker ID #${selectedWorkerId} for Task #${selectedTaskId}`,
      });
      setAmount('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error configuring price' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          User-Specific Task Pricing Matrix
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure individualized earning amounts per worker. Workers receive only the specific
          amount set here by the Operations Team.
        </p>
      </div>

      {/* Pricing Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">Set Worker Task Earning Amount</h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure custom per-task rewards for individual workers based on tier and performance
          </p>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-md border p-3 text-xs flex items-center gap-2 ${
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

        <form onSubmit={handleSavePrice} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Worker select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-500" />
                <span>Select Worker</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.full_name} ({w.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Task select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-gray-500" />
                <span>Select Business / Task</span>
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    Task #{t.id}: {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Earning Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span>Task Earning ($ USD)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.25"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5.00"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-slate-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save User Price</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Configured Price Rules Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-4">Active User Pricing Rules</h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading pricing rules...</div>
        ) : priceRules.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No custom pricing rules configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-3">Worker</th>
                  <th className="py-3 px-3">Task ID</th>
                  <th className="py-3 px-3">Task Title</th>
                  <th className="py-3 px-3">Assigned Earning Reward</th>
                  <th className="py-3 px-3">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {priceRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3 font-semibold text-gray-900">{rule.worker_name}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">#{rule.task_id}</td>
                    <td className="py-3 px-3 text-gray-700">{rule.task_title}</td>
                    <td className="py-3 px-3 font-mono">
                      <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700 tabular-nums">
                        ${rule.amount.toFixed(2)} USD
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(rule.updated_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
