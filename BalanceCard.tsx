import React from 'react';
import { Gift, Wallet, ArrowUpRight, ArrowDownLeft, Lock, CheckCircle2 } from 'lucide-react';

interface BalanceCardProps {
  bonusBalance: number;
  earningBalance: number;
  onRequestWithdrawal?: () => void;
  onRequestDeposit?: () => void;
  showActions?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  bonusBalance,
  earningBalance,
  onRequestWithdrawal,
  onRequestDeposit,
  showActions = true,
}) => {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Earning Balance Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Earning Balance</h3>
                <p className="text-xs text-gray-500">Verified Task Compensation</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Withdrawable
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                ${earningBalance.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-gray-500">USD</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Earned from completed, verified rating tasks. Available immediately for withdrawal
              or to fund task batches via instant crypto & direct deposits.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-xs text-gray-500">
            Immediate credit & withdrawable
          </span>
          {showActions && (
            <div className="flex items-center gap-2">
              {onRequestDeposit && (
                <button
                  type="button"
                  onClick={onRequestDeposit}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-100"
                >
                  <ArrowDownLeft className="h-4 w-4" />
                  <span>Deposit Funds</span>
                </button>
              )}
              {onRequestWithdrawal && (
                <button
                  type="button"
                  onClick={onRequestWithdrawal}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                >
                  <span>Request Withdrawal</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bonus Balance Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Bonus Balance</h3>
                <p className="text-xs text-gray-500">Platform Activity Credit</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
              <Lock className="h-3 w-3" />
              Non-Withdrawable
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                ${bonusBalance.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-gray-500">USD</span>
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">
              Allocated for worker level qualification and promotional milestones. Cannot be withdrawn
              directly to external bank or payment accounts.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Audited and maintained by Operations Team</span>
          <span className="font-medium text-gray-700">Tier Reserve</span>
        </div>
      </div>
    </div>
  );
};
