import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Deposit, CryptoWalletConfig } from '../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  Building,
  CreditCard,
  QrCode,
  ShieldCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface WorkerDepositsProps {
  onNavigateTab?: (tab: string) => void;
}

export const WorkerDeposits: React.FC<WorkerDepositsProps> = ({ onNavigateTab }) => {
  const { user, token, refreshUserData } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWalletConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const paymentMethod = 'CRYPTO' as const;
  const [selectedWalletId, setSelectedWalletId] = useState<string>('usdt_trc20');
  const [amount, setAmount] = useState<string>('50');
  const [txHash, setTxHash] = useState<string>('');
  const [proofNote, setProofNote] = useState<string>('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const earningBalance = user?.earning_balance || 0;
  const bonusBalance = user?.bonus_balance || 0;

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [depRes, walletRes] = await Promise.all([
        fetch('/api/deposits/my', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/deposits/crypto-wallets', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (depRes.ok) setDeposits(await depRes.json());
      if (walletRes.ok) {
        const wallets = await walletRes.json();
        setCryptoWallets(wallets);
        if (wallets.length > 0 && !selectedWalletId) {
          setSelectedWalletId(wallets[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load deposit data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const selectedWallet =
    cryptoWallets.find((w) => w.id === selectedWalletId) || cryptoWallets[0];

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount greater than $0.00');
      return;
    }

    if (paymentMethod === 'CRYPTO') {
      if (selectedWallet && numAmount < selectedWallet.min_deposit) {
        setErrorMessage(
          `Minimum deposit for ${selectedWallet.name} (${selectedWallet.network}) is $${selectedWallet.min_deposit.toFixed(2)}.`
        );
        return;
      }

      if (!txHash.trim() || txHash.trim().length < 8) {
        setErrorMessage('Please enter your blockchain Transaction Hash (TxID) to verify payment.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', String(numAmount));
      formData.append('payment_method', 'CRYPTO');
      if (selectedWallet?.id) formData.append('crypto_wallet_id', selectedWallet.id);
      if (selectedWallet?.symbol) formData.append('crypto_currency', selectedWallet.symbol);
      formData.append('tx_hash', txHash.trim());
      if (proofNote.trim()) formData.append('proof_note', proofNote.trim());
      if (paymentProof) formData.append('payment_proof', paymentProof);

      const res = await fetch('/api/deposits/request', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to submit deposit request');
      }

      setSuccessMessage(
        `Deposit request ${data.deposit_id} for $${data.amount.toFixed(
          2
        )} submitted successfully! It is now pending verification by the Operations Team.`
      );
      setTxHash('');
      setProofNote('');
      setPaymentProof(null);
      await refreshUserData();
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting deposit');
    } finally {
      setSubmitting(false);
    }
  };

  // Preset deposit amount chips
  const presetAmounts = [25, 50, 100, 250, 500, 1000];

  // Estimated crypto calculation
  const cryptoEstimatedAmount = () => {
    const num = parseFloat(amount) || 0;
    if (!selectedWallet) return '0.00';
    if (selectedWallet.rate_usd === 1) {
      return `${num.toFixed(2)} ${selectedWallet.symbol}`;
    }
    const val = num / selectedWallet.rate_usd;
    return `${val.toFixed(val < 1 ? 6 : 4)} ${selectedWallet.symbol}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Switch to Withdrawals button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Deposits</h1>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              Crypto & Direct
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Add funds directly to your verified Earning Balance. Deposit using instant Cryptocurrency (USDT, BTC, ETH, SOL) or traditional payment methods.
          </p>
        </div>

        {onNavigateTab && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('withdrawals')}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
            >
              <span>Go to Withdrawals</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Earning Balance (Deposit Target)
            </span>
            <span className="rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              Active / Usable
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
            ${earningBalance.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-500">USD</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-600">
            Deposited funds are credited directly to your Earning Balance and can be used immediately to claim task batches or withdrawn.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Bonus Balance (Promotional)
            </span>
            <span className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              Non-Withdrawable
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
            ${bonusBalance.toFixed(2)}{' '}
            <span className="text-xs font-normal text-gray-500">USD</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Promotional activity credits allocated by the Operations Team.
          </p>
        </div>
      </div>

      {/* Notification Alerts */}
      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Deposit Configuration Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Deposit Form & Methods */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Coins className="h-4 w-4 text-emerald-600" />
              <span>Crypto Deposit</span>
            </h2>
            <p className="mt-1 text-xs text-gray-500">Crypto is the only supported deposit method. Use the Operations Team's active wallet below.</p>

            <form onSubmit={handleDepositSubmit} className="mt-5 space-y-4">
              {/* Crypto Coin Selector */}
              {paymentMethod === 'CRYPTO' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Cryptocurrency & Network
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cryptoWallets.map((wallet) => {
                      const isSelected = wallet.id === selectedWallet?.id;
                      return (
                        <div
                          key={wallet.id}
                          onClick={() => setSelectedWalletId(wallet.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 text-left transition ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-500'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-gray-900">{wallet.symbol}</span>
                            {wallet.recommended && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                Best
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">{wallet.network}</p>
                          <p className="text-[10px] text-emerald-700 font-medium mt-1">
                            Min: ${wallet.min_deposit}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Deposit Amount (USD)
                  </label>
                  {paymentMethod === 'CRYPTO' && selectedWallet && (
                    <span className="text-[11px] font-mono text-emerald-700">
                      ≈ {cryptoEstimatedAmount()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-semibold text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50.00"
                    required
                    className="w-full rounded-md border border-gray-300 bg-white pl-7 pr-3 py-2 text-xs font-semibold text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Amount Chips */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-400">Quick Select:</span>
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset.toString())}
                      className={`rounded border px-2 py-0.5 text-[11px] font-medium transition ${
                        amount === preset.toString()
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tx Hash / Payment Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {paymentMethod === 'CRYPTO'
                    ? 'Blockchain Transaction Hash (TxID)'
                    : 'Payment Reference / Transaction ID'}
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={
                    paymentMethod === 'CRYPTO'
                      ? 'e.g. 7f91a8c3d9b0425e836109f3ab41285741...'
                      : 'e.g. Wire Ref # / Confirmation Code'
                  }
                  required
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Paste the transaction hash from your wallet (Binance, Trust Wallet, MetaMask, etc.) after completing the transfer.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sender Wallet Address or Notes (Optional)
                </label>
                <input
                  type="text"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. Sent from Binance TRC20 wallet"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Payment Screenshot Proof */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Screenshot / Proof</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700"
                />
                <p className="mt-1 text-[10px] text-gray-500">This proof will be shown to the Operations Team with your deposit request.</p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>
                    Submit Deposit of ${parseFloat(amount) ? parseFloat(amount).toFixed(2) : '0.00'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Deposit Address & Instructions */}
        <div className="lg:col-span-5 space-y-5">
          {paymentMethod === 'CRYPTO' && selectedWallet ? (
            <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    {selectedWallet.symbol}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{selectedWallet.name}</h3>
                    <p className="text-[10px] text-gray-500">{selectedWallet.network}</p>
                  </div>
                </div>
                <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                  {selectedWallet.confirmations} Confirmation(s)
                </span>
              </div>

              {/* QR Code Placeholder / Visual */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="h-32 w-32 bg-white border border-slate-300 rounded-lg p-2 shadow-xs flex items-center justify-center relative">
                  <QrCode className="h-28 w-28 text-slate-900" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white/95 px-1 py-0.5 rounded text-[9px] font-bold text-emerald-800 border border-emerald-200 shadow-xs">
                      {selectedWallet.symbol}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 mt-2 font-medium">
                  Scan QR code with your crypto wallet app
                </span>
              </div>

              {/* Wallet Address Box with Copy */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Official Deposit Address ({selectedWallet.network})
                </label>
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md p-2">
                  <span className="font-mono text-[11px] text-slate-900 font-semibold break-all select-all flex-1">
                    {selectedWallet.address}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyAddress(selectedWallet.address)}
                    className="shrink-0 flex items-center gap-1 bg-white border border-gray-300 rounded px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 transition shadow-2xs"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Guidelines */}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                  <span>Deposit Guidelines</span>
                </div>
                <p>• Send only <strong>{selectedWallet.symbol}</strong> via <strong>{selectedWallet.network}</strong>.</p>
                <p>• Minimum deposit: <strong>${selectedWallet.min_deposit.toFixed(2)} USD</strong>.</p>
                <p>• Automatically verified and credited upon blockchain network confirmation.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-700" />
                <span>Traditional Wire / Digital Wallet Info</span>
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                For Bank Transfers, Debit/Credit Cards, or Zelle/Digital Wallets, wire or transfer funds to the verified corporate escrow account:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs space-y-1.5 font-mono">
                <div><span className="text-gray-500 font-sans">Bank:</span> JPMorgan Chase Corporate Escrow</div>
                <div><span className="text-gray-500 font-sans">Beneficiary:</span> Terrkeet Review Network LLC</div>
                <div><span className="text-gray-500 font-sans">Account No:</span> 9821-4820-1102</div>
                <div><span className="text-gray-500 font-sans">Routing/ABA:</span> 021000021</div>
                <div><span className="text-gray-500 font-sans">Memo / Ref:</span> TK-USER-{user?.id}</div>
              </div>
              <p className="text-[11px] text-gray-500">
                Ensure you include your User ID (TK-USER-{user?.id}) in the transaction memo for instant matching.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Deposit History Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gray-600" />
            <h2 className="text-xs font-bold text-gray-900">My Deposit History</h2>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th scope="col" className="px-4 py-3">Deposit ID</th>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Method</th>
                <th scope="col" className="px-4 py-3">Tx Hash / Ref</th>
                <th scope="col" className="px-4 py-3">Amount</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400 mb-2" />
                    Loading deposit records...
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No deposits initiated yet. Use the form above to deposit funds.
                  </td>
                </tr>
              ) : (
                deposits.map((item) => {
                  const isApproved = item.status === 'APPROVED';
                  const isPending = item.status === 'PENDING';
                  const isRejected = item.status === 'REJECTED';

                  return (
                    <tr key={item.id || item.deposit_id} className="hover:bg-gray-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {item.deposit_id}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[11px]">
                        {new Date(item.requested_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                          {item.crypto_currency || item.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                        {item.tx_hash ? (
                          <span title={item.tx_hash}>
                            {item.tx_hash.substring(0, 12)}...{item.tx_hash.substring(item.tx_hash.length - 6)}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 tabular-nums">
                        ${item.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            <Clock className="h-3 w-3 animate-pulse" />
                            Pending Audit
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved & Credited
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
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
    </div>
  );
};
