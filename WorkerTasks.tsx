import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TaskItem } from '../types';
import { DailyTaskAlertBanner } from './DailyTaskAlertBanner';
import {
  Star,
  CheckCircle,
  AlertCircle,
  MapPin,
  X,
  ShieldAlert,
  Loader2,
  DollarSign,
  Play,
  ArrowRight,
  Clock,
  Wallet,
  AlertTriangle,
  Sparkles,
  Gift,
  PartyPopper,
} from 'lucide-react';

interface WorkerTasksProps {
  selectedTaskModal?: TaskItem | null;
  onCloseModal?: () => void;
}

export const WorkerTasks: React.FC<WorkerTasksProps> = ({
  selectedTaskModal = null,
  onCloseModal,
}) => {
  const { user, token, dailyStatus, refreshUserData } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [cycleProgress, setCycleProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Confirmation Modal for Starting Task (Requirement 3, 4, 12)
  const [taskToStart, setTaskToStart] = useState<TaskItem | null>(null);
  const [comboPreviewTask, setComboPreviewTask] = useState<TaskItem | null>(null);
  const [startingTask, setStartingTask] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Active Task Execution Modal (Requirement 7)
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  // Execution form states
  const [stars, setStars] = useState<number>(5);
  const [hoverStars, setHoverStars] = useState<number>(0);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
      const progressRes = await fetch('/api/tasks/progress', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (progressRes.ok) setCycleProgress(await progressRes.json());
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [token]);

  useEffect(() => {
    if (selectedTaskModal) {
      if (selectedTaskModal.assignment_status === 'IN_PROGRESS') {
        openTaskExecution(selectedTaskModal);
      } else if (!selectedTaskModal.has_completed) {
        if (selectedTaskModal.is_combo) setComboPreviewTask(selectedTaskModal);
        else setTaskToStart(selectedTaskModal);
      }
    }
  }, [selectedTaskModal]);

  const handleStartTaskClick = (task: TaskItem) => {
    if (task.assignment_status === 'IN_PROGRESS') {
      openTaskExecution(task);
      return;
    }
    setStartError(null);
    if (task.is_combo) {
      setComboPreviewTask(task);
      return;
    }
    setTaskToStart(task);
  };

  const handleConfirmStartTask = async (taskOverride?: TaskItem) => {
    const targetTask = taskOverride || taskToStart;
    if (!targetTask || !token) return;

    if (dailyStatus === 'CLOSED') {
      setStartError("Today's tasks are closed. Please return when tasks reopen.");
      return;
    }

    setStartingTask(true);
    setStartError(null);

    try {
      // Always re-read the server's authoritative sequential task immediately
      // before starting. Dashboard cards/modals can otherwise contain a stale
      // task object after a cycle update or server-side state change.
      const freshTasksRes = await fetch('/api/tasks', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const freshTasks = freshTasksRes.ok ? await freshTasksRes.json() : [];
      const currentTask = Array.isArray(freshTasks) && freshTasks.length ? freshTasks[0] : null;

      if (!currentTask) {
        throw new Error('No current task is available. Please refresh the page and try again.');
      }

      // If the authoritative task is already in progress, never POST /start
      // again; just reopen the execution screen.
      if (currentTask.assignment_status === 'IN_PROGRESS') {
        setTaskToStart(null);
        setComboPreviewTask(null);
        openTaskExecution(currentTask);
        return;
      }

      const startTaskId = currentTask.id;
      const res = await fetch(`/api/tasks/${startTaskId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to start task.');
      }

      // Immediately refresh user balance & tasks
      await refreshUserData();
      await loadTasks();

      // Open task execution modal using the server-authoritative task, not the
      // potentially stale task object that opened the confirmation dialog.
      const started = {
        ...currentTask,
        assignment_status: 'IN_PROGRESS' as const,
        is_in_progress: true,
      };
      setTaskToStart(null);
      setComboPreviewTask(null);
      openTaskExecution(started);
    } catch (err: any) {
      setStartError(err.message || 'An unexpected error occurred while starting task.');
    } finally {
      setStartingTask(false);
    }
  };

  const openTaskExecution = (task: TaskItem) => {
    setActiveTask(task);
    setStars(task.required_stars || 5);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const closeTaskModal = () => {
    setActiveTask(null);
    if (onCloseModal) onCloseModal();
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !token) return;

    if (dailyStatus === 'CLOSED') {
      setErrorMessage("Today's tasks are closed. Please return when tasks reopen.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('stars_given', String(stars));

      const res = await fetch(`/api/tasks/${activeTask.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to complete task.');
      }

      setSuccessMessage(
        `Success! Task completed and $${data.earning_credited.toFixed(
          2
        )} credited directly to your Earning Balance!`
      );
      await refreshUserData();
      await loadTasks();

      setTimeout(() => {
        closeTaskModal();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const earningBal = user?.earning_balance || 0;
  const bonusBal = user?.bonus_balance || 0;
  const totalTaskBalance = earningBal + bonusBal;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'AVAILABLE') {
      return !t.has_completed && t.assignment_status !== 'IN_PROGRESS';
    }
    if (filter === 'IN_PROGRESS') {
      return t.assignment_status === 'IN_PROGRESS';
    }
    if (filter === 'COMPLETED') {
      return t.has_completed || t.assignment_status === 'COMPLETED';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Available Tasks</h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete simple star-rating tasks. You will receive a fresh set of 20 tasks for each cycle.
          </p>
        </div>

        {/* Live Earning Balance Indicator */}
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Available for Tasks
            </span>
            <span className="text-base font-bold text-gray-900 tabular-nums">
              ${totalTaskBalance.toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>

      <DailyTaskAlertBanner status={dailyStatus} />

      {cycleProgress?.day_complete && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-xl font-black text-white">✓</div>
            <div>
              <h2 className="text-lg font-extrabold text-blue-950">Day {cycleProgress.day_number} completed — tasks are now closed</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">You completed {cycleProgress.tasks_completed} of {cycleProgress.task_limit} tasks. Your next task will be #{cycleProgress.next_task_number}, but it will not unlock automatically. The Operations Team must set the next day’s target, create the next day, and approve your access.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-md border border-gray-200 bg-white p-1 shadow-xs">
          {(['ALL', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED'] as const).map((tab) => (
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
                : tab === 'AVAILABLE'
                ? `Available (${tasks.filter((t) => !t.has_completed && t.assignment_status !== 'IN_PROGRESS').length})`
                : tab === 'IN_PROGRESS'
                ? `In Progress (${tasks.filter((t) => t.assignment_status === 'IN_PROGRESS').length})`
                : `Completed (${tasks.filter((t) => t.has_completed).length})`}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 font-medium">
          Showing {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Tasks Grid (Requirement 12 & 17) */}
      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-xs text-gray-500">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-slate-400" />
          <span className="mt-2 block">Loading tasks...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center text-xs text-gray-500">
          {cycleProgress?.day_complete
            ? `Day ${cycleProgress.day_number} is complete. Task ${cycleProgress.next_task_number} will unlock only after Operations Team approval.`
            : 'No tasks are available right now. Please check your task access approval or contact the Operations Team.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.has_completed || task.assignment_status === 'COMPLETED';
            const isInProgress = task.assignment_status === 'IN_PROGRESS';
            const hasEnoughBalance = totalTaskBalance >= task.price;
            const isDailyClosed = dailyStatus === 'CLOSED';

            return (
              <div
                key={task.id}
                className={`flex flex-col justify-between rounded-lg border p-5 shadow-xs transition ${task.is_combo ? 'border-amber-300 bg-amber-50/60 ring-1 ring-amber-200' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                      {task.business?.category || task.task_type}
                    </span>

                    {/* Task Price & Reward Badges (Requirement 2 & 12) */}
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800 tabular-nums">
                        Price: ${task.price.toFixed(2)}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-xs font-bold tabular-nums ${task.is_combo ? 'border border-amber-300 bg-amber-100 text-amber-900 shadow-sm' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        +${task.completion_amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Task {task.task_number ?? task.task_position ?? (task.cycle_tasks_completed ?? 0) + 1} · Day {task.task_day_number ?? 1} ({task.task_position ?? (task.cycle_tasks_completed ?? 0) + 1}/{task.cycle_task_limit ?? 20})
                  </div>
                  <h3 className="mt-3 text-base font-bold text-gray-900">{task.business?.name}</h3>
                  <div className="mt-0.5 text-xs font-medium text-slate-700">{task.title}</div>

                  {task.business?.address && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
                      <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                      <span className="truncate">{task.business.address}</span>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-3">
                    {task.instructions}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                      {[...Array(task.required_stars)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="ml-1 text-[11px] text-gray-500">
                        {task.required_stars} Stars
                      </span>
                    </div>

                    {/* Task status badge */}
                    {isCompleted ? (
                      <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200">
                        COMPLETED
                      </span>
                    ) : isInProgress ? (
                      <span className="rounded bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200 animate-pulse">
                        IN PROGRESS
                      </span>
                    ) : (
                      <span className="rounded bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-bold">
                        AVAILABLE
                      </span>
                    )}
                  </div>

                </div>

                <div className="mt-5 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
                    <span>Task Price: <strong className="text-gray-900">${task.price.toFixed(2)}</strong></span>
                    <span>Task Funds: <strong className="text-gray-900">${totalTaskBalance.toFixed(2)}</strong></span>
                  </div>

                  {/* START / CONTINUE BUTTON (Requirement 12) */}
                  <button
                    onClick={() => handleStartTaskClick(task)}
                    disabled={
                      isCompleted ||
                      (isDailyClosed && !isInProgress)
                    }
                    className={`w-full rounded-md py-2.5 text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      isCompleted
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : isInProgress
                        ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                        : isDailyClosed
                        ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed'
                        : !hasEnoughBalance
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span>Completed (+${task.completion_amount.toFixed(2)})</span>
                      </>
                    ) : isInProgress ? (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Continue Task (In Progress)</span>
                      </>
                    ) : isDailyClosed ? (
                      'Closed for Today'
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Task (Deduct ${task.price.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMBO ANNOUNCEMENT — shown before a combo task is started */}
      {comboPreviewTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300 bg-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400" />
            <div className="relative overflow-hidden px-7 pb-7 pt-10 text-center">
              <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-amber-200/40 blur-2xl" />
              <div className="pointer-events-none absolute -right-10 top-12 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl" />
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-amber-200 bg-gradient-to-br from-amber-100 via-yellow-50 to-emerald-100 text-amber-700 shadow-lg">
                <PartyPopper className="h-10 w-10" />
              </div>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-900">
                <Sparkles className="h-3.5 w-3.5" /> Special Combo Task
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Hurray! 🎉</h2>
              <p className="mt-2 text-lg font-bold text-emerald-700">Congratulations — you hit a Combo Task!</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
                You unlocked a special task with a boosted reward. Check the fee and reward below before starting.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Combo Fee</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">${comboPreviewTask.price.toFixed(2)}</div>
                </div>
                <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-emerald-50 p-4 shadow-sm">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-800"><Gift className="h-3.5 w-3.5" /> Combo Reward</div>
                  <div className="mt-1 text-2xl font-black text-emerald-700">+${comboPreviewTask.completion_amount.toFixed(2)}</div>
                  <div className="mt-1 text-[10px] font-bold text-amber-700">×{(comboPreviewTask.combo_multiplier ?? 2.5).toFixed(2)} multiplier</div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button type="button" onClick={() => setComboPreviewTask(null)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Not Now</button>
                <button type="button" onClick={() => handleConfirmStartTask(comboPreviewTask)} disabled={startingTask || totalTaskBalance < comboPreviewTask.price} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50">
                  {startingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Okay, Show My Combo Task
                </button>
              </div>
              {totalTaskBalance < comboPreviewTask.price && (
                <p className="mt-3 text-xs font-semibold text-red-600">You need ${comboPreviewTask.price.toFixed(2)} available to start this combo task.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TASK START CONFIRMATION MODAL (Requirement 3, 4, 12, 13) */}
      {taskToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl my-8 text-gray-900">
            <button
              onClick={() => setTaskToStart(null)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-gray-100 pb-3">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-800 border border-slate-200">
                TASK START CONFIRMATION
              </span>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                {taskToStart.business?.name}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{taskToStart.title}</p>
            </div>

            {/* Prompt Requirement 12 exact confirmation message */}
            <div className="my-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs">
              <p className="font-semibold text-gray-900">
                Starting this task will use ${taskToStart.price.toFixed(2)} from your available task funds (Bonus Balance first, then Earning Balance).
              </p>
            </div>

            {/* Financial Ledger Calculation Breakdown */}
            <div className="rounded-md border border-gray-200 bg-white p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-gray-600">
                <span>Bonus + Earning Available:</span>
                <span className="font-bold text-gray-900 tabular-nums">
                  ${totalTaskBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-red-600 font-semibold">
                <span>Task Price (Debit):</span>
                <span className="tabular-nums">-${taskToStart.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-gray-900 font-bold">
                <span>Balance After Starting:</span>
                <span className="tabular-nums">
                  ${Math.max(0, totalTaskBalance - taskToStart.price).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-700 text-[11px] pt-1 border-t border-gray-50">
                <span>Completion Reward Upon Verification:</span>
                <span className="font-bold tabular-nums">
                  +${taskToStart.completion_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* INSUFFICIENT BALANCE WARNING (Requirement 4) */}
            {totalTaskBalance < taskToStart.price && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-red-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>Insufficient task funds to start this task.</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>Required: <strong className="font-bold text-red-900">${taskToStart.price.toFixed(2)}</strong></div>
                  <div>Available: <strong className="font-bold text-red-900">${totalTaskBalance.toFixed(2)}</strong></div>
                </div>
                <p className="text-[11px] text-red-700 pt-1">
                  You need at least ${taskToStart.price.toFixed(2)} in available task funds. Bonus Balance is used first, followed by Earning Balance.
                </p>
              </div>
            )}

            {startError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{startError}</span>
              </div>
            )}

            {/* Modal Buttons (Requirement 12: [Cancel] [Start Task]) */}
            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTaskToStart(null)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartTask}
                disabled={startingTask || totalTaskBalance < taskToStart.price}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {startingTask && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Start Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TASK EXECUTION & COMPLETION MODAL (Requirement 7 & 8) */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl my-8 text-gray-900">
            <button
              onClick={closeTaskModal}
              className="absolute right-4 top-4 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                  TASK #{activeTask.id} • IN PROGRESS
                </span>
                <span className="text-xs text-gray-500">
                  {activeTask.business?.category || activeTask.task_type}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-gray-900">
                {activeTask.business?.name}
              </h2>
              <p className="text-xs text-gray-600 mt-1">{activeTask.instructions}</p>
            </div>

            {/* Business Details Panel */}
            <div className="my-4 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Completion Reward:</span>
                <span className="font-bold text-emerald-700 text-sm tabular-nums">
                  +${activeTask.completion_amount?.toFixed(2)} USD
                </span>
              </div>
              {activeTask.business?.address && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{activeTask.business.address}</span>
                </div>
              )}
              {activeTask.business?.ratingGuidelines && (
                <div className="rounded bg-white p-2.5 text-gray-700 border border-gray-200">
                  <span className="font-semibold text-gray-900">Guidelines: </span>
                  {activeTask.business.ratingGuidelines}
                </div>
              )}
            </div>

            {/* Messages */}
            {errorMessage && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleTaskSubmit} className="space-y-4">
              {/* Star Rating Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  1. Select Star Rating (Required: {activeTask.required_stars} Stars)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= (hoverStars || stars);
                    return (
                      <button
                        type="button"
                        key={starValue}
                        onClick={() => setStars(starValue)}
                        onMouseEnter={() => setHoverStars(starValue)}
                        onMouseLeave={() => setHoverStars(0)}
                        className="p-1 transition hover:scale-105"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs font-bold text-gray-700">{stars} / 5 Stars</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close & Return
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit Rating & Complete Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
