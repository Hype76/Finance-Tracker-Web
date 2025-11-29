import { supabase } from '../lib/supabase';
import { Transaction, Benefit, Payday, RecurringExpense, Asset, Debt, Goal } from '../types';

// --- Transactions ---
export const fetchTransactions = async (type: 'INCOME' | 'EXPENSE') => {
  const table = type === 'INCOME' ? 'assetflow_income' : 'assetflow_expenses';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(type === 'INCOME' ? 'date_received' : 'date_paid', { ascending: false });
  
  if (error) throw error;
  
  return (data || []).map(item => ({
    ...item,
    type,
    date: type === 'INCOME' ? item.date_received : item.date_paid
  })) as Transaction[];
};

export const deleteTransaction = async (id: string, type: 'INCOME' | 'EXPENSE') => {
  const table = type === 'INCOME' ? 'assetflow_income' : 'assetflow_expenses';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

// --- Recurring Items ---
export const fetchBenefits = async () => {
  const { data, error } = await supabase
    .from('assetflow_benefits')
    .select('*')
    .order('next_payment_date', { ascending: true });
  if (error) throw error;
  return data as Benefit[];
};

export const fetchPaydays = async () => {
  const { data, error } = await supabase
    .from('assetflow_paydays')
    .select('*')
    .order('next_payday_date', { ascending: true });
  if (error) throw error;
  return data as Payday[];
};

export const fetchRecurringExpenses = async () => {
  const { data, error } = await supabase
    .from('assetflow_recurring_expenses')
    .select('*')
    .order('next_due_date', { ascending: true });
  
  if (error && error.code === '42P01') { 
    console.warn('Recurring expenses table not found.');
    return [];
  }
  if (error) throw error;
  return data as RecurringExpense[];
};

export const deleteBenefit = async (id: string) => {
  const { error } = await supabase.from('assetflow_benefits').delete().eq('id', id);
  if (error) throw error;
};

export const deletePayday = async (id: string) => {
  const { error } = await supabase.from('assetflow_paydays').delete().eq('id', id);
  if (error) throw error;
};

export const deleteRecurringExpense = async (id: string) => {
  const { error } = await supabase.from('assetflow_recurring_expenses').delete().eq('id', id);
  if (error) throw error;
};

// --- NEW MODULES: Assets, Debts, Goals ---

export const fetchAssets = async () => {
  const { data, error } = await supabase
    .from('assetflow_assets')
    .select('*')
    .order('value', { ascending: false });
  // Graceful fallback if table missing during dev
  if (error && error.code === '42P01') return [];
  if (error) throw error;
  return data as Asset[];
};

export const deleteAsset = async (id: string) => {
  const { error } = await supabase.from('assetflow_assets').delete().eq('id', id);
  if (error) throw error;
};

export const fetchDebts = async () => {
  const { data, error } = await supabase
    .from('assetflow_debts')
    .select('*')
    .order('balance', { ascending: false });
  if (error && error.code === '42P01') return [];
  if (error) throw error;
  return data as Debt[];
};

export const deleteDebt = async (id: string) => {
  const { error } = await supabase.from('assetflow_debts').delete().eq('id', id);
  if (error) throw error;
};

export const fetchGoals = async () => {
  const { data, error } = await supabase
    .from('assetflow_goals')
    .select('*')
    .order('target_date', { ascending: true });
  if (error && error.code === '42P01') return [];
  if (error) throw error;
  return data as Goal[];
};

export const deleteGoal = async (id: string) => {
  const { error } = await supabase.from('assetflow_goals').delete().eq('id', id);
  if (error) throw error;
};