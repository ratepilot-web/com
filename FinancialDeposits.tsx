import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Coins,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface FinancialDepositItem {
  id: number;
  deposit_id: string;
  worker_id: number;
  worker_name: string;
  worker_username: string;
  amount: number;
  payment_method: string;
  crypto_currency?: string;
  crypto_address?: string;
  tx_hash?: string;
  proof_note?: string;
  proof_screenshot_path?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejection_reason?: string;
  processed_by_id?: number;
  requested_at: string;
  processed_at?: string;
}

interface FinancialDepositsSummary {
  total: number;
  pending_count: number;
  approved_count: number;
  total_volume: number;
  deposits: FinancialDepositItem[];
}

export const FinancialDeposits: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<FinancialDepositsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Modal / Action state
  const [rejectingDeposit, setRejectingDeposit] = useState<FinancialDepositItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletForm, setWalletForm] = useState({ name: '', symbol: '', network: '', address: '', min_deposit: '10', confirmations: '1', rate_usd: '1', qr_data: '' });
  const [savingWallet, setSavingWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<any|null>(null);

  const fetchDeposits = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const walletRes = await fetch('/api/financial/crypto-wallets', { headers: { Authorization: `Bearer ${token}` } });
      if (walletRes.ok) setWallets(await walletRes.json());
      const res = await fetch('/api/financial/deposits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load financial deposits');
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error fetching deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [token]);

  const handleCopyTx = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleProcessDeposit = async (
    depositId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    if (!token) return;
    setProcessingId(depositId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/financial/deposits/${depositId}/process`, {
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

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Failed to process deposit');
      }

      setSuccessMsg(
        status === 'APPROVED'
          ? `Deposit ${depositId} successfully approved! Worker's Earning Balance has been credited.`
          : `Deposit ${depositId} has been rejected.`
      );
      setRejectingDeposit(null);
      setRejectionReason('');
      await fetchDeposits();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error processing deposit');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingWallet(true); setErrorMsg(null); setSuccessMsg(null);
    try {
      const res = await fetch('/api/financial/crypto-wallets', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...walletForm, min_deposit: Number(walletForm.min_deposit), confirmations: Number(walletForm.confirmations), rate_usd: Number(walletForm.rate_usd) }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Failed to add wallet');
      setSuccessMsg(`Crypto wallet ${json.symbol} / ${json.network} added and available for worker deposits.`);
      setWalletForm({ name: '', symbol: '', network: '', address: '', min_deposit: '10', confirmations: '1', rate_usd: '1', qr_data: '' });
      await fetchDeposits();
    } catch (e: any) { setErrorMsg(e.message || 'Failed to add wallet'); } finally { setSavingWallet(false); }
  };

  const saveWallet = async (e: React.FormEvent) => { e.preventDefault(); if(!token)return; setSavingWallet(true); setErrorMsg(null); try { const url=editingWallet?`/api/financial/crypto-wallets/${editingWallet.id}`:'/api/financial/crypto-wallets'; const method=editingWallet?'PUT':'POST'; const res=await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({...walletForm,min_deposit:Number(walletForm.min_deposit),confirmations:Number(walletForm.confirmations),rate_usd:Number(walletForm.rate_usd)})}); const j=await res.json(); if(!res.ok)throw new Error(j.detail||'Failed to save wallet'); setSuccessMsg(editingWallet?'Wallet updated.':'Wallet added.'); setEditingWallet(null); setWalletForm({name:'',symbol:'',network:'',address:'',min_deposit:'10',confirmations:'1',rate_usd:'1',qr_data:''}); await fetchDeposits(); } catch(e:any){setErrorMsg(e.message)} finally{setSavingWallet(false)} };
  const editWallet=(w:any)=>{setEditingWallet(w);setWalletForm({name:w.name||'',symbol:w.symbol||'',network:w.network||'',address:w.address||'',min_deposit:String(w.min_deposit??10),confirmations:String(w.confirmations??1),rate_usd:String(w.rate_usd??1),qr_data:w.qr_data||''})};
  const toggleWallet=async(w:any)=>{if(!token)return;const r=await fetch(`/api/financial/crypto-wallets/${w.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({is_active:!w.is_active})});const j=await r.json();if(!r.ok){setErrorMsg(j.detail||'Failed');return}await fetchDeposits()};
  const deleteWallet=async(id:string)=>{if(!token||!window.confirm('Delete this crypto wallet?'))return;const r=await fetch(`/api/financial/crypto-wallets/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});const j=await r.json();if(!r.ok){setErrorMsg(j.detail||'Failed');return}setSuccessMsg('Wallet deleted.');await fetchDeposits()};

  const allDeposits = data?.deposits || [];
  const filteredDeposits = allDeposits.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.deposit_id.toLowerCase().includes(q) ||
        d.worker_name.toLowerCase().includes(q) ||
        d.worker_username.toLowerCase().includes(q) ||
        (d.tx_hash && d.tx_hash.toLowerCase().includes(q)) ||
        (d.crypto_currency && d.crypto_currency.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Deposit Management</h1>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Operations Team Only
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Audit, verify, and approve crypto-only worker deposits. Review transaction hashes and uploaded payment screenshots before crediting the worker's Earning Balance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDeposits}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Crypto Wallet Management */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900">Crypto Deposit Wallets</h2>
          <p className="mt-1 text-xs text-gray-500">Add and manage the wallet addresses workers will use for crypto deposits.</p>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={saveWallet} className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            {([['name','Name'],['symbol','Symbol'],['network','Network'],['address','Wallet Address'],['min_deposit','Min USD'],['confirmations','Confirmations'],['rate_usd','USD Rate'],['qr_data','QR Data (optional)']] as const).map(([key,label]) => (
              <input key={key} value={(walletForm as any)[key]} onChange={(e)=>setWalletForm({...walletForm,[key]:e.target.value})} placeholder={label} required={key !== 'qr_data'} className="rounded-md border border-gray-300 px-2.5 py-2 text-xs" />
            ))}
            <button disabled={savingWallet} className="col-span-2 md:col-span-4 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingWallet ? 'Saving...' : (editingWallet ? 'Save Wallet Changes' : 'Add Crypto Wallet')}</button>
          </form>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {wallets.map((w)=>(<div key={w.id} className="rounded border border-gray-200 bg-gray-50 p-2.5 text-xs"><div className="flex justify-between gap-2"><b>{w.symbol} · {w.network}</b><span className={w.is_active?'text-emerald-700':'text-gray-400'}>{w.is_active?'ACTIVE':'INACTIVE'}</span></div><div className="mt-1 font-mono text-[10px] break-all text-gray-600">{w.address}</div><div className="mt-2 flex gap-1"><button onClick={()=>editWallet(w)} className="rounded border bg-white px-2 py-1 text-[10px] font-semibold">Edit</button><button onClick={()=>toggleWallet(w)} className="rounded border bg-white px-2 py-1 text-[10px] font-semibold">{w.is_active?'Deactivate':'Activate'}</button><button onClick={()=>deleteWallet(w.id)} className="rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold text-red-700">Delete</button></div></div>))}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Deposits</span>
            <Coins className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{data?.total ?? 0}</div>
          <p className="mt-1 text-[11px] text-gray-400">All submitted records</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {data?.pending_count ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-amber-700">Requires manual/blockchain verification</p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Approved Deposits</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {data?.approved_count ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">Funds credited to balances</p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Approved Volume</span>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900 tabular-nums">
            ${(data?.total_volume ?? 0).toFixed(2)}
          </div>
          <p className="mt-1 text-[11px] text-blue-700">Total credited to workers</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deposit ID, worker name, username, or TxID..."
            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center rounded-md border border-gray-300 bg-gray-50 p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({allDeposits.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500 text-white font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({data?.pending_count ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved ({data?.approved_count ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition ${
              statusFilter === 'REJECTED'
                ? 'bg-red-600 text-white font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Deposit ID</th>
                <th scope="col" className="px-4 py-3">Worker</th>
                <th scope="col" className="px-4 py-3">Method / Currency</th>
                <th scope="col" className="px-4 py-3">Amount</th>
                <th scope="col" className="px-4 py-3">Tx Hash / Proof</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && allDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 mb-2" />
                    Loading deposits audit ledger...
                  </td>
                </tr>
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No deposits match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((item) => {
                  const isPending = item.status === 'PENDING';
                  const isApproved = item.status === 'APPROVED';
                  const isRejected = item.status === 'REJECTED';
                  const isProcessing = processingId === item.deposit_id;

                  return (
                    <tr key={item.id || item.deposit_id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-900">
                          {item.deposit_id}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(item.requested_at).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.worker_name}</div>
                        <div className="text-[11px] text-gray-400">
                          @{item.worker_username} • ID: {item.worker_id}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                          {item.crypto_currency || item.payment_method}
                        </span>
                        {item.proof_note && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate max-w-xs">
                            {item.proof_note}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">
                        ${item.amount.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                        {item.tx_hash ? (
                          <div className="flex items-center gap-1.5">
                            <span title={item.tx_hash}>
                              {item.tx_hash.substring(0, 10)}...{item.tx_hash.substring(item.tx_hash.length - 6)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyTx(item.tx_hash!)}
                              className="text-gray-400 hover:text-gray-700"
                              title="Copy Tx Hash"
                            >
                              {copiedTx === item.tx_hash ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No Tx Hash</span>
                        )}
                        {item.proof_screenshot_path && (
                          <a href={item.proof_screenshot_path} target="_blank" rel="noreferrer" className="mt-1 inline-block text-emerald-700 hover:underline">View payment screenshot</a>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3 animate-pulse" />
                            Pending Audit
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Credited
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={isProcessing}
                              onClick={() => handleProcessDeposit(item.deposit_id, 'APPROVED')}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              <span>Approve & Credit</span>
                            </button>

                            <button
                              disabled={isProcessing}
                              onClick={() => setRejectingDeposit(item)}
                              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                            >
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">Finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Reject Deposit Request {rejectingDeposit.deposit_id}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Specify the reason why this deposit of ${rejectingDeposit.amount.toFixed(2)} could not be verified. The worker will be notified.
            </p>

            <div className="mt-3.5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rejection Reason
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Invalid TxID, transaction not found on blockchain explorer"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingDeposit(null)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleProcessDeposit(
                      rejectingDeposit.deposit_id,
                      'REJECTED',
                      rejectionReason.trim() || undefined
                    )
                  }
                  className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
