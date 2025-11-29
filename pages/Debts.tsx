import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { fetchDebts, deleteDebt } from '../services/data';
import { Button, Input, Card } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, CreditCard, AlertCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  balance: z.coerce.number().positive('Balance must be positive'),
  interest_rate: z.coerce.number().min(0, 'Interest cannot be negative'),
  minimum_payment: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

const Debts: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const { data: debts = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_debts'], 
    queryFn: fetchDebts 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('assetflow_debts').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_debts'] });
      setIsAdding(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_debts'] })
  });

  const totalDebt = useMemo(() => debts.reduce((sum, item) => sum + item.balance, 0), [debts]);
  const monthlyObligation = useMemo(() => debts.reduce((sum, item) => sum + item.minimum_payment, 0), [debts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Debt Crusher</h1>
           <p className="text-gray-500">Track liabilities and plan your freedom.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'danger'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> Add Debt</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-l-4 border-red-500">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <CreditCard size={32} />
              </div>
              <div>
                <p className="text-gray-500 font-medium">Total Balance</p>
                <h2 className="text-3xl font-bold text-gray-900">${totalDebt.toLocaleString()}</h2>
              </div>
           </div>
        </Card>

        <Card className="p-6 border-l-4 border-orange-500">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <AlertCircle size={32} />
              </div>
              <div>
                <p className="text-gray-500 font-medium">Monthly Minimums</p>
                <h2 className="text-3xl font-bold text-gray-900">${monthlyObligation.toLocaleString()}</h2>
              </div>
           </div>
        </Card>
      </div>

      {isAdding && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200">
          <h2 className="text-lg font-semibold mb-4">Add New Liability</h2>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Debt Name" {...register('name')} error={errors.name?.message} placeholder="e.g. Visa, Car Loan" />
              <Input label="Current Balance" type="number" step="0.01" {...register('balance')} error={errors.balance?.message} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Interest Rate (%)" type="number" step="0.01" {...register('interest_rate')} error={errors.interest_rate?.message} />
              <Input label="Min. Monthly Payment" type="number" step="0.01" {...register('minimum_payment')} error={errors.minimum_payment?.message} />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="danger" isLoading={mutation.isPending}>Save Debt</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading debts...</div>
        ) : debts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Debt free! Or you haven't added any yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {debts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        {item.interest_rate}% APR
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       ${item.minimum_payment.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      ${item.balance.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => {
                          if(confirm('Is this debt paid off?')) deleteMutation.mutate(item.id);
                        }}
                        className="text-gray-400 hover:text-green-600"
                        title="Mark Paid"
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

export default Debts;