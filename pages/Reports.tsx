import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTransactions } from '../services/data';
import { Button, Card } from '../components/UI';
import { FileDown, Printer, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

const Reports: React.FC = () => {
  const { data: income = [] } = useQuery({ queryKey: ['assetflow_income'], queryFn: () => fetchTransactions('INCOME') });
  const { data: expenses = [] } = useQuery({ queryKey: ['assetflow_expenses'], queryFn: () => fetchTransactions('EXPENSE') });

  const downloadCSV = (data: any[], filename: string) => {
    if (!data.length) {
      alert('No data to export');
      return;
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + '\n' + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanData = (data: any[]) => {
    return data.map(({ id, user_id, attachment_url, created_at, ...rest }) => rest);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
        <p className="text-gray-500">Download your financial data for taxes, loans, or personal records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 text-center hover:shadow-md transition-shadow">
           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <FileSpreadsheet size={32} />
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">Income Statement</h3>
           <p className="text-sm text-gray-500 mb-6">Export all recorded income streams including Salary, Benefits, and One-offs.</p>
           <Button onClick={() => downloadCSV(cleanData(income), `income_report_${format(new Date(), 'yyyy-MM-dd')}`)}>
             <FileDown size={16} className="mr-2" /> Download CSV
           </Button>
        </Card>

        <Card className="p-8 text-center hover:shadow-md transition-shadow">
           <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <FileSpreadsheet size={32} />
           </div>
           <h3 className="text-lg font-bold text-gray-900 mb-2">Expense Report</h3>
           <p className="text-sm text-gray-500 mb-6">Export full history of bills and spending for tax deductions.</p>
           <Button onClick={() => downloadCSV(cleanData(expenses), `expense_report_${format(new Date(), 'yyyy-MM-dd')}`)} variant="secondary">
             <FileDown size={16} className="mr-2" /> Download CSV
           </Button>
        </Card>

        <Card className="p-8 text-center md:col-span-2 bg-gray-50 border-dashed border-2">
           <h3 className="text-lg font-bold text-gray-900 mb-2">Printer Friendly View</h3>
           <p className="text-sm text-gray-500 mb-6">Generate a clean browser print-out of your current dashboard stats.</p>
           <Button onClick={() => window.print()} variant="ghost">
             <Printer size={16} className="mr-2" /> Print Dashboard
           </Button>
        </Card>
      </div>
    </div>
  );
};

export default Reports;