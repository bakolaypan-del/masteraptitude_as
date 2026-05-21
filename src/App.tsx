import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import TestRunner from './pages/TestRunner';
import TypingTestList from './pages/TypingTestList';
import TypingTestRunner from './pages/TypingTestRunner';
import TypingTestAnalysis from './pages/TypingTestAnalysis';
import { NewsListPage, NewsDetailPage } from './pages/NewsPage';

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        alert('Screenshots are disabled for security reasons.');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <>
      {children}
      <div className="security-watermark">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="watermark-item">
            {user?.email || 'MASTER APTITUDE'}
          </div>
        ))}
      </div>
    </>
  );
}

// Only used for /admin/* — students access the site freely
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  // Anonymous users and unauthenticated users → go to admin login
  if (!user || user.isAnonymous) return <Navigate to="/login" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SecurityWrapper>
          <Routes>
            {/* Admin login — students go directly to dashboard */}
            <Route path="/login" element={<Login />} />

            {/* Root and all student routes — no auth required */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/test/:testId" element={<TestRunner />} />
            <Route path="/typing-test" element={<TypingTestList />} />
            <Route path="/typing-test/:id" element={<TypingTestRunner />} />
            <Route path="/typing-test/:id/analysis" element={<TypingTestAnalysis />} />
            <Route path="/news" element={<NewsListPage />} />
            <Route path="/news/:slugOrId" element={<NewsDetailPage />} />

            {/* Admin-only */}
            <Route path="/admin/*" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
          </Routes>
        </SecurityWrapper>
      </BrowserRouter>
    </AuthProvider>
  );
}
