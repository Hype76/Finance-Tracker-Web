import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase, uploadFile, getFileUrl } from '../lib/supabase';
import { fetchTransactions, deleteTransaction } from '../services/data';
import { Button, Input, Select, Card } from '../components/UI';
import { INCOME_CATEGORIES } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, Trash2, FileText, X } from 'lucide-react';

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date_received: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const Income: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { data: incomeList = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_income'], 
    queryFn: () => fetchTransactions('INCOME') 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: FormData & { attachment_url?: string }) => {
      const { error } = await supabase.from('assetflow_income').insert([{
        user_id: user?.id,
        title: data.title,
        amount: data.amount,
        date_received: data.date_received,
        category: data.category,
        notes: data.notes,
        attachment_url: data.attachment_url
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_income'] });
      setIsAdding(false);
      reset();
      setSelectedFile(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id, 'INCOME'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_income'] })
  });

  const onSubmit = async (data: FormData) => {
    let attachmentPath = undefined;
    if (selectedFile && user) {
      setUploading(true);
      const path = await uploadFile(user.id, selectedFile);
      setUploading(false);
      if (path) attachmentPath = path;
    }
    mutation.mutate({ ...data, attachment_url: attachmentPath });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Helper to open file
  const openFile = async (path: string) => {
    const url = await getFileUrl(path);
    if(url) window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> Add Income</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200">
          <h2 className="text-lg font-semibold mb-4">New Income Entry</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Title" {...register('title')} error={errors.title?.message} placeholder="e.g. Salary, Project X" />
              <Input label="Amount" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} placeholder="0.00" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Date Received" type="date" {...register('date_received')} error={errors.date_received?.message} />
              <Select 
                label="Category" 
                options={INCOME_CATEGORIES.map(c => ({ label: c, value: c }))} 
                {...register('category')} 
                error={errors.category?.message} 
              />
            </div>
            <Input label="Notes (Optional)" {...register('notes')} placeholder="Additional details..." />
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Attachment (Optional)</label>
              <input type="file" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"/>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={mutation.isPending || uploading}>Save Entry</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading entries...</div>
        ) : incomeList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No income entries found. Click "Add Income" to start tracking.</div>
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
                {incomeList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(item.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-3">
                      {item.attachment_url && (
                        <button onClick={() => openFile(item.attachment_url!)} className="text-primary-600 hover:text-primary-900" title="View Attachment">
                          <FileText size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          if(confirm('Are you sure you want to delete this entry?')) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
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
    </div>
  );
};

export default Income;