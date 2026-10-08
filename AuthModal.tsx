import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Lock,
  User,
  Phone,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Ticket,
  CheckCircle2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Registration Fields
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [withdrawalPin, setWithdrawalPin] = useState('');
  const [confirmWithdrawalPin, setConfirmWithdrawalPin] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Sign In Fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!username.trim() || username.trim().length < 3) {
          setError('Username is required and must be at least 3 characters.');
          setLoading(false);
          return;
        }

        if (!phoneNumber.trim() || phoneNumber.trim().length < 6) {
          setError('Please provide a valid phone number.');
          setLoading(false);
          return;
        }

        if (!password || password.length < 6) {
          setError('Account password is required (minimum 6 characters) to log into your account.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Account Password and Confirm Password do not match.');
          setLoading(false);
          return;
        }

        if (!withdrawalPin.trim() || withdrawalPin.trim().length < 4) {
          setError('Withdrawal PIN/password is required (minimum 4 characters) for withdrawing income.');
          setLoading(false);
          return;
        }

        if (withdrawalPin !== confirmWithdrawalPin) {
          setError('Withdrawal PIN and Confirm Withdrawal PIN do not match.');
          setLoading(false);
          return;
        }

        const trimmedRef = referralCode.trim().toUpperCase();
        if (!trimmedRef) {
          setError('Referral invitation code is required. Please obtain an invitation code from the Operations Team.');
          setLoading(false);
          return;
        }

        await register({
          username: username.trim(),
          phoneNumber: phoneNumber.trim(),
          password: password,
          confirmPassword: confirmPassword,
          withdrawalPin: withdrawalPin.trim(),
          confirmWithdrawalPin: confirmWithdrawalPin.trim(),
          referralCode: trimmedRef,
          role: 'WORKER',
        });
      } else {
        if (!loginIdentifier.trim() || !loginPassword.trim()) {
          setError('Please enter your username/phone/email and password.');
          setLoading(false);
          return;
        }
        await login(loginIdentifier.trim(), loginPassword.trim());
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl text-gray-900 my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-900">
            {isRegister ? 'Create Terrkeet Account' : 'Sign in to Terrkeet'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRegister
              ? 'Register with your username, phone number, and security withdrawal PIN'
              : 'Enter your username, phone number, or email and PIN/password'}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {isRegister ? (
            <>
              {/* 1. Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex_reviewer"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 2. Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 3. Account Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Account Password</label>
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                    For logging in
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a secure password (min 6 chars)"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 4. Confirm Account Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your account password"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 5. Withdrawal PIN / Password (For withdrawing only) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Withdrawal PIN / Password</label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                    For withdrawing only
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    maxLength={8}
                    value={withdrawalPin}
                    onChange={(e) => setWithdrawalPin(e.target.value)}
                    placeholder="4-6 digit numeric PIN or security password"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  This withdrawal password/PIN is strictly used when withdrawing your earned income.
                </p>
              </div>

              {/* 6. Confirm Withdrawal PIN */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm Withdrawal PIN / Password
                </label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    maxLength={8}
                    value={confirmWithdrawalPin}
                    onChange={(e) => setConfirmWithdrawalPin(e.target.value)}
                    placeholder="Re-enter your withdrawal PIN / password"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 7. Referral Code (Confidential single-use code issued by Operations Team) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">Referral Invitation Code</label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                    Single-Use Only
                  </span>
                </div>
                <div className="relative">
                  <Ticket className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Enter single-use code (e.g. TK-XXXX-XXXX)"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-24 py-2 text-xs font-mono uppercase text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    Required
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Confidential invitation code provided by the Operations Team. Each code can only be used by one user.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Sign In Mode */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Username, Phone Number, or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter username, phone, or email"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Password or Withdrawal PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password or withdrawal PIN"
                    className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-gray-500">
                <span className="text-gray-400">Staff Access:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginIdentifier('operations');
                    setLoginPassword('FinanceSecure123!');
                  }}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  Quick Fill Financial Dept Login
                </button>
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isRegister ? 'Complete Registration' : 'Sign In'}</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create an account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
