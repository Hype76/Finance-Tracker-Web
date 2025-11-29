import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Benefits from './pages/Benefits';
import Payday from './pages/Payday';
import Projections from './pages/Projections';
import Assets from './pages/Assets';
import Debts from './pages/Debts';
import Goals from './pages/Goals';
import Reports from './pages/Reports';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Layout><Assets /></Layout></ProtectedRoute>} />
      <Route path="/debts" element={<ProtectedRoute><Layout><Debts /></Layout></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Layout><Goals /></Layout></ProtectedRoute>} />
      <Route path="/income" element={<ProtectedRoute><Layout><Income /></Layout></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
      <Route path="/benefits" element={<ProtectedRoute><Layout><Benefits /></Layout></ProtectedRoute>} />
      <Route path="/payday" element={<ProtectedRoute><Layout><Payday /></Layout></ProtectedRoute>} />
      <Route path="/projections" element={<ProtectedRoute><Layout><Projections /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;