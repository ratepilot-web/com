import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Withdrawal } from '../types';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Loader2,
  KeyRound,
} from 'lucide-react';

interface WorkerWithdrawalsProps {
  onNavigateTab?: (tab: string) => void;
}

export const WorkerWithdrawals: React.FC<WorkerWithdrawalsProps> = ({ onNavigateTab }) => {
  const { user, token, refreshUserData } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod] = useState<string>('CRYPTO');
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [withdrawalPin, setWithdrawalPin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const earningBalance = user?.earning_balance || 0;
  const bonusBalance = user?.bonus_balance || 0;

  const loadWithdrawals = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/withdrawals/my', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setWithdrawals(await res.json());
      }
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, [token]);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const withdrawNum = parseFloat(amount);
    if (isNaN(withdrawNum) || withdrawNum <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount greater than $0.00');
      return;
    }

    if (withdrawNum > earningBalance) {
      setErrorMessage(
        `Insufficient Earning Balance. Maximum withdrawable amount is $${earningBalance.toFixed(
          2
        )}. Bonus Balance cannot be withdrawn.`
      );
      return;
    }

    if (!paymentDetails || paymentDetails.trim().length < 5) {
      setErrorMessage('Please provide a valid crypto wallet address.');
      return;
    }

    if (!withdrawalPin || withdrawalPin.trim().length < 4) {
      setErrorMessage('Please enter your 4-6 digit Security Withdrawal PIN to authorize this payout.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawNum,
          payment_method: paymentMethod,
          payment_details: paymentDetails.trim(),
          withdrawal_pin: withdrawalPin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Withdrawal request failed');
      }

      setSuccessMessage(
        `Withdrawal request ${data.withdrawal_id} for $${data.amount.toFixed(
          2
        )} submitted successfully! It is now pending review by Operations Team.`
      );
      setAmount('');
      setPaymentDetails('');
      setWithdrawalPin('');
      await refreshUserData();
      await loadWithdrawals();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred processing withdrawal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Withdrawals</h1>
          <p className="text-xs text-gray-500 mt-1">
            Request payouts from your verified Earning Balance. Withdrawals are processed by the Financial
            Department.
          </p>
        </div>

        {onNavigateTab && (
          <button
            type="button"
            onClick={() => onNavigateTab('deposits')}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs hover:bg-emerald-100 transition self-start sm:self-auto"
          >
            <ArrowDownLeft className="h-4 w-4" />
            <span>Go to Deposits</span>
          </button>
        )}
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Withdrawable Funds
            </span>
            <span className="rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Earning Balance
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              ${earningBalance.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">USD</span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            Available immediately for payout requests. Credited from approved task reviews.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Platform Funds
            </span>
            <span className="flex items-center gap-1 rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
              <Lock className="h-3 w-3" />
              Bonus Balance
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              ${bonusBalance.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">USD</span>
          </div>
          <p className="mt-1.5 text-xs text-gray-600">
            Strictly non-withdrawable. Used for worker level status and platform engagement bonuses.
          </p>
        </div>
      </div>

      {/* Request Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-bold text-gray-900">Submit New Withdrawal Request</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Requested funds are held in escrow pending review by the Operations Team
          </p>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleWithdrawalSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">
                  Withdrawal Amount ($ USD)
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(earningBalance.toString())}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Max (${earningBalance.toFixed(2)})
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                min="1.00"
                max={earningBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                required
              />
            </div>

            <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Payout Method</label><div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Crypto only</div></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Payout Destination & Account Details
            </label>
            <input
              type="text"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="e.g. Bank Account Number / Routing / PayPal Email / USDT Address"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
                <span>Security Withdrawal PIN</span>
              </label>
              <span className="text-[11px] text-gray-400">Created during registration</span>
            </div>
            <input
              type="password"
              maxLength={8}
              value={withdrawalPin}
              onChange={(e) => setWithdrawalPin(e.target.value)}
              placeholder="Enter your 4-6 digit Withdrawal PIN"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
              required
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Your security withdrawal PIN is required to authorize the payout of your earned income.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || earningBalance <= 0}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <span>Submit Withdrawal Request</span>
                  <ArrowUpRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Withdrawal History Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-4">Your Withdrawal Requests</h2>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading history...</div>
        ) : withdrawals.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No withdrawal requests made yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method & Details</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {withdrawals.map((w) => {
                  const wId = w.withdrawal_id || (w as any).withdrawalId || `WD-${w.id}`;
                  const reqDate =
                    w.requested_at || (w as any).requestedAt || new Date().toISOString();
                  const pMethod = w.payment_method || (w as any).paymentMethod || 'BANK_TRANSFER';
                  const pDetails = w.payment_details || (w as any).paymentDetails || '';
                  const amountVal = typeof w.amount === 'number' ? w.amount : Number(w.amount || 0);
                  const rejReason = w.rejection_reason || (w as any).rejectionReason;

                  return (
                    <tr key={w.id} className="hover:bg-gray-50/80">
                      <td className="py-3 px-3 font-mono font-semibold text-gray-700">{wId}</td>
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(reqDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-900 tabular-nums">
                        ${amountVal.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        <span className="font-semibold text-gray-900">{pMethod}</span>
                        <div className="text-[11px] text-gray-500 truncate max-w-xs">
                          {pDetails}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                            w.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : w.status === 'APPROVED'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : w.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {w.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {w.status === 'COMPLETED' && <CheckCircle className="h-3 w-3" />}
                          {w.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-gray-500">
                        {rejReason ? (
                          <span className="text-red-700 font-medium">{rejReason}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
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
