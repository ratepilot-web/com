import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  KeyRound,
  Ticket,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Star,
  Building2,
  Users,
  Globe,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  Check,
} from 'lucide-react';

interface LandingPageProps {
  onEnterDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterDashboard }) => {
  const { user, login, register } = useAuth();

  // Auth Form State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Registration Fields (Username, Phone Number, Password, Confirm Password, Withdrawal PIN, Confirm Withdrawal PIN, Referral Code)
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authMode === 'REGISTER') {
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
          setError('Account password is required (minimum 6 characters) for logging into your account.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Account Password and Confirm Password do not match.');
          setLoading(false);
          return;
        }

        if (!withdrawalPin.trim() || withdrawalPin.trim().length < 4) {
          setError('Withdrawal PIN/password is required (min 4 characters) to authorize future withdrawals.');
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
          setError(
            'Referral invitation code is required. Please obtain a confidential invitation code from the Operations Team.'
          );
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
        setSuccessMsg('Account registered successfully! Welcome to RatePilot.');
      } else {
        if (!loginIdentifier.trim() || !loginPassword.trim()) {
          setError('Please enter your username/phone/email and password.');
          setLoading(false);
          return;
        }
        await login(loginIdentifier.trim(), loginPassword.trim());
        setSuccessMsg('Signed in successfully.');
      }
      if (onEnterDashboard) {
        onEnterDashboard();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const faqItems = [
    {
      q: 'How does RatePilot pay workers for completed tasks?',
      a: 'Tasks are assigned with pre-approved price points set directly by our Operations Team. Once you complete the verified rating and submit authentic feedback, the funds are credited directly to your withdrawable Earning Balance. You can request payouts anytime to your bank account, PayPal, or crypto wallet.',
    },
    {
      q: 'What is the difference between Bonus Balance and Earning Balance?',
      a: 'RatePilot uses a dual-balance architecture. Task costs can use available balances, while completed rating-task earnings are credited to the withdrawable Earning Balance.',
    },
    {
      q: 'How are the daily rating tasks selected?',
      a: 'Tasks are never randomized. Day 1 runs Task 1 through Task 20, Day 2 continues with Task 21 through Task 40, and each following day continues in numerical order. Operations Team must set the daily target and approve access before a day opens.',
    },
    {
      q: 'What does a rating task require?',
      a: 'Workers select the required star rating. No written review or screenshot proof is required.',
    },
    {
      q: 'What happens if the daily task session is marked closed?',
      a: 'The Operations Team manages daily capacity to balance rating volume. When daily sessions are closed, existing balances and withdrawals remain completely active, and new rating submissions pause until the next daily session opens.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#061b49] via-[#0b429f] to-[#1765e8] border-b border-blue-400/30 text-white shadow-lg shadow-blue-950/20">
        <div className="mx-auto flex min-h-[100px] max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6 lg:px-9">
          <div className="flex items-center gap-8">
            <div
              onClick={() => scrollToSection('hero')}
              className="flex cursor-pointer items-center gap-3"
            >
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-2xl border border-white/30 bg-white text-xl font-black text-blue-700 shadow-xl ring-4 ring-white/10">RP</div>
              <div>
                <span className="text-2xl sm:text-3xl font-black tracking-[.14em] text-white block">RATEPILOT</span>
                <span className="text-xs sm:text-sm font-medium tracking-wide text-blue-100 block mt-0.5">
                  SEQUENTIAL TASKS • CLEAR PROGRESS
                </span>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
              <button
                onClick={() => scrollToSection('about')}
                className="hover:text-white transition"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-white transition"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('businesses')}
                className="hover:text-white transition"
              >
                Business Verticals
              </button>
              <button
                onClick={() => scrollToSection('testimonials')}
                className="hover:text-white transition"
              >
                Testimonials
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="hover:text-white transition"
              >
                FAQ
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={onEnterDashboard}
                className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
              >
                <span>Dashboard ({user.full_name.split(' ')[0]})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('LOGIN');
                    scrollToSection('auth-section');
                  }}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('REGISTER');
                    scrollToSection('auth-section');
                  }}
                  className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="bg-white border-b border-gray-200 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Value Proposition & Stats */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Verified Ratings & Micro-Earnings</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                Earn Real Income Reviewing Verified Businesses.
              </h1>

              <p className="text-base text-gray-600 max-w-2xl leading-relaxed">
                RatePilot connects authenticated workers with a rotating catalogue of simple star-rating tasks. Complete your assigned 20-task cycle, track your balances, and manage withdrawals from one dashboard.
              </p>

              {/* Key Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-100">
                <div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums font-mono">$412,000+</div>
                  <div className="text-xs text-gray-500 mt-0.5">Disbursed to Reviewers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700 tabular-nums font-mono">14,800+</div>
                  <div className="text-xs text-gray-500 mt-0.5">Verified Reviews</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums font-mono">99.8%</div>
                  <div className="text-xs text-gray-500 mt-0.5">Payout Delivery Rate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums font-mono">1-to-1</div>
                  <div className="text-xs text-gray-500 mt-0.5">Task Escalation Escrow</div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Verified Rating Submissions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>1-Review Per Business Anti-Spam</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>100% Withdrawable Earning Balance</span>
                </div>
              </div>
            </div>

            {/* Right Column: Embedded Sign In / Sign Up Module */}
            <div id="auth-section" className="lg:col-span-5">
              <div className="rounded-lg border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                
                {/* Mode Selector Tabs */}
                <div className="flex rounded-md bg-gray-100 p-1 mb-6 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('LOGIN');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                      authMode === 'LOGIN'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('REGISTER');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                      authMode === 'REGISTER'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <div className="mb-5">
                  <h2 className="text-xl font-bold text-gray-900">
                    {authMode === 'LOGIN' ? 'Welcome back to RatePilot' : 'Join the Review Network'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {authMode === 'LOGIN'
                      ? 'Access your assigned tasks, earning balance, and withdrawals'
                      : 'Create your account to start claiming paid ratings'}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {authMode === 'REGISTER' ? (
                    <>
                      {/* 1. Username */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Username
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. alex_worker"
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 2. Phone Number */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="e.g. +1 (555) 019-2834"
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 3. Account Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700">
                            Account Password
                          </label>
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
                            placeholder="Create account password (min 6 chars)"
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
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
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 5. Withdrawal PIN / Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700">
                            Withdrawal PIN / Password
                          </label>
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
                            placeholder="4-6 digit Security PIN or withdrawal password"
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          This withdrawal password/PIN is strictly used to withdraw your earned income.
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
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 7. Referral Code (Confidential single-use code issued by Operations Team) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700">
                            Referral Invitation Code
                          </label>
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
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-24 py-2 text-xs font-mono uppercase text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Confidential single-use invitation code provided by the Operations Team. Each code works for one user only.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Sign In Fields */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Username, Phone Number, or Email
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            placeholder="Enter username, phone, or email"
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
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
                            required
                            className="w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>

                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>{authMode === 'REGISTER' ? 'Register & Begin' : 'Sign In'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
                  <span>Protected by 256-bit encryption • Double-entry balance integrity</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Online Photography & Highlights Showcase */}
      <section className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Operational Rigor
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              Engineered for Authenticity and Commercial Trust
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-2">
              Reviewers and businesses connect on a clean, audited platform built to support accurate local discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="Professional team collaborating on rating verification"
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">
                  Community Standards
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Verified Human Feedback</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Reviewers adhere to clear guidelines ensuring comments provide actionable, real consumer insight for local clients.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
                alt="Financial operations and audited payouts"
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">
                  Financial Integrity
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Direct Department Approvals</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Every earnings credit is backed by an audited ledger entry with previous and new balance checks. No surprise deductions.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80"
                alt="Local retail and cafe businesses"
                className="h-48 w-full object-cover"
              />
              <div className="p-5">
                <span className="text-[11px] font-semibold text-gray-500 uppercase">
                  Commercial Relevance
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Measurable Local Impact</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Assisting local service providers, dental clinics, bistros, and retailers with honest Google Maps visibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Deep Dive */}
      <section id="about" className="py-16 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                About RatePilot
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                Built on Integrity. Verified by Human Reviewers.
              </h2>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                The online feedback ecosystem is saturated with automated spam and click-farms that degrade customer trust. At the same time, legitimate workers often face micro-task portals with hidden fees and unreachable withdrawal thresholds.
              </p>

              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                RatePilot provides a structured task marketplace. Rewards are configured by the Operations Team and credited to the worker Earning Balance after a rating task is completed.
              </p>

              {/* 4 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  <div className="text-gray-900 font-bold text-xs mb-1">1. Anti-Spam Constraint</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Each cycle contains 20 unique tasks selected from the 300-task catalogue.
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  <div className="text-gray-900 font-bold text-xs mb-1">2. Transparent Balances</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Clear distinction between promotional Bonus credits and withdrawable Earning funds.
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  <div className="text-gray-900 font-bold text-xs mb-1">3. Direct Review Feedback</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Authentic star rating and comprehensive customer feedback submitted directly with quality verification.
                  </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3.5">
                  <div className="text-gray-900 font-bold text-xs mb-1">4. Immutable Ledger</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Full accounting trace showing previous balances, adjustments, and timestamps.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1000&q=80"
                  alt="RatePilot operations and financial auditing team"
                  className="w-full h-80 object-cover"
                />
                <div className="p-5 bg-white border-t border-gray-200">
                  <p className="text-xs text-gray-700 italic leading-relaxed">
                    "Every task price on RatePilot is configured in advance. Workers see the task cost and expected earning before starting."
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-semibold text-gray-900">Operations & Financial Governance</span>
                    <span>RatePilot Inc.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Simple 4-Step Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              How Reviewers Earn on RatePilot
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-2">
              Straightforward steps from assignment to cash withdrawal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-800 font-mono mb-3">
                01
              </div>
              <h3 className="text-sm font-bold text-gray-900">Register Account</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Sign up and access your rating-task dashboard.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-800 font-mono mb-3">
                02
              </div>
              <h3 className="text-sm font-bold text-gray-900">Pick Available Task</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Select an open rating task with guaranteed compensation displayed upfront.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-800 font-mono mb-3">
                03
              </div>
              <h3 className="text-sm font-bold text-gray-900">Submit Review</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Select the required star rating and submit the task directly.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-xs">
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-800 font-mono mb-3">
                04
              </div>
              <h3 className="text-sm font-bold text-gray-900">Receive Payout</h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Funds land instantly in your Earning Balance. Request payouts via Bank Transfer or PayPal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Business Categories */}
      <section id="businesses" className="py-16 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Industry Coverage
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                Verified Business Verticals
              </h2>
            </div>
            <p className="text-xs text-gray-500 max-w-md mt-2 sm:mt-0">
              We work with verified companies across retail, professional services, hospitality, and healthcare.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
                alt="Cafe and dining reviews"
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Hospitality</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Cafes & Bistros</h3>
                <p className="text-xs text-gray-600 mt-1">Hospitality, coffee quality, and dining atmosphere.</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80"
                alt="Digital technology companies"
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Software & Web</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Digital Marketing Agencies</h3>
                <p className="text-xs text-gray-600 mt-1">Onboarding speed, support quality, and service value.</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80"
                alt="Healthcare clinics"
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Healthcare</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Dental & Wellness Clinics</h3>
                <p className="text-xs text-gray-600 mt-1">Clinic cleanliness and staff professionalism.</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
                alt="Hotels and lodging"
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <span className="text-[10px] font-semibold text-gray-500 uppercase">Lodging</span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">Urban Suites & Hotels</h3>
                <p className="text-xs text-gray-600 mt-1">Check-in convenience and room comfort.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviewer Testimonials */}
      <section id="testimonials" className="py-16 bg-gray-50 border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Feedback from Contributors
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              Reviewer Testimonials
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-2">
              Authentic opinions from workers on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed italic">
                  "The price shown on the task is 100% credited to your withdrawable balance. My first withdrawal arrived into my bank account without hassle."
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  JD
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Johnathan D.</div>
                  <div className="text-[11px] text-gray-500">Verified Reviewer • 38 Tasks Completed</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed italic">
                  "Because each worker receives a rotating set of 20 tasks, the dashboard stays simple and easy to follow."
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  SJ
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Sarah J.</div>
                  <div className="text-[11px] text-gray-500">Senior Contributor • Higher Tier Matrix</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed italic">
                  "The separation between Bonus Balance and Earning Balance is very clear. The ledger table lets you see every transaction timestamp."
                </p>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                  MR
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Marcus R.</div>
                  <div className="text-[11px] text-gray-500">Active Reviewer • 22 Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-16 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Answers & Guidance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-gray-900 hover:bg-gray-50 transition"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t border-gray-200 text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">RATEPILOT</span>
            <span>•</span>
            <span>SEQUENTIAL TASKS • CLEAR PROGRESS</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} RATEPILOT Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
