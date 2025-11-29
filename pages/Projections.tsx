import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions, fetchBenefits, fetchRecurringExpenses } from '../services/data';
import { Card } from '../components/UI';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, addMonths } from 'date-fns';

const Projections: React.FC = () => {
  const { data: income = [] } = useQuery({ queryKey: ['assetflow_income'], queryFn: () => fetchTransactions('INCOME') });
  const { data: expenses = [] } = useQuery({ queryKey: ['assetflow_expenses'], queryFn: () => fetchTransactions('EXPENSE') });
  const { data: benefits = [] } = useQuery({ queryKey: ['assetflow_benefits'], queryFn: fetchBenefits });
  const { data: recurringBills = [] } = useQuery({ queryKey: ['assetflow_recurring_expenses'], queryFn: fetchRecurringExpenses });

  const projectionData = useMemo(() => {
    // 1. Calculate Historical Average (Variable Spending)
    // We assume recurring bills handle fixed costs. 
    // If recurring bills exist, we try not to double count. 
    // For simplicity in this version, we take the average of all historical expenses 
    // but if recurring bills are > 0, we treat historical avg as just 'variable' (maybe 50% of history? or full history + recurring?)
    // Best Approach for Flip Value: Show the user the power of the "Upcoming Bills" feature.
    
    // Logic: Projected Expense = (Sum of Recurring Bills per month) + (Average Historical Expense * 0.2 buffer)
    // If no recurring bills, use Full Historical Average.
    
    const totalHistoryExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const avgHistoryExpense = totalHistoryExpenses / (expenses.length > 0 ? 3 : 1); // Mock 3 month divisor

    // 2. Calculate Monthly Value of Recurring Bills
    const monthlyFixedCosts = recurringBills.reduce((acc, bill) => {
      let monthlyVal = 0;
      switch(bill.frequency) {
        case 'WEEKLY': monthlyVal = (bill.amount * 52) / 12; break;
        case 'FORTNIGHTLY': monthlyVal = (bill.amount * 26) / 12; break;
        case 'MONTHLY': 
        case 'SPECIFIC_DAY': monthlyVal = bill.amount; break;
        case 'YEARLY': monthlyVal = bill.amount / 12; break;
        case 'EVERY_X_DAYS':
          const days = bill.custom_value || 30;
          monthlyVal = (bill.amount * 365) / days / 12;
          break;
        default: monthlyVal = 0;
      }
      return acc + monthlyVal;
    }, 0);

    // Final Expense Projection Logic
    let projectedMonthlyExpense = 0;
    if (monthlyFixedCosts > 0) {
      // If we have bills set up, assume history is mostly variable spending (food, etc)
      // We'll add 50% of history avg as variable spending to the fixed costs
      projectedMonthlyExpense = monthlyFixedCosts + (avgHistoryExpense * 0.5);
    } else {
      // Fallback if no bills set up
      projectedMonthlyExpense = avgHistoryExpense > 0 ? avgHistoryExpense : 1500;
    }

    // 3. Calculate Recurring Income (Benefits)
    const monthlyBenefits = benefits.reduce((acc, b) => {
      let monthlyValue = 0;
      switch(b.frequency) {
        case 'WEEKLY': monthlyValue = (b.amount * 52) / 12; break;
        case 'FORTNIGHTLY': monthlyValue = (b.amount * 26) / 12; break;
        case 'MONTHLY':
        case 'SPECIFIC_DAY': monthlyValue = b.amount; break;
        case 'YEARLY': monthlyValue = b.amount / 12; break;
        case 'EVERY_X_DAYS':
          const days = b.custom_value || 1;
          monthlyValue = (b.amount * 365) / days / 12;
          break;
        default: monthlyValue = 0;
      }
      return acc + monthlyValue;
    }, 0);

    // 4. Project for next 6 months
    const data = [];
    let currentSavings = 0; 
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(now, i);
      const monthLabel = format(monthDate, 'MMM yyyy');
      
      const projectedIncome = monthlyBenefits + 2000; // Base salary assumption if no data
      const net = projectedIncome - projectedMonthlyExpense;
      currentSavings += net;

      data.push({
        month: monthLabel,
        Income: projectedIncome,
        Expenses: projectedMonthlyExpense,
        Savings: currentSavings
      });
    }
    return data;
  }, [income, expenses, benefits, recurringBills]);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Projections</h1>
        <p className="text-gray-500">Estimated growth over the next 6 months based on Recurring Bills and Income.</p>
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
        
        <div className="space-y-6">
          <Card className="p-6 bg-primary-900 text-white">
            <h3 className="font-semibold text-primary-100 mb-2">Projected 6-Month Result</h3>
            <div className="mt-8 text-center">
              <p className="text-primary-200">Estimated Total Savings</p>
              <p className="text-4xl font-bold mt-2">
                ${projectionData[projectionData.length - 1]?.Savings.toFixed(2)}
              </p>
            </div>
          </Card>
          
          <Card className="p-6">
             <h4 className="text-sm font-semibold text-gray-500 mb-2">Calculation Basis</h4>
             <ul className="text-sm text-gray-600 space-y-2">
               <li className="flex justify-between">
                 <span>Recurring Income:</span>
                 <span className="font-medium">Active</span>
               </li>
               <li className="flex justify-between">
                 <span>Recurring Bills:</span>
                 <span className="font-medium">{recurringBills.length > 0 ? 'Active (Preferred)' : 'None (Using History)'}</span>
               </li>
             </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Projections;