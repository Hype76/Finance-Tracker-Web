import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { fetchAssets, deleteAsset } from '../services/data';
import { Button, Input, Select, Card } from '../components/UI';
import { ASSET_TYPES } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, Building2, TrendingUp } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  value: z.coerce.number().positive('Value must be positive'),
  type: z.string().min(1, 'Type is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const Assets: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  const { data: assets = [], isLoading } = useQuery({ 
    queryKey: ['assetflow_assets'], 
    queryFn: fetchAssets 
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase.from('assetflow_assets').insert([{
        user_id: user?.id,
        ...data
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assetflow_assets'] });
      setIsAdding(false);
      reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assetflow_assets'] })
  });

  const totalValue = useMemo(() => assets.reduce((sum, item) => sum + item.value, 0), [assets]);

  const chartData = useMemo(() => {
    const map = new Map();
    assets.forEach(a => {
      const existing = map.get(a.type) || 0;
      map.set(a.type, existing + a.value);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Asset Portfolio</h1>
           <p className="text-gray-500">Track high-value items to build Net Worth.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? <><X size={16} className="mr-2"/> Cancel</> : <><Plus size={16} className="mr-2"/> Add Asset</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary-900 to-primary-700 text-white col-span-1 md:col-span-2">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Building2 size={32} />
              </div>
              <div>
                <p className="text-primary-100 font-medium">Total Asset Value</p>
                <h2 className="text-3xl font-bold">${totalValue.toLocaleString()}</h2>
              </div>
           </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Allocation</h3>
          <div className="h-[120px]">
             {assets.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={30} 
                    outerRadius={50} 
                    paddingAngle={5}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-xs text-gray-400">No data</div>
             )}
          </div>
        </Card>
      </div>

      {isAdding && (
        <Card className="p-6 animate-in slide-in-from-top-4 duration-200 border-l-4 border-primary-500">
          <h2 className="text-lg font-semibold mb-4">Add New Asset</h2>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as FormData))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Asset Name" {...register('name')} error={errors.name?.message} placeholder="e.g. Main Residence, Tesla" />
              <Input label="Estimated Value" type="number" step="0.01" {...register('value')} error={errors.value?.message} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Select 
                label="Asset Type" 
                options={ASSET_TYPES.map(c => ({ label: c, value: c }))} 
                {...register('type')} 
                error={errors.type?.message} 
              />
              <Input label="Notes (Optional)" {...register('notes')} />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={mutation.isPending}>Save Asset</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading portfolio...</div>
        ) : assets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No assets recorded yet. Add your house, car, or savings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                      {item.notes && <p className="text-xs text-gray-400 font-normal">{item.notes}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                      ${item.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => {
                          if(confirm('Delete this asset?')) deleteMutation.mutate(item.id);
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
    </div>
  );
};

export default Assets;