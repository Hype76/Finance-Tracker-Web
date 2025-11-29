import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { fetchPaydays, deletePayday } from '../services/data';
import { Button, Input, Select, Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { format, addWeeks, addMonths } from 'date-fns';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import { Frequency } from '../types';

const schema = z.object({
  frequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  next_payday_date: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof schema>;

const Payday: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const { data: paydays = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_paydays'], 
    queryFn: fetchPaydays 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('assetflow_paydays').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_paydays'] });
      setIsAdding(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePayday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_paydays'] })
  });

  const getFutureDates = (dateStr: string, freq: Frequency, count: number = 4) => {
    let date = new Date(dateStr);
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(date);
      if (freq === 'WEEKLY') date = addWeeks(date, 1);
      else if (freq === 'FORTNIGHTLY') date = addWeeks(date, 2);
      else if (freq === 'MONTHLY') date = addMonths(date, 1);
    }
    return dates;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payday Schedule</h1>
        {paydays.length === 0 && (
          <Button onClick={() => setIsAdding(!isAdding)} variant="primary">
            {isAdding ? 'Cancel' : 'Set Schedule'}
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="p-6 max-w-lg mx-auto">
          <h2 className="text-lg font-semibold mb-4">Set Payday Routine</h2>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <Select 
              label="How often do you get paid?" 
              options={[
                { label: 'Weekly', value: 'WEEKLY' },
                { label: 'Fortnightly', value: 'FORTNIGHTLY' },
                { label: 'Monthly', value: 'MONTHLY' },
              ]} 
              {...register('frequency')} 
              error={errors.frequency?.message} 
            />
            <Input label="Next Payday Date" type="date" {...register('next_payday_date')} error={errors.next_payday_date?.message} />
            <div className="flex justify-end">
              <Button type="submit" isLoading={mutation.isPending}>Save Schedule</Button>
            </div>
          </form>
        </Card>
      )}

      {paydays.map(pd => (
        <Card key={pd.id} className="p-8 text-center bg-gradient-to-br from-white to-blue-50">
           <CalendarDays size={48} className="mx-auto text-primary-500 mb-4" />
           <h3 className="text-2xl font-bold text-gray-900 mb-2">
             You are paid <span className="text-primary-600">{pd.frequency.toLowerCase()}</span>
           </h3>
           <p className="text-gray-500 mb-6">Next payday is {format(new Date(pd.next_payday_date), 'EEEE, MMMM do, yyyy')}</p>
           
           <div className="max-w-md mx-auto bg-white rounded-lg p-4 shadow-sm border mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 text-left">Projected Dates</h4>
              <div className="space-y-2">
                {getFutureDates(pd.next_payday_date, pd.frequency).map((d, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 border-b last:border-0 pb-1 last:pb-0">
                    <span>Payday #{i + 1}</span>
                    <span className="font-medium">{format(d, 'MMM d, yyyy')}</span>
                  </div>
                ))}
              </div>
           </div>

           <Button variant="danger" onClick={() => deleteMutation.mutate(pd.id)}>Reset Schedule</Button>
        </Card>
      ))}
    </div>
  );
};

export default Payday;