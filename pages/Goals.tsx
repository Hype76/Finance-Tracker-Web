import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { fetchGoals, deleteGoal } from '../services/data';
import { Button, Input, Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, Target, Trophy } from 'lucide-react';
import { format } from 'date-fns';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  target_amount: z.coerce.number().positive('Target must be positive'),
  current_amount: z.coerce.number().min(0, 'Current amount cannot be negative'),
  target_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const Goals: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const { data: goals = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_goals'], 
    queryFn: fetchGoals 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('assetflow_goals').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_goals'] });
      setIsAdding(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_goals'] })
  });

  // Small mutation to add money to a goal (simulated update for demo)
  const addFunds = async (id: string, current: number, amount: number) => {
    await supabase.from('assetflow_goals').update({ current_amount: current + amount }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['assetflow_goals'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Goal Buckets</h1>
           <p className="text-gray-500">Visualize your dreams and track progress.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> New Goal</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200 border-l-4 border-green-500">
          <h2 className="text-lg font-semibold mb-4">Set a New Target</h2>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Goal Name" {...register('name')} error={errors.name?.message} placeholder="e.g. Vacation, New Van" />
              <Input label="Target Amount ($)" type="number" step="0.01" {...register('target_amount')} error={errors.target_amount?.message} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Starting Balance ($)" type="number" step="0.01" {...register('current_amount')} error={errors.current_amount?.message} />
              <Input label="Target Date (Optional)" type="date" {...register('target_date')} error={errors.target_date?.message} />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={mutation.isPending}>Create Goal</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
          const isComplete = percent >= 100;
          
          return (
            <Card key={goal.id} className={`p-6 flex flex-col justify-between ${isComplete ? 'border-2 border-yellow-400 bg-yellow-50' : ''}`}>
              <div>
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isComplete ? 'bg-yellow-200 text-yellow-700' : 'bg-primary-50 text-primary-600'}`}>
                         {isComplete ? <Trophy size={20} /> : <Target size={20} />}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{goal.name}</h3>
                    </div>
                    <button onClick={() => deleteMutation.mutate(goal.id)} className="text-gray-400 hover:text-red-500">
                       <Trash2 size={16} />
                    </button>
                 </div>
                 
                 <div className="mt-4 mb-2 flex justify-between text-sm">
                   <span className="text-gray-600 font-medium">${goal.current_amount.toLocaleString()}</span>
                   <span className="text-gray-400">of ${goal.target_amount.toLocaleString()}</span>
                 </div>
                 
                 <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                   <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${isComplete ? 'bg-yellow-500' : 'bg-primary-600'}`} 
                      style={{ width: `${percent}%` }}
                   ></div>
                 </div>
                 <p className="text-right text-xs text-gray-500 mt-1">{percent}% Funded</p>
                 
                 {goal.target_date && (
                   <p className="text-xs text-gray-400 mt-2">Target Date: {format(new Date(goal.target_date), 'MMM d, yyyy')}</p>
                 )}
              </div>

              {!isComplete && (
                 <div className="mt-6 pt-4 border-t flex gap-2">
                    <Button 
                      variant="secondary" 
                      className="flex-1 text-xs" 
                      onClick={() => addFunds(goal.id, goal.current_amount, 50)}
                    >
                      + $50
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1 text-xs"
                      onClick={() => addFunds(goal.id, goal.current_amount, 100)}
                    >
                      + $100
                    </Button>
                 </div>
              )}
            </Card>
          );
        })}
        
        {!isLoading && goals.length === 0 && (
          <div className="col-span-1 md:col-span-2 p-12 text-center text-gray-500 border-2 border-dashed rounded-xl bg-gray-50">
            <Target size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900">No goals set</p>
            <p className="mb-4">Start saving for a vehicle, holiday, or rainy day.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;