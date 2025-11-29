import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { fetchBenefits, deleteBenefit } from '../services/data';
import { Button, Input, Select, Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { format, addWeeks, addMonths, addYears } from 'date-fns';
import { Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { Frequency } from '../types';

const schema = z.object({
  benefit_name: z.string().min(2, 'Name is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  frequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'YEARLY']),
  next_payment_date: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof schema>;

const Benefits: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const { data: benefits = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_benefits'], 
    queryFn: fetchBenefits 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('assetflow_benefits').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_benefits'] });
      setIsAdding(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBenefit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_benefits'] })
  });

  const getNextDates = (dateStr: string, freq: Frequency, count: number = 3) => {
    let date = new Date(dateStr);
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(date);
      if (freq === 'WEEKLY') date = addWeeks(date, 1);
      else if (freq === 'FORTNIGHTLY') date = addWeeks(date, 2);
      else if (freq === 'MONTHLY') date = addMonths(date, 1);
      else if (freq === 'YEARLY') date = addYears(date, 1);
    }
    return dates;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Benefit Tracking</h1>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> Add Benefit</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200">
          <h2 className="text-lg font-semibold mb-4">Add Recurring Benefit</h2>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Benefit Name" {...register('benefit_name')} error={errors.benefit_name?.message} />
              <Input label="Amount" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select 
                label="Frequency" 
                options={[
                  { label: 'Weekly', value: 'WEEKLY' },
                  { label: 'Fortnightly', value: 'FORTNIGHTLY' },
                  { label: 'Monthly', value: 'MONTHLY' },
                  { label: 'Yearly', value: 'YEARLY' },
                ]} 
                {...register('frequency')} 
                error={errors.frequency?.message} 
              />
              <Input label="Next Payment Date" type="date" {...register('next_payment_date')} error={errors.next_payment_date?.message} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={mutation.isPending}>Save Schedule</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {benefits.map(benefit => (
          <Card key={benefit.id} className="p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{benefit.benefit_name}</h3>
                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <RefreshCw size={10} className="mr-1"/> {benefit.frequency}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600">${benefit.amount}</span>
              </div>
            </div>
            
            <div className="mt-4 border-t pt-4">
              <p className="text-sm font-medium text-gray-500 mb-2">Upcoming Payments</p>
              <div className="flex gap-2 flex-wrap">
                {getNextDates(benefit.next_payment_date, benefit.frequency).map((d, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                    {format(d, 'MMM d')}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                variant="ghost" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => { if(confirm('Delete?')) deleteMutation.mutate(benefit.id) }}
              >
                <Trash2 size={16} className="mr-1" /> Remove
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && benefits.length === 0 && (
          <div className="col-span-1 md:col-span-2 p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
            No benefits set up yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Benefits;