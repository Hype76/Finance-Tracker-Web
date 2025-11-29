import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, uploadFile, getFileUrl } from '../lib/supabase';
import { fetchTransactions, fetchRecurringExpenses, deleteTransaction, deleteRecurringExpense } from '../services/data';
import { Button, Input, Select, Card } from '../components/UI';
import { EXPENSE_CATEGORIES, Frequency } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, addWeeks, addMonths, addYears, addDays } from 'date-fns';
import { Plus, Trash2, FileText, X, History, CalendarClock, RefreshCw } from 'lucide-react';

// --- Schema for History (One-off) ---
const historySchema = z.object({
  title: z.string().min(2, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date_paid: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

// --- Schema for Recurring (Bills) ---
const recurringSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'YEARLY', 'EVERY_X_DAYS', 'SPECIFIC_DAY']),
  custom_value: z.coerce.number().optional(),
  next_due_date: z.string().min(1, 'Start date is required'),
}).refine(data => {
  if (data.frequency === 'EVERY_X_DAYS' && (!data.custom_value || data.custom_value < 1)) return false;
  if (data.frequency === 'SPECIFIC_DAY' && (!data.custom_value || data.custom_value < 1 || data.custom_value > 31)) return false;
  return true;
}, {
  message: "Invalid custom value",
  path: ["custom_value"],
});

type HistoryFormData = z.infer<typeof historySchema>;
type RecurringFormData = z.infer<typeof recurringSchema>;

const Expenses: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'history' | 'recurring'>('history');
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Queries
  const { data: expenseList = [], isLoading: historyLoading } = useQuery({ 
    queryKey: ['assetflow_expenses'], 
    queryFn: () => fetchTransactions('EXPENSE') 
  });
  
  const { data: recurringList = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['assetflow_recurring_expenses'],
    queryFn: fetchRecurringExpenses
  });

  // Forms
  const historyForm = useForm({ resolver: zodResolver(historySchema) });
  
  const recurringForm = useForm({ 
    resolver: zodResolver(recurringSchema),
    defaultValues: { frequency: 'MONTHLY' }
  });

  const selectedFrequency = useWatch({ control: recurringForm.control, name: 'frequency' });

  // Mutations
  const addHistoryMutation = useMutation({
    mutationFn: async (data: HistoryFormData & { attachment_url?: string }) => {
      const { error } = await supabase.from('assetflow_expenses').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_expenses'] });
      setIsAdding(false);
      historyForm.reset();
      setSelectedFile(null);
    }
  });

  const addRecurringMutation = useMutation({
    mutationFn: async (data: RecurringFormData) => {
      const { error } = await supabase.from('assetflow_recurring_expenses').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_recurring_expenses'] });
      setIsAdding(false);
      recurringForm.reset();
    }
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id, 'EXPENSE'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_expenses'] })
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: deleteRecurringExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_recurring_expenses'] })
  });

  // Handlers
  const onHistorySubmit = async (data: HistoryFormData) => {
    let attachmentPath = undefined;
    if (selectedFile && user) {
      setUploading(true);
      const path = await uploadFile(user.id, selectedFile);
      setUploading(false);
      if (path) attachmentPath = path;
    }
    addHistoryMutation.mutate({ ...data, attachment_url: attachmentPath });
  };

  const onRecurringSubmit = (data: RecurringFormData) => {
    addRecurringMutation.mutate(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const openFile = async (path: string) => {
    const url = await getFileUrl(path);
    if(url) window.open(url, '_blank');
  };

  // Helper for dates (Recurring logic)
  const getNextDates = (dateStr: string, freq: Frequency, customVal?: number, count: number = 3) => {
    let date = new Date(dateStr);
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(date);
      if (freq === 'WEEKLY') date = addWeeks(date, 1);
      else if (freq === 'FORTNIGHTLY') date = addWeeks(date, 2);
      else if (freq === 'MONTHLY') date = addMonths(date, 1);
      else if (freq === 'YEARLY') date = addYears(date, 1);
      else if (freq === 'EVERY_X_DAYS' && customVal) date = addDays(date, customVal);
      else if (freq === 'SPECIFIC_DAY' && customVal) {
        date = addMonths(date, 1);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(customVal, daysInMonth));
      }
    }
    return dates;
  };

  const formatFrequency = (item: any) => {
    if (item.frequency === 'EVERY_X_DAYS') return `Every ${item.custom_value} Days`;
    if (item.frequency === 'SPECIFIC_DAY') return `${item.custom_value}${getOrdinal(item.custom_value)} of Month`;
    return item.frequency;
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab('history'); setIsAdding(false); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <History size={16} /> History
          </button>
          <button
            onClick={() => { setActiveTab('recurring'); setIsAdding(false); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'recurring' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <CalendarClock size={16} /> Upcoming Bills
          </button>
        </div>

        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'danger'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> {activeTab === 'history' ? 'Log Expense' : 'Add Bill'}</>}
        </Button>
      </div>

      {/* --- ADD FORM (Context aware) --- */}
      {isAdding && activeTab === 'history' && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200 border-l-4 border-l-red-500">
          <h2 className="text-lg font-semibold mb-4">Log Past Expense</h2>
          <form onSubmit={historyForm.handleSubmit(onHistorySubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" {...historyForm.register('title')} error={historyForm.formState.errors.title?.message as string} placeholder="e.g. Coffee, Groceries" />
              <Input label="Amount" type="number" step="0.01" {...historyForm.register('amount')} error={historyForm.formState.errors.amount?.message as string} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Date Paid" type="date" {...historyForm.register('date_paid')} error={historyForm.formState.errors.date_paid?.message as string} />
              <Select 
                label="Category" 
                options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))} 
                {...historyForm.register('category')} 
                error={historyForm.formState.errors.category?.message as string} 
              />
            </div>
            <Input label="Notes (Optional)" {...historyForm.register('notes')} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Receipt (Optional)</label>
              <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="danger" isLoading={addHistoryMutation.isPending || uploading}>Record Expense</Button>
            </div>
          </form>
        </Card>
      )}

      {isAdding && activeTab === 'recurring' && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200 border-l-4 border-l-orange-500">
          <h2 className="text-lg font-semibold mb-4">Set Upcoming Bill</h2>
          <form onSubmit={recurringForm.handleSubmit(onRecurringSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bill Name" {...recurringForm.register('title')} error={recurringForm.formState.errors.title?.message as string} placeholder="e.g. Rent, Netflix" />
              <Input label="Amount" type="number" step="0.01" {...recurringForm.register('amount')} error={recurringForm.formState.errors.amount?.message as string} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Select 
                label="Category" 
                options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))} 
                {...recurringForm.register('category')} 
                error={recurringForm.formState.errors.category?.message as string} 
              />
              <Select 
                label="Frequency" 
                options={[
                  { label: 'Weekly', value: 'WEEKLY' },
                  { label: 'Fortnightly', value: 'FORTNIGHTLY' },
                  { label: 'Monthly', value: 'MONTHLY' },
                  { label: 'Yearly', value: 'YEARLY' },
                  { label: 'Every X Days', value: 'EVERY_X_DAYS' },
                  { label: 'Specific Day of Month', value: 'SPECIFIC_DAY' },
                ]} 
                {...recurringForm.register('frequency')} 
                error={recurringForm.formState.errors.frequency?.message as string} 
              />
            </div>

             {selectedFrequency === 'EVERY_X_DAYS' && (
               <Input 
                 label="Number of Days (e.g. 28)" 
                 type="number" 
                 {...recurringForm.register('custom_value')} 
                 error={recurringForm.formState.errors.custom_value?.message as string} 
               />
            )}

            {selectedFrequency === 'SPECIFIC_DAY' && (
               <Input 
                 label="Day of Month (1-31)" 
                 type="number" 
                 min="1" max="31"
                 {...recurringForm.register('custom_value')} 
                 error={recurringForm.formState.errors.custom_value?.message as string} 
               />
            )}

            <Input label="Next Due Date" type="date" {...recurringForm.register('next_due_date')} error={recurringForm.formState.errors.next_due_date?.message as string} />
            
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" isLoading={addRecurringMutation.isPending}>Save Schedule</Button>
            </div>
          </form>
        </Card>
      )}

      {/* --- CONTENT VIEWS --- */}
      
      {/* 1. HISTORY TABLE */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden">
          {historyLoading ? (
            <div className="p-8 text-center text-gray-500">Loading history...</div>
          ) : expenseList.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No past expenses found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenseList.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ${item.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                        {item.attachment_url && (
                          <button onClick={() => openFile(item.attachment_url!)} className="text-primary-600 hover:text-primary-900" title="View Receipt">
                            <FileText size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if(confirm('Delete this record?')) deleteHistoryMutation.mutate(item.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. RECURRING CARDS */}
      {activeTab === 'recurring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recurringList.map(bill => (
            <Card key={bill.id} className="p-6 flex flex-col justify-between border-t-4 border-t-orange-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{bill.title}</h3>
                  <div className="flex gap-2 mt-2">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 uppercase">
                      <RefreshCw size={10} className="mr-1"/> {formatFrequency(bill)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {bill.category}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-red-600">${bill.amount}</span>
                </div>
              </div>
              
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">Upcoming Due Dates</p>
                <div className="flex gap-2 flex-wrap">
                  {getNextDates(bill.next_due_date, bill.frequency, bill.custom_value).map((d, i) => (
                    <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                      {format(d, 'MMM d')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button 
                  variant="ghost" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { if(confirm('Stop tracking this bill?')) deleteRecurringMutation.mutate(bill.id) }}
                >
                  <Trash2 size={16} className="mr-1" /> Remove
                </Button>
              </div>
            </Card>
          ))}
          {!recurringLoading && recurringList.length === 0 && (
            <div className="col-span-1 md:col-span-2 p-12 text-center text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
              <CalendarClock size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">No recurring bills set up</p>
              <p className="mb-4">Add your Rent, Subscriptions, or Loans to get accurate projections.</p>
              <Button onClick={() => setIsAdding(true)} variant="primary">Add First Bill</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Expenses;