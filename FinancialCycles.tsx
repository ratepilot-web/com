import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export const FinancialCycles: React.FC = () => {
  const { token } = useAuth();
  const [workers,setWorkers]=useState<any[]>([]);
  const [selected,setSelected]=useState('');
  const [target,setTarget]=useState('60');
  const [approved,setApproved]=useState(false);
  const [resetBalances,setResetBalances]=useState(false);
  const [msg,setMsg]=useState<any>(null);

  const load=async()=>{
    if(!token)return;
    const r=await fetch('/api/financial/workers',{headers:{Authorization:`Bearer ${token}`}});
    if(r.ok){
      const d=await r.json();
      setWorkers(d);
      if(d[0]&&!selected){
        setSelected(String(d[0].id));
        setTarget(String(d[0].current_cycle?.targetReward??60));
        setApproved(!!d[0].task_access_approved);
      }
    }
  };
  useEffect(()=>{load()},[token]);

  const current=workers.find(w=>String(w.id)===selected);
  const cycleComplete = Number(current?.current_cycle?.tasksCompleted ?? 0) >= Number(current?.current_cycle?.taskLimit ?? 20);

  const saveApproval=async()=>{
    const r=await fetch(`/api/financial/workers/${selected}/task-access`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({approved})
    });
    const d=await r.json();
    setMsg({ok:r.ok,text:d.detail||`Task access ${approved?'approved':'paused'}.`});
    await load();
  };

  const reset=async()=>{
    if(!selected)return;
    const actionText = cycleComplete
      ? (resetBalances ? 'create the next day AND set both balances to $0.00' : 'create the next sequential day while keeping the current balances')
      : 'save the target for the current day and pause access until approval';
    if(!window.confirm(`Are you sure you want to ${actionText}?`)) return;
    const endpoint = cycleComplete
      ? `/api/financial/workers/${selected}/cycle/reset`
      : `/api/financial/workers/${selected}/cycle/target`;
    const r=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
      body:JSON.stringify({target_reward:Number(target),reset_balances:resetBalances})
    });
    const d=await r.json();
    if (r.ok) setApproved(false);
    setMsg({ok:r.ok,text:d.detail||(cycleComplete
      ? `Day ${Number(current?.current_cycle?.cycleNumber??1)+1} created. It continues at Task ${(Number(current?.current_cycle?.cycleNumber??1)*20)+1}. Save approval separately to unlock it.`
      : `Today's target set to $${Number(target).toFixed(2)}. Save approval separately to unlock tasks.`)});
    await load();
  };

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Worker Task Cycles</h1>
      <p className="mt-1 text-xs text-gray-500">Tasks run in order: Day 1 is Tasks 1–20, Day 2 is Tasks 21–40, and so on. When a worker finishes 20 tasks, that worker’s day closes. Operations Team must set the target, create the next sequential day, and separately approve access.</p>
    </div>

    <div className="rounded-lg border bg-white p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold">Worker</label>
          <select value={selected} onChange={e=>{
            setSelected(e.target.value);
            const w=workers.find(x=>String(x.id)===e.target.value);
            setTarget(String(w?.current_cycle?.targetReward??60));
            setApproved(!!w?.task_access_approved);
            setResetBalances(false);
            setMsg(null);
          }} className="mt-1 w-full rounded border px-3 py-2 text-sm">
            {workers.map(w=><option key={w.id} value={w.id}>{w.full_name} — {w.profile_code}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold">Set daily target (required)</label>
          <input type="number" min="0.01" step="0.01" value={target} onChange={e=>setTarget(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm"/>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> Task access approved</label>
        </div>
        <div className="flex items-end">
          <button onClick={saveApproval} className="rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Save Approval</button>
        </div>
      </div>

      {current && <>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="rounded bg-slate-50 p-3"><span className="text-gray-500">Profile</span><b className="block">{current.profile_code}</b></div>
          <div className="rounded bg-slate-50 p-3"><span className="text-gray-500">Progress</span><b className="block">{current.current_cycle?.tasksCompleted??0} / {current.current_cycle?.taskLimit??20}</b></div>
          <div className="rounded bg-slate-50 p-3"><span className="text-gray-500">Reward</span><b className="block">${Number(current.current_cycle?.rewardAccumulated??0).toFixed(2)}</b></div>
          <div className="rounded bg-slate-50 p-3"><span className="text-gray-500">Bonus Balance</span><b className="block">${Number(current.bonus_balance??0).toFixed(2)}</b></div>
          <div className="rounded bg-slate-50 p-3"><span className="text-gray-500">Earning Balance</span><b className="block">${Number(current.earning_balance??0).toFixed(2)}</b></div>
        </div>

        {cycleComplete && <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>20/20 completed.</b> Today's tasks are closed. The next day starts at Task {(Number(current.current_cycle?.cycleNumber ?? 1) * 20) + 1} only after Operations Team sets its target and approves access.
        </div>}

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Reset balance options</div>
          <p className="mt-1 text-xs text-slate-600">Choose which balance behavior to use when the next day is created. This choice does not change balances while setting today's target. The new day remains locked until Operations Team separately approves access.</p>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="reset-balance" checked={!resetBalances} onChange={()=>setResetBalances(false)} className="mt-1"/>
              <span><b>Reset WITHOUT balance reset</b><span className="block text-xs text-slate-500">Start the next sequential 20-task day and keep the worker's current Bonus and Earning Balances.</span></span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="reset-balance" checked={resetBalances} onChange={()=>setResetBalances(true)} className="mt-1"/>
              <span><b>Reset WITH balance reset</b><span className="block text-xs text-slate-500">Start the next sequential 20-task day and set both Bonus Balance and Earning Balance to $0.00.</span></span>
            </label>
          </div>
        </div>
      </>}

      {msg && <div className={`mt-4 rounded border p-3 text-xs ${msg.ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-red-200 bg-red-50 text-red-700'}`}>{msg.ok?<CheckCircle className="inline h-4 w-4 mr-2"/>:<AlertCircle className="inline h-4 w-4 mr-2"/>}{msg.text}</div>}
      <div className="mt-5 flex gap-2">
        <button onClick={reset} disabled={!selected} className="flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><RotateCcw className="h-4 w-4"/>{cycleComplete ? 'Set Target & Create Next Day' : 'Save Today’s Target'}</button>
      </div>
    </div>
  </div>
};
