import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Ticket,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export interface ReferralCodeItem {
  id: number;
  code: string;
  status: 'UNUSED' | 'USED';
  createdById?: number;
  usedByUserId?: number;
  usedByUsername?: string;
  usedAt?: string;
  createdAt: string;
  notes?: string;
}

interface ReferralSummary {
  total: number;
  unused_count: number;
  used_count: number;
  codes: ReferralCodeItem[];
}

export const FinancialReferrals: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNUSED' | 'USED'>('ALL');

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(25);
  const [generateNote, setGenerateNote] = useState('');
  const [generating, setGenerating] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const fetchReferralCodes = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let url = '/api/financial/referral-codes';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to load referral codes');
      }

      const json = await res.json();
      setData(json);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e.message || 'Error fetching referral codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralCodes();
  }, [token, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReferralCodes();
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setSuccessMsg(`Copied code ${code} to clipboard`);
    setTimeout(() => {
      setCopiedCode(null);
      setSuccessMsg(null);
    }, 2500);
  };

  const handleCopyNextAvailable = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/financial/referral-codes/next-available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'No unused referral codes available.');
      }
      const item = await res.json();
      copyToClipboard(item.code);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/financial/referral-codes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          count: generateCount,
          notes: generateNote.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to generate referral codes');
      }

      const resData = await res.json();
      setSuccessMsg(`Successfully generated ${resData.generated_count} new confidential referral codes!`);
      setShowGenerateModal(false);
      setGenerateNote('');
      fetchReferralCodes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const allCodes = data?.codes || [];
  const totalPages = Math.ceil(allCodes.length / pageSize) || 1;
  const paginatedCodes = allCodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-amber-400">
              <Ticket className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Referral Codes Management</h1>
            <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Operations Team Only
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Confidential single-use invitation codes. Referral codes are kept hidden from public view and can only be seen and issued by the Operations Team. Each code works for one user at a time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleCopyNextAvailable}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Next Available Code</span>
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Generate Codes</span>
          </button>

          <button
            onClick={fetchReferralCodes}
            className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Total Codes</span>
            <Ticket className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{data?.total ?? 0}</div>
          <p className="mt-1 text-[11px] text-gray-400">Total pool in database</p>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Available / Unused</span>
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{data?.unused_count ?? 0}</div>
          <p className="mt-1 text-[11px] text-emerald-700">Ready to issue to new workers</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Redeemed / Used</span>
            <UserCheck className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{data?.used_count ?? 0}</div>
          <p className="mt-1 text-[11px] text-slate-500">Consumed (single-use applied)</p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Privacy & Gate Guard</span>
            <Lock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-sm font-bold text-blue-900">Enforced Single-Use</div>
          <p className="mt-1 text-[11px] text-blue-700">Hidden from public registration</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, redeemed worker, or batch notes..."
            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-20 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1 rounded bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-gray-300 bg-gray-50 p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({data?.total ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('UNUSED')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'UNUSED'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Available ({data?.unused_count ?? 0})
            </button>
            <button
              onClick={() => setStatusFilter('USED')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                statusFilter === 'USED'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Redeemed ({data?.used_count ?? 0})
            </button>
          </div>
        </div>
      </div>

      {/* Referral Codes Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">#</th>
                <th scope="col" className="px-4 py-3">Referral Code</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Redeemed By</th>
                <th scope="col" className="px-4 py-3">Redeemed At</th>
                <th scope="col" className="px-4 py-3">Batch / Notes</th>
                <th scope="col" className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && allCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 mb-2" />
                    Loading referral codes database...
                  </td>
                </tr>
              ) : paginatedCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No referral codes match your criteria.
                  </td>
                </tr>
              ) : (
                paginatedCodes.map((item, idx) => {
                  const isCopied = copiedCode === item.code;
                  const isUnused = item.status === 'UNUSED';

                  return (
                    <tr
                      key={item.id || item.code}
                      className={`hover:bg-gray-50/80 transition ${
                        isCopied ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            {item.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isUnused ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Available (Unused)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                            <Check className="h-3 w-3 text-slate-500" />
                            Redeemed (Used)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.usedByUsername ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900">
                              @{item.usedByUsername}
                            </span>
                            {item.usedByUserId && (
                              <span className="text-[10px] text-gray-400">
                                (ID: {item.usedByUserId})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {item.usedAt
                          ? new Date(item.usedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {item.notes || 'Operations Team Pool'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => copyToClipboard(item.code)}
                          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : isUnused
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Copy invitation code"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>{isUnused ? 'Issue Code' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <div>
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * pageSize, allCodes.length)}
              </span>{' '}
              of <span className="font-medium">{allCodes.length}</span> referral codes
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="rounded border border-gray-300 bg-white px-2.5 py-1 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate More Codes Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-emerald-600" />
              <span>Generate Additional Referral Codes</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Add a new batch of confidential single-use referral codes to the Operations Team pool.
            </p>

            <form onSubmit={handleGenerateCodes} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Number of Codes to Generate
                </label>
                <select
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value={10}>10 Single-Use Codes</option>
                  <option value={25}>25 Single-Use Codes</option>
                  <option value={50}>50 Single-Use Codes</option>
                  <option value={100}>100 Single-Use Codes</option>
                  <option value={200}>200 Single-Use Codes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Batch Tag / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={generateNote}
                  onChange={(e) => setGenerateNote(e.target.value)}
                  placeholder="e.g. October Onboarding Batch"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Codes will only be visible to Operations Team administrators and will each be restricted to a single redemption.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Codes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
