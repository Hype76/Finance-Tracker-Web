import { supabase } from '../lib/supabase';
import { Transaction, Benefit, Payday } from '../types';

export const fetchTransactions = async (type: 'INCOME' | 'EXPENSE') => {
  const { data, error } = await supabase
    .from(type === 'INCOME' ? 'income' : 'expenses')
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
    .from('benefits')
    .select('*')
    .order('next_payment_date', { ascending: true });
  if (error) throw error;
  return data as Benefit[];
};

export const fetchPaydays = async () => {
  const { data, error } = await supabase
    .from('paydays')
    .select('*')
    .order('next_payday_date', { ascending: true });
  if (error) throw error;
  return data as Payday[];
};

export const deleteTransaction = async (id: string, type: 'INCOME' | 'EXPENSE') => {
  const table = type === 'INCOME' ? 'income' : 'expenses';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

export const deleteBenefit = async (id: string) => {
  const { error } = await supabase.from('benefits').delete().eq('id', id);
  if (error) throw error;
};

export const deletePayday = async (id: string) => {
  const { error } = await supabase.from('paydays').delete().eq('id', id);
  if (error) throw error;
};