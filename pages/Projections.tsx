import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchBenefits } from '../services/data';
import { Card } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const Projections: React.FC = () => {
  // In a real app, we might need a more sophisticated backend calculation or more data fetching
  // Here we project based on averages and recurring benefits
  const { data: income = [] } = useQuery({ queryKey: ['income'], queryFn: () => fetchTransactions('INCOME') });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses'], queryFn: () => fetchTransactions('EXPENSE') });
  const { data: benefits = [] } = useQuery({ queryKey: ['benefits'], queryFn: fetchBenefits });

  const projectionData = useMemo(() => {
    // 1. Calculate average monthly expense (excluding current month partial data usually, but we keep it simple)
    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const avgExpense = totalExpenses / (expenses.length > 0 ? 3 : 1); // Mock divisor for demo
    
    // 2. Calculate recurring monthly benefit income
    const monthlyBenefits = benefits.reduce((acc, b) => {
      if (b.frequency === 'WEEKLY') return acc + (b.amount * 52 / 12);
      if (b.frequency === 'FORTNIGHTLY') return acc + (b.amount * 26 / 12);
      if (b.frequency === 'MONTHLY') return acc + b.amount;
      return acc;
    }, 0);

    // 3. Project for next 6 months
    const data = [];
    let currentSavings = 0; // Ideally fetched from current balance
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(now, i);
      const monthLabel = format(monthDate, 'MMM yyyy');
      
      // Simple projection logic:
      // Project Income = Last month's income (or avg) + Benefits
      // Project Expenses = Avg Expenses
      
      // Note: This is a placeholder logic for the "Engine". 
      // Real implementation would look at past trends more closely.
      const projectedIncome = monthlyBenefits + 2000; // Mock salary base of 2000 if not found
      const projectedExpenses = avgExpense || 1500; // Mock expense base

      const net = projectedIncome - projectedExpenses;
      currentSavings += net;

      data.push({
        month: monthLabel,
        Income: projectedIncome,
        Expenses: projectedExpenses,
        Savings: currentSavings
      });
    }
    return data;
  }, [income, expenses, benefits]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Projections</h1>
        <p className="text-gray-500">Estimated growth over the next 6 months based on current trends.</p>
      </div>

      <Card className="p-6 h-[400px]">
        <h3 className="text-lg font-semibold mb-4">Projected Savings Growth</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="month" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip />
            <Area type="monotone" dataKey="Savings" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSavings)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
           <h3 className="font-semibold text-gray-700 mb-4">Monthly Breakdown</h3>
           <div className="space-y-4">
              {projectionData.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <span className="font-medium text-gray-900">{d.month}</span>
                  <div className="text-right">
                    <span className="block text-green-600">+${d.Income.toFixed(0)}</span>
                    <span className="block text-red-500">-${d.Expenses.toFixed(0)}</span>
                  </div>
                </div>
              ))}
           </div>
        </Card>
        
        <Card className="p-6 bg-primary-900 text-white">
          <h3 className="font-semibold text-primary-100 mb-2">Projected 6-Month Result</h3>
          <div className="mt-8 text-center">
             <p className="text-primary-200">Estimated Total Savings</p>
             <p className="text-4xl font-bold mt-2">
               ${projectionData[projectionData.length - 1]?.Savings.toFixed(2)}
             </p>
             <p className="text-sm text-primary-300 mt-4">
               *This is an estimate based on your recurring benefits and average spending habits.
             </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Projections;