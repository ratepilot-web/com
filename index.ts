export interface User {
  id: number;
  email: string;
  username: string;
  phone_number?: string;
  full_name: string;
  role: 'WORKER' | 'FINANCIAL_DEPARTMENT';
  referral_code?: string;
  has_withdrawal_pin?: boolean;
  is_active: boolean;
  created_at: string;
  bonus_balance: number;
  earning_balance: number;
  profile_code?: string;
  profile_image?: string | null;
  task_access_approved?: boolean;
  smart_points?: number;
  level?: string;
  must_change_password?: boolean;
  must_change_withdrawal_pin?: boolean;
}

export interface Business {
  id: number;
  name: string;
  category: string;
  website?: string;
  address?: string;
  description?: string;
  ratingGuidelines?: string;
  logoUrl?: string;
  is_active: boolean;
}

export interface TaskItem {
  id: number;
  business_id: number;
  business: Business;
  title: string;
  task_type: string;
  instructions: string;
  required_stars: number;
  is_active: boolean;
  price: number;
  completion_amount: number;
  user_price: number | null;
  configured_price?: number;
  available_balance?: number;
  assignment_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  has_completed: boolean;
  is_in_progress?: boolean;
  has_reviewed_business: boolean;
  is_daily_closed?: boolean;
  task_position?: number;
  task_number?: number;
  task_day_number?: number;
  cycle_task_limit?: number;
  cycle_tasks_completed?: number;
  cycle_target_reward?: number;
  cycle_reward_accumulated?: number;
  is_combo?: boolean;
  combo_multiplier?: number;
}

export interface FinancialTask {
  id: number;
  business_id: number;
  business?: Business;
  title: string;
  task_type: string;
  instructions: string;
  required_stars: number;
  price: number;
  completion_amount: number;
  is_active: boolean;
  created_at: string;
  is_combo?: boolean;
  combo_multiplier?: number;
  stats?: {
    completions: number;
    in_progress: number;
  };
}

export interface TaskCompletion {
  id: number;
  task_id: number;
  worker_id: number;
  business_id: number;
  stars_given: number;
  review_text: string;
  screenshot_path?: string;
  earning_credited: number;
  completed_at: string;
  task_title: string;
  business_name: string;
}

export interface BalanceTransaction {
  id: number;
  transaction_id: string;
  worker_id: number;
  worker_name?: string;
  balance_type: 'BONUS' | 'EARNING';
  transaction_type:
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
  previous_balance: number;
  new_balance: number;
  reason: string;
  performed_by_id?: number;
  performed_by_name?: string;
  created_at: string;
}

export interface Withdrawal {
  id: number;
  withdrawal_id: string;
  worker_id: number;
  worker_name?: string;
  amount: number;
  payment_method: string;
  payment_details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejection_reason?: string;
  processed_by_id?: number;
  requested_at: string;
  processed_at?: string;
}

export interface Deposit {
  id: number;
  deposit_id: string;
  worker_id: number;
  worker_name?: string;
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

export interface CryptoWalletConfig {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  min_deposit: number;
  confirmations: number;
  recommended?: boolean;
  rate_usd: number;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  createdAt: string;
}

export interface DailySessionStatus {
  daily_task_status: 'OPEN' | 'CLOSED';
  latest_session?: {
    status: 'OPEN' | 'CLOSED';
    changed_by: string;
    updated_at: string;
    note?: string;
  };
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface TestResultItem {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: any;
}
