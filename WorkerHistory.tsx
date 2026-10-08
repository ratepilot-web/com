import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TaskCompletion } from '../types';
import { Star, CheckCircle2 } from 'lucide-react';

export const WorkerHistory: React.FC = () => {
  const { token } = useAuth();
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch('/api/tasks/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setCompletions(await res.json());
        }
      } catch (e) {
        console.error('Failed to load task history', e);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Task History</h1>
        <p className="text-xs text-gray-500 mt-1">
          Review your completed business ratings and feedback submissions
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading completed tasks...</div>
        ) : completions.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No completed tasks yet. Head over to Available Tasks to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                  <th className="py-3 px-3">Completed Date</th>
                  <th className="py-3 px-3">Business</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3">Feedback Excerpt</th>
                  <th className="py-3 px-3">Earning Credited</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {completions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80">
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(c.completed_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{c.business_name}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{c.stars_given}/5</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-600 max-w-sm">
                      <p className="truncate">Rating submitted: {c.stars_given}/5 stars</p>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700 tabular-nums">
                      +${c.earning_credited.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>Completed</span>
                      </span>
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
