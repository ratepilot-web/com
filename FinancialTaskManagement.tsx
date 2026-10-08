import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FinancialTask, Business } from '../types';
import {
  Briefcase,
  Plus,
  CheckCircle,
  AlertCircle,
  Edit2,
  Power,
  Layers,
  X,
  Loader2,
  DollarSign,
  Star,
  Info,
} from 'lucide-react';

export const FinancialTaskManagement: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<FinancialTask[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [maxActive, setMaxActive] = useState<number>(300);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<FinancialTask | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formBizId, setFormBizId] = useState('');
  const [formTaskType, setFormTaskType] = useState('Rating');
  const [formPrice, setFormPrice] = useState('');
  const [formCompletionAmount, setFormCompletionAmount] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formStars, setFormStars] = useState(5);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsCombo, setFormIsCombo] = useState(false);
  const [formComboMultiplier, setFormComboMultiplier] = useState('2.5');
  const [formComboWorkerId, setFormComboWorkerId] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const workerRes = await fetch('/api/financial/workers', { headers: { Authorization: `Bearer ${token}` } });
      if (workerRes.ok) setWorkers(await workerRes.json());
      const res = await fetch('/api/financial/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setActiveCount(data.active_count || 0);
        setMaxActive(data.max_active || 300);
        setBusinesses(data.businesses || []);
        if (data.businesses && data.businesses.length > 0 && !formBizId) {
          setFormBizId(data.businesses[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Error loading financial tasks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [token]);

  const openCreateModal = () => {
    setFormTitle('');
    setFormBizId(businesses[0]?.id.toString() || '1');
    setFormTaskType('Rating');
    setFormPrice('10.00');
    setFormCompletionAmount('15.00');
    setFormInstructions(
      'Open the listed business profile and submit the required star rating. No written review is required.'
    );
    setFormStars(5);
    setFormIsActive(activeCount < maxActive);
    setFormIsCombo(false); setFormComboMultiplier('2.5'); setFormComboWorkerId('');
    setFeedback(null);
    setShowCreateModal(true);
  };

  const openEditModal = (task: FinancialTask) => {
    setSelectedTask(task);
    setFormTitle(task.title);
    setFormBizId(task.business_id.toString());
    setFormTaskType(task.task_type || 'Rating');
    setFormPrice(task.price.toFixed(2));
    setFormCompletionAmount(task.completion_amount.toFixed(2));
    setFormInstructions(task.instructions);
    setFormStars(task.required_stars || 5);
    setFormIsActive(task.is_active);
    setFormIsCombo(!!task.is_combo); setFormComboMultiplier(String(task.combo_multiplier || 2.5)); setFormComboWorkerId('');
    setFeedback(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const numPrice = parseFloat(formPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFeedback({ type: 'error', message: 'Task price must be a valid positive amount (> $0.00)' });
      return;
    }
    if (formIsCombo) {
      const multiplier = Number(formComboMultiplier);
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        setFeedback({ type: 'error', message: 'Combo multiplier must be greater than 0.' });
        return;
      }
    }

    const numCompletion = parseFloat(formCompletionAmount);
    if (isNaN(numCompletion) || numCompletion <= 0) {
      setFeedback({
        type: 'error',
        message: 'Completion reward amount must be a valid positive amount',
      });
      return;
    }

    if (formIsActive && activeCount >= maxActive) {
      setFeedback({
        type: 'error',
        message: `Maximum limit of ${maxActive} active tasks reached (${activeCount}/${maxActive}). Deactivate an existing task before activating another.`,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const workerRes = await fetch('/api/financial/workers', { headers: { Authorization: `Bearer ${token}` } });
      if (workerRes.ok) setWorkers(await workerRes.json());
      const res = await fetch('/api/financial/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          business_id: parseInt(formBizId, 10),
          task_type: formTaskType.trim(),
          instructions: formInstructions.trim(),
          price: numPrice,
          completion_amount: numCompletion,
          required_stars: formStars,
          is_active: formIsActive,
          is_combo: formIsCombo,
          combo_multiplier: formIsCombo ? Number(formComboMultiplier) : 2.5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create task');
      }

      if (formIsCombo) {
        if (!formComboWorkerId) throw new Error('Select the worker who should receive this Combo Task.');
        const comboRes = await fetch(`/api/financial/tasks/${data.task.id}/combo`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({worker_id:Number(formComboWorkerId), price:numPrice, multiplier:Number(formComboMultiplier)}) });
        const comboData=await comboRes.json(); if(!comboRes.ok) throw new Error(comboData.detail||'Failed to configure combo assignment');
      }

      setFeedback({
        type: 'success',
        message: `Task successfully created with price $${numPrice.toFixed(
          2
        )} and completion reward $${numCompletion.toFixed(2)}.`,
      });

      await loadTasks();
      setTimeout(() => setShowCreateModal(false), 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating task' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTask) return;

    const numPrice = parseFloat(formPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFeedback({ type: 'error', message: 'Task price must be a valid positive amount (> $0.00)' });
      return;
    }
    if (formIsCombo) {
      const multiplier = Number(formComboMultiplier);
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        setFeedback({ type: 'error', message: 'Combo multiplier must be greater than 0.' });
        return;
      }
    }

    const numCompletion = parseFloat(formCompletionAmount);
    if (isNaN(numCompletion) || numCompletion <= 0) {
      setFeedback({
        type: 'error',
        message: 'Completion reward amount must be a valid positive amount',
      });
      return;
    }

    if (formIsActive && !selectedTask.is_active && activeCount >= maxActive) {
      setFeedback({
        type: 'error',
        message: `Maximum limit of ${maxActive} active tasks reached (${activeCount}/${maxActive}). Deactivate another task before activating this one.`,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/financial/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          business_id: parseInt(formBizId, 10),
          task_type: formTaskType.trim(),
          instructions: formInstructions.trim(),
          price: numPrice,
          completion_amount: numCompletion,
          required_stars: formStars,
          is_active: formIsActive,
          is_combo: formIsCombo,
          combo_multiplier: formIsCombo ? Number(formComboMultiplier) : 2.5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update task');
      }
      if (formIsCombo) {
        if (!formComboWorkerId) throw new Error('Select the worker who should receive this Combo Task.');
        const comboRes = await fetch(`/api/financial/tasks/${selectedTask.id}/combo`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({worker_id:Number(formComboWorkerId), price:numPrice, multiplier:Number(formComboMultiplier)}) });
        const comboData=await comboRes.json(); if(!comboRes.ok) throw new Error(comboData.detail||'Failed to configure combo assignment');
      }

      setFeedback({
        type: 'success',
        message: `Task #${selectedTask.id} successfully updated.`,
      });

      await loadTasks();
      setTimeout(() => setShowEditModal(false), 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating task' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (task: FinancialTask) => {
    if (!token) return;

    const targetActive = !task.is_active;

    if (targetActive && activeCount >= maxActive) {
      alert(
        `Maximum limit of ${maxActive} active tasks reached (${activeCount}/${maxActive}). You must deactivate an existing task before activating another.`
      );
      return;
    }

    try {
      const res = await fetch(`/api/financial/tasks/${task.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: targetActive }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to change task status');
      }

      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Error updating task status');
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'ACTIVE') return t.is_active;
    if (filter === 'INACTIVE') return !t.is_active;
    return true;
  });

  const capacityPercentage = Math.round((activeCount / maxActive) * 100);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200">
              TASK GOVERNANCE
            </span>
            <span className="text-xs text-gray-500">Operations Team Control</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="mt-1 text-xs text-gray-500">
            Configure tasks, enforce prices, and control published availability. Terrkeet supports
            up to 300 tasks at a time.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Active Tasks Capacity Widget (Requirement 1, 10, 18) */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                ACTIVE TASKS
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                  activeCount >= maxActive
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {activeCount} / {maxActive}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                {activeCount}
              </span>
              <span className="text-sm font-medium text-gray-500">/ {maxActive} Active Tasks</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              {activeCount >= maxActive ? (
                <span className="text-red-600 font-semibold">
                  Maximum capacity reached. Deactivate an existing task to publish a new one.
                </span>
              ) : (
                <span>
                  {maxActive - activeCount} active task slot{maxActive - activeCount === 1 ? '' : 's'}{' '}
                  available. Workers can only see and start active tasks.
                </span>
              )}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-medium">
              <span>Platform Capacity</span>
              <span>{capacityPercentage}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  activeCount >= maxActive ? 'bg-red-600' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, capacityPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-md border border-gray-200 bg-white p-1 shadow-xs">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                filter === tab
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'ALL'
                ? `All (${tasks.length})`
                : tab === 'ACTIVE'
                ? `Active (${tasks.filter((t) => t.is_active).length})`
                : `Inactive (${tasks.filter((t) => !t.is_active).length})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Showing {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Tasks Table (Requirement 10) */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-700">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Task Type</th>
                <th className="px-4 py-3">Start Price</th>
                <th className="px-4 py-3">Completion Reward</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-gray-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
                    <span className="mt-2 block">Loading task directory...</span>
                  </td>
                </tr>
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-gray-500">
                    No tasks found matching filter.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{t.title}</div>
                      <div className="text-[11px] text-gray-500">ID #{t.id} • {t.required_stars} Stars Required</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{t.business?.name || `Business #${t.business_id}`}</div>
                      <div className="text-[11px] text-gray-500">{t.business?.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        {t.task_type || 'Rating'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 tabular-nums text-xs">
                        ${t.price.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-gray-500">Start Fee (Debit)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-emerald-700 tabular-nums text-xs">
                        +${t.completion_amount.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-gray-500">Worker Payout</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums">
                      {new Date(t.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(t)}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
                          title="Edit Task"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t)}
                          className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                            t.is_active
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {t.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl my-8 text-gray-900">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Create New Task</h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure task parameters, start price, and completion reward
              </p>
            </div>

            {feedback && (
              <div
                className={`my-4 rounded-md p-3 text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
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

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Business
                </label>
                <select
                  value={formBizId}
                  onChange={(e) => setFormBizId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rating #28: ..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Task Type</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value="Rating"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Required Stars</label>
                  <select
                    value={formStars}
                    onChange={(e) => setFormStars(parseInt(e.target.value, 10))}
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {s} Star{s > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Completion Reward */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Task Price (Start Debit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      placeholder="10.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-1.5 text-xs font-bold text-gray-900 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <span className="block text-[10px] text-gray-500 mt-1">
                    Deducted from Earning Balance on start
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Completion Reward
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      placeholder="15.00"
                      value={formCompletionAmount}
                      onChange={(e) => setFormCompletionAmount(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-1.5 text-xs font-bold text-emerald-700 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <span className="block text-[10px] text-gray-500 mt-1">
                    Credited on task completion
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Worker Instructions
                </label>
                <textarea
                  rows={3}
                  required
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Status Toggle with 40 active limit notice */}
              <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    disabled={activeCount >= maxActive}
                    className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-gray-900">
                    Publish immediately as Active Task
                  </span>
                </label>
                {activeCount >= maxActive && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">
                    Maximum limit of 300 tasks reached ({activeCount}/{maxActive}). Task will be
                    saved as Inactive.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl my-8 text-gray-900">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Edit Task #{selectedTask.id}</h2>
              <p className="text-xs text-gray-500 mt-1">Modify task price, reward, and parameters</p>
            </div>

            {feedback && (
              <div
                className={`my-4 rounded-md p-3 text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border border-red-200 bg-red-50 text-red-800'
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

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Business
                </label>
                <select
                  value={formBizId}
                  onChange={(e) => setFormBizId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Task Type</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value="Rating"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Required Stars</label>
                  <select
                    value={formStars}
                    onChange={(e) => setFormStars(parseInt(e.target.value, 10))}
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                  >
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {s} Star{s > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Completion Reward */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">
                    Task Price (Start Debit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-1.5 text-xs font-bold text-gray-900 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <span className="block text-[10px] text-gray-500 mt-1">
                    Deducted from Earning Balance
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Completion Reward
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs text-gray-500 font-bold">$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={formCompletionAmount}
                      onChange={(e) => setFormCompletionAmount(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white pl-6 pr-2 py-1.5 text-xs font-bold text-emerald-700 focus:border-slate-900 focus:outline-hidden"
                    />
                  </div>
                  <span className="block text-[10px] text-gray-500 mt-1">
                    Credited on task completion
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Worker Instructions
                </label>
                <textarea
                  rows={3}
                  required
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white p-2 text-xs focus:border-slate-900 focus:outline-hidden"
                />
              </div>

              <div className={`rounded-md border p-3 ${formIsCombo ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formIsCombo} onChange={e=>setFormIsCombo(e.target.checked)} className="h-4 w-4 rounded border-gray-300"/>
                  <span className="text-xs font-bold text-gray-900">Turn this task into a Combo Task</span>
                </label>
                {formIsCombo && <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3"><div><label className="block text-[11px] font-semibold text-gray-700 mb-1">Worker</label><select value={formComboWorkerId} onChange={e=>setFormComboWorkerId(e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs"><option value="">Select worker...</option>{workers.map(w=><option key={w.id} value={w.id}>{w.full_name} — {w.profile_code}</option>)}</select></div>
                  <div><label className="block text-[11px] font-semibold text-gray-700 mb-1">Combo Fee / Price</label><input type="number" step="0.01" min="0.01" value={formPrice} onChange={e=>setFormPrice(e.target.value)} className="w-full rounded border px-2 py-1.5 text-xs"/></div>
                  <div><label className="block text-[11px] font-semibold text-gray-700 mb-1">Combo Multiplier</label><input type="number" step="0.1" min="0.1" value={formComboMultiplier} onChange={e=>setFormComboMultiplier(e.target.value)} className="w-full rounded border border-amber-300 bg-white px-2 py-1.5 text-xs font-bold text-amber-900 focus:border-amber-500 focus:outline-none"/><p className="mt-1 text-[10px] text-amber-800">Editable by Operations Team. Example: $100 × 2.5 = $250; $100 × 3 = $300.</p></div>
                </div>}
              </div>

              {/* Status Toggle */}
              <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    disabled={!selectedTask.is_active && activeCount >= maxActive}
                    className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-semibold text-gray-900">Task is Active</span>
                </label>
                {!selectedTask.is_active && activeCount >= maxActive && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">
                    Maximum limit of 300 tasks reached ({activeCount}/{maxActive}). Deactivate
                    another task before activating this one.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Update Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
