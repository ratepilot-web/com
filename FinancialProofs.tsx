import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, ExternalLink, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';

interface ProofItem {
  id: number;
  task_id: number;
  worker_id: number;
  worker_name: string;
  worker_username: string;
  profile_code: string;
  task_title: string;
  business_name: string;
  stars_given: number;
  review_text: string;
  screenshot_path?: string;
  earning_credited: number;
  completed_at: string;
  cycle_id?: number;
}

export const FinancialProofs: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/financial/task-proofs', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setItems(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Task Proofs</h1>
          <p className="mt-1 text-xs text-gray-500">Review screenshots submitted by workers with their completed task records.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Task</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Reward</th><th className="px-4 py-3">Proof</th><th className="px-4 py-3">Completed</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No task proofs submitted yet.</td></tr> : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/70">
                  <td className="px-4 py-3"><div className="font-semibold text-gray-900">{item.worker_name}</div><div className="text-[10px] text-gray-400">@{item.worker_username} · {item.profile_code}</div></td>
                  <td className="px-4 py-3"><div className="font-semibold text-gray-900">{item.task_title}</div><div className="text-[10px] text-gray-500">{item.business_name}</div></td>
                  <td className="px-4 py-3">{'★'.repeat(item.stars_given)}{'☆'.repeat(5-item.stars_given)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">+${item.earning_credited.toFixed(2)}</td>
                  <td className="px-4 py-3">{item.screenshot_path ? <a href={item.screenshot_path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700"><ImageIcon className="h-3 w-3"/> View screenshot <ExternalLink className="h-3 w-3"/></a> : <span className="text-gray-400">No screenshot</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(item.completed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
