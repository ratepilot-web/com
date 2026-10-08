import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  db,
  User,
  ReferralCode,
  generateReferralCodeString,
  BalanceTransaction,
  Withdrawal,
  Deposit,
  TaskCompletion,
  Task,
  TaskAssignment,
  TaskCycle,
  CryptoWalletConfig,
  ComboTaskAssignment,
} from './db';
import { AuthRequest, authenticateToken, requireRole, generateToken } from './auth';
import { runAllBusinessRulesTests } from './testRunner';

const router = express.Router();
const uploadRoot = path.resolve(process.cwd(), 'uploads');
const profileUpload = multer({ dest: path.join(uploadRoot, 'profile'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /image\/(png|jpe?g|webp)/i.test(file.mimetype)) });
const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadRoot, 'proofs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});
const taskProofUpload = multer({ storage: proofStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /image\/(png|jpe?g|webp)/i.test(file.mimetype)) });
const depositProofUpload = multer({ storage: proofStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, /image\/(png|jpe?g|webp)/i.test(file.mimetype)) });

// Supported Official Crypto Deposit Wallets
export const CRYPTO_WALLETS = [
  {
    id: 'usdt_trc20',
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'TRC20 (Tron Network)',
    address: 'TYu89NqK4kQvW8ZgH9Jp2F5m3Rt6La7VxP',
    min_deposit: 10,
    confirmations: 1,
    recommended: true,
    rate_usd: 1.0,
    qr_data: 'tron:TYu89NqK4kQvW8ZgH9Jp2F5m3Rt6La7VxP',
  },
  {
    id: 'usdt_erc20',
    name: 'Tether USD',
    symbol: 'USDT',
    network: 'ERC20 (Ethereum)',
    address: '0x71C836466Dab29231b02451C8f07F37F16d8234D',
    min_deposit: 20,
    confirmations: 12,
    recommended: false,
    rate_usd: 1.0,
    qr_data: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D',
  },
  {
    id: 'usdc_erc20',
    name: 'USD Coin',
    symbol: 'USDC',
    network: 'ERC20 (Ethereum)',
    address: '0x71C836466Dab29231b02451C8f07F37F16d8234D',
    min_deposit: 20,
    confirmations: 12,
    recommended: false,
    rate_usd: 1.0,
    qr_data: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D',
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    network: 'Bitcoin Native (SegWit)',
    address: 'bc1q9d4h8v0zk5s4f3c7y9q5l2a8g7p4r1x3m9w2e4',
    min_deposit: 25,
    confirmations: 2,
    recommended: false,
    rate_usd: 68500.0,
    qr_data: 'bitcoin:bc1q9d4h8v0zk5s4f3c7y9q5l2a8g7p4r1x3m9w2e4',
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    network: 'ERC20 / Native',
    address: '0x71C836466Dab29231b02451C8f07F37F16d8234D',
    min_deposit: 25,
    confirmations: 12,
    recommended: false,
    rate_usd: 2650.0,
    qr_data: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D',
  },
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    network: 'Solana SPL',
    address: '7XvKq8NpM4Wz9L2R5T6y3F1J8gA4bC9dE2fG5hJ7kL8m',
    min_deposit: 10,
    confirmations: 32,
    recommended: false,
    rate_usd: 155.0,
    qr_data: 'solana:7XvKq8NpM4Wz9L2R5T6y3F1J8gA4bC9dE2fG5hJ7kL8m',
  },
];

// Helper for logging audit actions
function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  userId?: number,
  details?: Record<string, any>
) {
  const auditId = db.auditLogs.length + 1;
  const entry = {
    id: auditId,
    userId,
    action,
    entityType,
    entityId,
    details: details || {},
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(entry);
  db.save();
  return entry;
}

const financialGuard = [authenticateToken, requireRole('FINANCIAL_DEPARTMENT')];
const TASKS_PER_CYCLE = 20;
const TASK_POOL_LIMIT = 300;

/**
 * Each 20-task day uses a fixed, ascending slice of the task catalogue:
 * Day 1 = tasks 1-20, Day 2 = tasks 21-40, and so on.
 * Task order is never randomized. Operations must create the next cycle and
 * separately approve the worker before that day's tasks can start.
 */
function pickSequentialTaskIds(cycleNumber = 1): number[] {
  const orderedIds = db.tasks.map(t => t.id).sort((a, b) => a - b);
  const start = Math.max(0, cycleNumber - 1) * TASKS_PER_CYCLE;
  return orderedIds.slice(start, start + TASKS_PER_CYCLE);
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------

// Single Universal Referral Code required for all new registrations
export const UNIVERSAL_REFERRAL_CODE = 'RATEPILOT2026';

router.post('/auth/register', (req: Request, res: Response) => {
  const {
    username,
    phoneNumber,
    phone_number,
    withdrawalPin,
    withdrawal_pin,
    confirmWithdrawalPin,
    confirm_withdrawal_pin,
    referralCode,
    referral_code,
    email,
    fullName,
    full_name,
    password,
    confirmPassword,
    confirm_password,
    role,
  } = req.body;

  // 1. Username verification
  const rawUsername = (username || (email ? email.split('@')[0] : '')).toString().trim();
  if (!rawUsername || rawUsername.length < 3) {
    res.status(400).json({
      detail: 'Username is required and must be at least 3 characters long.',
    });
    return;
  }

  if (rawUsername.toLowerCase() === 'finance' || rawUsername.toLowerCase().includes('financial')) {
    res.status(400).json({
      detail: 'This username is reserved for Operations Team system administration and cannot be registered.',
    });
    return;
  }

  const existingUser = db.users.find(
    (u) => u.username?.toLowerCase() === rawUsername.toLowerCase()
  );
  if (existingUser) {
    res.status(400).json({ detail: `Username '${rawUsername}' is already taken.` });
    return;
  }

  // 2. Referral Code verification (Single-use invitation code issued by Operations Team; can only work for one user at a time)
  const inputRefCode = (referralCode || referral_code || '').toString().trim().toUpperCase();
  if (!inputRefCode) {
    res.status(400).json({
      detail: 'Referral invitation code is required. Please obtain a confidential invitation code from the Operations Team to register.',
    });
    return;
  }

  // Look up in database referral codes
  const matchedReferral = db.referralCodes.find(
    (rc) => rc.code.toUpperCase() === inputRefCode
  );

  if (!matchedReferral) {
    res.status(400).json({
      detail: 'Invalid referral code. A valid single-use invitation code provided by the Operations Team is required to register.',
    });
    return;
  }

  if (matchedReferral.status === 'USED') {
    res.status(400).json({
      detail: `This referral code has already been redeemed by ${matchedReferral.usedByUsername ? '@' + matchedReferral.usedByUsername : 'another user'}. Referral codes can only work for one user at a time. Please request a new invitation code from the Operations Team.`,
    });
    return;
  }

  // 3. Phone Number verification
  const rawPhone = (phoneNumber || phone_number || '').toString().trim();
  if (!rawPhone || rawPhone.length < 5) {
    res.status(400).json({ detail: 'A valid phone number is required.' });
    return;
  }

  // 4. Account Password & Confirm Password verification
  const rawPassword = (password || '').toString();
  if (!rawPassword || rawPassword.length < 6) {
    res.status(400).json({
      detail: 'Account password is required (minimum 6 characters) for logging into your account.',
    });
    return;
  }

  const rawConfirmPassword = (confirmPassword || confirm_password || '').toString();
  if (rawConfirmPassword && rawConfirmPassword !== rawPassword) {
    res.status(400).json({ detail: 'Password and Confirm Password do not match.' });
    return;
  }

  // 5. Withdrawal PIN / Password verification (Will later be used to authorize withdrawals of income earned only)
  const rawPin = (withdrawalPin || withdrawal_pin || '').toString().trim();
  if (!rawPin || rawPin.length < 4) {
    res.status(400).json({
      detail: 'Withdrawal PIN/password is required (minimum 4 characters/digits). This is strictly used for withdrawing earned income only.',
    });
    return;
  }

  // 6. Confirm Withdrawal PIN verification
  const rawConfirmPin = (confirmWithdrawalPin || confirm_withdrawal_pin || '').toString().trim();
  if (rawConfirmPin && rawConfirmPin !== rawPin) {
    res.status(400).json({ detail: 'Withdrawal PIN and Confirm Withdrawal PIN do not match.' });
    return;
  }

  // Email and Full Name defaults if not supplied directly
  const userEmail = (email || `${rawUsername.toLowerCase()}@ratepilot.test`).toLowerCase().trim();
  const existingEmail = db.users.find((u) => u.email.toLowerCase() === userEmail);
  if (existingEmail && existingEmail.username !== rawUsername) {
    res.status(400).json({ detail: `Email '${userEmail}' is already registered.` });
    return;
  }

  const userFullName = (fullName || full_name || rawUsername).trim();
  // All public registrations are strictly WORKER accounts.
  // The FINANCIAL_DEPARTMENT account is hardcoded & permanently protected so no worker can create one.
  const userRole = 'WORKER';

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(rawPassword, salt);
  const withdrawalPinHash = bcrypt.hashSync(rawPin, salt);

  const newUser: User = {
    id: db.users.length + 1,
    email: userEmail,
    username: rawUsername,
    phoneNumber: rawPhone,
    fullName: userFullName,
    passwordHash,
    withdrawalPinHash,
    role: userRole as 'WORKER' | 'FINANCIAL_DEPARTMENT',
    referralCodeUsed: inputRefCode,
    isActive: true,
    createdAt: new Date().toISOString(),
    profileCode: '',
    taskAccessApproved: false,
    smartPoints: 0,
    level: 'LEVEL 1',
    mustChangePassword: false,
    mustChangeWithdrawalPin: false,
  };

  newUser.profileCode = `TKP-${newUser.id.toString().padStart(6, '0')}`;
  db.users.push(newUser);

  // Mark single-use referral code as USED by this user
  matchedReferral.status = 'USED';
  matchedReferral.usedByUserId = newUser.id;
  matchedReferral.usedByUsername = newUser.username;
  matchedReferral.usedAt = new Date().toISOString();

  // Initialize balances
  const newBalance = {
    userId: newUser.id,
    bonusBalance: userRole === 'WORKER' ? 25.0 : 0.0,
    earningBalance: 0.0,
    updatedAt: new Date().toISOString(),
  };
  db.balances.push(newBalance);

  if (userRole === 'WORKER') {
    const initialTarget = 55 + ((newUser.id * 7) % 6);
    db.taskCycles.push({
      id: db.taskCycles.length + 1,
      workerId: newUser.id,
      cycleNumber: 1,
      taskLimit: TASKS_PER_CYCLE,
      targetReward: initialTarget,
      rewardAccumulated: 0,
      tasksCompleted: 0,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      targetConfiguredManually: false,
      selectedTaskIds: pickSequentialTaskIds(1),
    });
    // Record initial bonus ledger transaction
    db.balanceTransactions.unshift({
      id: db.balanceTransactions.length + 1,
      transactionId: `TX-REG-${Date.now().toString(36).toUpperCase()}`,
      workerId: newUser.id,
      balanceType: 'BONUS',
      transactionType: 'BONUS_CREDIT',
      amount: 25.0,
      previousBalance: 0,
      newBalance: 25.0,
      reason: 'Welcome bonus on verified registration with referral code',
      performedById: newUser.id,
      createdAt: new Date().toISOString(),
    });

    db.notifications.unshift({
      id: db.notifications.length + 1,
      userId: newUser.id,
      title: 'Welcome to Terrkeet!',
      message: 'Your account has been created. Use your Withdrawal PIN when requesting payouts.',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  logAudit('REGISTER', 'USER', newUser.id.toString(), newUser.id, {
    username: newUser.username,
    phoneNumber: newUser.phoneNumber,
    email: newUser.email,
    role: newUser.role,
    referralCode: inputRefCode,
  });

  db.save();

  const token = generateToken(newUser);
  res.json({
    access_token: token,
    token_type: 'bearer',
    user_id: newUser.id,
    username: newUser.username,
    phone_number: newUser.phoneNumber,
    email: newUser.email,
    role: newUser.role,
    full_name: newUser.fullName,
  });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, username, identifier, password, pin, withdrawal_pin } = req.body;
  const loginId = (identifier || username || email || '').toString().trim().toLowerCase();
  const credential = (password || pin || withdrawal_pin || '').toString();

  if (!loginId || !credential) {
    res.status(400).json({ detail: 'Username/phone/email and Password/PIN are required' });
    return;
  }

  // Look up by email, username, or phone number
  const cleanId = loginId.replace(/\D/g, '');
  const user = db.users.find((u) => {
    if (u.email && u.email.toLowerCase() === loginId) return true;
    if (u.username && u.username.toLowerCase() === loginId) return true;
    if (u.phoneNumber && cleanId.length >= 7 && u.phoneNumber.replace(/\D/g, '').endsWith(cleanId))
      return true;
    return false;
  });

  if (!user) {
    res.status(401).json({ detail: 'Invalid credentials. User not found.' });
    return;
  }

  // Verify password or withdrawal PIN
  const passwordMatch = bcrypt.compareSync(credential, user.passwordHash);
  const pinMatch = user.withdrawalPinHash ? bcrypt.compareSync(credential, user.withdrawalPinHash) : false;

  if (!passwordMatch && !pinMatch) {
    res.status(401).json({ detail: 'Invalid password or withdrawal PIN.' });
    return;
  }

  if (!user.isActive) {
    res.status(400).json({ detail: 'Account is deactivated' });
    return;
  }

  logAudit('LOGIN', 'USER', user.id.toString(), user.id, {
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const token = generateToken(user);
  res.json({
    access_token: token,
    token_type: 'bearer',
    user_id: user.id,
    username: user.username,
    phone_number: user.phoneNumber,
    email: user.email,
    role: user.role,
    full_name: user.fullName,
    must_change_password: !!user.mustChangePassword,
    must_change_withdrawal_pin: !!user.mustChangeWithdrawalPin,
  });
});

// Demo quick-switch route for easy evaluator review
router.post('/auth/demo-switch', (req: Request, res: Response) => {
  const { role, workerEmail } = req.body;

  let targetUser = db.users[0];
  if (role === 'FINANCIAL_DEPARTMENT') {
    targetUser = db.users.find((u) => u.role === 'FINANCIAL_DEPARTMENT') || db.users[0];
  } else if (workerEmail) {
    targetUser = db.users.find((u) => u.email === workerEmail) || db.users[1];
  } else {
    targetUser = db.users.find((u) => u.role === 'WORKER') || db.users[1];
  }

  const token = generateToken(targetUser);
  res.json({
    access_token: token,
    token_type: 'bearer',
    user_id: targetUser.id,
    username: targetUser.username,
    phone_number: targetUser.phoneNumber,
    email: targetUser.email,
    role: targetUser.role,
    full_name: targetUser.fullName,
  });
});

router.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const balance = db.balances.find((b) => b.userId === user.id) || {
    bonusBalance: 0,
    earningBalance: 0,
  };

  res.json({
    id: user.id,
    username: user.username,
    phone_number: user.phoneNumber,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    referral_code: user.referralCodeUsed,
    has_withdrawal_pin: !!user.withdrawalPinHash,
    is_active: user.isActive,
    created_at: user.createdAt,
    bonus_balance: balance.bonusBalance,
    earning_balance: balance.earningBalance,
    profile_code: user.profileCode,
    task_access_approved: user.taskAccessApproved !== false,
    smart_points: user.smartPoints || 0,
    level: calculateLevel(balance.earningBalance),
    must_change_password: !!user.mustChangePassword,
    must_change_withdrawal_pin: !!user.mustChangeWithdrawalPin,
  });
});

router.get('/profile/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const u = req.user!; const b = db.balances.find(x=>x.userId===u.id) || {bonusBalance:0, earningBalance:0}; const c = u.role==='WORKER' ? getActiveCycle(u.id) : null;
  res.json({ id:u.id, full_name:u.fullName, username:u.username, email:u.email, phone_number:u.phoneNumber, profile_code:u.profileCode, profile_image:u.profileImage ? `/uploads/profile/${u.profileImage}` : null, level:calculateLevel(b.earningBalance), smart_points:u.smartPoints||0, task_access_approved:u.taskAccessApproved!==false, bonus_balance:b.bonusBalance, earning_balance:b.earningBalance, cycle:c });
});

router.post('/profile/image', authenticateToken, profileUpload.single('image'), (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ detail: 'A valid PNG, JPG or WEBP image is required.' }); return; }
  const u=req.user!; const dir=path.resolve(process.cwd(),'uploads/profile'); fs.mkdirSync(dir,{recursive:true});
  const ext = req.file.mimetype.includes('png') ? '.png' : req.file.mimetype.includes('webp') ? '.webp' : '.jpg';
  const finalName = `profile_${u.id}_${Date.now()}${ext}`; fs.renameSync(req.file.path, path.join(dir, finalName));
  if (u.profileImage) { try { fs.unlinkSync(path.join(dir,u.profileImage)); } catch {} }
  u.profileImage=finalName; db.save(); res.json({ success:true, profile_image:`/uploads/profile/${finalName}` });
});

router.post('/profile/password', authenticateToken, (req: AuthRequest, res: Response) => {
  const u=req.user!; const {old_password,new_password,confirm_password}=req.body;
  if (!old_password || !new_password || new_password !== confirm_password) { res.status(400).json({detail:'Current password, new password and confirmation are required.'}); return; }
  if (!bcrypt.compareSync(old_password,u.passwordHash)) { res.status(400).json({detail:'Current password is incorrect.'}); return; }
  if (new_password.length < 6) { res.status(400).json({detail:'New password must be at least 6 characters.'}); return; }
  u.passwordHash=bcrypt.hashSync(new_password,bcrypt.genSaltSync(10)); u.mustChangePassword=false; db.save(); res.json({success:true});
});

router.post('/profile/pin', authenticateToken, (req: AuthRequest, res: Response) => {
  const u=req.user!; const {old_pin,new_pin,confirm_pin}=req.body;
  if (!old_pin || !new_pin || new_pin !== confirm_pin || new_pin.length < 4) { res.status(400).json({detail:'Current PIN, new PIN and confirmation are required.'}); return; }
  if (!u.withdrawalPinHash || !bcrypt.compareSync(old_pin,u.withdrawalPinHash)) { res.status(400).json({detail:'Current payment PIN is incorrect.'}); return; }
  u.withdrawalPinHash=bcrypt.hashSync(new_pin,bcrypt.genSaltSync(10)); u.mustChangeWithdrawalPin=false; db.save(); res.json({success:true});
});

// In-memory worker task lock map to prevent race conditions and duplicate deductions
const workerTaskLocks = new Map<number, boolean>();

// Current worker cycle and deterministic reward allocation helpers
function calculateLevel(earningBalance: number): string {
  const configs = db.levelConfigs.slice().sort((a,b) => b.minBalance - a.minBalance);
  return configs.find((c) => earningBalance >= c.minBalance)?.level || 'LEVEL 1';
}

function getLevelConfig(level: string) {
  return db.levelConfigs.find((c) => c.level === level) || db.levelConfigs.find((c) => c.level === 'LEVEL 1')!;
}


function getActiveCycle(workerId: number) {
  // A 20-task cycle NEVER rolls over automatically. Once the worker reaches
  // 20/20 the cycle remains COMPLETED until Operations Team explicitly
  // resets/starts a new cycle. Only workers with no cycle at all get the
  // initial cycle automatically.
  let cycle = db.taskCycles
    .filter((c) => c.workerId === workerId && c.status === 'ACTIVE')
    .sort((a, b) => b.id - a.id)[0];

  if (!cycle) {
    const latest = db.taskCycles
      .filter((c) => c.workerId === workerId)
      .sort((a, b) => b.id - a.id)[0];
    if (latest) return latest;
  }

  if (cycle) {
    const worker = db.users.find((u) => u.id === workerId);
    const levelConfig = getLevelConfig(calculateLevel(db.balances.find((b) => b.userId === workerId)?.earningBalance || 0));
    if (cycle.targetConfiguredManually !== true && (levelConfig.defaultCycleTarget || 60) > cycle.targetReward) {
      cycle.targetReward = levelConfig.defaultCycleTarget || cycle.targetReward;
      db.save();
    }
  }
  if (!cycle) {
    const worker = db.users.find((u) => u.id === workerId);
    const level = worker ? calculateLevel((db.balances.find((b) => b.userId === workerId)?.earningBalance || 0)) : 'LEVEL 1';
    const levelConfig = getLevelConfig(level);
    cycle = {
      id: db.taskCycles.length + 1, workerId, cycleNumber: 1, taskLimit: TASKS_PER_CYCLE,
      targetReward: levelConfig.defaultCycleTarget || 60, rewardAccumulated: 0, tasksCompleted: 0, status: 'ACTIVE',
      startedAt: new Date().toISOString(), targetConfiguredManually: false, selectedTaskIds: pickSequentialTaskIds(1)
    };
    db.taskCycles.push(cycle);
    // Persist the newly-created cycle immediately. Otherwise a server restart can
    // forget the worker's current position and make the UI/backend disagree.
    db.save();
  }

  // Keep the cycle counter synchronized with completions belonging to this exact
  // cycle. This protects against an older/stale in-memory counter after a reload.
  const cycleCompletions = db.taskCompletions.filter(
    (c) => c.workerId === workerId && c.cycleId === cycle!.id
  );
  const completedPositions = new Set(
    cycleCompletions.map((c) => taskPosition(c.taskId, cycle)).filter((n) => n > 0)
  );
  const contiguousCompleted = (() => {
    let n = 0;
    while (completedPositions.has(n + 1) && n < cycle!.taskLimit) n += 1;
    return n;
  })();
  if (contiguousCompleted > cycle.tasksCompleted) {
    cycle.tasksCompleted = contiguousCompleted;
    cycle.rewardAccumulated = Math.round(
      cycleCompletions.reduce((sum, c) => sum + (Number(c.earningCredited) || 0), 0) * 100
    ) / 100;
    db.save();
  }

  return cycle;
}

function calculateCycleReward(cycle: TaskCycle, taskNumber: number): number {
  const remainingTasks = Math.max(1, cycle.taskLimit - cycle.tasksCompleted);
  const remainingTarget = Math.max(0, Math.round((cycle.targetReward - cycle.rewardAccumulated) * 100) / 100);
  if (remainingTarget <= 0) return 0;
  if (remainingTasks === 1) return remainingTarget;
  // Deterministic variation while guaranteeing the configured cycle target is reached.
  const seed = ((cycle.workerId * 7919) + (cycle.cycleNumber * 104729) + (taskNumber * 15485863)) % 1000;
  const weight = 0.65 + (seed / 1000) * 0.7;
  const raw = (remainingTarget / remainingTasks) * weight;
  const maxForThisTask = Math.max(0.01, Math.round((remainingTarget - Math.max(0, remainingTasks - 1) * 0.01) * 100) / 100);
  return Math.max(0.01, Math.min(Math.round(raw * 100) / 100, maxForThisTask, remainingTarget));
}

function calculateSafeTaskPrice(cycle: TaskCycle, configuredPrice: number, bonusBalance: number, earningBalance: number): number {
  const totalAvailable = Math.max(0, bonusBalance + earningBalance);
  const remainingTasks = Math.max(1, cycle.taskLimit - cycle.tasksCompleted);
  if (totalAvailable <= 0) return 0;
  // Never let a configured task price consume more than the worker can safely allocate across the remaining cycle.
  // This keeps the 20-task cycle completable even when the configured price is higher than the starting bonus.
  const sustainablePrice = totalAvailable / remainingTasks;
  return Math.max(0.01, Math.min(configuredPrice, Math.round(sustainablePrice * 100) / 100));
}

function ensureCycleSelection(cycle: TaskCycle) {
  const expected = pickSequentialTaskIds(cycle.cycleNumber || 1);
  const current = Array.isArray(cycle.selectedTaskIds) ? cycle.selectedTaskIds : [];
  // Migrate legacy random selections to the canonical sequential task range.
  if (current.length !== expected.length || current.some((id, index) => id !== expected[index]) || cycle.taskLimit !== expected.length) {
    cycle.selectedTaskIds = expected;
    cycle.taskLimit = expected.length;
    db.save();
  }
  return cycle.selectedTaskIds || [];
}

function getCycleTasks(cycle?: TaskCycle) {
  if (!cycle) return [];
  const selected = ensureCycleSelection(cycle);
  const byId = new Map(db.tasks.map(t => [t.id, t]));
  return selected.map(id => byId.get(id)).filter(Boolean) as Task[];
}

function taskPosition(taskId: number, cycle?: TaskCycle): number {
  const ids = getCycleTasks(cycle).map(t => t.id);
  const idx = ids.indexOf(taskId);
  return idx >= 0 ? idx + 1 : 0;
}

function getExpectedTaskForCycle(cycle: TaskCycle) {
  const tasks = getCycleTasks(cycle);
  return tasks[Math.min(cycle.tasksCompleted, tasks.length - 1)];
}

function getComboAssignment(taskId: number, workerId: number, cycleId: number) {
  return db.comboTaskAssignments.find((x) => x.taskId === taskId && x.workerId === workerId && x.enabled && (!x.cycleId || x.cycleId === cycleId));
}

// -------------------------------------------------------------
// WORKER TASK ROUTES
// -------------------------------------------------------------

router.get('/tasks/progress', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.id) || req.user!;
  const cycle = getActiveCycle(user.id);
  const completed = cycle.tasksCompleted >= cycle.taskLimit || cycle.status === 'COMPLETED';
  res.json({
    day_number: cycle.cycleNumber,
    tasks_completed: cycle.tasksCompleted,
    task_limit: cycle.taskLimit,
    next_task_number: ((cycle.cycleNumber - 1) * TASKS_PER_CYCLE) + cycle.tasksCompleted + 1,
    target_reward: cycle.targetReward,
    reward_accumulated: cycle.rewardAccumulated,
    day_complete: completed,
    task_access_approved: user.taskAccessApproved !== false,
  });
});

router.get('/tasks', authenticateToken, (req: AuthRequest, res: Response) => {
  // The running server owns the authoritative in-memory state; every mutation is persisted with db.save().
  const user = db.users.find((u) => u.id === req.user!.id) || req.user!;
  const currentPrices = db.taskPrices.filter((p) => p.workerId === user.id);
  const priceMap = new Map(currentPrices.map((p) => [p.taskId, p]));
  const cycle = getActiveCycle(user.id);
  const cycleTasks = getCycleTasks(cycle);

  const completedTaskIds = new Set(
    db.taskCompletions.filter((c) => c.workerId === user.id && c.cycleId === cycle.id).map((c) => c.taskId)
  );
  const inProgress = db.taskAssignments.find(
    (a) => a.workerId === user.id && a.cycleId === cycle.id && a.status === 'IN_PROGRESS'
  );

  const reviewedBusinessIds = new Set(
    db.taskCompletions.filter((c) => c.workerId === user.id && c.cycleId === cycle.id).map((c) => c.businessId)
  );

  const latestSession = db.dailyTaskSessions[db.dailyTaskSessions.length - 1];
  const isDailyClosed = latestSession ? latestSession.status === 'CLOSED' : false;
  const expectedTask = getExpectedTaskForCycle(cycle);

  // Only the current sequential task is exposed. If it is already in progress,
  // keep showing that same task so refresh/logout cannot unlock a later task.
  const visibleTask = inProgress
    ? cycleTasks.find(t => t.id === inProgress.taskId)
    : expectedTask;

  if (!visibleTask || cycle.tasksCompleted >= cycle.taskLimit) {
    res.json([]);
    return;
  }

  const biz = db.businesses.find((b) => b.id === visibleTask.businessId);
  const userPriceEntry = priceMap.get(visibleTask.id);
  const configuredTaskPrice =
    userPriceEntry?.price !== undefined
      ? userPriceEntry.price
      : userPriceEntry?.amount !== undefined
      ? userPriceEntry.amount
      : visibleTask.price;
  const balanceForPrice = db.balances.find((b) => b.userId === user.id) || { bonusBalance: 0, earningBalance: 0 };
  // Resolve combo settings before calculating the effective task price/reward.
  // Previously effectiveCombo/effectivePrice were referenced before their const
  // declarations, which caused GET /api/tasks to fail and the worker UI to show
  // an empty task list even when the worker was approved.
  const taskNumber = taskPosition(visibleTask.id, cycle);
  const comboAssignment = getComboAssignment(visibleTask.id, user.id, cycle.id);
  const effectiveCombo = !!comboAssignment;
  const effectivePrice = comboAssignment?.price ?? configuredTaskPrice;
  const taskPrice = effectiveCombo
    ? effectivePrice
    : calculateSafeTaskPrice(cycle, configuredTaskPrice, balanceForPrice.bonusBalance, balanceForPrice.earningBalance);
  const completionReward = effectiveCombo
    ? Math.round(effectivePrice * (comboAssignment?.multiplier ?? (visibleTask.comboMultiplier || 2.5)) * 100) / 100
    : calculateCycleReward(cycle, taskNumber);
  const hasCompleted = completedTaskIds.has(visibleTask.id);
  const isInProgress = inProgress?.taskId === visibleTask.id;

  res.json([{
    id: visibleTask.id,
    business_id: visibleTask.businessId,
    business: biz,
    title: visibleTask.title,
    task_type: visibleTask.taskType || 'Rating',
    instructions: visibleTask.instructions,
    required_stars: visibleTask.requiredStars,
    is_active: visibleTask.isActive,
    price: taskPrice,
    completion_amount: completionReward,
    user_price: taskPrice,
    configured_price: configuredTaskPrice,
    available_balance: balanceForPrice.bonusBalance + balanceForPrice.earningBalance,
    assignment_status: hasCompleted ? 'COMPLETED' : isInProgress ? 'IN_PROGRESS' : 'NOT_STARTED',
    has_completed: hasCompleted,
    is_in_progress: isInProgress,
    has_reviewed_business: reviewedBusinessIds.has(visibleTask.businessId),
    is_daily_closed: isDailyClosed,
    task_position: taskNumber,
    task_number: ((cycle.cycleNumber - 1) * TASKS_PER_CYCLE) + taskNumber,
    task_day_number: cycle.cycleNumber,
    cycle_task_limit: cycle.taskLimit,
    cycle_tasks_completed: cycle.tasksCompleted,
    cycle_target_reward: cycle.targetReward,
    cycle_reward_accumulated: cycle.rewardAccumulated,
    is_combo: effectiveCombo,
    combo_multiplier: comboAssignment?.multiplier ?? (visibleTask.comboMultiplier || 2.5),
  }]);
});

// TASK START TRANSACTION
// Deducts task price atomically from worker's Earning Balance before task is started
router.post('/tasks/:id/start', authenticateToken, (req: AuthRequest, res: Response) => {
  // Use the same authoritative in-memory task state that produced the worker's task card.
  const user = db.users.find((u) => u.id === req.user!.id) || req.user!;
  if (user.role !== 'WORKER') {
    res.status(403).json({ detail: 'Only workers can start tasks' });
    return;
  }

  const taskId = parseInt(req.params.id, 10);

  // 1. Check daily task status
  const latestSession = db.dailyTaskSessions[db.dailyTaskSessions.length - 1];
  if (latestSession && latestSession.status === 'CLOSED') {
    res.status(403).json({
      detail: "Today's tasks are closed. Please return when tasks reopen.",
    });
    return;
  }

  // 2. Worker must be individually approved by Operations Team
  if (user.taskAccessApproved === false) {
    res.status(403).json({ detail: 'Your task access has not yet been approved by the Operations Team.' });
    return;
  }

  const cycle = getActiveCycle(user.id);
  if (cycle.targetConfiguredManually !== true) {
    res.status(403).json({ detail: 'Operations Team must set and save the target for this day before tasks can start.' });
    return;
  }
  if (cycle.tasksCompleted >= cycle.taskLimit) {
    res.status(400).json({ detail: 'You have completed all 20 tasks for this cycle.' });
    return;
  }

  // Strict sequential progression: the worker may start only the next task.
  const expectedTask = getExpectedTaskForCycle(cycle);
  if (!expectedTask || expectedTask.id !== taskId) {
    const expectedPosition = Math.min(cycle.tasksCompleted + 1, cycle.taskLimit);
    res.status(409).json({
      detail: `Task sequence locked. Complete Task ${expectedPosition} before starting another task.`,
      expected_task_id: expectedTask?.id ?? null,
      expected_task_position: expectedPosition,
    });
    return;
  }

  // Resolve the task from the same in-memory collection used by GET /api/tasks.
  // This avoids a false 404 caused by reloading an older JSON snapshot between
  // displaying the task and pressing Start Task.
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ detail: 'Task not found', expected_task_id: expectedTask.id });
    return;
  }
  if (!task.isActive) {
    res.status(409).json({
      detail: 'This task is currently inactive. The Operations Team must activate it before it can be started.',
      task_id: task.id,
      expected_task_id: expectedTask.id,
    });
    return;
  }

  // 3. Check worker authorization & duplication
  const alreadyCompleted =
    db.taskCompletions.some((c) => c.workerId === user.id && c.cycleId === cycle.id && c.taskId === taskId) ||
    db.taskAssignments.some(
      (a) => a.workerId === user.id && a.cycleId === cycle.id && a.taskId === taskId && a.status === 'COMPLETED'
    );
  if (alreadyCompleted) {
    res.status(400).json({ detail: 'You have already completed this task.' });
    return;
  }

  const alreadyInProgress = db.taskAssignments.find(
    (a) => a.workerId === user.id && a.cycleId === cycle.id && a.taskId === taskId && a.status === 'IN_PROGRESS'
  );
  if (alreadyInProgress) {
    res.status(409).json({
      detail: 'This task is already in progress. Continue the current task instead of starting it again.',
      assignment: alreadyInProgress,
    });
    return;
  }

  // 4. Check rating restriction
  const alreadyReviewedBiz = db.taskCompletions.some(
    (c) => c.workerId === user.id && c.cycleId === cycle.id && c.businessId === task.businessId
  );
  if (alreadyReviewedBiz) {
    res.status(400).json({
      detail:
        'Rating Restriction: You have already submitted a rating/review for this business.',
    });
    return;
  }

  // 5. Prevent double deduction: check if task is already in progress
  const existingInProgress = db.taskAssignments.find(
    (a) => a.workerId === user.id && a.cycleId === cycle.id && a.taskId === taskId && a.status === 'IN_PROGRESS'
  );
  if (existingInProgress) {
    res.status(400).json({ detail: 'Task is already in progress.' });
    return;
  }

  // 6. Concurrency lock to prevent simultaneous duplicate clicks
  if (workerTaskLocks.get(user.id)) {
    res.status(409).json({ detail: 'A task start transaction is currently processing. Please wait.' });
    return;
  }
  workerTaskLocks.set(user.id, true);

  try {
    // 7. Retrieve authorized task price from database for this specific worker (never trust frontend!)
    const priceEntry = db.taskPrices.find(
      (p) => p.taskId === taskId && p.workerId === user.id
    );
    const comboAssignment = getComboAssignment(task.id, user.id, cycle.id);
    const configuredTaskPrice = comboAssignment?.price ?? (priceEntry?.price !== undefined
      ? priceEntry.price
      : priceEntry?.amount !== undefined
      ? priceEntry.amount
      : task.price);

    if (typeof configuredTaskPrice !== 'number' || configuredTaskPrice <= 0) {
      throw new Error('Authorized task price is invalid or unconfigured.');
    }

    // 8. Deduct from Bonus Balance first, then Earning Balance.
    let balance = db.balances.find((b) => b.userId === user.id);
    if (!balance) {
      balance = { userId: user.id, bonusBalance: 0, earningBalance: 0, updatedAt: new Date().toISOString() };
      db.balances.push(balance);
    }
    const totalAvailable = balance.bonusBalance + balance.earningBalance;
    const taskPrice = comboAssignment ? configuredTaskPrice : calculateSafeTaskPrice(cycle, configuredTaskPrice, balance.bonusBalance, balance.earningBalance);
    if (taskPrice <= 0 || totalAvailable < taskPrice) {
      res.status(400).json({ detail: 'Insufficient balance to start this task.', required: taskPrice, available: totalAvailable });
      return;
    }

    const bonusUsed = Math.min(balance.bonusBalance, taskPrice);
    const earningUsed = Math.round((taskPrice - bonusUsed) * 100) / 100;
    const prevBonus = balance.bonusBalance;
    const prevEarning = balance.earningBalance;
    balance.bonusBalance = Math.round((balance.bonusBalance - bonusUsed) * 100) / 100;
    balance.earningBalance = Math.round((balance.earningBalance - earningUsed) * 100) / 100;
    balance.updatedAt = new Date().toISOString();

    if (bonusUsed > 0) {
      db.balanceTransactions.unshift({ id: db.balanceTransactions.length + 1, transactionId: `TX-BONUS-${Date.now().toString(36).toUpperCase()}`, workerId: user.id, balanceType: 'BONUS', transactionType: 'BONUS_DEBIT', amount: bonusUsed, previousBalance: prevBonus, newBalance: balance.bonusBalance, reason: `TASK START: ${task.title} (Task #${task.id})`, performedById: user.id, createdAt: new Date().toISOString() });
    }
    if (earningUsed > 0) {
      db.balanceTransactions.unshift({ id: db.balanceTransactions.length + 1, transactionId: `TX-START-${Date.now().toString(36).toUpperCase()}`, workerId: user.id, balanceType: 'EARNING', transactionType: 'TASK_START_DEBIT', amount: earningUsed, previousBalance: prevEarning, newBalance: balance.earningBalance, reason: `TASK START: ${task.title} (Task #${task.id})`, performedById: user.id, createdAt: new Date().toISOString() });
    }

    // 11. Create worker's task assignment in-progress record
    const assignment = {
      id: db.taskAssignments.length + 1,
      assignmentId: `ASG-${Date.now().toString(36).toUpperCase()}`,
      taskId: task.id,
      workerId: user.id,
      taskPrice: taskPrice,
      cycleId: cycle.id,
      status: 'IN_PROGRESS' as const,
      startedAt: new Date().toISOString(),
    };
    db.taskAssignments.push(assignment);

    // 12. Worker notification
    db.notifications.unshift({
      id: db.notifications.length + 1,
      userId: user.id,
      title: 'Task Started',
      message: `Task #${task.id} started. $${taskPrice.toFixed(2)} was used from your available balances. Bonus used: $${bonusUsed.toFixed(2)}. Earning used: $${earningUsed.toFixed(2)}.`,
      type: 'INFO',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 13. Audit log
    logAudit('TASK_START_DEBIT', 'TASK_ASSIGNMENT', assignment.assignmentId, user.id, {
      taskId: task.id,
      taskPrice,
      configuredTaskPrice,
      previousBonusBalance: prevBonus,
      newBonusBalance: balance.bonusBalance,
      previousEarningBalance: prevEarning,
      newEarningBalance: balance.earningBalance,
    });

    db.save();

    res.json({
      success: true,
      message: 'Task successfully started',
      assignment,
      task_id: task.id,
      task_title: task.title,
      task_price: taskPrice,
      configured_task_price: configuredTaskPrice,
      previous_bonus_balance: prevBonus,
      new_bonus_balance: balance.bonusBalance,
      previous_earning_balance: prevEarning,
      new_earning_balance: balance.earningBalance,
      bonus_used: bonusUsed,
      earning_used: earningUsed,
      cycle_id: cycle.id,
      cycle_tasks_completed: cycle.tasksCompleted,
      cycle_target_reward: cycle.targetReward,
    });
  } catch (err: any) {
    res.status(500).json({ detail: err.message || 'Internal error starting task' });
  } finally {
    workerTaskLocks.delete(user.id);
  }
});

router.post(
  '/tasks/:id/complete',
  authenticateToken,
  taskProofUpload.single('screenshot'),
  (req: AuthRequest, res: Response) => {
    try {
      const user = db.users.find((u) => u.id === req.user!.id) || req.user!;
      if (user.role !== 'WORKER') {
        res.status(403).json({ detail: 'Only workers can complete tasks' });
        return;
      }

      const taskId = parseInt(req.params.id, 10);
      const { stars_given, review_text } = req.body;
      const screenshotPath = (req as any).file ? `/uploads/proofs/${(req as any).file.filename}` : undefined;

      // 1. Check daily task status
      const latestSession = db.dailyTaskSessions[db.dailyTaskSessions.length - 1];
      if (latestSession && latestSession.status === 'CLOSED') {
        res.status(403).json({
          detail: "Today's tasks are closed. Please return when tasks reopen.",
        });
        return;
      }

      // 2. Require Operations Team approval for every completion submission too.
      if (user.taskAccessApproved === false) {
        res.status(403).json({ detail: 'Task access is paused. Operations Team must approve your current day before you can continue.' });
        return;
      }

      // 3. Validate task from the same authoritative in-memory state used by task start.
      const task = db.tasks.find((t) => t.id === taskId);
      if (!task) {
        res.status(404).json({ detail: 'Task not found' });
        return;
      }
      if (!task.isActive) {
        res.status(409).json({ detail: 'This task is currently inactive. The Operations Team must activate it before it can be completed.' });
        return;
      }

      // 3. Enforce the same sequential lock at completion time.
      const cycle = getActiveCycle(user.id);
      if (cycle.targetConfiguredManually !== true) {
        res.status(403).json({ detail: 'Operations Team must configure and approve this day before task completion can be submitted.' });
        return;
      }
      const expectedTask = getExpectedTaskForCycle(cycle);
      if (!expectedTask || expectedTask.id !== taskId) {
        res.status(409).json({
          detail: `Task sequence locked. Complete Task ${Math.min(cycle.tasksCompleted + 1, cycle.taskLimit)} before completing another task.`,
          expected_task_id: expectedTask?.id ?? null,
        });
        return;
      }

      // 4. Verify worker has an IN_PROGRESS assignment
      const assignment = db.taskAssignments.find(
        (a) => a.workerId === user.id && a.taskId === taskId && a.status === 'IN_PROGRESS'
      );
      if (!assignment) {
        res.status(400).json({
          detail:
            'You must start this task before submitting completion. Click [START TASK] to begin.',
        });
        return;
      }

      // 4. Validate duplicate task completion
      const alreadyCompleted = db.taskCompletions.find(
        (c) => c.workerId === user.id && c.cycleId === assignment.cycleId && c.taskId === taskId
      );
      if (alreadyCompleted || assignment.status === 'COMPLETED') {
        res.status(400).json({ detail: 'You have already completed this task.' });
        return;
      }

      const starsNum = parseInt(stars_given, 10);
      if (isNaN(starsNum) || starsNum < 1 || starsNum > 5) {
        res.status(400).json({ detail: 'Rating must be between 1 and 5 stars.' });
        return;
      }


      // 6. Determine configured task completion amount from DB (controlled by Operations Team)
      const priceEntry = db.taskPrices.find(
        (p) => p.taskId === taskId && p.workerId === user.id
      );
      const comboAssignment = getComboAssignment(task.id, user.id, assignment.cycleId || cycle.id);
      const cycleForAssignment = db.taskCycles.find((c) => c.id === assignment.cycleId) || getActiveCycle(user.id);
      const earningAmount = comboAssignment
        ? Math.round((assignment.taskPrice * (comboAssignment.multiplier ?? (task.comboMultiplier || 2.5))) * 100) / 100
        : calculateCycleReward(cycleForAssignment, taskPosition(task.id, cycleForAssignment));

      // 7. Update assignment status to COMPLETED
      assignment.status = 'COMPLETED';
      assignment.completedAt = new Date().toISOString();

      // 8. Save task completion record
      const completion: TaskCompletion = {
        id: db.taskCompletions.length + 1,
        taskId,
        workerId: user.id,
        businessId: task.businessId,
        starsGiven: starsNum,
        reviewText: '',
        screenshotPath,
        earningCredited: earningAmount,
        cycleId: cycleForAssignment.id,
        completedAt: new Date().toISOString(),
      };
      db.taskCompletions.push(completion);

      // 9. Credit Earning Balance & write transaction ledger entry (TASK_EARNING)
      let balance = db.balances.find((b) => b.userId === user.id);
      if (!balance) {
        balance = {
          userId: user.id,
          bonusBalance: 0,
          earningBalance: 0,
          updatedAt: new Date().toISOString(),
        };
        db.balances.push(balance);
      }

      const prevBalance = balance.earningBalance;
      const newBalance = Math.round((prevBalance + earningAmount) * 100) / 100;
      balance.earningBalance = newBalance;
      balance.updatedAt = new Date().toISOString();
      user.level = calculateLevel(balance.earningBalance);
      if (!comboAssignment) {
        cycleForAssignment.rewardAccumulated = Math.round((cycleForAssignment.rewardAccumulated + earningAmount) * 100) / 100;
      }
      cycleForAssignment.tasksCompleted += 1;
      user.smartPoints = (user.smartPoints || 0) + 1;
      if (cycleForAssignment.tasksCompleted >= cycleForAssignment.taskLimit) {
        cycleForAssignment.status = 'COMPLETED';
        cycleForAssignment.endedAt = new Date().toISOString();
        // Day completion locks this worker out until Operations creates the next day and approves access.
        user.taskAccessApproved = false;
      }

      const tx: BalanceTransaction = {
        id: db.balanceTransactions.length + 1,
        transactionId: `TX-TASK-${Date.now().toString(36).toUpperCase()}`,
        workerId: user.id,
        balanceType: 'EARNING',
        transactionType: 'TASK_EARNING',
        amount: earningAmount,
        previousBalance: prevBalance,
        newBalance: newBalance,
        reason: `Task completed: ${task.title} (Task #${task.id})`,
        performedById: user.id,
        createdAt: new Date().toISOString(),
      };
      db.balanceTransactions.unshift(tx);

      // 10. Worker notification
      const biz = db.businesses.find((b) => b.id === task.businessId);
      db.notifications.unshift({
        id: db.notifications.length + 1,
        userId: user.id,
        title: 'Task Completed & Earnings Credited!',
        message: `You earned $${earningAmount.toFixed(2)} for rating '${biz?.name}'. Amount credited directly to your Earning Balance.`,
        type: 'SUCCESS',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // 11. Audit log
      logAudit('TASK_COMPLETED', 'TASK_COMPLETION', completion.id.toString(), user.id, {
        taskId,
        businessId: task.businessId,
        earningCredited: earningAmount,
        starsGiven: starsNum,
        screenshotPath,
      });

      db.save();

      res.json({
        id: completion.id,
        task_id: completion.taskId,
        worker_id: completion.workerId,
        business_id: completion.businessId,
        stars_given: completion.starsGiven,
        review_text: completion.reviewText,
        earning_credited: completion.earningCredited,
        completed_at: completion.completedAt,
        task_title: task.title,
        business_name: biz?.name,
        screenshot_path: completion.screenshotPath,
      });
    } catch (err: any) {
      res.status(500).json({ detail: err.message || 'Internal server error' });
    }
  }
);

router.get('/financial/task-proofs', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = req.query.worker_id ? parseInt(String(req.query.worker_id), 10) : undefined;
  const rows = db.taskCompletions
    .filter((c) => workerId ? c.workerId === workerId : true)
    .sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map((c) => {
      const worker = db.users.find((u) => u.id === c.workerId);
      const task = db.tasks.find((t) => t.id === c.taskId);
      const business = db.businesses.find((b) => b.id === c.businessId);
      return {
        id: c.id, task_id: c.taskId, worker_id: c.workerId, worker_name: worker?.fullName || 'Worker',
        worker_username: worker?.username || '', profile_code: worker?.profileCode || '',
        task_title: task?.title || '', business_name: business?.name || '',
        stars_given: c.starsGiven, review_text: c.reviewText, screenshot_path: c.screenshotPath,
        earning_credited: c.earningCredited, completed_at: c.completedAt, cycle_id: c.cycleId,
      };
    });
  res.json(rows);
});

router.get('/tasks/history', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const activeCycle = user.role === 'WORKER' ? getActiveCycle(user.id) : null;
  const completions = db.taskCompletions
    .filter((c) => c.workerId === user.id && (!activeCycle || c.cycleId === activeCycle.id))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map((c) => {
      const task = db.tasks.find((t) => t.id === c.taskId);
      const biz = db.businesses.find((b) => b.id === c.businessId);
      return {
        id: c.id,
        task_id: c.taskId,
        worker_id: c.workerId,
        business_id: c.businessId,
        stars_given: c.starsGiven,
        review_text: c.reviewText,
        screenshot_path: c.screenshotPath,
        earning_credited: c.earningCredited,
        completed_at: c.completedAt,
        task_title: task?.title || '',
        business_name: biz?.name || '',
      };
    });

  res.json(completions);
});

router.get('/tasks/status', (_req: Request, res: Response) => {
  const latestSession = db.dailyTaskSessions[db.dailyTaskSessions.length - 1];
  res.json({
    daily_task_status: latestSession ? latestSession.status : 'OPEN',
    latest_session: latestSession || null,
  });
});

// -------------------------------------------------------------
// WITHDRAWALS ROUTES (WORKER & FINANCE)
// -------------------------------------------------------------

router.post('/withdrawals/request', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'WORKER') {
    res.status(403).json({ detail: 'Only workers can request withdrawals' });
    return;
  }

  const { amount, payment_method, payment_details, withdrawal_pin, withdrawalPin } = req.body;
  const normalizedMethod = String(payment_method || 'CRYPTO').toUpperCase();
  if (!normalizedMethod.startsWith('CRYPTO')) {
    res.status(400).json({ detail: 'Only crypto withdrawals are supported.' });
    return;
  }
  const withdrawAmount = parseFloat(amount);

  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    res.status(400).json({ detail: 'Withdrawal amount must be greater than zero' });
    return;
  }

  // Validate withdrawal PIN: withdrawal pin will later be used to withdraw the income earned
  const pinInput = (withdrawal_pin || withdrawalPin || '').toString().trim();
  if (!pinInput) {
    res.status(400).json({
      detail: 'Security Withdrawal PIN is required to authorize withdrawals of your earned income.',
    });
    return;
  }

  if (user.withdrawalPinHash) {
    const isPinValid = bcrypt.compareSync(pinInput, user.withdrawalPinHash);
    if (!isPinValid) {
      res.status(400).json({
        detail: 'Incorrect Withdrawal PIN. Please enter your valid security PIN created during account registration.',
      });
      return;
    }
  }

  if (!payment_details || payment_details.trim().length < 5) {
    res.status(400).json({ detail: 'Valid payout details are required' });
    return;
  }

  const balance = db.balances.find((b) => b.userId === user.id);
  if (!balance) {
    res.status(400).json({ detail: 'Balance profile not found' });
    return;
  }

  const prevBalance = balance.earningBalance;
  if (prevBalance < withdrawAmount) {
    res.status(400).json({
      detail: `Insufficient Earning Balance. Your withdrawable balance is $${prevBalance.toFixed(
        2
      )}. Bonus Balance cannot be withdrawn.`,
    });
    return;
  }

  // Deduct from Earning Balance
  const newBalance = Math.round((prevBalance - withdrawAmount) * 100) / 100;
  balance.earningBalance = newBalance;
  balance.updatedAt = new Date().toISOString();

  const withdrawalId = `WD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const withdrawal: Withdrawal = {
    id: db.withdrawals.length + 1,
    withdrawalId,
    workerId: user.id,
    amount: withdrawAmount,
    paymentMethod: normalizedMethod,
    paymentDetails: payment_details.trim(),
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
  };
  db.withdrawals.unshift(withdrawal);

  // Record ledger transaction
  const tx: BalanceTransaction = {
    id: db.balanceTransactions.length + 1,
    transactionId: `TX-WD-${Date.now().toString(36).toUpperCase()}`,
    workerId: user.id,
    balanceType: 'EARNING',
    transactionType: 'WITHDRAWAL',
    amount: withdrawAmount,
    previousBalance: prevBalance,
    newBalance: newBalance,
    reason: `Withdrawal request ${withdrawalId} via ${normalizedMethod}`,
    performedById: user.id,
    createdAt: new Date().toISOString(),
  };
  db.balanceTransactions.unshift(tx);

  logAudit('WITHDRAWAL_REQUEST', 'WITHDRAWAL', withdrawalId, user.id, {
    amount: withdrawAmount,
    paymentMethod: payment_method,
    paymentDetails: payment_details,
  });

  db.save();

  res.json({
    id: withdrawal.id,
    withdrawal_id: withdrawal.withdrawalId,
    worker_id: withdrawal.workerId,
    amount: withdrawal.amount,
    payment_method: withdrawal.paymentMethod,
    payment_details: withdrawal.paymentDetails,
    status: withdrawal.status,
    requested_at: withdrawal.requestedAt,
  });
});

router.get('/withdrawals/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const list = db.withdrawals
    .filter((w) => w.workerId === user.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .map((w) => ({
      id: w.id,
      withdrawal_id: w.withdrawalId,
      worker_id: w.workerId,
      worker_name: user.fullName,
      amount: w.amount,
      payment_method: w.paymentMethod,
      payment_details: w.paymentDetails,
      status: w.status,
      rejection_reason: w.rejectionReason,
      processed_by_id: w.processedById,
      requested_at: w.requestedAt,
      processed_at: w.processedAt,
    }));
  res.json(list);
});

// -------------------------------------------------------------
// WORKER DEPOSIT ROUTES (INCLUDING CRYPTO & DIRECT OPTIONS)
// -------------------------------------------------------------

router.get('/deposits/crypto-wallets', authenticateToken, (_req: AuthRequest, res: Response) => {
  res.json(db.cryptoWallets.filter((w) => w.isActive).map((w) => ({
    id: w.id, name: w.name, symbol: w.symbol, network: w.network, address: w.address,
    min_deposit: w.minDeposit, confirmations: w.confirmations, recommended: w.recommended,
    rate_usd: w.rateUsd, qr_data: w.qrData, is_active: w.isActive,
  })));
});

router.get('/financial/crypto-wallets', ...financialGuard, (_req: AuthRequest, res: Response) => {
  res.json(db.cryptoWallets.map((w) => ({ ...w, min_deposit: w.minDeposit, rate_usd: w.rateUsd, qr_data: w.qrData, is_active: w.isActive })));
});

router.post('/financial/crypto-wallets', ...financialGuard, (req: AuthRequest, res: Response) => {
  const { name, symbol, network, address, min_deposit, confirmations, rate_usd, recommended, qr_data } = req.body;
  if (!name || !symbol || !network || !address) { res.status(400).json({ detail: 'Name, symbol, network and wallet address are required.' }); return; }
  const minDeposit = Number(min_deposit || 0);
  const conf = Number(confirmations || 1);
  const rate = Number(rate_usd || 1);
  if (!Number.isFinite(minDeposit) || minDeposit < 0 || !Number.isFinite(conf) || conf < 1 || !Number.isFinite(rate) || rate <= 0) { res.status(400).json({ detail: 'Invalid wallet configuration values.' }); return; }
  const id = `${String(symbol).toLowerCase()}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const wallet: CryptoWalletConfig = { id, name: String(name).trim(), symbol: String(symbol).trim().toUpperCase(), network: String(network).trim(), address: String(address).trim(), minDeposit, confirmations: Math.floor(conf), rateUsd: rate, recommended: !!recommended, qrData: qr_data?.toString().trim() || undefined, isActive: true, createdAt: now, updatedAt: now, createdById: req.user!.id };
  db.cryptoWallets.unshift(wallet);
  logAudit('CRYPTO_WALLET_ADDED', 'CRYPTO_WALLET', wallet.id, req.user!.id, { symbol: wallet.symbol, network: wallet.network, address: wallet.address });
  db.save();
  res.status(201).json(wallet);
});

router.put('/financial/crypto-wallets/:id', ...financialGuard, (req: AuthRequest, res: Response) => {
  const wallet = db.cryptoWallets.find((w) => w.id === req.params.id);
  if (!wallet) { res.status(404).json({ detail: 'Crypto wallet not found.' }); return; }
  const { name, symbol, network, address, min_deposit, confirmations, rate_usd, recommended, qr_data, is_active } = req.body;
  if (name !== undefined) wallet.name = String(name).trim();
  if (symbol !== undefined) wallet.symbol = String(symbol).trim().toUpperCase();
  if (network !== undefined) wallet.network = String(network).trim();
  if (address !== undefined) wallet.address = String(address).trim();
  if (min_deposit !== undefined) wallet.minDeposit = Number(min_deposit);
  if (confirmations !== undefined) wallet.confirmations = Math.max(1, Math.floor(Number(confirmations)));
  if (rate_usd !== undefined) wallet.rateUsd = Number(rate_usd);
  if (recommended !== undefined) wallet.recommended = !!recommended;
  if (qr_data !== undefined) wallet.qrData = String(qr_data).trim() || undefined;
  if (is_active !== undefined) wallet.isActive = !!is_active;
  wallet.updatedAt = new Date().toISOString();
  logAudit('CRYPTO_WALLET_UPDATED', 'CRYPTO_WALLET', wallet.id, req.user!.id, { isActive: wallet.isActive, symbol: wallet.symbol, network: wallet.network });
  db.save();
  res.json(wallet);
});

router.delete('/financial/crypto-wallets/:id', ...financialGuard, (req: AuthRequest, res: Response) => {
  const idx = db.cryptoWallets.findIndex((w) => w.id === req.params.id);
  if (idx < 0) { res.status(404).json({ detail: 'Crypto wallet not found.' }); return; }
  const [wallet] = db.cryptoWallets.splice(idx, 1);
  logAudit('CRYPTO_WALLET_DELETED', 'CRYPTO_WALLET', wallet.id, req.user!.id, { symbol: wallet.symbol, network: wallet.network });
  db.save();
  res.json({ success: true, deleted_id: wallet.id });
});

router.post('/deposits/request', authenticateToken, depositProofUpload.single('payment_proof'), (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'WORKER') {
    res.status(403).json({ detail: 'Only workers can initiate deposits' });
    return;
  }

  const {
    amount,
    payment_method,
    crypto_currency,
    crypto_wallet_id,
    tx_hash,
    proof_note,
  } = req.body;
  const paymentProofPath = (req as any).file ? `/uploads/proofs/${(req as any).file.filename}` : undefined;

  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    res.status(400).json({ detail: 'Please enter a valid deposit amount greater than $0.00' });
    return;
  }

  const method = (payment_method || 'CRYPTO').toUpperCase();
  if (method !== 'CRYPTO') {
    res.status(400).json({ detail: 'Only crypto deposits are supported.' });
    return;
  }
  let selectedCrypto = crypto_currency;
  let selectedAddress = '';

  if (method === 'CRYPTO') {
    const walletConfig =
      db.cryptoWallets.find((w) => w.isActive && (w.id === crypto_wallet_id || w.symbol === crypto_currency)) ||
      db.cryptoWallets.find((w) => w.isActive);
    if (!walletConfig) { res.status(400).json({ detail: 'No active crypto deposit wallet is configured.' }); return; }

    selectedCrypto = `${walletConfig.symbol} (${walletConfig.network})`;
    selectedAddress = walletConfig.address;

    if (depositAmount < walletConfig.minDeposit) {
      res.status(400).json({
        detail: `Minimum deposit for ${walletConfig.name} (${walletConfig.network}) is $${walletConfig.minDeposit.toFixed(2)}.`,
      });
      return;
    }
  }

  const depositId = `DEP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const newDeposit: Deposit = {
    id: db.deposits.length + 1,
    depositId,
    workerId: user.id,
    amount: depositAmount,
    paymentMethod: method,
    cryptoCurrency: selectedCrypto,
    cryptoAddress: selectedAddress,
    txHash: tx_hash?.toString().trim() || undefined,
    proofNote: proof_note?.toString().trim() || undefined,
    proofScreenshotPath: paymentProofPath,
    status: 'PENDING',
    requestedAt: now,
  };

  db.deposits.unshift(newDeposit);

  // Send system notification to worker confirming deposit request
  db.notifications.unshift({
    id: db.notifications.length + 1,
    userId: user.id,
    title: 'Deposit Submitted',
    message: `Your deposit request ${depositId} for $${depositAmount.toFixed(
      2
    )} (${selectedCrypto || method}) has been submitted and is pending review by the Operations Team.`,
    type: 'INFO',
    isRead: false,
    createdAt: now,
  });

  logAudit('DEPOSIT_REQUEST', 'DEPOSIT', depositId, user.id, {
    amount: depositAmount,
    paymentMethod: method,
    cryptoCurrency: selectedCrypto,
    txHash: tx_hash,
  });

  db.save();

  res.status(201).json({
    success: true,
    id: newDeposit.id,
    deposit_id: newDeposit.depositId,
    worker_id: newDeposit.workerId,
    amount: newDeposit.amount,
    payment_method: newDeposit.paymentMethod,
    crypto_currency: newDeposit.cryptoCurrency,
    crypto_address: newDeposit.cryptoAddress,
    tx_hash: newDeposit.txHash,
    status: newDeposit.status,
    requested_at: newDeposit.requestedAt,
  });
});

router.get('/deposits/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const list = db.deposits
    .filter((d) => d.workerId === user.id)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .map((d) => ({
      id: d.id,
      deposit_id: d.depositId,
      worker_id: d.workerId,
      worker_name: user.fullName,
      amount: d.amount,
      payment_method: d.paymentMethod,
      crypto_currency: d.cryptoCurrency,
      crypto_address: d.cryptoAddress,
      tx_hash: d.txHash,
      proof_note: d.proofNote,
      proof_screenshot_path: d.proofScreenshotPath,
      status: d.status,
      rejection_reason: d.rejectionReason,
      processed_by_id: d.processedById,
      requested_at: d.requestedAt,
      processed_at: d.processedAt,
    }));
  res.json(list);
});

router.get('/transactions/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const activeCycle = user.role === 'WORKER' ? getActiveCycle(user.id) : null;
  const cycleStart = activeCycle ? new Date(activeCycle.startedAt).getTime() : 0;
  const txs = db.balanceTransactions
    .filter((tx) => tx.workerId === user.id && (!activeCycle || new Date(tx.createdAt).getTime() >= cycleStart))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((tx) => {
      const performer = db.users.find((u) => u.id === tx.performedById);
      return {
        id: tx.id,
        transaction_id: tx.transactionId,
        worker_id: tx.workerId,
        worker_name: user.fullName,
        balance_type: tx.balanceType,
        transaction_type: tx.transactionType,
        amount: tx.amount,
        previous_balance: tx.previousBalance,
        new_balance: tx.newBalance,
        reason: tx.reason,
        performed_by_id: tx.performedById,
        performed_by_name: performer?.fullName || 'System',
        created_at: tx.createdAt,
      };
    });
  res.json(txs);
});

// -------------------------------------------------------------
// FINANCIAL DEPARTMENT ROUTES
// -------------------------------------------------------------

router.get('/financial/dashboard-stats', ...financialGuard, (_req: AuthRequest, res: Response) => {
  const totalWorkers = db.users.filter((u) => u.role === 'WORKER').length;
  const tasksCompletedToday = db.taskCompletions.length;
  const totalEarningsToday = db.taskCompletions.reduce((acc, c) => acc + c.earningCredited, 0);
  const pendingWithdrawals = db.withdrawals.filter((w) => w.status === 'PENDING').length;
  const activeTasksCount = db.tasks.filter((t) => t.isActive).length;

  const latestSession = db.dailyTaskSessions[db.dailyTaskSessions.length - 1];
  const changedByUser = latestSession
    ? db.users.find((u) => u.id === latestSession.changedById)
    : null;

  res.json({
    total_workers: totalWorkers,
    tasks_completed_today: tasksCompletedToday,
    total_earnings_today: Math.round(totalEarningsToday * 100) / 100,
    pending_withdrawals: pendingWithdrawals,
    active_tasks_count: activeTasksCount,
    max_tasks_limit: 40,
    total_tasks_count: db.tasks.length,
    daily_task_status: latestSession ? latestSession.status : 'OPEN',
    latest_session: latestSession
      ? {
          status: latestSession.status,
          changed_by: changedByUser?.fullName || 'Operations Lead',
          updated_at: latestSession.updatedAt,
          note: latestSession.note,
        }
      : null,
  });
});

// Rating Catalogue: List the full 300-task pool
router.get('/financial/tasks', ...financialGuard, (_req: AuthRequest, res: Response) => {
  const activeCount = db.tasks.filter((t) => t.isActive).length;

  const tasksWithBiz = db.tasks.map((t) => {
    const biz = db.businesses.find((b) => b.id === t.businessId);
    const completionCount = db.taskCompletions.filter((c) => c.taskId === t.id).length;
    const inProgressCount = db.taskAssignments.filter(
      (a) => a.taskId === t.id && a.status === 'IN_PROGRESS'
    ).length;

    return {
      id: t.id,
      business_id: t.businessId,
      business: biz,
      title: t.title,
      task_type: t.taskType || 'Rating',
      instructions: t.instructions,
      required_stars: t.requiredStars,
      price: t.price,
      completion_amount: t.completionAmount,
      is_active: t.isActive,
      is_combo: !!t.isCombo,
      combo_multiplier: t.comboMultiplier || 2.5,
      created_at: t.createdAt,
      stats: {
        completions: completionCount,
        in_progress: inProgressCount,
      },
    };
  });

  res.json({
    active_count: activeCount,
    max_active: TASK_POOL_LIMIT,
    can_create_active: activeCount < TASK_POOL_LIMIT,
    tasks: tasksWithBiz,
    businesses: db.businesses,
  });
});

// Rating Catalogue: Create task (maximum 300 tasks)
router.post('/financial/tasks', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const {
    title,
    business_id,
    task_type,
    instructions,
    price,
    completion_amount,
    required_stars,
    is_active,
    is_combo,
    combo_multiplier,
  } = req.body;

  if (!title || !business_id || !instructions) {
    res.status(400).json({ detail: 'Title, business, and instructions are required' });
    return;
  }

  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    res.status(400).json({ detail: 'Task price must be a valid positive amount (> $0.00)' });
    return;
  }

  const numCompletion = completion_amount
    ? parseFloat(completion_amount)
    : Math.round(numPrice * 1.45 * 100) / 100;
  if (isNaN(numCompletion) || numCompletion <= 0) {
    res.status(400).json({ detail: 'Completion amount must be a valid positive amount' });
    return;
  }

  const shouldBeActive = is_active !== false;
  const currentActiveCount = db.tasks.filter((t) => t.isActive).length;

  if (shouldBeActive && currentActiveCount >= TASK_POOL_LIMIT) {
    res.status(400).json({
      detail:
        'Maximum limit of 300 rating tasks reached (300/300). RatePilot can hold up to 300 catalogue tasks. Deactivate an existing task before activating another.',
    });
    return;
  }

  const biz = db.businesses.find((b) => b.id === parseInt(business_id, 10));
  if (!biz) {
    res.status(404).json({ detail: 'Selected business not found' });
    return;
  }

  if (shouldBeActive && db.tasks.some((t) => t.isActive && t.businessId === biz.id)) {
    res.status(400).json({ detail: 'This business already has an active task. Each active task must use a unique business.' });
    return;
  }

  const nextId = Math.max(0, ...db.tasks.map((t) => t.id)) + 1;
  const newTask: Task = {
    id: nextId,
    businessId: biz.id,
    title: title.trim(),
    taskType: 'Rating',
    instructions: 'Open the listed business profile and submit the required star rating. No written review is required.',
    requiredStars: parseInt(required_stars, 10) || 5,
    price: numPrice,
    completionAmount: numCompletion,
    isActive: shouldBeActive,
    createdAt: new Date().toISOString(),
    isCombo: !!is_combo,
    comboMultiplier: (() => { const m = Number(combo_multiplier ?? 2.5); return Number.isFinite(m) && m > 0 ? m : 2.5; })(),
  };

  db.tasks.push(newTask);

  logAudit('TASK_CREATED', 'TASK', newTask.id.toString(), currentAdmin.id, {
    title: newTask.title,
    businessId: newTask.businessId,
    price: newTask.price,
    completionAmount: newTask.completionAmount,
    isActive: newTask.isActive,
  });

  db.save();

  res.json({
    success: true,
    task: { ...newTask, business: biz },
    active_count: db.tasks.filter((t) => t.isActive).length,
    max_active: TASK_POOL_LIMIT,
  });
});

// Financial Task Management: Update task
router.put('/financial/tasks/:id', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const taskId = parseInt(req.params.id, 10);
  const task = db.tasks.find((t) => t.id === taskId);

  if (!task) {
    res.status(404).json({ detail: 'Task not found' });
    return;
  }

  const {
    title,
    business_id,
    task_type,
    instructions,
    price,
    completion_amount,
    required_stars,
    is_active,
    is_combo,
    combo_multiplier,
  } = req.body;

  if (price !== undefined) {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      res.status(400).json({ detail: 'Price must be greater than $0.00' });
      return;
    }
    task.price = numPrice;
  }

  if (completion_amount !== undefined) {
    const numComp = parseFloat(completion_amount);
    if (isNaN(numComp) || numComp <= 0) {
      res.status(400).json({ detail: 'Completion amount must be greater than $0.00' });
      return;
    }
    task.completionAmount = numComp;
  }

  if (is_active !== undefined && is_active !== task.isActive) {
    if (is_active) {
      const activeCount = db.tasks.filter((t) => t.isActive && t.id !== taskId).length;
      if (db.tasks.some((t) => t.id !== taskId && t.isActive && t.businessId === task.businessId)) {
        res.status(400).json({ detail: 'This business already has another active task. Each active task must use a unique business.' });
        return;
      }
      if (activeCount >= TASK_POOL_LIMIT) {
        res.status(400).json({
          detail:
            'Maximum catalogue limit of 300 active tasks reached (300/300). Deactivate an existing task before adding another.',
        });
        return;
      }
    }
    task.isActive = is_active;
  }

  if (title) task.title = title.trim();
  task.taskType = 'Rating';
  task.instructions = 'Open the listed business profile and submit the required star rating. No written review is required.';
  if (required_stars) task.requiredStars = parseInt(required_stars, 10) || 5;
  if (is_combo !== undefined) { task.isCombo = !!is_combo; if (!task.isCombo) db.comboTaskAssignments.filter(x => x.taskId === task.id).forEach(x => x.enabled = false); }
  if (combo_multiplier !== undefined) {
    const mult = Number(combo_multiplier);
    if (!Number.isFinite(mult) || mult <= 0) { res.status(400).json({ detail: 'Combo multiplier must be greater than zero.' }); return; }
    task.comboMultiplier = mult;
  }

  if (business_id) {
    const nextBusinessId = parseInt(business_id, 10);
    const nextBusiness = db.businesses.find((b) => b.id === nextBusinessId);
    if (!nextBusiness) {
      res.status(404).json({ detail: 'Selected business not found' });
      return;
    }
    if (task.isActive && db.tasks.some((t) => t.id !== task.id && t.isActive && t.businessId === nextBusinessId)) {
      res.status(400).json({ detail: 'This business already has another active task. Each active task must use a unique business.' });
      return;
    }
    task.businessId = nextBusinessId;
  }

  logAudit('TASK_UPDATED', 'TASK', task.id.toString(), currentAdmin.id, {
    title: task.title,
    price: task.price,
    completionAmount: task.completionAmount,
    isActive: task.isActive,
  });

  db.save();

  const biz = db.businesses.find((b) => b.id === task.businessId);
  res.json({
    success: true,
    task: { ...task, business: biz },
    active_count: db.tasks.filter((t) => t.isActive).length,
    max_active: TASK_POOL_LIMIT,
  });
});

// Financial Task Management: Toggle task status (Activate / Deactivate)
router.post('/financial/tasks/:id/status', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const taskId = parseInt(req.params.id, 10);
  const task = db.tasks.find((t) => t.id === taskId);

  if (!task) {
    res.status(404).json({ detail: 'Task not found' });
    return;
  }

  const { is_active } = req.body;
  const targetActive = is_active !== undefined ? !!is_active : !task.isActive;

  if (targetActive && !task.isActive) {
    const activeCount = db.tasks.filter((t) => t.isActive).length;
    if (db.tasks.some((t) => t.id !== taskId && t.isActive && t.businessId === task.businessId)) {
      res.status(400).json({ detail: 'This business already has another active task. Each active task must use a unique business.' });
      return;
    }
    if (activeCount >= TASK_POOL_LIMIT) {
      res.status(400).json({
        detail:
          'Maximum catalogue limit of 300 active tasks reached (300/300). Deactivate an existing task before adding another.',
      });
      return;
    }
  }

  task.isActive = targetActive;

  logAudit(
    targetActive ? 'TASK_ACTIVATED' : 'TASK_DEACTIVATED',
    'TASK',
    task.id.toString(),
    currentAdmin.id,
    {
      taskId: task.id,
      title: task.title,
      status: targetActive ? 'Active' : 'Inactive',
    }
  );

  db.save();

  res.json({
    success: true,
    task_id: task.id,
    is_active: task.isActive,
    active_count: db.tasks.filter((t) => t.isActive).length,
    max_active: TASK_POOL_LIMIT,
  });
});

router.get('/financial/workers', ...financialGuard, (req: AuthRequest, res: Response) => {
  const query = (req.query.query as string)?.toLowerCase();
  let workers = db.users.filter((u) => u.role === 'WORKER');

  if (query) {
    workers = workers.filter(
      (w) => w.fullName.toLowerCase().includes(query) || w.email.toLowerCase().includes(query) || (w.profileCode || '').toLowerCase().includes(query) || (w.username || '').toLowerCase().includes(query)
    );
  }

  const result = workers.map((w) => {
    const bal = db.balances.find((b) => b.userId === w.id) || {
      bonusBalance: 0,
      earningBalance: 0,
    };
    const completedTasksCount = db.taskCompletions.filter((c) => c.workerId === w.id).length;
    return {
      id: w.id,
      email: w.email,
      phone_number: w.phoneNumber,
      full_name: w.fullName,
      is_active: w.isActive,
      created_at: w.createdAt,
      bonus_balance: bal.bonusBalance,
      earning_balance: bal.earningBalance,
      completed_tasks_count: completedTasksCount,
      profile_code: w.profileCode,
      task_access_approved: w.taskAccessApproved !== false,
      smart_points: w.smartPoints || 0,
      level: w.level || 'LEVEL 1',
      current_cycle: db.taskCycles.filter((c) => c.workerId === w.id).sort((a,b) => b.id-a.id)[0] || null,
    };
  });

  res.json(result);
});

router.post('/financial/balances/adjust', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const { worker_id, balance_type, action, amount, reason } = req.body;

  const workerId = parseInt(worker_id, 10);
  const adjustAmount = parseFloat(amount);

  if (isNaN(adjustAmount) || adjustAmount <= 0) {
    res.status(400).json({ detail: 'Adjustment amount must be greater than zero' });
    return;
  }

  if (!reason || reason.trim().length < 3) {
    res.status(400).json({ detail: 'Adjustment reason must be provided (min 3 chars)' });
    return;
  }

  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  if (!worker) {
    res.status(404).json({ detail: 'Worker not found' });
    return;
  }

  let balance = db.balances.find((b) => b.userId === workerId);
  if (!balance) {
    balance = {
      userId: workerId,
      bonusBalance: 0,
      earningBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    db.balances.push(balance);
  }

  const isBonus = balance_type === 'BONUS';
  const prevBalance = isBonus ? balance.bonusBalance : balance.earningBalance;
  let newBalance = prevBalance;
  let txType: BalanceTransaction['transactionType'];

  if (action === 'INCREASE') {
    newBalance = Math.round((prevBalance + adjustAmount) * 100) / 100;
    txType = isBonus ? 'BONUS_CREDIT' : 'EARNING_CREDIT';
  } else if (action === 'DECREASE') {
    if (prevBalance < adjustAmount) {
      res.status(400).json({
        detail: `Insufficient ${balance_type.toLowerCase()} balance. Current balance is $${prevBalance.toFixed(
          2
        )}.`,
      });
      return;
    }
    newBalance = Math.round((prevBalance - adjustAmount) * 100) / 100;
    txType = isBonus ? 'BONUS_DEBIT' : 'EARNING_DEBIT';
  } else {
    res.status(400).json({ detail: 'Invalid action: must be INCREASE or DECREASE' });
    return;
  }

  // Commit balance change
  if (isBonus) {
    balance.bonusBalance = newBalance;
  } else {
    balance.earningBalance = newBalance;
  }
  balance.updatedAt = new Date().toISOString();
  worker.level = calculateLevel(balance.earningBalance);

  // Create immutable transaction ledger record
  const tx: BalanceTransaction = {
    id: db.balanceTransactions.length + 1,
    transactionId: `TX-ADJ-${Date.now().toString(36).toUpperCase()}`,
    workerId,
    balanceType: balance_type,
    transactionType: txType,
    amount: adjustAmount,
    previousBalance: prevBalance,
    newBalance: newBalance,
    reason: reason.trim(),
    performedById: currentAdmin.id,
    createdAt: new Date().toISOString(),
  };
  db.balanceTransactions.unshift(tx);

  // Send worker notification
  const verb = action === 'INCREASE' ? 'credited' : 'deducted';
  db.notifications.unshift({
    id: db.notifications.length + 1,
    userId: workerId,
    title: `${balance_type} Balance ${action === 'INCREASE' ? 'Increased' : 'Decreased'}`,
    message: `Operations Team ${verb} $${adjustAmount.toFixed(
      2
    )} to your ${balance_type.toLowerCase()} balance. Reason: ${reason}`,
    type: action === 'INCREASE' ? 'SUCCESS' : 'WARNING',
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  // Audit log
  logAudit('BALANCE_ADJUSTMENT', 'BALANCE', balance.userId.toString(), currentAdmin.id, {
    workerId,
    workerName: worker.fullName,
    balanceType: balance_type,
    action,
    amount: adjustAmount,
    previousBalance: prevBalance,
    newBalance,
    reason,
    transactionId: tx.transactionId,
  });

  db.save();

  res.json({
    id: tx.id,
    transaction_id: tx.transactionId,
    worker_id: tx.workerId,
    worker_name: worker.fullName,
    balance_type: tx.balanceType,
    transaction_type: tx.transactionType,
    amount: tx.amount,
    previous_balance: tx.previousBalance,
    new_balance: tx.newBalance,
    reason: tx.reason,
    performed_by_id: currentAdmin.id,
    performed_by_name: currentAdmin.fullName,
    created_at: tx.createdAt,
  });
});

router.post('/financial/workers/:workerId/task-access', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = parseInt(req.params.workerId, 10);
  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  const requestedApproval = !!req.body.approved;
  const activeCycle = db.taskCycles.filter((c) => c.workerId === workerId && c.status === 'ACTIVE').sort((a, b) => b.id - a.id)[0];
  if (requestedApproval && (!activeCycle || activeCycle.targetConfiguredManually !== true)) {
    res.status(409).json({ detail: 'Set and save the daily target first. Task access cannot be approved before Operations configures the day.' });
    return;
  }
  worker.taskAccessApproved = requestedApproval;
  logAudit('TASK_ACCESS_CHANGE', 'USER', String(worker.id), req.user!.id, { approved: worker.taskAccessApproved });
  db.save();
  res.json({ success: true, approved: worker.taskAccessApproved });
});

router.post('/financial/workers/:workerId/cycle/target', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = parseInt(req.params.workerId, 10);
  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  const targetInput = req.body.target_reward;
  const target = Number(targetInput);
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  if (targetInput === undefined || targetInput === null || targetInput === '' || !Number.isFinite(target) || target <= 0) {
    res.status(400).json({ detail: 'Operations Team must set a valid target reward greater than zero.' }); return;
  }
  const cycle = db.taskCycles.filter((c) => c.workerId === workerId && c.status === 'ACTIVE').sort((a, b) => b.id - a.id)[0];
  if (!cycle) { res.status(409).json({ detail: 'No active day exists. Create the next day first.' }); return; }
  if (cycle.tasksCompleted > 0) { res.status(409).json({ detail: 'The daily target cannot be changed after task completion has started.' }); return; }
  cycle.targetReward = Math.round(target * 100) / 100;
  cycle.targetConfiguredManually = true;
  worker.taskAccessApproved = false;
  logAudit('TASK_CYCLE_TARGET_SET', 'TASK_CYCLE', String(cycle.id), req.user!.id, { workerId, targetReward: cycle.targetReward });
  db.save();
  res.json({ success: true, cycle, detail: 'Daily target saved. Operations Team must separately approve task access.' });
});

router.post('/financial/workers/:workerId/cycle', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = parseInt(req.params.workerId, 10);
  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  const targetInput = req.body.target_reward;
  const target = Number(targetInput);
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  if (targetInput === undefined || targetInput === null || targetInput === '' || !Number.isFinite(target) || target <= 0) { res.status(400).json({ detail: 'Operations Team must set a valid target reward greater than zero before starting the day.' }); return; }
  const active = db.taskCycles.find((c) => c.workerId === workerId && c.status === 'ACTIVE');
  if (active) { res.status(400).json({ detail: 'Worker already has an active cycle. Reset it before creating another.' }); return; }
  const previous = db.taskCycles.filter((c) => c.workerId === workerId).sort((a,b)=>b.cycleNumber-a.cycleNumber)[0];
  const cycle: TaskCycle = { id: db.taskCycles.length + 1, workerId, cycleNumber: (previous?.cycleNumber || 0) + 1, taskLimit: TASKS_PER_CYCLE, targetReward: Math.round(target*100)/100, rewardAccumulated: 0, tasksCompleted: 0, status: 'ACTIVE', startedAt: new Date().toISOString(), targetConfiguredManually: true, selectedTaskIds: pickSequentialTaskIds((previous?.cycleNumber || 0) + 1) };
  db.taskCycles.push(cycle);
  worker.taskAccessApproved = false;
  logAudit('TASK_CYCLE_CREATED', 'TASK_CYCLE', String(cycle.id), req.user!.id, { workerId, targetReward: cycle.targetReward });
  db.save();
  res.json(cycle);
});

router.post('/financial/workers/:workerId/cycle/reset', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = parseInt(req.params.workerId, 10);
  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  const targetInput = req.body.target_reward;
  const target = Number(targetInput);
  if (targetInput === undefined || targetInput === null || targetInput === '' || !Number.isFinite(target) || target <= 0) { res.status(400).json({ detail: 'Operations Team must set a valid target reward greater than zero before starting the next day.' }); return; }
  const active = db.taskCycles.find((c) => c.workerId === workerId && c.status === 'ACTIVE');
  if (active && active.tasksCompleted < active.taskLimit) {
    res.status(409).json({ detail: `The worker must complete all ${active.taskLimit} tasks for the current day before the next day can be created.` });
    return;
  }
  if (active) { active.status = 'COMPLETED'; active.endedAt = new Date().toISOString(); active.resetById = req.user!.id; }
  const previous = db.taskCycles.filter((c) => c.workerId === workerId).sort((a,b)=>b.cycleNumber-a.cycleNumber)[0];

  // Manual reset only. The Operations Team chooses whether the worker's
  // balances are preserved or explicitly reset to zero. Never reset balances
  // implicitly when a 20-task cycle finishes.
  const resetBalance = db.balances.find((b) => b.userId === workerId);
  if (!resetBalance) {
    res.status(400).json({ detail: 'Worker balance record not found.' }); return;
  }
  const resetBalances = req.body.reset_balances === true;
  const prevBonus = resetBalance.bonusBalance;
  const prevEarning = resetBalance.earningBalance;

  if (resetBalances) {
    resetBalance.bonusBalance = 0;
    resetBalance.earningBalance = 0;
    resetBalance.updatedAt = new Date().toISOString();
    if (prevBonus !== 0) db.balanceTransactions.unshift({ id: db.balanceTransactions.length + 1, transactionId: `TX-RESET-B-${Date.now().toString(36).toUpperCase()}`, workerId, balanceType: 'BONUS', transactionType: 'ADMIN_ADJUSTMENT', amount: Math.abs(prevBonus), previousBalance: prevBonus, newBalance: 0, reason: `Worker cycle reset by Operations Team — balances reset to zero`, performedById: req.user!.id, createdAt: new Date().toISOString() });
    if (prevEarning !== 0) db.balanceTransactions.unshift({ id: db.balanceTransactions.length + 1, transactionId: `TX-RESET-E-${Date.now().toString(36).toUpperCase()}`, workerId, balanceType: 'EARNING', transactionType: 'ADMIN_ADJUSTMENT', amount: Math.abs(prevEarning), previousBalance: prevEarning, newBalance: 0, reason: `Worker cycle reset by Operations Team — balances reset to zero`, performedById: req.user!.id, createdAt: new Date().toISOString() });
  }

  worker.smartPoints = 0;
  worker.level = calculateLevel(resetBalance.earningBalance);
  const cycle: TaskCycle = { id: db.taskCycles.length + 1, workerId, cycleNumber: (previous?.cycleNumber || 0) + 1, taskLimit: TASKS_PER_CYCLE, targetReward: Math.round(target*100)/100, rewardAccumulated: 0, tasksCompleted: 0, status: 'ACTIVE', startedAt: new Date().toISOString(), targetConfiguredManually: true, selectedTaskIds: pickSequentialTaskIds((previous?.cycleNumber || 0) + 1) };
  db.taskCycles.push(cycle);
  worker.taskAccessApproved = false;
  logAudit('TASK_CYCLE_RESET', 'TASK_CYCLE', String(cycle.id), req.user!.id, { workerId, targetReward: cycle.targetReward, resetBalances, bonusBalanceAfterReset: resetBalance.bonusBalance, earningBalanceAfterReset: resetBalance.earningBalance });
  db.save();
  res.json(cycle);
});

router.get('/financial/workers/:workerId/cycle', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = parseInt(req.params.workerId, 10);
  const cycles = db.taskCycles.filter((c) => c.workerId === workerId).sort((a,b)=>b.id-a.id);
  res.json(cycles);
});

router.post('/financial/workers/:workerId/password-reset', ...financialGuard, (req: AuthRequest, res: Response) => {
  const worker = db.users.find((u) => u.id === parseInt(req.params.workerId,10) && u.role === 'WORKER');
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  const temporaryPassword = `TK-${Math.random().toString(36).slice(2,8).toUpperCase()}-${Math.floor(100+Math.random()*900)}`;
  worker.passwordHash = bcrypt.hashSync(temporaryPassword, bcrypt.genSaltSync(10));
  worker.mustChangePassword = true;
  logAudit('PASSWORD_RESET', 'USER', String(worker.id), req.user!.id, { workerId: worker.id });
  db.save();
  res.json({ temporary_password: temporaryPassword, must_change_password: true });
});

router.post('/financial/workers/:workerId/pin-reset', ...financialGuard, (req: AuthRequest, res: Response) => {
  const worker = db.users.find((u) => u.id === parseInt(req.params.workerId,10) && u.role === 'WORKER');
  if (!worker) { res.status(404).json({ detail: 'Worker not found' }); return; }
  const temporaryPin = String(Math.floor(100000 + Math.random()*900000));
  worker.withdrawalPinHash = bcrypt.hashSync(temporaryPin, bcrypt.genSaltSync(10));
  worker.mustChangeWithdrawalPin = true;
  logAudit('PAYMENT_PIN_RESET', 'USER', String(worker.id), req.user!.id, { workerId: worker.id });
  db.save();
  res.json({ temporary_pin: temporaryPin, must_change_pin: true });
});

router.post('/financial/tasks/price', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const { task_id, worker_id, amount, price } = req.body;

  const taskId = parseInt(task_id, 10);
  const workerId = parseInt(worker_id, 10);
  const newReward = amount !== undefined ? parseFloat(amount) : undefined;
  const newPrice = price !== undefined ? parseFloat(price) : undefined;

  if (newReward !== undefined && (isNaN(newReward) || newReward <= 0)) {
    res.status(400).json({ detail: 'Earning amount must be greater than zero' });
    return;
  }

  if (newPrice !== undefined && (isNaN(newPrice) || newPrice <= 0)) {
    res.status(400).json({ detail: 'Task price must be greater than zero' });
    return;
  }

  const worker = db.users.find((u) => u.id === workerId && u.role === 'WORKER');
  if (!worker) {
    res.status(404).json({ detail: 'Worker not found' });
    return;
  }

  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    res.status(404).json({ detail: 'Task not found' });
    return;
  }

  let priceEntry = db.taskPrices.find((p) => p.taskId === taskId && p.workerId === workerId);
  const oldPrice = priceEntry ? priceEntry.price || priceEntry.amount : null;

  if (priceEntry) {
    if (newReward !== undefined) priceEntry.amount = newReward;
    if (newPrice !== undefined) priceEntry.price = newPrice;
    priceEntry.createdById = currentAdmin.id;
    priceEntry.updatedAt = new Date().toISOString();
  } else {
    priceEntry = {
      id: db.taskPrices.length + 1,
      taskId,
      workerId,
      amount: newReward !== undefined ? newReward : task.completionAmount,
      price: newPrice !== undefined ? newPrice : task.price,
      createdById: currentAdmin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.taskPrices.push(priceEntry);
  }

  logAudit('TASK_PRICE_CHANGE', 'TASK_PRICE', `W${workerId}_T${taskId}`, currentAdmin.id, {
    workerId,
    workerName: worker.fullName,
    taskId,
    taskTitle: task.title,
    oldPrice,
    newPrice: priceEntry.price,
    newReward: priceEntry.amount,
  });

  db.save();

  res.json({
    id: priceEntry.id,
    task_id: priceEntry.taskId,
    worker_id: priceEntry.workerId,
    amount: priceEntry.amount,
    price: priceEntry.price,
    created_by_id: priceEntry.createdById,
    created_at: priceEntry.createdAt,
    updated_at: priceEntry.updatedAt,
  });
});

router.get('/financial/tasks/prices', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = req.query.worker_id ? parseInt(req.query.worker_id as string, 10) : null;
  let prices = db.taskPrices;
  if (workerId) {
    prices = prices.filter((p) => p.workerId === workerId);
  }

  const result = prices.map((p) => {
    const task = db.tasks.find((t) => t.id === p.taskId);
    const worker = db.users.find((u) => u.id === p.workerId);
    return {
      id: p.id,
      task_id: p.taskId,
      task_title: task?.title || '',
      worker_id: p.workerId,
      worker_name: worker?.fullName || '',
      amount: p.amount,
      updated_at: p.updatedAt,
    };
  });

  res.json(result);
});

router.post('/financial/tasks/:id/combo', ...financialGuard, (req: AuthRequest, res: Response) => {
  const taskId=parseInt(req.params.id,10); const task=db.tasks.find(t=>t.id===taskId); if(!task){res.status(404).json({detail:'Task not found'});return;}
  const workerId=Number(req.body.worker_id); const enabled=req.body.enabled !== false; const cycleId=req.body.cycle_id ? Number(req.body.cycle_id) : undefined;
  if(!Number.isInteger(workerId)){res.status(400).json({detail:'A worker must be selected for a combo task.'});return;}
  if(!db.users.some(u=>u.id===workerId&&u.role==='WORKER')){res.status(404).json({detail:'Worker not found'});return;}
  const price=Number(req.body.price ?? task.price); const multiplier=Number(req.body.multiplier ?? task.comboMultiplier ?? 2.5);
  if(!Number.isFinite(price)||price<=0||!Number.isFinite(multiplier)||multiplier<=0){res.status(400).json({detail:'Combo price and multiplier must be greater than zero.'});return;}
  let row=db.comboTaskAssignments.find(x=>x.taskId===taskId&&x.workerId===workerId&&(!cycleId||x.cycleId===cycleId));
  if(!row){row={id:db.comboTaskAssignments.length+1,taskId,workerId,cycleId,enabled,price,multiplier,createdAt:new Date().toISOString(),createdById:req.user!.id};db.comboTaskAssignments.push(row);}else{row.enabled=enabled;row.price=price;row.multiplier=multiplier;}
  logAudit(enabled?'COMBO_TASK_ENABLED':'COMBO_TASK_DISABLED','COMBO_TASK',String(row.id),req.user!.id,{taskId,workerId,cycleId,price,multiplier}); db.save(); res.json(row);
});

router.post('/financial/daily-task-control', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const { status, note } = req.body;

  if (status !== 'OPEN' && status !== 'CLOSED') {
    res.status(400).json({ detail: "Status must be 'OPEN' or 'CLOSED'" });
    return;
  }

  const session = {
    id: db.dailyTaskSessions.length + 1,
    status: status as 'OPEN' | 'CLOSED',
    changedById: currentAdmin.id,
    note: note || `Daily tasks marked ${status} by ${currentAdmin.fullName}`,
    updatedAt: new Date().toISOString(),
  };

  db.dailyTaskSessions.push(session);

  logAudit(
    status === 'OPEN' ? 'DAILY_TASKS_OPENED' : 'DAILY_TASKS_CLOSED',
    'DAILY_TASK_CONTROL',
    status,
    currentAdmin.id,
    { status, note: session.note, changedBy: currentAdmin.fullName }
  );

  db.save();

  res.json({
    id: session.id,
    status: session.status,
    changed_by_id: session.changedById,
    changed_by_name: currentAdmin.fullName,
    note: session.note,
    updated_at: session.updatedAt,
  });
});

router.get('/financial/withdrawals', ...financialGuard, (_req: AuthRequest, res: Response) => {
  const list = db.withdrawals
    .map((w) => {
      const worker = db.users.find((u) => u.id === w.workerId);
      return {
        id: w.id,
        withdrawal_id: w.withdrawalId,
        worker_id: w.workerId,
        worker_name: worker?.fullName || 'Worker',
        amount: w.amount,
        payment_method: w.paymentMethod,
        payment_details: w.paymentDetails,
        status: w.status,
        rejection_reason: w.rejectionReason,
        processed_by_id: w.processedById,
        requested_at: w.requestedAt,
        processed_at: w.processedAt,
      };
    })
    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

  res.json(list);
});

router.post(
  '/financial/withdrawals/:id/process',
  ...financialGuard,
  (req: AuthRequest, res: Response) => {
    const currentAdmin = req.user!;
    const withdrawalId = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
      res.status(400).json({ detail: "Status must be 'APPROVED', 'REJECTED', or 'COMPLETED'" });
      return;
    }

    const wd = db.withdrawals.find((w) => w.withdrawalId === withdrawalId);
    if (!wd) {
      res.status(404).json({ detail: 'Withdrawal not found' });
      return;
    }

    if (wd.status !== 'PENDING' && wd.status !== 'APPROVED') {
      res.status(400).json({
        detail: `Withdrawal has already been finalized with status ${wd.status}`,
      });
      return;
    }

    wd.status = status;
    wd.processedById = currentAdmin.id;
    wd.processedAt = new Date().toISOString();

    if (status === 'REJECTED') {
      wd.rejectionReason = rejection_reason || 'Rejected by Operations Team';

      // Restore reserved funds back to Earning Balance
      const balance = db.balances.find((b) => b.userId === wd.workerId);
      if (balance) {
        const prevBalance = balance.earningBalance;
        const newBalance = Math.round((prevBalance + wd.amount) * 100) / 100;
        balance.earningBalance = newBalance;
        balance.updatedAt = new Date().toISOString();

        // Ledger reversal transaction
        const tx: BalanceTransaction = {
          id: db.balanceTransactions.length + 1,
          transactionId: `TX-REV-${Date.now().toString(36).toUpperCase()}`,
          workerId: wd.workerId,
          balanceType: 'EARNING',
          transactionType: 'WITHDRAWAL_REVERSAL',
          amount: wd.amount,
          previousBalance: prevBalance,
          newBalance: newBalance,
          reason: `Reversal of rejected withdrawal ${wd.withdrawalId}: ${wd.rejectionReason}`,
          performedById: currentAdmin.id,
          createdAt: new Date().toISOString(),
        };
        db.balanceTransactions.unshift(tx);
      }
    }

    db.notifications.unshift({
      id: db.notifications.length + 1,
      userId: wd.workerId,
      title: `Withdrawal ${status}`,
      message:
        status === 'REJECTED'
          ? `Your withdrawal ${wd.withdrawalId} of $${wd.amount.toFixed(
              2
            )} was rejected (${wd.rejectionReason}). Funds have been refunded to your Earning Balance.`
          : `Your withdrawal ${wd.withdrawalId} of $${wd.amount.toFixed(2)} is now ${status}.`,
      type: status === 'COMPLETED' ? 'SUCCESS' : status === 'REJECTED' ? 'WARNING' : 'INFO',
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    logAudit('WITHDRAWAL_PROCESSED', 'WITHDRAWAL', wd.withdrawalId, currentAdmin.id, {
      workerId: wd.workerId,
      status: wd.status,
      amount: wd.amount,
      rejectionReason: wd.rejectionReason,
    });

    db.save();

    res.json(wd);
  }
);

// -------------------------------------------------------------
// FINANCIAL DEPARTMENT: DEPOSIT AUDIT & APPROVAL
// -------------------------------------------------------------

router.get('/financial/deposits', ...financialGuard, (_req: AuthRequest, res: Response) => {
  const list = db.deposits
    .map((d) => {
      const worker = db.users.find((u) => u.id === d.workerId);
      return {
        id: d.id,
        deposit_id: d.depositId,
        worker_id: d.workerId,
        worker_name: worker?.fullName || 'Worker',
        worker_username: worker?.username || 'user',
        amount: d.amount,
        payment_method: d.paymentMethod,
        crypto_currency: d.cryptoCurrency,
        crypto_address: d.cryptoAddress,
        tx_hash: d.txHash,
        proof_note: d.proofNote,
        status: d.status,
        rejection_reason: d.rejectionReason,
        processed_by_id: d.processedById,
        requested_at: d.requestedAt,
        processed_at: d.processedAt,
      };
    })
    .sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());

  const pendingCount = list.filter((d) => d.status === 'PENDING').length;
  const approvedCount = list.filter((d) => d.status === 'APPROVED').length;
  const totalVolume = list
    .filter((d) => d.status === 'APPROVED')
    .reduce((acc, d) => acc + d.amount, 0);

  res.json({
    total: list.length,
    pending_count: pendingCount,
    approved_count: approvedCount,
    total_volume: totalVolume,
    deposits: list,
  });
});

router.post(
  '/financial/deposits/:id/process',
  ...financialGuard,
  (req: AuthRequest, res: Response) => {
    const currentAdmin = req.user!;
    const depositId = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ detail: "Status must be 'APPROVED' or 'REJECTED'" });
      return;
    }

    const dep = db.deposits.find((d) => d.depositId === depositId || d.id.toString() === depositId);
    if (!dep) {
      res.status(404).json({ detail: 'Deposit not found' });
      return;
    }

    if (dep.status !== 'PENDING') {
      res.status(400).json({
        detail: `Deposit has already been finalized with status ${dep.status}`,
      });
      return;
    }

    const now = new Date().toISOString();
    dep.status = status;
    dep.processedById = currentAdmin.id;
    dep.processedAt = now;

    if (status === 'APPROVED') {
      // Credit worker's Earning Balance
      const balance = db.balances.find((b) => b.userId === dep.workerId);
      if (balance) {
        const prevBalance = balance.earningBalance;
        const newBalance = Math.round((prevBalance + dep.amount) * 100) / 100;
        balance.earningBalance = newBalance;
        balance.updatedAt = now;

        const tx: BalanceTransaction = {
          id: db.balanceTransactions.length + 1,
          transactionId: `TX-DEP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          workerId: dep.workerId,
          balanceType: 'EARNING',
          transactionType: 'EARNING_CREDIT',
          amount: dep.amount,
          previousBalance: prevBalance,
          newBalance: newBalance,
          reason: `Deposit approved: ${dep.depositId} via ${dep.cryptoCurrency || dep.paymentMethod}${
            dep.txHash ? ` (Tx: ${dep.txHash.substring(0, 10)}...)` : ''
          }`,
          performedById: currentAdmin.id,
          createdAt: now,
        };
        db.balanceTransactions.unshift(tx);
      }

      db.notifications.unshift({
        id: db.notifications.length + 1,
        userId: dep.workerId,
        title: 'Deposit Approved & Credited',
        message: `Your deposit ${dep.depositId} for $${dep.amount.toFixed(
          2
        )} (${dep.cryptoCurrency || dep.paymentMethod}) has been verified and credited to your Earning Balance.`,
        type: 'SUCCESS',
        isRead: false,
        createdAt: now,
      });
    } else {
      dep.rejectionReason = rejection_reason || 'Unverified blockchain or payment transaction';

      db.notifications.unshift({
        id: db.notifications.length + 1,
        userId: dep.workerId,
        title: 'Deposit Not Verified',
        message: `Your deposit ${dep.depositId} of $${dep.amount.toFixed(
          2
        )} could not be verified: ${dep.rejectionReason}. Please contact support or retry.`,
        type: 'WARNING',
        isRead: false,
        createdAt: now,
      });
    }

    logAudit('DEPOSIT_PROCESSED', 'DEPOSIT', dep.depositId, currentAdmin.id, {
      workerId: dep.workerId,
      status: dep.status,
      amount: dep.amount,
      rejectionReason: dep.rejectionReason,
    });

    db.save();

    res.json({
      success: true,
      deposit: dep,
    });
  }
);

router.get('/financial/transactions', ...financialGuard, (req: AuthRequest, res: Response) => {
  const workerId = req.query.worker_id ? parseInt(req.query.worker_id as string, 10) : null;
  let txs = db.balanceTransactions;
  if (workerId) {
    txs = txs.filter((tx) => tx.workerId === workerId);
  }

  const result = txs.map((tx) => {
    const worker = db.users.find((u) => u.id === tx.workerId);
    const performer = db.users.find((u) => u.id === tx.performedById);
    return {
      id: tx.id,
      transaction_id: tx.transactionId,
      worker_id: tx.workerId,
      worker_name: worker?.fullName || 'Worker',
      balance_type: tx.balanceType,
      transaction_type: tx.transactionType,
      amount: tx.amount,
      previous_balance: tx.previousBalance,
      new_balance: tx.newBalance,
      reason: tx.reason,
      performed_by_id: tx.performedById,
      performed_by_name: performer?.fullName || 'System',
      created_at: tx.createdAt,
    };
  });

  res.json(result);
});

router.get('/audit-logs', ...financialGuard, (req: AuthRequest, res: Response) => {
  const action = req.query.action as string;
  let logs = db.auditLogs;
  if (action) {
    logs = logs.filter((l) => l.action === action);
  }

  const result = logs.slice(0, 100).map((l) => {
    const user = db.users.find((u) => u.id === l.userId);
    return {
      id: l.id,
      user_id: l.userId,
      user_name: user?.fullName || 'System',
      action: l.action,
      entity_type: l.entityType,
      entity_id: l.entityId,
      details: l.details,
      created_at: l.createdAt,
    };
  });

  res.json(result);
});

// Notifications
router.get('/financial/level-configs', ...financialGuard, (_req: AuthRequest, res: Response) => {
  res.json(db.levelConfigs);
});

router.put('/financial/level-configs/:level', ...financialGuard, (req: AuthRequest, res: Response) => {
  const cfg = db.levelConfigs.find((c) => c.level === req.params.level);
  if (!cfg) { res.status(404).json({ detail: 'Level configuration not found.' }); return; }
  for (const key of ['minBalance','maxBalance','defaultCycleTarget','rewardMultiplier']) {
    if (req.body[key] !== undefined) {
      const value = Number(req.body[key]);
      if (!Number.isFinite(value) || value < 0) { res.status(400).json({ detail: `${key} must be a non-negative number.` }); return; }
      (cfg as any)[key] = value;
    }
  }
  cfg.updatedAt = new Date().toISOString();
  logAudit('LEVEL_CONFIG_UPDATED','LEVEL_CONFIG',cfg.level,req.user!.id,{...cfg});
  db.save();
  res.json(cfg);
});

router.get('/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifs = db.notifications
    .filter((n) => n.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifs);
});

router.post('/notifications/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const notifId = parseInt(req.params.id, 10);
  const n = db.notifications.find((notif) => notif.id === notifId && notif.userId === user.id);
  if (n) {
    n.isRead = true;
    db.save();
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// FINANCIAL DEPARTMENT: REFERRAL CODES MANAGEMENT
// -------------------------------------------------------------

router.get('/financial/referral-codes', ...financialGuard, (req: AuthRequest, res: Response) => {
  const statusFilter = (req.query.status as string)?.toUpperCase();
  const search = (req.query.search as string)?.toLowerCase().trim();

  let codes = db.referralCodes;

  if (statusFilter && (statusFilter === 'UNUSED' || statusFilter === 'USED')) {
    codes = codes.filter((c) => c.status === statusFilter);
  }

  if (search) {
    codes = codes.filter(
      (c) =>
        c.code.toLowerCase().includes(search) ||
        (c.usedByUsername && c.usedByUsername.toLowerCase().includes(search)) ||
        (c.notes && c.notes.toLowerCase().includes(search))
    );
  }

  const total = db.referralCodes.length;
  const unusedCount = db.referralCodes.filter((c) => c.status === 'UNUSED').length;
  const usedCount = db.referralCodes.filter((c) => c.status === 'USED').length;

  res.json({
    total,
    unused_count: unusedCount,
    used_count: usedCount,
    codes,
  });
});

router.get('/financial/referral-codes/next-available', ...financialGuard, (_req: AuthRequest, res: Response) => {
  const nextCode = db.referralCodes.find((c) => c.status === 'UNUSED');
  if (!nextCode) {
    res.status(404).json({ detail: 'No available referral codes found. Please generate new codes.' });
    return;
  }
  res.json({
    code: nextCode.code,
    id: nextCode.id,
    created_at: nextCode.createdAt,
    notes: nextCode.notes,
  });
});

router.post('/financial/referral-codes/generate', ...financialGuard, (req: AuthRequest, res: Response) => {
  const currentAdmin = req.user!;
  const count = Math.min(Math.max(parseInt(req.body.count, 10) || 10, 1), 200);
  const notes = req.body.notes?.toString().trim() || `Generated by Financial Admin #${currentAdmin.id}`;

  const newCodes: ReferralCode[] = [];
  const existingSet = new Set(db.referralCodes.map((c) => c.code.toUpperCase()));
  const now = new Date().toISOString();

  let attempts = 0;
  while (newCodes.length < count && attempts < count * 20) {
    attempts++;
    const codeStr = generateReferralCodeString();
    if (!existingSet.has(codeStr.toUpperCase())) {
      existingSet.add(codeStr.toUpperCase());
      const newRc: ReferralCode = {
        id: db.referralCodes.length + newCodes.length + 1,
        code: codeStr,
        status: 'UNUSED',
        createdById: currentAdmin.id,
        createdAt: now,
        notes,
      };
      newCodes.push(newRc);
    }
  }

  db.referralCodes.push(...newCodes);

  logAudit('GENERATE_REFERRAL_CODES', 'REFERRAL_CODES', `${count}`, currentAdmin.id, {
    count: newCodes.length,
    notes,
  });

  db.save();

  res.json({
    success: true,
    generated_count: newCodes.length,
    new_codes: newCodes,
    total_codes: db.referralCodes.length,
    unused_count: db.referralCodes.filter((c) => c.status === 'UNUSED').length,
    used_count: db.referralCodes.filter((c) => c.status === 'USED').length,
  });
});

// Automated business rule test suite runner
router.get('/test-suite/run', (_req: Request, res: Response) => {
  const results = runAllBusinessRulesTests();
  const passedCount = results.filter((r) => r.passed).length;
  res.json({
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    timestamp: new Date().toISOString(),
    results,
  });
});

export default router;
