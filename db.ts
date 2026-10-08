import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  username: string;
  phoneNumber?: string;
  fullName: string;
  passwordHash: string;
  withdrawalPinHash?: string;
  role: 'WORKER' | 'FINANCIAL_DEPARTMENT';
  referralCodeUsed?: string;
  isActive: boolean;
  createdAt: string;
  profileCode?: string;
  taskAccessApproved?: boolean;
  smartPoints?: number;
  level?: string;
  mustChangePassword?: boolean;
  mustChangeWithdrawalPin?: boolean;
  profileImage?: string;
}

export interface Balance {
  userId: number;
  bonusBalance: number;
  earningBalance: number;
  updatedAt: string;
}

export interface Business {
  id: number;
  name: string;
  category: string;
  website: string;
  address: string;
  description: string;
  ratingGuidelines: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Task {
  id: number;
  businessId: number;
  title: string;
  taskType: string;
  instructions: string;
  requiredStars: number;
  price: number;
  completionAmount: number;
  isActive: boolean;
  createdAt: string;
  isCombo?: boolean;
  comboMultiplier?: number;
}

export interface TaskAssignment {
  id: number;
  assignmentId: string;
  taskId: number;
  workerId: number;
  taskPrice: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  cycleId?: number;
  startedAt: string;
  completedAt?: string;
}

export interface TaskCycle {
  id: number;
  workerId: number;
  cycleNumber: number;
  taskLimit: number;
  targetReward: number;
  rewardAccumulated: number;
  tasksCompleted: number;
  status: 'ACTIVE' | 'COMPLETED' | 'RESET';
  startedAt: string;
  endedAt?: string;
  resetById?: number;
  targetConfiguredManually?: boolean;
  selectedTaskIds?: number[];
}

export interface TaskPrice {
  id: number;
  taskId: number;
  workerId: number;
  amount: number;
  price?: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: number;
  taskId: number;
  workerId: number;
  businessId: number;
  starsGiven: number;
  reviewText: string;
  screenshotPath?: string;
  earningCredited: number;
  cycleId?: number;
  completedAt: string;
}

export interface BalanceTransaction {
  id: number;
  transactionId: string;
  workerId: number;
  balanceType: 'BONUS' | 'EARNING';
  transactionType:
    | 'TASK_START_DEBIT'
    | 'TASK_EARNING'
    | 'BONUS_CREDIT'
    | 'BONUS_DEBIT'
    | 'EARNING_CREDIT'
    | 'EARNING_DEBIT'
    | 'WITHDRAWAL'
    | 'WITHDRAWAL_REVERSAL'
    | 'ADMIN_ADJUSTMENT';
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  performedById: number;
  createdAt: string;
}

export interface Withdrawal {
  id: number;
  withdrawalId: string;
  workerId: number;
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectionReason?: string;
  processedById?: number;
  requestedAt: string;
  processedAt?: string;
}

export interface ComboTaskAssignment {
  id: number;
  taskId: number;
  workerId: number;
  cycleId?: number;
  enabled: boolean;
  price?: number;
  multiplier: number;
  createdAt: string;
  createdById: number;
}

export interface LevelConfig {
  level: string;
  minBalance: number;
  maxBalance?: number;
  defaultCycleTarget?: number;
  rewardMultiplier: number;
  updatedAt: string;
}

export interface CryptoWalletConfig {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  minDeposit: number;
  confirmations: number;
  recommended?: boolean;
  rateUsd: number;
  qrData?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: number;
}

export interface Deposit {
  id: number;
  depositId: string;
  workerId: number;
  amount: number;
  paymentMethod: string;
  cryptoCurrency?: string;
  cryptoAddress?: string;
  txHash?: string;
  proofNote?: string;
  proofScreenshotPath?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectionReason?: string;
  processedById?: number;
  requestedAt: string;
  processedAt?: string;
}

export interface DailyTaskSession {
  id: number;
  status: 'OPEN' | 'CLOSED';
  changedById: number;
  note: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  createdAt: string;
}

export interface ReferralCode {
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

export function generateReferralCodeString(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TK-${part1}-${part2}`;
}

export function generateInitialReferralCodes(count: number = 500): ReferralCode[] {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const codes: ReferralCode[] = [];
  const now = new Date().toISOString();

  for (let i = 1; i <= count; i++) {
    let rand = '';
    let val = (i * 2654435761) >>> 0;
    for (let j = 0; j < 4; j++) {
      rand += chars[val % chars.length];
      val = Math.floor(val / chars.length);
    }
    const hexIdx = i.toString(36).toUpperCase().padStart(4, '0');
    const code = `TK-${rand}-${hexIdx}`;
    codes.push({
      id: i,
      code,
      status: 'UNUSED',
      createdAt: now,
      notes: 'Initial Operations Team Batch',
    });
  }

  return codes;
}

interface DatabaseSchema {
  users: User[];
  balances: Balance[];
  businesses: Business[];
  tasks: Task[];
  taskAssignments: TaskAssignment[];
  taskPrices: TaskPrice[];
  taskCompletions: TaskCompletion[];
  balanceTransactions: BalanceTransaction[];
  withdrawals: Withdrawal[];
  deposits: Deposit[];
  dailyTaskSessions: DailyTaskSession[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  referralCodes: ReferralCode[];
  taskCycles: TaskCycle[];
  cryptoWallets: CryptoWalletConfig[];
  levelConfigs: LevelConfig[];
  comboTaskAssignments: ComboTaskAssignment[];
}

export function createDefaultLevelConfigs(): LevelConfig[] {
  const now = new Date().toISOString();
  return [
    { level: 'LEVEL 1', minBalance: 0, maxBalance: 499.99, rewardMultiplier: 1, defaultCycleTarget: 60, updatedAt: now },
    { level: 'LEVEL 2', minBalance: 500, maxBalance: 999.99, rewardMultiplier: 1.5, defaultCycleTarget: 90, updatedAt: now },
    { level: 'VIP 1', minBalance: 1000, maxBalance: 1999.99, rewardMultiplier: 2, defaultCycleTarget: 120, updatedAt: now },
    { level: 'VIP 2', minBalance: 2000, maxBalance: 4999.99, rewardMultiplier: 3, defaultCycleTarget: 150, updatedAt: now },
    { level: 'VIP 3', minBalance: 5000, rewardMultiplier: 4, defaultCycleTarget: 200, updatedAt: now },
  ];
}

export function createDefaultCryptoWallets(): CryptoWalletConfig[] {
  const now = new Date().toISOString();
  return [
    { id: 'usdt_trc20', name: 'Tether USD', symbol: 'USDT', network: 'TRC20 (Tron Network)', address: 'TYu89NqK4kQvW8ZgH9Jp2F5m3Rt6La7VxP', minDeposit: 10, confirmations: 1, recommended: true, rateUsd: 1, qrData: 'tron:TYu89NqK4kQvW8ZgH9Jp2F5m3Rt6La7VxP', isActive: true, createdAt: now, updatedAt: now },
    { id: 'usdt_erc20', name: 'Tether USD', symbol: 'USDT', network: 'ERC20 (Ethereum)', address: '0x71C836466Dab29231b02451C8f07F37F16d8234D', minDeposit: 20, confirmations: 12, recommended: false, rateUsd: 1, qrData: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D', isActive: true, createdAt: now, updatedAt: now },
    { id: 'usdc_erc20', name: 'USD Coin', symbol: 'USDC', network: 'ERC20 (Ethereum)', address: '0x71C836466Dab29231b02451C8f07F37F16d8234D', minDeposit: 20, confirmations: 12, recommended: false, rateUsd: 1, qrData: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D', isActive: true, createdAt: now, updatedAt: now },
    { id: 'btc', name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin Native (SegWit)', address: 'bc1q9d4h8v0zk5s4f3c7y9q5l2a8g7p4r1x3m9w2e4', minDeposit: 25, confirmations: 2, recommended: false, rateUsd: 68500, qrData: 'bitcoin:bc1q9d4h8v0zk5s4f3c7y9q5l2a8g7p4r1x3m9w2e4', isActive: true, createdAt: now, updatedAt: now },
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', network: 'ERC20 / Native', address: '0x71C836466Dab29231b02451C8f07F37F16d8234D', minDeposit: 25, confirmations: 12, recommended: false, rateUsd: 2650, qrData: 'ethereum:0x71C836466Dab29231b02451C8f07F37F16d8234D', isActive: true, createdAt: now, updatedAt: now },
    { id: 'sol', name: 'Solana', symbol: 'SOL', network: 'Solana SPL', address: '7XvKq8NpM4Wz9L2R5T6y3F1J8gA4bC9dE2fG5hJ7kL8m', minDeposit: 10, confirmations: 32, recommended: false, rateUsd: 155, qrData: 'solana:7XvKq8NpM4Wz9L2R5T6y3F1J8gA4bC9dE2fG5hJ7kL8m', isActive: true, createdAt: now, updatedAt: now },
  ];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'terrkeet.json');

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        if (!parsed.taskAssignments) {
          parsed.taskAssignments = [];
        }
        if (!parsed.deposits) {
          parsed.deposits = [];
        }
        if (!parsed.taskCycles) {
          parsed.taskCycles = [];
        }
        if (!parsed.comboTaskAssignments) parsed.comboTaskAssignments = [];
        if (!parsed.levelConfigs) {
          parsed.levelConfigs = createDefaultLevelConfigs();
        } else {
          const defaults = createDefaultLevelConfigs();
          for (const d of defaults) {
            const existing = parsed.levelConfigs.find((x) => x.level === d.level);
            if (!existing) parsed.levelConfigs.push(d);
          }
        }
        if (!parsed.cryptoWallets) {
          parsed.cryptoWallets = createDefaultCryptoWallets();
        } else {
          parsed.cryptoWallets.forEach((w) => {
            if (w.isActive === undefined) w.isActive = true;
            if (!w.createdAt) w.createdAt = new Date().toISOString();
            if (!w.updatedAt) w.updatedAt = w.createdAt;
          });
        }

        // Ensure hardcoded Operations Team account is always guaranteed to exist and cannot be overridden
        const salt = bcrypt.genSaltSync(10);
        const finPasswordHash = bcrypt.hashSync('FinanceSecure123!', salt);
        const finPinHash = bcrypt.hashSync('1234', salt);

        let financeUser = parsed.users.find(
          (u) => u.username === 'operations' || u.email === 'ops@ratepilot.test' || u.role === 'FINANCIAL_DEPARTMENT'
        );

        if (!financeUser) {
          financeUser = {
            id: 1,
            email: 'ops@ratepilot.test',
            username: 'operations',
            phoneNumber: '+1 (555) 100-0001',
            fullName: 'Operations Team Administrator',
            passwordHash: finPasswordHash,
            withdrawalPinHash: finPinHash,
            role: 'FINANCIAL_DEPARTMENT',
            referralCodeUsed: 'INTERNAL-MASTER',
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          parsed.users.unshift(financeUser);
        } else {
          financeUser.role = 'FINANCIAL_DEPARTMENT';
          financeUser.username = 'operations';
          financeUser.email = 'ops@ratepilot.test';
          financeUser.passwordHash = finPasswordHash;
          financeUser.withdrawalPinHash = finPinHash;
          financeUser.isActive = true;
        }

        // Ensure all users have username, phoneNumber, and withdrawalPinHash
        const defaultPinHash = bcrypt.hashSync('1234', bcrypt.genSaltSync(10));
        parsed.users.forEach((u, idx) => {
          if (!u.username) {
            u.username = u.email ? u.email.split('@')[0] : `user_${idx + 1}`;
          }
          if (!u.phoneNumber) {
            u.phoneNumber = `+1 (555) ${idx + 1}00-000${idx + 1}`;
          }
          if (!u.withdrawalPinHash) {
            u.withdrawalPinHash = defaultPinHash;
          }
          if (!u.profileCode) u.profileCode = `TKP-${String(u.id).padStart(6, '0')}`;
          if (u.role === 'WORKER' && u.taskAccessApproved === undefined) u.taskAccessApproved = true;
          if (u.smartPoints === undefined) u.smartPoints = 0;
          if (!u.level) u.level = 'LEVEL 1';
          if (u.mustChangePassword === undefined) u.mustChangePassword = false;
          if (u.mustChangeWithdrawalPin === undefined) u.mustChangeWithdrawalPin = false;
        });

        const seed = this.createInitialSeed();
        if (!parsed.tasks || parsed.tasks.length < 27) {
          parsed.businesses = seed.businesses;
          parsed.tasks = seed.tasks;
          parsed.taskPrices = seed.taskPrices;
        } else {
          // Ensure all task IDs are unique (fix duplicate id 7 on task #17)
          parsed.tasks.forEach((t) => {
            if (t.id === 7 && t.title && t.title.includes('#17')) {
              t.id = 17;
            }
          });

          // Ensure all tasks have taskType, price, and completionAmount
          parsed.tasks.forEach((t, idx) => {
            t.taskType = 'Rating';
            t.instructions = 'Open the listed business profile and submit the required star rating. No written review is required.';
            if (typeof t.price !== 'number' || t.price <= 0) {
              const defaultPrices = [5, 10, 3, 15, 20, 8, 12, 6, 14, 18, 7, 9, 11, 16, 22, 5, 10, 8, 12, 15, 6, 14, 9, 18, 20, 7, 11];
              t.price = defaultPrices[idx % defaultPrices.length] || 10;
            }
            if (typeof t.completionAmount !== 'number' || t.completionAmount <= 0) {
              t.completionAmount = Math.round(t.price * 1.45 * 100) / 100;
            }
          });
        }

        // Expand the task catalogue to 300 rating-only tasks. Existing worker data is preserved.
        // The worker-facing cycle will select only 20 of these tasks at a time.
        if (!parsed.businesses) parsed.businesses = [];
        if (!parsed.tasks) parsed.tasks = [];
        const existingTaskIds = new Set(parsed.tasks.map((t) => t.id));
        const existingBusinessIds = new Set(parsed.businesses.map((b) => b.id));
        const categories = ['Technology', 'Shopping', 'Food & Dining', 'Travel', 'Beauty', 'Fitness', 'Home Services', 'Education', 'Entertainment', 'Professional Services'];
        const prefixes = ['Northstar', 'BluePeak', 'Urban', 'Prime', 'Bright', 'Evergreen', 'Cedar', 'Summit', 'Metro', 'Golden', 'Silver', 'Harbor', 'Vista', 'Oakline', 'Riverside', 'Atlas', 'Crown', 'Nova', 'Lighthouse', 'Vertex'];
        const suffixes = ['Studio', 'Market', 'Hub', 'House', 'Center', 'Collective', 'Works', 'Point', 'Place', 'Services', 'Lab', 'Shop', 'Cafe', 'Group', 'Co'];
        for (let i = 1; i <= 300; i++) {
          if (!existingBusinessIds.has(i)) {
            const prefix = prefixes[(i - 1) % prefixes.length];
            const suffix = suffixes[Math.floor((i - 1) / prefixes.length) % suffixes.length];
            const category = categories[(i - 1) % categories.length];
            parsed.businesses.push({
              id: i, name: `${prefix} ${category.replace(/ & /g, ' ')} ${suffix}`, category,
              website: `https://example.com/rating/${i}`, address: 'Online',
              description: `Rate your experience with this ${category.toLowerCase()} business.`,
              ratingGuidelines: 'Select the star rating that matches the task instructions.',
              isActive: true, createdAt: new Date().toISOString()
            });
            existingBusinessIds.add(i);
          }
          if (!existingTaskIds.has(i)) {
            parsed.tasks.push({
              id: i, businessId: i, title: `Experience Rating ${String(i).padStart(3, '0')}`,
              taskType: 'Rating', instructions: 'Open the listed business profile and submit the required star rating. No written review is required.',
              requiredStars: 5, price: 1, completionAmount: 1, isActive: true,
              createdAt: new Date().toISOString(), isCombo: false, comboMultiplier: 2.5
            });
            existingTaskIds.add(i);
          }
        }

        // Normalize the bundled/testing task catalogue so the worker always has 40
        // active tasks backed by 40 different businesses. This migration only repairs
        // the original seeded 10-business/30-task catalogue; it does not touch worker
        // balances, cycles, completions, or ledger history.
        const activeTasks = parsed.tasks.filter((t) => t.isActive).sort((a, b) => a.id - b.id);
        const activeBusinessIds = new Set<number>();
        const hasDuplicateActiveBusiness = activeTasks.some((t) => {
          if (activeBusinessIds.has(t.businessId)) return true;
          activeBusinessIds.add(t.businessId);
          return false;
        });

        if (parsed.businesses.length < 300 || parsed.tasks.length < 300 || activeTasks.length < 20 || hasDuplicateActiveBusiness) {
          const seedBusinesses = seed.businesses;
          const seedTasks = seed.tasks;

          // Replace only the original seeded catalogue with the normalized 300-task catalogue.
          // Preserve user/financial records elsewhere in the database.
          const looksLikeOriginalSeed = parsed.businesses.length <= 10 && parsed.tasks.length <= 30 && parsed.tasks.every((t) => t.id >= 1 && t.id <= 30);
          if (looksLikeOriginalSeed) {
            parsed.businesses = seedBusinesses;
            parsed.tasks = seedTasks;
            // Keep existing worker-specific prices only for task IDs that still exist.
            parsed.taskPrices = (parsed.taskPrices || []).filter((p) => seedTasks.some((t) => t.id === p.taskId));
          }
        }

        // Ensure 500 single-use referral codes exist for Operations Team
        if (!parsed.referralCodes || parsed.referralCodes.length < 500) {
          const initialCodes = generateInitialReferralCodes(500);
          parsed.referralCodes = initialCodes;
        }

        this.saveData(parsed);
        return parsed;
      } catch (e) {
        console.error('Error loading database file, seeding default data:', e);
      }
    }

    const initial = this.createInitialSeed();
    this.saveData(initial);
    return initial;
  }

  public save(): void {
    this.saveData(this.data);
  }

  /**
   * Refresh the in-memory database from the JSON store.
   * This is intentionally available for the local/dev environment because
   * more than one dev server/process can otherwise hold different task states.
   * A partially-written file is ignored so a concurrent save cannot crash a request.
   */
  public refreshFromDisk(): boolean {
    try {
      if (!fs.existsSync(DATA_FILE)) return false;
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      if (!raw.trim()) return false;
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.tasks)) return false;
      if (!parsed.taskAssignments) parsed.taskAssignments = [];
      if (!parsed.deposits) parsed.deposits = [];
      if (!parsed.referralCodes) parsed.referralCodes = [];
      if (!parsed.dailyTaskSessions) parsed.dailyTaskSessions = [];
      if (!parsed.notifications) parsed.notifications = [];
      if (!parsed.auditLogs) parsed.auditLogs = [];
      if (!parsed.balanceTransactions) parsed.balanceTransactions = [];
      if (!parsed.withdrawals) parsed.withdrawals = [];
      if (!parsed.taskPrices) parsed.taskPrices = [];
      if (!parsed.taskCompletions) parsed.taskCompletions = [];
      if (!parsed.taskCycles) parsed.taskCycles = [];
      if (!parsed.comboTaskAssignments) parsed.comboTaskAssignments = [];
      if (!parsed.levelConfigs) parsed.levelConfigs = createDefaultLevelConfigs();
      if (!parsed.cryptoWallets) parsed.cryptoWallets = createDefaultCryptoWallets();
      this.data = parsed;
      return true;
    } catch (e) {
      // Keep the current in-memory state if another process is writing the file.
      return false;
    }
  }

  private saveData(data: DatabaseSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  private createInitialSeed(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const finPasswordHash = bcrypt.hashSync('FinanceSecure123!', salt);
    const workerPasswordHash = bcrypt.hashSync('WorkerPass123!', salt);
    const defaultPinHash = bcrypt.hashSync('1234', salt);
    const now = new Date().toISOString();

    const users: User[] = [
      {
        id: 1,
        email: 'ops@ratepilot.test',
        username: 'operations',
        phoneNumber: '+1 (555) 100-0001',
        fullName: 'Alexander Croft (Finance Lead)',
        passwordHash: finPasswordHash,
        withdrawalPinHash: defaultPinHash,
        role: 'FINANCIAL_DEPARTMENT',
        referralCodeUsed: 'RATEPILOT2026',
        isActive: true,
        createdAt: now,
      },
      {
        id: 2,
        email: 'worker1@terrkeet.com',
        username: 'john_worker',
        phoneNumber: '+1 (555) 200-0002',
        fullName: 'Johnathan Doe (Senior Reviewer)',
        passwordHash: workerPasswordHash,
        withdrawalPinHash: defaultPinHash,
        role: 'WORKER',
        referralCodeUsed: 'RATEPILOT2026',
        isActive: true,
        createdAt: now,
        profileCode: 'TKP-000002',
        taskAccessApproved: true,
        smartPoints: 0,
        level: 'LEVEL 1',
      },
      {
        id: 3,
        email: 'worker2@terrkeet.com',
        username: 'sarah_worker',
        phoneNumber: '+1 (555) 300-0003',
        fullName: 'Sarah Jenkins (Verified Reviewer)',
        passwordHash: workerPasswordHash,
        withdrawalPinHash: defaultPinHash,
        role: 'WORKER',
        referralCodeUsed: 'RATEPILOT2026',
        isActive: true,
        createdAt: now,
        profileCode: 'TKP-000003',
        taskAccessApproved: true,
        smartPoints: 0,
        level: 'LEVEL 1',
      },
    ];

    const balances: Balance[] = [
      {
        userId: 1,
        bonusBalance: 0,
        earningBalance: 0,
        updatedAt: now,
      },
      {
        userId: 2,
        bonusBalance: 50.0,
        earningBalance: 145.5,
        updatedAt: now,
      },
      {
        userId: 3,
        bonusBalance: 25.0,
        earningBalance: 75.0,
        updatedAt: now,
      },
    ];

    const businesses: Business[] = [
      {
        id: 1,
        name: "Apex Gourmet Bistro",
        category: "Fine Dining & Hospitality",
        website: "https://apexgourmetbistro.example.com",
        address: "450 Grand Avenue, Downtown Metro",
        description: "Apex Gourmet Bistro provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 2,
        name: "Luminary Tech Cloud",
        category: "Enterprise Cloud & AI",
        website: "https://luminarytechcloud.example.com",
        address: "100 Silicon Way, Tech Innovation District",
        description: "Luminary Tech Cloud provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 3,
        name: "Horizon Athletic & Wellness",
        category: "Sports & Health Centers",
        website: "https://horizonathleticwellness.example.com",
        address: "220 Park Lane, Westside Sports Complex",
        description: "Horizon Athletic & Wellness provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 4,
        name: "Velvet Roast Coffeehouse",
        category: "Artisanal Coffee & Bakeries",
        website: "https://velvetroastcoffeehouse.example.com",
        address: "88 Cobblestone Row, Arts District",
        description: "Velvet Roast Coffeehouse provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 5,
        name: "Prism Aesthetic Dental Studio",
        category: "Healthcare & Dentistry",
        website: "https://prismaestheticdentalstudio.example.com",
        address: "312 Medical Plaza Suite 400",
        description: "Prism Aesthetic Dental Studio provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 6,
        name: "SweetBite Artisan Bakery",
        category: "Bakeries & Desserts",
        website: "https://sweetbiteartisanbakery.example.com",
        address: "14 Elmwood Terrace, Old Town",
        description: "SweetBite Artisan Bakery provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 7,
        name: "Vanguard Auto Service & Tuning",
        category: "Automotive & Repairs",
        website: "https://vanguardautoservicetuning.example.com",
        address: "500 Industrial Parkway",
        description: "Vanguard Auto Service & Tuning provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 8,
        name: "Blue Harbor Spa & Resort",
        category: "Wellness & Spa",
        website: "https://blueharborsparesort.example.com",
        address: "77 Ocean Drive, Waterfront Harbor",
        description: "Blue Harbor Spa & Resort provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 9,
        name: "OmniStream Legal Counsel",
        category: "Professional & Legal Services",
        website: "https://omnistreamlegalcounsel.example.com",
        address: "800 Financial Square Suite 2200",
        description: "OmniStream Legal Counsel provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 10,
        name: "NovaTech Smart Electronics",
        category: "Consumer Electronics & Gadgets",
        website: "https://novatechsmartelectronics.example.com",
        address: "350 Commerce Promenade",
        description: "NovaTech Smart Electronics provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 11,
        name: "Cedar Lane Home & Living",
        category: "Home & Lifestyle",
        website: "https://cedarlanehomeliving.example.com",
        address: "12 Cedar Lane, Riverside Quarter",
        description: "Cedar Lane Home & Living provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 12,
        name: "BrightPath Learning Center",
        category: "Education & Training",
        website: "https://brightpathlearningcenter.example.com",
        address: "42 Scholar Avenue, Central District",
        description: "BrightPath Learning Center provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 13,
        name: "HarborView Travel House",
        category: "Travel & Hospitality",
        website: "https://harborviewtravelhouse.example.com",
        address: "9 Marina Road, Harborfront",
        description: "HarborView Travel House provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 14,
        name: "GreenField Fresh Market",
        category: "Groceries & Food Retail",
        website: "https://greenfieldfreshmarket.example.com",
        address: "18 Market Street, Greenfield",
        description: "GreenField Fresh Market provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 15,
        name: "MetroCraft Furniture",
        category: "Furniture & Interior",
        website: "https://metrocraftfurniture.example.com",
        address: "76 Artisan Boulevard, Design District",
        description: "MetroCraft Furniture provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 16,
        name: "PulsePoint Fitness Studio",
        category: "Fitness & Wellness",
        website: "https://pulsepointfitnessstudio.example.com",
        address: "31 Victory Road, Midtown",
        description: "PulsePoint Fitness Studio provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 17,
        name: "SilverLine Mobile Hub",
        category: "Mobile & Communications",
        website: "https://silverlinemobilehub.example.com",
        address: "205 Tech Plaza, Commerce District",
        description: "SilverLine Mobile Hub provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 18,
        name: "Golden Spoon Family Restaurant",
        category: "Restaurants & Dining",
        website: "https://goldenspoonfamilyrestaurant.example.com",
        address: "64 Unity Street, City Center",
        description: "Golden Spoon Family Restaurant provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 19,
        name: "ClearView Optical House",
        category: "Optical & Eyewear",
        website: "https://clearviewopticalhouse.example.com",
        address: "15 Vision Way, Medical District",
        description: "ClearView Optical House provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 20,
        name: "UrbanNest Property Services",
        category: "Property & Real Estate",
        website: "https://urbannestpropertyservices.example.com",
        address: "101 Estate Avenue, Northside",
        description: "UrbanNest Property Services provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 21,
        name: "FreshGlow Beauty Lounge",
        category: "Beauty & Personal Care",
        website: "https://freshglowbeautylounge.example.com",
        address: "27 Blossom Street, Garden Quarter",
        description: "FreshGlow Beauty Lounge provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 22,
        name: "PrimeRide Car Rentals",
        category: "Transportation & Mobility",
        website: "https://primeridecarrentals.example.com",
        address: "88 Transit Avenue, Airport District",
        description: "PrimeRide Car Rentals provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 23,
        name: "Skyline Event Studio",
        category: "Events & Entertainment",
        website: "https://skylineeventstudio.example.com",
        address: "55 Skyline Drive, Cultural Quarter",
        description: "Skyline Event Studio provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 24,
        name: "WellSpring Pharmacy & Care",
        category: "Pharmacy & Health",
        website: "https://wellspringpharmacycare.example.com",
        address: "73 Wellness Road, Central District",
        description: "WellSpring Pharmacy & Care provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 25,
        name: "CraftHaus Creative Studio",
        category: "Creative & Design",
        website: "https://crafthauscreativestudio.example.com",
        address: "24 Canvas Lane, Arts District",
        description: "CraftHaus Creative Studio provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 26,
        name: "QuickFix Appliance Center",
        category: "Home Repairs & Appliances",
        website: "https://quickfixappliancecenter.example.com",
        address: "91 Service Road, Industrial Quarter",
        description: "QuickFix Appliance Center provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 27,
        name: "RiverStone Outdoor Gear",
        category: "Sports & Outdoor Retail",
        website: "https://riverstoneoutdoorgear.example.com",
        address: "36 Trail Avenue, Lakeside",
        description: "RiverStone Outdoor Gear provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 28,
        name: "CloudNine Coworking Space",
        category: "Coworking & Business Services",
        website: "https://cloudninecoworkingspace.example.com",
        address: "140 Enterprise Way, Business District",
        description: "CloudNine Coworking Space provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 29,
        name: "Oak & Ivy Fashion House",
        category: "Fashion & Apparel",
        website: "https://oakivyfashionhouse.example.com",
        address: "62 Style Street, Fashion Quarter",
        description: "Oak & Ivy Fashion House provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 30,
        name: "SafeHarbor Insurance Group",
        category: "Insurance & Financial Services",
        website: "https://safeharborinsurancegroup.example.com",
        address: "19 Assurance Plaza, Financial District",
        description: "SafeHarbor Insurance Group provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 31,
        name: "Sunrise Kids Academy",
        category: "Childcare & Education",
        website: "https://sunrisekidsacademy.example.com",
        address: "7 Sunrise Avenue, Family District",
        description: "Sunrise Kids Academy provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 32,
        name: "BluePeak IT Solutions",
        category: "IT Services & Support",
        website: "https://bluepeakitsolutions.example.com",
        address: "118 Innovation Road, Tech Park",
        description: "BluePeak IT Solutions provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 33,
        name: "Harvest Table Kitchen",
        category: "Food & Dining",
        website: "https://harvesttablekitchen.example.com",
        address: "33 Harvest Street, Market Quarter",
        description: "Harvest Table Kitchen provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 34,
        name: "NorthStar Dental Care",
        category: "Dental & Oral Health",
        website: "https://northstardentalcare.example.com",
        address: "204 Northstar Plaza, Medical District",
        description: "NorthStar Dental Care provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 35,
        name: "CityLink Courier Services",
        category: "Courier & Logistics",
        website: "https://citylinkcourierservices.example.com",
        address: "11 Logistics Way, Industrial Park",
        description: "CityLink Courier Services provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 36,
        name: "PureSpace Cleaning Co.",
        category: "Cleaning & Facilities",
        website: "https://purespacecleaningco.example.com",
        address: "28 Cleanway Road, Westside",
        description: "PureSpace Cleaning Co. provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 37,
        name: "Evergreen Garden Center",
        category: "Gardening & Home Improvement",
        website: "https://evergreengardencenter.example.com",
        address: "90 Garden Road, Green Quarter",
        description: "Evergreen Garden Center provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 38,
        name: "MotionWorks Auto Parts",
        category: "Automotive Parts",
        website: "https://motionworksautoparts.example.com",
        address: "410 Motorway Avenue, Auto District",
        description: "MotionWorks Auto Parts provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 39,
        name: "Lighthouse Book & Media",
        category: "Books & Media",
        website: "https://lighthousebookmedia.example.com",
        address: "16 Lighthouse Lane, Cultural District",
        description: "Lighthouse Book & Media provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
      {
        id: 40,
        name: "VistaPet Animal Care",
        category: "Pet Care & Veterinary",
        website: "https://vistapetanimalcare.example.com",
        address: "52 Companion Road, Lakeside",
        description: "VistaPet Animal Care provides professional products and services for customers in its local community.",
        ratingGuidelines: "Complete the task using accurate, non-deceptive feedback based on the information presented on Terrkeet.",
        isActive: true,
        createdAt: now,
      },
    ];

    // Seed exactly 40 active tasks, with one unique business per task.
    // Task start prices are intentionally modest; the backend also applies the worker/cycle safety cap.
    const seedTaskConfigs = [
      { id: 1, bizId: 1, title: 'Rating #01', price: 0.75, reward: 1.0, stars: 5, active: true },
      { id: 2, bizId: 2, title: 'Rating #02', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 3, bizId: 3, title: 'Rating #03', price: 0.65, reward: 1.0, stars: 5, active: true },
      { id: 4, bizId: 4, title: 'Rating #04', price: 0.95, reward: 1.0, stars: 5, active: true },
      { id: 5, bizId: 5, title: 'Rating #05', price: 1.00, reward: 1.0, stars: 5, active: true },
      { id: 6, bizId: 6, title: 'Rating #06', price: 0.80, reward: 1.0, stars: 5, active: true },
      { id: 7, bizId: 7, title: 'Rating #07', price: 0.90, reward: 1.0, stars: 5, active: true },
      { id: 8, bizId: 8, title: 'Rating #08', price: 0.70, reward: 1.0, stars: 5, active: true },
      { id: 9, bizId: 9, title: 'Rating #09', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 10, bizId: 10, title: 'Rating #10', price: 1.05, reward: 1.0, stars: 5, active: true },
      { id: 11, bizId: 11, title: 'Rating #11', price: 0.75, reward: 1.0, stars: 5, active: true },
      { id: 12, bizId: 12, title: 'Rating #12', price: 0.90, reward: 1.0, stars: 5, active: true },
      { id: 13, bizId: 13, title: 'Rating #13', price: 0.80, reward: 1.0, stars: 5, active: true },
      { id: 14, bizId: 14, title: 'Rating #14', price: 0.95, reward: 1.0, stars: 5, active: true },
      { id: 15, bizId: 15, title: 'Rating #15', price: 1.10, reward: 1.0, stars: 5, active: true },
      { id: 16, bizId: 16, title: 'Rating #16', price: 0.70, reward: 1.0, stars: 5, active: true },
      { id: 17, bizId: 17, title: 'Rating #17', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 18, bizId: 18, title: 'Rating #18', price: 0.90, reward: 1.0, stars: 5, active: true },
      { id: 19, bizId: 19, title: 'Rating #19', price: 0.75, reward: 1.0, stars: 5, active: true },
      { id: 20, bizId: 20, title: 'Rating #20', price: 1.00, reward: 1.0, stars: 5, active: true },
      { id: 21, bizId: 21, title: 'Rating #21', price: 0.80, reward: 1.0, stars: 5, active: true },
      { id: 22, bizId: 22, title: 'Rating #22', price: 0.95, reward: 1.0, stars: 5, active: true },
      { id: 23, bizId: 23, title: 'Rating #23', price: 0.70, reward: 1.0, stars: 5, active: true },
      { id: 24, bizId: 24, title: 'Rating #24', price: 1.05, reward: 1.0, stars: 5, active: true },
      { id: 25, bizId: 25, title: 'Rating #25', price: 0.90, reward: 1.0, stars: 5, active: true },
      { id: 26, bizId: 26, title: 'Rating #26', price: 0.75, reward: 1.0, stars: 5, active: true },
      { id: 27, bizId: 27, title: 'Rating #27', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 28, bizId: 28, title: 'Rating #28', price: 0.95, reward: 1.0, stars: 5, active: true },
      { id: 29, bizId: 29, title: 'Rating #29', price: 0.80, reward: 1.0, stars: 5, active: true },
      { id: 30, bizId: 30, title: 'Rating #30', price: 1.00, reward: 1.0, stars: 5, active: true },
      { id: 31, bizId: 31, title: 'Rating #31', price: 0.70, reward: 1.0, stars: 5, active: true },
      { id: 32, bizId: 32, title: 'Rating #32', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 33, bizId: 33, title: 'Rating #33', price: 0.90, reward: 1.0, stars: 5, active: true },
      { id: 34, bizId: 34, title: 'Rating #34', price: 0.75, reward: 1.0, stars: 5, active: true },
      { id: 35, bizId: 35, title: 'Rating #35', price: 1.05, reward: 1.0, stars: 5, active: true },
      { id: 36, bizId: 36, title: 'Rating #36', price: 0.80, reward: 1.0, stars: 5, active: true },
      { id: 37, bizId: 37, title: 'Rating #37', price: 0.95, reward: 1.0, stars: 5, active: true },
      { id: 38, bizId: 38, title: 'Rating #38', price: 0.70, reward: 1.0, stars: 5, active: true },
      { id: 39, bizId: 39, title: 'Rating #39', price: 0.85, reward: 1.0, stars: 5, active: true },
      { id: 40, bizId: 40, title: 'Rating #40', price: 0.90, reward: 1.0, stars: 5, active: true },
    ];

    const tasks: Task[] = seedTaskConfigs.map((cfg) => {
      const biz = businesses.find((b) => b.id === cfg.bizId);
      return {
        id: cfg.id,
        businessId: cfg.bizId,
        title: cfg.title,
        taskType: 'Rating',
        instructions: `Submit a genuine 5-star customer experience evaluation for '${biz?.name}'. Highlight facility quality, customer service, and feedback for the business.`,
        requiredStars: cfg.stars,
        price: cfg.price,
        completionAmount: cfg.reward,
        isActive: cfg.active,
        createdAt: now,
      };
    });

    // User-specific Task Pricing configured by Operations Team
    // Supports custom worker prices (Requirement 11: Task #10 John -> $5, Sarah -> $8, David -> $12)
    const taskPrices: TaskPrice[] = [
      {
        id: 1,
        taskId: 1,
        workerId: 2, // Johnathan Doe
        amount: 7.5,
        price: 4.5, // Custom worker price
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        taskId: 2,
        workerId: 2, // Johnathan Doe
        amount: 15.0,
        price: 6.25,
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        taskId: 3,
        workerId: 2, // Johnathan Doe
        amount: 12.5,
        price: 8.5,
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 4,
        taskId: 4,
        workerId: 2, // Johnathan Doe
        amount: 22.5,
        price: 5.0,
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      // Worker 3 (Sarah Jenkins) has different user-specific prices!
      {
        id: 5,
        taskId: 1,
        workerId: 3, // Sarah Jenkins
        amount: 10.5,
        price: 7.0,
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 6,
        taskId: 2,
        workerId: 3, // Sarah Jenkins
        amount: 18.0,
        price: 9.5,
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      // Example Task #10 custom pricing:
      {
        id: 7,
        taskId: 10,
        workerId: 2, // Johnathan
        amount: 25.0,
        price: 5.0, // John -> $5
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 8,
        taskId: 10,
        workerId: 3, // Sarah
        amount: 28.0,
        price: 8.0, // Sarah -> $8
        createdById: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const taskAssignments: TaskAssignment[] = [];

    const balanceTransactions: BalanceTransaction[] = [
      {
        id: 1,
        transactionId: 'TX-INIT-001',
        workerId: 2,
        balanceType: 'BONUS',
        transactionType: 'BONUS_CREDIT',
        amount: 50.0,
        previousBalance: 0,
        newBalance: 50.0,
        reason: 'Welcome bonus credit granted upon verified account activation',
        performedById: 1,
        createdAt: now,
      },
      {
        id: 2,
        transactionId: 'TX-INIT-002',
        workerId: 2,
        balanceType: 'EARNING',
        transactionType: 'TASK_EARNING',
        amount: 145.5,
        previousBalance: 0,
        newBalance: 145.5,
        reason: 'Initial completed tasks milestone earnings',
        performedById: 2,
        createdAt: now,
      },
      {
        id: 3,
        transactionId: 'TX-INIT-003',
        workerId: 3,
        balanceType: 'BONUS',
        transactionType: 'BONUS_CREDIT',
        amount: 25.0,
        previousBalance: 0,
        newBalance: 25.0,
        reason: 'Welcome bonus allocation',
        performedById: 1,
        createdAt: now,
      },
      {
        id: 4,
        transactionId: 'TX-INIT-004',
        workerId: 3,
        balanceType: 'EARNING',
        transactionType: 'EARNING_CREDIT',
        amount: 75.0,
        previousBalance: 0,
        newBalance: 75.0,
        reason: 'Special promotional earning grant by Operations Team',
        performedById: 1,
        createdAt: now,
      },
    ];

    const withdrawals: Withdrawal[] = [
      {
        id: 1,
        withdrawalId: 'WD-8921A',
        workerId: 2,
        amount: 40.0,
        paymentMethod: 'BANK_TRANSFER',
        paymentDetails: 'Chase Premier Checking ****4821',
        status: 'PENDING',
        requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
    ];

    const dailyTaskSessions: DailyTaskSession[] = [
      {
        id: 1,
        status: 'OPEN',
        changedById: 1,
        note: 'Daily review batches opened for all verified workers',
        updatedAt: now,
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 1,
        userId: 1,
        action: 'DAILY_TASKS_OPENED',
        entityType: 'DAILY_TASK_CONTROL',
        entityId: 'OPEN',
        details: { status: 'OPEN', note: 'Daily tasks activated' },
        createdAt: now,
      },
      {
        id: 2,
        userId: 1,
        action: 'TASK_PRICE_CHANGE',
        entityType: 'TASK_PRICE',
        entityId: 'W2_T1',
        details: { workerId: 2, taskId: 1, amount: 4.5 },
        createdAt: now,
      },
      {
        id: 3,
        userId: 1,
        action: 'BALANCE_ADJUSTMENT',
        entityType: 'BALANCE',
        entityId: 'W2',
        details: { workerId: 2, balanceType: 'BONUS', action: 'INCREASE', amount: 50.0 },
        createdAt: now,
      },
    ];

    const notifications: Notification[] = [
      {
        id: 1,
        userId: 2,
        title: 'Welcome to Terrkeet!',
        message: 'Your account has been credited with $50.00 in Bonus Balance. You have 5 tasks available today.',
        type: 'SUCCESS',
        isRead: false,
        createdAt: now,
      },
      {
        id: 2,
        userId: 2,
        title: 'Withdrawal Processing',
        message: 'Your withdrawal request WD-8921A for $40.00 is currently pending review by the Operations Team.',
        type: 'INFO',
        isRead: false,
        createdAt: now,
      },
    ];

    const deposits: Deposit[] = [
      {
        id: 1,
        depositId: 'DEP-7731C',
        workerId: 2,
        amount: 50.0,
        paymentMethod: 'CRYPTO',
        cryptoCurrency: 'USDT (TRC20)',
        cryptoAddress: 'TYu89NqK4kQvW8ZgH9Jp2F5m3Rt6La7VxP',
        txHash: '7f91a8c3d9b0425e836109f3ab41285741e9c20a881347d512ef9012351ab661',
        status: 'APPROVED',
        processedById: 1,
        requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        processedAt: new Date(Date.now() - 86400000 * 2 + 1800000).toISOString(),
        proofNote: 'USDT TRC20 wallet deposit from Binance',
      },
    ];

    const normalizedBusinesses: Business[] = [
      { id: 1, name: 'Netflix', category: 'Entertainment', website: 'https://netflix.com', address: 'Online', description: 'Netflix' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/netflix', isActive: true, createdAt: now },
      { id: 2, name: 'X', category: 'Social Media', website: 'https://x.com', address: 'Online', description: 'X' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/x', isActive: true, createdAt: now },
      { id: 3, name: 'Meta AI', category: 'Artificial Intelligence', website: 'https://meta.ai', address: 'Online', description: 'Meta AI' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/meta', isActive: true, createdAt: now },
      { id: 4, name: 'Grok', category: 'Artificial Intelligence', website: 'https://x.ai', address: 'Online', description: 'Grok' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/grok', isActive: true, createdAt: now },
      { id: 5, name: 'Spotify', category: 'Music', website: 'https://spotify.com', address: 'Online', description: 'Spotify' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/spotify', isActive: true, createdAt: now },
      { id: 6, name: 'WhatsApp', category: 'Messaging', website: 'https://whatsapp.com', address: 'Online', description: 'WhatsApp' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/whatsapp', isActive: true, createdAt: now },
      { id: 7, name: 'Instagram', category: 'Social Media', website: 'https://instagram.com', address: 'Online', description: 'Instagram' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/instagram', isActive: true, createdAt: now },
      { id: 8, name: 'Facebook', category: 'Social Media', website: 'https://facebook.com', address: 'Online', description: 'Facebook' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/facebook', isActive: true, createdAt: now },
      { id: 9, name: 'YouTube', category: 'Video', website: 'https://youtube.com', address: 'Online', description: 'YouTube' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/youtube', isActive: true, createdAt: now },
      { id: 10, name: 'TikTok', category: 'Social Media', website: 'https://tiktok.com', address: 'Online', description: 'TikTok' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/tiktok', isActive: true, createdAt: now },
      { id: 11, name: 'Telegram', category: 'Messaging', website: 'https://telegram.org', address: 'Online', description: 'Telegram' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/telegram', isActive: true, createdAt: now },
      { id: 12, name: 'Canva', category: 'Design', website: 'https://canva.com', address: 'Online', description: 'Canva' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/canva', isActive: true, createdAt: now },
      { id: 13, name: 'Google', category: 'Technology', website: 'https://google.com', address: 'Online', description: 'Google' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/google', isActive: true, createdAt: now },
      { id: 14, name: 'Microsoft', category: 'Technology', website: 'https://microsoft.com', address: 'Online', description: 'Microsoft' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/microsoft', isActive: true, createdAt: now },
      { id: 15, name: 'Amazon', category: 'E-commerce', website: 'https://amazon.com', address: 'Online', description: 'Amazon' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/amazon', isActive: true, createdAt: now },
      { id: 16, name: 'LinkedIn', category: 'Professional Network', website: 'https://linkedin.com', address: 'Online', description: 'LinkedIn' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/linkedin', isActive: true, createdAt: now },
      { id: 17, name: 'Discord', category: 'Community', website: 'https://discord.com', address: 'Online', description: 'Discord' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/discord', isActive: true, createdAt: now },
      { id: 18, name: 'Reddit', category: 'Community', website: 'https://reddit.com', address: 'Online', description: 'Reddit' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/reddit', isActive: true, createdAt: now },
      { id: 19, name: 'Zoom', category: 'Communication', website: 'https://zoom.us', address: 'Online', description: 'Zoom' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/zoom', isActive: true, createdAt: now },
      { id: 20, name: 'Slack', category: 'Workplace', website: 'https://slack.com', address: 'Online', description: 'Slack' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/slack', isActive: true, createdAt: now },
      { id: 21, name: 'Dropbox', category: 'Cloud Storage', website: 'https://dropbox.com', address: 'Online', description: 'Dropbox' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/dropbox', isActive: true, createdAt: now },
      { id: 22, name: 'Adobe', category: 'Creative Software', website: 'https://adobe.com', address: 'Online', description: 'Adobe' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/adobe', isActive: true, createdAt: now },
      { id: 23, name: 'OpenAI', category: 'Artificial Intelligence', website: 'https://openai.com', address: 'Online', description: 'OpenAI' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/openai', isActive: true, createdAt: now },
      { id: 24, name: 'ChatGPT', category: 'Artificial Intelligence', website: 'https://chatgpt.com', address: 'Online', description: 'ChatGPT' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/openai', isActive: true, createdAt: now },
      { id: 25, name: 'Claude', category: 'Artificial Intelligence', website: 'https://claude.ai', address: 'Online', description: 'Claude' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/claude', isActive: true, createdAt: now },
      { id: 26, name: 'Gemini', category: 'Artificial Intelligence', website: 'https://gemini.google.com', address: 'Online', description: 'Gemini' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/googlegemini', isActive: true, createdAt: now },
      { id: 27, name: 'Perplexity', category: 'Artificial Intelligence', website: 'https://perplexity.ai', address: 'Online', description: 'Perplexity' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/perplexity', isActive: true, createdAt: now },
      { id: 28, name: 'Pinterest', category: 'Social Media', website: 'https://pinterest.com', address: 'Online', description: 'Pinterest' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/pinterest', isActive: true, createdAt: now },
      { id: 29, name: 'Twitch', category: 'Streaming', website: 'https://twitch.tv', address: 'Online', description: 'Twitch' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/twitch', isActive: true, createdAt: now },
      { id: 30, name: 'Uber', category: 'Transport', website: 'https://uber.com', address: 'Online', description: 'Uber' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/uber', isActive: true, createdAt: now },
      { id: 31, name: 'Airbnb', category: 'Travel', website: 'https://airbnb.com', address: 'Online', description: 'Airbnb' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/airbnb', isActive: true, createdAt: now },
      { id: 32, name: 'PayPal', category: 'Payments', website: 'https://paypal.com', address: 'Online', description: 'PayPal' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/paypal', isActive: true, createdAt: now },
      { id: 33, name: 'Stripe', category: 'Payments', website: 'https://stripe.com', address: 'Online', description: 'Stripe' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/stripe', isActive: true, createdAt: now },
      { id: 34, name: 'Shopify', category: 'E-commerce', website: 'https://shopify.com', address: 'Online', description: 'Shopify' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/shopify', isActive: true, createdAt: now },
      { id: 35, name: 'Notion', category: 'Productivity', website: 'https://notion.so', address: 'Online', description: 'Notion' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/notion', isActive: true, createdAt: now },
      { id: 36, name: 'Figma', category: 'Design', website: 'https://figma.com', address: 'Online', description: 'Figma' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/figma', isActive: true, createdAt: now },
      { id: 37, name: 'GitHub', category: 'Developer Platform', website: 'https://github.com', address: 'Online', description: 'GitHub' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/github', isActive: true, createdAt: now },
      { id: 38, name: 'GitLab', category: 'Developer Platform', website: 'https://gitlab.com', address: 'Online', description: 'GitLab' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/gitlab', isActive: true, createdAt: now },
      { id: 39, name: 'Duolingo', category: 'Education', website: 'https://duolingo.com', address: 'Online', description: 'Duolingo' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/duolingo', isActive: true, createdAt: now },
      { id: 40, name: 'Coursera', category: 'Education', website: 'https://coursera.org', address: 'Online', description: 'Coursera' + ' task review profile', ratingGuidelines: 'Rate your experience on the Terrkeet task form and submit screenshot proof.', logoUrl: 'https://cdn.simpleicons.org/coursera', isActive: true, createdAt: now },
    ];
    // Extend the initial catalogue to 300 rating-only businesses.
    const generatedCategories = ['Technology', 'Shopping', 'Food & Dining', 'Travel', 'Beauty', 'Fitness', 'Home Services', 'Education', 'Entertainment', 'Professional Services'];
    const generatedPrefixes = ['Northstar', 'BluePeak', 'Urban', 'Prime', 'Bright', 'Evergreen', 'Cedar', 'Summit', 'Metro', 'Golden', 'Silver', 'Harbor', 'Vista', 'Oakline', 'Riverside', 'Atlas', 'Crown', 'Nova', 'Lighthouse', 'Vertex'];
    const generatedSuffixes = ['Studio', 'Market', 'Hub', 'House', 'Center', 'Collective', 'Works', 'Point', 'Place', 'Services', 'Lab', 'Shop', 'Cafe', 'Group', 'Co'];
    for (let i = normalizedBusinesses.length + 1; i <= 300; i++) {
      const prefix = generatedPrefixes[(i - 1) % generatedPrefixes.length];
      const suffix = generatedSuffixes[Math.floor((i - 1) / generatedPrefixes.length) % generatedSuffixes.length];
      const category = generatedCategories[(i - 1) % generatedCategories.length];
      normalizedBusinesses.push({
        id: i, name: `${prefix} ${category.replace(/ & /g, ' ')} ${suffix}`, category,
        website: `https://example.com/rating/${i}`, address: 'Online',
        description: `Rate your experience with this ${category.toLowerCase()} business.`,
        ratingGuidelines: 'Select the star rating that matches the task instructions.',
        isActive: true, createdAt: now
      });
    }

    const normalizedTasks: Task[] = normalizedBusinesses.map((b, i) => ({ id: i + 1, businessId: b.id, title: `Experience Rating ${String(i + 1).padStart(3, '0')}`, taskType: 'Rating', instructions: 'Open the listed business profile and submit the required star rating. No written review is required.', requiredStars: 5, price: 1, completionAmount: 1, isActive: true, createdAt: now, isCombo: false, comboMultiplier: 2.5 }));

    return {
      users,
      balances,
      businesses: normalizedBusinesses,
      tasks: normalizedTasks,
      taskAssignments,
      taskPrices,
      taskCompletions: [],
      balanceTransactions,
      withdrawals,
      deposits,
      dailyTaskSessions,
      auditLogs,
      notifications,
      referralCodes: generateInitialReferralCodes(500),
      taskCycles: [
        { id: 1, workerId: 2, cycleNumber: 1, taskLimit: 20, targetReward: 60, rewardAccumulated: 0, tasksCompleted: 0, status: 'ACTIVE', startedAt: now, selectedTaskIds: Array.from({length: 20}, (_, i) => i + 1), targetConfiguredManually: false },
        { id: 2, workerId: 3, cycleNumber: 1, taskLimit: 20, targetReward: 60, rewardAccumulated: 0, tasksCompleted: 0, status: 'ACTIVE', startedAt: now, selectedTaskIds: Array.from({length: 20}, (_, i) => i + 1), targetConfiguredManually: false },
      ],
      cryptoWallets: createDefaultCryptoWallets(),
      levelConfigs: createDefaultLevelConfigs(),
      comboTaskAssignments: [],
    };
  }

  // Getters & Setters
  get users(): User[] {
    return this.data.users;
  }
  get balances(): Balance[] {
    return this.data.balances;
  }
  get businesses(): Business[] {
    return this.data.businesses;
  }
  get tasks(): Task[] {
    return this.data.tasks;
  }
  get taskAssignments(): TaskAssignment[] {
    return this.data.taskAssignments;
  }
  get taskPrices(): TaskPrice[] {
    return this.data.taskPrices;
  }
  get taskCompletions(): TaskCompletion[] {
    return this.data.taskCompletions;
  }
  get balanceTransactions(): BalanceTransaction[] {
    return this.data.balanceTransactions;
  }
  get withdrawals(): Withdrawal[] {
    return this.data.withdrawals;
  }
  get deposits(): Deposit[] {
    return this.data.deposits;
  }
  get dailyTaskSessions(): DailyTaskSession[] {
    return this.data.dailyTaskSessions;
  }
  get auditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }
  get notifications(): Notification[] {
    return this.data.notifications;
  }
  get referralCodes(): ReferralCode[] {
    return this.data.referralCodes;
  }
  get taskCycles(): TaskCycle[] {
    return this.data.taskCycles;
  }
  get cryptoWallets(): CryptoWalletConfig[] {
    return this.data.cryptoWallets;
  }
  get levelConfigs(): LevelConfig[] {
    return this.data.levelConfigs;
  }
  get comboTaskAssignments(): ComboTaskAssignment[] {
    return this.data.comboTaskAssignments;
  }
}

export const db = new Database();
