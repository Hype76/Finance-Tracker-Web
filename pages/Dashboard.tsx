import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/UI';
import { fetchTransactions, fetchBenefits, fetchPaydays } from '../services/data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { data: income = [] } = useQuery({ queryKey: ['assetflow_income'], queryFn: () => fetchTransactions('INCOME') });
  const { data: expenses = [] } = useQuery({ queryKey: ['assetflow_expenses'], queryFn: () => fetchTransactions('EXPENSE') });
  const { data: benefits = [] } = useQuery({ queryKey: ['assetflow_benefits'], queryFn: fetchBenefits });
  const { data: paydays = [] } = useQuery({ queryKey: ['assetflow_paydays'], queryFn: fetchPaydays });

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    // Use native Date methods to avoid import issues with date-fns versions
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyIncome = income
      .filter(i => {
        const d = new Date(i.date);
        return d >= start && d <= end;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    const monthlyExpenses = expenses
      .filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      })
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income: monthlyIncome,
      expenses: monthlyExpenses,
      balance: monthlyIncome - monthlyExpenses
    };
  }, [income, expenses]);

  const nextBenefit = useMemo(() => {
    if (!benefits.length) return null;
    // Simple sort for now, ideally filter for future dates
    return benefits.sort((a, b) => new Date(a.next_payment_date).getTime() - new Date(b.next_payment_date).getTime())[0];
  }, [benefits]);

  const nextPayday = useMemo(() => {
    if (!paydays.length) return null;
    return paydays.sort((a, b) => new Date(a.next_payday_date).getTime() - new Date(b.next_payday_date).getTime())[0];
  }, [paydays]);

  const chartData = [
    { name: 'Income', amount: currentMonthStats.income },
    { name: 'Expenses', amount: currentMonthStats.expenses },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-gray-500">Here's what's happening this month.</p>
        </div>
        <div className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
          {format(new Date(), 'MMMM yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <ArrowUpCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Income</p>
              <h3 className="text-2xl font-bold text-gray-900">${currentMonthStats.income.toFixed(2)}</h3>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg text-red-600">
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Monthly Outgoings</p>
              <h3 className="text-2xl font-bold text-gray-900">${currentMonthStats.expenses.toFixed(2)}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg text-primary-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Net Balance</p>
              <h3 className={`text-2xl font-bold ${currentMonthStats.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                ${currentMonthStats.balance.toFixed(2)}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 min-h-[300px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Income vs Expenses</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip 
                   cursor={{fill: 'transparent'}}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
           <Card className="p-6">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-sm font-medium text-gray-500 mb-1">Next Payday</p>
                   {nextPayday ? (
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{format(new Date(nextPayday.next_payday_date), 'EEEE, MMM do')}</h4>
                        <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full mt-2 inline-block">
                          {nextPayday.frequency}
                        </span>
                      </div>
                   ) : (
                     <p className="text-gray-400 italic">No payday scheduled</p>
                   )}
                </div>
                <Calendar className="text-primary-300" size={32} />
             </div>
           </Card>

           <Card className="p-6">
             <div className="flex items-start justify-between">
                <div>
                   <p className="text-sm font-medium text-gray-500 mb-1">Upcoming Benefit</p>
                   {nextBenefit ? (
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">{nextBenefit.benefit_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-semibold text-green-600">${nextBenefit.amount}</span>
                          <span className="text-sm text-gray-400">on {format(new Date(nextBenefit.next_payment_date), 'MMM do')}</span>
                        </div>
                      </div>
                   ) : (
                     <p className="text-gray-400 italic">No benefits found</p>
                   )}
                </div>
                <Wallet className="text-green-300" size={32} />
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;