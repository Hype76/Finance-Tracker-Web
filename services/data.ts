import { supabase } from '../lib/supabase';
import { Transaction, Benefit, Payday, RecurringExpense } from '../types';

export const fetchTransactions = async (type: 'INCOME' | 'EXPENSE') => {
  const table = type === 'INCOME' ? 'assetflow_income' : 'assetflow_expenses';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order(type === 'INCOME' ? 'date_received' : 'date_paid', { ascending: false });
  
  if (error) throw error;
  
  // Normalize date field for frontend
  return (data || []).map(item => ({
    ...item,
    type,
    date: type === 'INCOME' ? item.date_received : item.date_paid
  })) as Transaction[];
};

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
  
  // If table doesn't exist yet, return empty array to prevent app crash during setup
  if (error && error.code === '42P01') { 
    console.warn('Recurring expenses table not found. Please run SQL setup.');
    return [];
  }
  if (error) throw error;
  return data as RecurringExpense[];
};

export const deleteTransaction = async (id: string, type: 'INCOME' | 'EXPENSE') => {
  const table = type === 'INCOME' ? 'assetflow_income' : 'assetflow_expenses';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
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