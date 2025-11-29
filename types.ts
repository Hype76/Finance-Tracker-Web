export type Frequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'YEARLY' | 'EVERY_X_DAYS' | 'SPECIFIC_DAY';

export interface Profile {
  id: string;
  email: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  date: string; // date_received or date_paid
  category: string;
  notes?: string;
  attachment_url?: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Benefit {
  id: string;
  user_id: string;
  benefit_name: string;
  amount: number;
  frequency: Frequency;
  custom_value?: number;
  next_payment_date: string;
}

export interface Payday {
  id: string;
  user_id: string;
  frequency: Frequency;
  custom_value?: number;
  next_payday_date: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  frequency: Frequency;
  custom_value?: number;
  next_due_date: string;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  value: number;
  type: string; // Real Estate, Vehicle, Cash, Investment, Other
  notes?: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
}

export interface ProjectionData {
  month: string;
  expectedIncome: number;
  expectedExpenses: number;
  projectedSavings: number;
}

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Other'
];

export const EXPENSE_CATEGORIES = [
  'Housing', 'Utilities', 'Food', 'Transport', 'Healthcare', 'Entertainment', 'Debt', 'Other'
];

export const ASSET_TYPES = [
  'Real Estate', 'Vehicle', 'Cash/Bank', 'Investment', 'Crypto', 'Valuables', 'Other'
];